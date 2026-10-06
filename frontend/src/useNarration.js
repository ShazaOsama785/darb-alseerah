import { useCallback, useEffect, useRef, useState } from "react";
import { SeeraNarrator, StaticNarrator } from "./narrator.js";

// Pre-generated narration is served by the backend (works offline, no GPU).
const AUDIO_BASE = "/api/audio";
// Optional live TTS server (only for texts without pre-generated audio). Set in frontend/.env.local:
//   VITE_TTS_WS_URL=wss://<tunnel>/ws/tts
const LIVE_URL = import.meta.env.VITE_TTS_WS_URL || "";

/** Can this text be narrated? `stem` = pre-generated file name, or null. */
export const canListen = (stem) => Boolean(stem || LIVE_URL);

/** state: "idle" | "connecting" | "playing" | "error";  line: what is being heard now. */
export function useNarration() {
  const current = useRef(null);
  const [state, setState] = useState("idle");
  const [line, setLine] = useState(null);   // { text, quran }

  const stop = useCallback(() => {
    current.current?.stop();
    current.current = null;
    setState("idle");
    setLine(null);
  }, []);

  /** Pre-generated audio when `stem` is given, otherwise the live server with `text`. */
  const play = useCallback(async ({ stem, text }) => {
    stop();
    const callbacks = {
      onSegment: (_, t) => { if (current.current === n) { setState("playing"); setLine({ text: t, quran: false }); } },
      onQuran: (_, t) => { if (current.current === n) { setState("playing"); setLine({ text: t, quran: true }); } },
      onDone: () => { if (current.current === n) { current.current = null; setState("idle"); setLine(null); } },
      onError: () => fail(n),
    };
    const n = stem ? new StaticNarrator(AUDIO_BASE, callbacks) : new SeeraNarrator(LIVE_URL, callbacks);
    const fail = (x) => { if (current.current === x) { x.stop(); current.current = null; setState("error"); setLine(null); } };
    current.current = n;
    setState("connecting");
    try { await n.speak(stem || text); } catch { fail(n); }
  }, [stop]);

  useEffect(() => stop, [stop]);            // leaving the reader silences everything
  return { state, line, play, stop };
}
