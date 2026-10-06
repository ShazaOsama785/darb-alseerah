import { useCallback, useEffect, useState } from "react";

const KEY = "darb:v1";
const BASE = { done: {}, ch: {}, check: {}, streak: 0, last: null, best: 0, pref: { theme: "light", fz: 1 } };
const dstr = (d) => d.toLocaleDateString("en-CA");
export const today = () => dstr(new Date());
const yest = () => dstr(new Date(Date.now() - 864e5));

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s ? { ...BASE, ...s, pref: { ...BASE.pref, ...(s.pref || {}) } } : BASE; }
  catch { return BASE; }
}

/** Progress, streak, understanding-check results and reading prefs — all kept in localStorage (no login). */
export function useStore() {
  const [S, setS] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }, [S]);

  const touch = useCallback(() => setS((o) => {
    if (o.last === today()) return o;
    const streak = o.last === yest() ? o.streak + 1 : 1;
    return { ...o, streak, last: today(), best: Math.max(o.best || 0, streak) };
  }), []);
  const markEvent = useCallback((chId, evId) => setS((o) => (o.done[`${chId}:${evId}`] ? o : { ...o, done: { ...o.done, [`${chId}:${evId}`]: 1 } })), []);
  const markChapter = useCallback((chId) => setS((o) => (o.ch[chId] ? o : { ...o, ch: { ...o.ch, [chId]: 1 } })), []);
  const saveCheck = useCallback((evId, level) => setS((o) => ({ ...o, check: { ...o.check, [evId]: { level, at: Date.now() } } })), []);
  const setPref = useCallback((p) => setS((o) => ({ ...o, pref: { ...o.pref, ...p } })), []);

  const effStreak = S.last === today() || S.last === yest() ? S.streak : 0;
  const evDone = (chId, evId) => !!S.done[`${chId}:${evId}`];
  const doneCount = (chId) => Object.keys(S.done).filter((k) => k.startsWith(chId + ":")).length;
  return { S, touch, markEvent, markChapter, saveCheck, setPref, effStreak, evDone, doneCount };
}
