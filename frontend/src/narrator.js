/**
 * Client for the درب السيرة TTS server (WebSocket /ws/tts).
 * Plays streamed PCM audio gaplessly, plays Quran recitations (audio_urls) in between,
 * and calls onSegment / onQuran when that part is actually HEARD.
 */
export class SeeraNarrator {
  constructor(url, { onSegment = () => {}, onQuran = () => {}, onDone = () => {}, onError = console.error } = {}) {
    Object.assign(this, { url, onSegment, onQuran, onDone, onError });
    this.ctx = null;
    this.ws = null;
    this.playhead = 0;
    this.sampleRate = 24000;
    this.finished = false;
    this.queue = Promise.resolve();
    this.timers = new Set();
    this.sources = new Set();
    this.recitations = new Set();
  }

  async speak(text, voice) { await this.#connect(); this.finished = false; this.#send({ type: "speak", text, voice }); }

  stop() {
    const ws = this.ws;
    this.ws = null;                       // set first, so onclose knows this was intentional
    ws?.close();
    this.timers.forEach(clearTimeout);
    this.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    this.recitations.forEach((a) => a.pause());
    this.timers.clear(); this.sources.clear(); this.recitations.clear();
    this.ctx?.close();
    this.ctx = null;
    this.playhead = 0;
  }

  async #connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ctx ??= new AudioContext();      // created inside the click handler -> audio allowed
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.binaryType = "arraybuffer";
    this.queue = Promise.resolve();
    ws.onmessage = (e) => {
      this.queue = this.queue
        .then(() => (typeof e.data === "string" ? this.#onEvent(JSON.parse(e.data)) : this.#playPcm(e.data)))
        .catch((err) => this.onError(err));
    };
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error(`Cannot connect to ${this.url}`));
    });
    ws.onclose = () => {                  // server went away mid-narration (e.g. GPU session stopped)
      if (this.ws === ws && !this.finished) this.onError(new Error("TTS connection closed"));
    };
  }

  #send(msg) { this.ws.send(JSON.stringify(msg)); }

  async #onEvent(evt) {
    if (!this.ctx) return;                // stopped
    switch (evt.event) {
      case "start": this.sampleRate = evt.sample_rate; break;
      case "segment": this.#atPlayhead(() => this.onSegment(evt.index, evt.text)); break;
      case "quran":
        this.#atPlayhead(() => this.onQuran(evt.index, evt.text));
        for (const url of evt.audio_urls ?? []) await this.#scheduleRecitation(url);
        break;
      case "done": this.finished = true; this.#atPlayhead(() => this.onDone()); break;
      case "error": this.onError(new Error(evt.message)); break;
    }
  }

  #atPlayhead(fn) { this.#later(fn, Math.max(0, (this.playhead - this.ctx.currentTime) * 1000)); }

  #later(fn, delayMs) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, delayMs);
    this.timers.add(id);
  }

  #reserve(seconds) {
    this.playhead = Math.max(this.playhead, this.ctx.currentTime + 0.05);
    const start = this.playhead;
    this.playhead += seconds;
    return start;
  }

  #playPcm(buffer) {
    if (!this.ctx) return;
    const pcm = new Int16Array(buffer);
    const audio = this.ctx.createBuffer(1, pcm.length, this.sampleRate);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;
    const src = this.ctx.createBufferSource();
    src.buffer = audio;
    src.connect(this.ctx.destination);
    src.onended = () => this.sources.delete(src);
    src.start(this.#reserve(audio.duration));
    this.sources.add(src);
  }

  async #scheduleRecitation(url) {
    const audio = new Audio(url);         // <audio> needs no CORS, unlike fetch()
    audio.preload = "auto";
    const duration = await new Promise((resolve) => {
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);
      setTimeout(() => resolve(0), 8000);
    });
    if (!duration || !this.ctx) return;   // unreachable recitation: skip it, keep narrating
    const start = this.#reserve(0.3 + duration + 0.4) + 0.3;
    this.recitations.add(audio);
    audio.onended = () => this.recitations.delete(audio);
    this.#later(() => audio.play().catch((e) => console.warn("recitation failed", e)), (start - this.ctx.currentTime) * 1000);
  }
}

/**
 * Plays PRE-GENERATED narration (tts/scripts/pregenerate.py) - no TTS server or GPU needed.
 * Same callbacks as SeeraNarrator. At each Quran marker it pauses the narration,
 * plays the human recitation(s), then continues.
 */
export class StaticNarrator {
  constructor(base, { onSegment = () => {}, onQuran = () => {}, onDone = () => {}, onError = console.error } = {}) {
    Object.assign(this, { base, onSegment, onQuran, onDone, onError });
    this.audio = null;
    this.items = null;     // timeline, loaded in parallel with the audio
    this.next = 0;         // next timeline item to announce
    this.reciting = false;
    this.stopped = false;
    this.timer = null;
    this.cancelRecitation = null;
  }

  async speak(stem) {
    const audio = new Audio(`${this.base}/${stem}.mp3`);
    this.audio = audio;
    audio.onended = () => { if (!this.stopped && !this.reciting) this.#finish(); };
    audio.onerror = () => { if (!this.stopped) this.onError(new Error(`Cannot load ${stem}.mp3`)); };
    const playing = audio.play();   // start inside the click, before any await (browser autoplay rules)
    const timeline = fetch(`${this.base}/${stem}.json`).then((r) => {
      if (!r.ok) throw new Error(`Cannot load ${stem}.json`);
      return r.json();
    });
    const [tl] = await Promise.all([timeline, playing]);
    if (this.stopped) return;
    this.items = tl.items;
    this.timer = setInterval(() => this.#tick(), 50);
    this.#tick();
  }

  stop() {
    this.stopped = true;
    clearInterval(this.timer);
    this.cancelRecitation?.();
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute("src"); this.audio.load(); }
  }

  #tick() {
    if (this.stopped || this.reciting || !this.items) return;
    const t = this.audio.currentTime;
    while (this.next < this.items.length) {
      const it = this.items[this.next];
      if ((it.kind === "speech" ? it.start : it.at) > t) break;
      const index = this.next++;
      if (it.kind === "speech") { this.onSegment(index, it.text); continue; }
      this.onQuran(index, it.text);
      if (it.audio_urls?.length) { this.#recite(it.audio_urls); break; }
    }
  }

  async #recite(urls) {
    this.reciting = true;
    this.audio.pause();
    for (const url of urls) {
      if (this.stopped) return;
      await this.#playOne(url);
    }
    if (this.stopped) return;
    this.reciting = false;
    if (this.audio.ended) this.#finish();
    else this.audio.play().catch((e) => this.onError(e));
  }

  /** Resolves when the recitation ends, fails, stalls, or narration is stopped - never hangs. */
  #playOne(url) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      let guard = setTimeout(done, 10000);            // never loaded (offline?): skip it
      function done() { clearTimeout(guard); a.pause(); resolve(); }
      a.onloadedmetadata = () => { clearTimeout(guard); guard = setTimeout(done, (a.duration + 5) * 1000); };
      a.onended = done;
      a.onerror = done;
      this.cancelRecitation = done;
      a.play().catch(done);
    });
  }

  #finish() {
    clearInterval(this.timer);
    this.onDone();
  }
}
