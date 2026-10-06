# درب السيرة: Real-time Arabic Narration TTS

A streaming text-to-speech service for the narration mode (وضع السرد). Text goes in, either a full chapter or deltas streamed from the narration LLM, and PCM audio comes out over a WebSocket. Audio starts after the **first sentence**; the service never waits for the whole chapter.

```
Narration LLM ──deltas──▶ SentenceStream ──▶ normalize ──▶ lexicon + diacritizer ──▶ XTTS-v2 (streaming)
                          (emits each          (ﷺ، هـ،        (names/places            │
                           finished sentence)   citations)      pronounced right)       ▼
                                                                        WebSocket: segment events + PCM audio
```

## Project layout

```
seera_tts/
  config.py          all settings, overridable via SEERA_TTS_* env vars
  pipeline.py        orchestrates text → segments → audio events
  server.py          FastAPI: POST /tts, WS /ws/tts, GET /health, /voices
  audio.py           PCM/WAV helpers
  text/              normalizer, sentence streaming, Quran detection, lexicon, diacritizer
  engines/           TTSEngine interface + XTTS-v2 implementation
  data/lexicon.json  pronunciation overrides for names/places
examples/            ws_client.py (latency test), player.js (frontend client)
scripts/kaggle_start.sh
tests/               run on CPU with a fake engine: `pytest`
```

## Run on Kaggle

1. Create a notebook with **Accelerator: GPU T4** and **Internet: ON** (Internet requires a phone-verified account).
2. Upload this folder as a Kaggle Dataset (or `git clone` your repo) and copy it to `/kaggle/working/seera-tts`.
3. Add a narrator voice at `voices/narrator.wav` (see the next section).
4. Run:
   ```
   !bash /kaggle/working/seera-tts/scripts/kaggle_start.sh
   ```
   It installs dependencies, loads and warms up the model, opens a public tunnel, and prints `wss://….trycloudflare.com/ws/tts`.
5. From your laptop: `python examples/ws_client.py wss://….trycloudflare.com/ws/tts`. This prints time-to-first-audio and the real-time factor, and saves `output.wav`.

Kaggle limitations to plan around: sessions stop after about 12 hours or when idle, the weekly GPU quota is limited, and the tunnel URL changes on every restart. That's fine for development and the demo. Keep the URL in an env var on the backend, not hard-coded.

## The storytelling voice

XTTS clones the voice **and the delivery style** of the reference clip, so the clip determines how the narration sounds.

- Record 10–30 seconds of calm, warm فصحى storytelling with clear endings, as if reading a story to students. Use a quiet room, no music, and no echo.
- For a more stable voice, put several clips in `voices/narrator/` (folder form). They're averaged together.
- Add more voices as `voices/<name>.wav` and select them per request with `"voice": "<name>"`.
- **Use a voice you have permission to use**, such as a teammate's. Don't clone a known sheikh or narrator from YouTube.
- Fine-tune pacing with `SEERA_TTS_SPEED` (default 0.95), `SEERA_TTS_SENTENCE_PAUSE_MS` (default 280), and `SEERA_TTS_TEMPERATURE` (default 0.65; lower is steadier).

## Arabic accuracy

1. **Lexicon (`data/lexicon.json`)** has the most impact. It handles names and places that are ambiguous without tashkeel, such as أُحُد vs أَحَد and العَقَبَة vs عُقْبة. Matching handles attached و/ف/ب/ل/ك, and entries are protected from the diacritizer. When you hear a mispronunciation, add an entry. A value can be a diacritized form or a phonetic respelling, whichever the model reads correctly. **Have someone strong in Arabic review this file.**
2. **Diacritizer:** XTTS-v2 was trained mostly on undiacritized Arabic, so full tashkeel may help or hurt. A/B test on your real chapters with `SEERA_TTS_DIACRITIZER=none` vs `mishkal`. If you use `mishkal`, also set `SEERA_TTS_MAX_SEGMENT_CHARS=90`, because the marks count toward XTTS's 166-character limit. Another option is to have the narration LLM write tashkeel on names only.
3. **The normalizer** expands ﷺ, (رض), and "1 هـ" into "1 للهجرة". It strips citations like `[الدرر السنية]` and `(ج2، ص45)`, markdown, and invisible characters.
4. **Quranic text inside ﴿ ﴾ is never machine-voiced.** The server sends a `quran` event instead. The frontend can display the verse or play an authentic recitation. Make sure the narration LLM always wraps verses in ﴿ ﴾.
5. **Compare models:** check the MSA tab of the [Arabic TTS Arena](https://huggingface.co/spaces/Navid-AI/Arabic-TTS-Arena). To try another model, implement `TTSEngine` (three methods) in `engines/` and register it in `build_engine`. Nothing else changes.

## API

**WebSocket `/ws/tts`** is the real-time path.

| Client sends | Meaning |
|---|---|
| `{"type":"speak","text":"…","voice":"narrator"}` | Narrate a full text |
| `{"type":"begin"}` → `{"type":"append","text":"<delta>"}`… → `{"type":"end"}` | Narrate while the LLM is still generating |

| Server sends | Meaning |
|---|---|
| `{"event":"start","sample_rate":24000,"format":"pcm_s16le","channels":1}` | Session started |
| `{"event":"segment","index":i,"text":"…"}` | Next audio belongs to this sentence (for UI highlighting) |
| binary frames | Raw 16-bit mono PCM |
| `{"event":"quran","index":i,"text":"﴿…﴾"}` | Show or play the verse; no TTS |
| `{"event":"done"}` / `{"event":"error","message":"…"}` | End of session |

One connection can run many sessions in sequence.

**`POST /tts`** with `{"text","voice"}` returns a complete WAV, LRU-cached. Use it for "download chapter audio" or as a fallback.

## Integration

**Frontend:** `examples/player.js` plays the stream without gaps and fires `onSegment` in sync with the *audio*, not with the network, so highlighting matches what the user hears. Create it after a user click, because browsers block audio until then.

**Backend:** pipe the narration LLM straight into TTS:

```python
async with websockets.connect(TTS_WS_URL, max_size=None) as tts:
    await tts.send(json.dumps({"type": "begin"}))
    async for delta in narration_llm.stream(chapter):  # your RAG narration mode
        await tts.send(json.dumps({"type": "append", "text": delta}))
    await tts.send(json.dumps({"type": "end"}))
```
Read from `tts` concurrently, in a second task, and forward frames to the user. Alternatively, the frontend can connect to `/ws/tts` directly and send the deltas itself.

## Configuration

Every field in `config.py` can be overridden with an env var, for example `SEERA_TTS_DEFAULT_VOICE`, `SEERA_TTS_STREAM_CHUNK_SIZE` (smaller means faster first audio), `SEERA_TTS_DEVICE`, or `SEERA_TTS_USE_DEEPSPEED=true` (faster on GPU if deepspeed installs).

## Notes

- **License:** XTTS-v2 weights are under the Coqui Public Model License (non-commercial). That's fine for the hackathon; revisit it if the project goes commercial.
- The engine serves one generation at a time per GPU, and concurrent users interleave sentence by sentence. For more users, run more GPU replicas.
- Run the tests with `pip install -r requirements-dev.txt && pytest`. They need no GPU and no model.

## Pre-generating the narration (for the shipped app)

The shipped app has **no TTS server**: every event's narration is generated once, in advance, into
`../data/audio/` (`<event_id>.mp3` + `<event_id>.json` timeline). The frontend plays these files, highlights
each sentence from the timeline, and pauses for the Quran recitations.

**Run it with `notebooks/pregenerate_kaggle.ipynb`** (Kaggle, GPU T4 x2, Internet on): it clones the repo,
installs the model, lets you listen to one chapter, then generates the whole book on both GPUs and zips
`audio.zip` for download. Unzip it into the project's `data/` folder and commit.

Manual use:
```
python scripts/pregenerate.py --data ../data                    # everything (resumable)
python scripts/pregenerate.py --data ../data --chapters ch02    # one chapter
python scripts/pregenerate.py --data ../data --shard 0/2        # half the events (one GPU)
```
Options: `--bitrate 24k` for smaller files; `SEERA_TTS_DEFAULT_VOICE=...` to change the voice.
Without a GPU, `SEERA_TTS_ENGINE=fake SEERA_TTS_FAKE_REALTIME=false` writes tone placeholders (UI testing only - never commit them).
