import { useEffect, useRef, useState } from "react";
import Daal from "./Daal.jsx";
import { postChat } from "./api.js";

const DEF = {
  event: ["لخّص لي هذا الحدث", "لماذا حدث هذا؟", "ما الدرس المستفاد منه؟", "من الأشخاص المذكورون هنا؟"],
  chapter: ["لخّص لي هذا الفصل", "ما أهم حدث في هذا الفصل؟", "ما أهم دروس هذا الفصل؟"],
  home: ["من أين أبدأ الرحلة؟", "كيف أستفيد من دَرْب السيرة؟", "عرّفني بنفسك يا دَالّ", "ما الفصول المتاحة؟"],
};

/** ctx = { mode: 'home' | 'chapter' | 'event', chapter_id?, event_id?, title? } */
export default function ChatSheet({ ctx, onClose }) {
  const [msgs, setMsgs] = useState([]), [val, setVal] = useState(""), [busy, setBusy] = useState(false);
  const box = useRef(null);
  useEffect(() => { setMsgs([]); setVal(""); }, [ctx]);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);
  useEffect(() => { const f = (e) => e.key === "Escape" && onClose(); addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [onClose]);

  const send = async (text) => {
    const q = (text ?? val).trim(); if (!q || busy) return;
    setVal(""); setBusy(true);
    const history = msgs.filter((m) => !m.pending).slice(-6).map((m) => ({ role: m.role, content: m.text }));
    setMsgs((o) => [...o, { role: "user", text: q }, { role: "assistant", text: "دَالّ يفكّر...", pending: true }]);
    try {
      const r = await postChat({ mode: ctx.mode, chapter_id: ctx.chapter_id ?? null, event_id: ctx.event_id ?? null, message: q.slice(0, 500), history });
      setMsgs((o) => [...o.slice(0, -1), { role: "assistant", text: r.reply }]);
    } catch {
      setMsgs((o) => [...o.slice(0, -1), { role: "assistant", text: "تعذّر الرد الآن. حاول مرة أخرى بعد قليل." }]);
    }
    setBusy(false);
  };

  const sub = ctx.mode === "home" ? "اسألني عن الدرب أو عن السيرة" : `اسألني عن: ${ctx.title || ""}`;
  return (
    <>
      <div id="shade" className="on" onClick={onClose} />
      <div id="sheet" className="on"><div className="sh">
        <div className="sh-h"><Daal width={50} think={busy} /><div className="nm">دَالّ<small>{sub}</small></div><button className="x" aria-label="إغلاق" onClick={onClose}>&times;</button></div>
        <div className="msgs" ref={box}>
          {!msgs.length && <div className="lead">اختر سؤالاً من الاقتراحات، أو اكتب سؤالك بنفسك.</div>}
          {msgs.map((m, i) => <div key={i} className={`m ${m.role === "user" ? "u" : "a"}`}>{m.text}</div>)}
        </div>
        <div className="chips">{DEF[ctx.mode].map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>
        <div className="ask"><input value={val} placeholder="اكتب سؤالك هنا" maxLength={500} autoComplete="off" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="btn" disabled={busy} onClick={() => send()}>إرسال</button></div>
      </div></div>
    </>
  );
}
