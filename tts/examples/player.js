/**
 * Browser client for the درب السيرة TTS server (/ws/tts).
 *
 * - Plays streamed PCM chunks back-to-back with no gaps.
 * - Plays human Quran recitations (from the server's audio_urls) in between.
 * - Calls onSegment / onQuran exactly when that part is HEARD, so the UI can highlight it.
 *
 *   const narrator = new SeeraNarrator("wss://<host>/ws/tts", {
 *     onSegment: (i, text) => highlight(i, text),
 *     onQuran:   (i, text) => showVerse(i, text),
 *     onDone:    () => console.log("finished"),
 *   });
 *   await narrator.speak(chapterText);                       // full text
 *   await narrator.begin(); narrator.append(delta); ... narrator.end();   // streaming LLM
 *   narrator.stop();                                         // silence everything
 */
export class SeeraNarrator {
  constructor(url, { onSegment = () => {}, onQuran = () => {}, onDone = () => {}, onError = console.error } = {}) {
    Object.assign(this, { url, onSegment, onQuran, onDone, onError });
    this.ctx = null;           // Web Audio clock + output
    this.ws = null;
    this.playhead = 0;         // time (on ctx's clock) where the next sound should start
    this.sampleRate = 24000;
    this.queue = Promise.resolve();
    this.timers = new Set();       // pending setTimeouts (highlights, recitations)
    this.sources = new Set();      // scheduled PCM buffers
    this.recitations = new Set();  // <audio> elements
  }

  // ------------------------------------------------------------ public API
  async speak(text, voice) { await this.#connect(); this.#send({ type: "speak", text, voice }); }
  async begin(voice)       { await this.#connect(); this.#send({ type: "begin", voice }); }
  append(text)             { this.#send({ type: "append", text }); }
  end()                    { this.#send({ type: "end" }); }

  stop() {
    this.ws?.close();
    this.ws = null;
    this.timers.forEach(clearTimeout);
    this.sources.forEach((s) => s.stop());
    this.recitations.forEach((a) => a.pause());
    this.timers.clear(); this.sources.clear(); this.recitations.clear();
    this.ctx?.close();
    this.ctx = null;
    this.playhead = 0;
  }

  // ------------------------------------------------------------ connection
  async #connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ctx ??= new AudioContext();  // browsers allow audio only after a user click
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";
    // Handle messages strictly in order: a recitation must finish loading
    // before the narration after it is scheduled, or they would overlap.
    this.queue = Promise.resolve();
    this.ws.onmessage = (e) => {
      this.queue = this.queue
        .then(() => (typeof e.data === "string" ? this.#onEvent(JSON.parse(e.data)) : this.#playPcm(e.data)))
        .catch((err) => this.onError(err));
    };
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = () => reject(new Error(`Cannot connect to ${this.url}`));
    });
  }

  #send(msg) {
    if (this.ws?.readyState !== WebSocket.OPEN) throw new Error("Not connected - call speak() or begin() first");
    this.ws.send(JSON.stringify(msg));
  }

  // ---------------------------------------------------------------- events
  async #onEvent(evt) {
    switch (evt.event) {
      case "start":
        this.sampleRate = evt.sample_rate;
        break;
      case "segment":
        this.#atPlayhead(() => this.onSegment(evt.index, evt.text));
        break;
      case "quran":
        this.#atPlayhead(() => this.onQuran(evt.index, evt.text));
        for (const url of evt.audio_urls ?? []) await this.#scheduleRecitation(url);
        break;
      case "done":
        this.#atPlayhead(() => this.onDone());
        break;
      case "error":
        this.onError(new Error(evt.message));
        break;
    }
  }

  /** Run fn when playback reaches the current playhead - i.e. when the user hears it. */
  #atPlayhead(fn) {
    const delayMs = Math.max(0, (this.playhead - this.ctx.currentTime) * 1000);
    this.#later(fn, delayMs);
  }

  #later(fn, delayMs) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, delayMs);
    this.timers.add(id);
  }

  // ----------------------------------------------------------------- audio
  #reserve(seconds) {
    // If we fell behind (network gap), restart slightly in the future instead of in the past.
    this.playhead = Math.max(this.playhead, this.ctx.currentTime + 0.05);
    const start = this.playhead;
    this.playhead += seconds;
    return start;
  }

  #playPcm(buffer) {
    const pcm = new Int16Array(buffer);
    const audio = this.ctx.createBuffer(1, pcm.length, this.sampleRate);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;  // int16 -> float [-1, 1]

    const src = this.ctx.createBufferSource();
    src.buffer = audio;
    src.connect(this.ctx.destination);
    src.onended = () => this.sources.delete(src);
    src.start(this.#reserve(audio.duration));
    this.sources.add(src);
  }

  /** Load a recitation, reserve its slot on the timeline, and play it there. */
  async #scheduleRecitation(url) {
    const audio = new Audio(url);  // an <audio> element needs no CORS headers, unlike fetch()
    audio.preload = "auto";
    const duration = await new Promise((resolve) => {
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);      // unreachable: skip it and keep narrating
      setTimeout(() => resolve(0), 8000);    // too slow: same
    });
    if (!duration || !this.ctx) return;

    const start = this.#reserve(0.3 + duration + 0.4) + 0.3;  // short breath before and after
    this.recitations.add(audio);
    audio.onended = () => this.recitations.delete(audio);
    this.#later(() => audio.play().catch((err) => this.onError(err)), (start - this.ctx.currentTime) * 1000);
  }
}