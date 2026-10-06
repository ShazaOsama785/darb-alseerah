import { PlayIc, StopIc } from "./icons.jsx";

const LABEL = { idle: "استمع إلى الحدث", connecting: "جارٍ تحضير الصوت…", playing: "إيقاف الاستماع", error: "حاول مرة أخرى" };

/** Listen button + "now reading" line, shown inside the event card. */
export default function ListenBar({ narration, stem, text }) {
  const { state, line, play, stop } = narration;
  const active = state === "connecting" || state === "playing";
  return (
    <div className="listen">
      <button className={`lbtn ${active ? "on" : ""}`} onClick={() => (active ? stop() : play({ stem, text }))} aria-pressed={active}>
        {active ? <StopIc /> : <PlayIc />}<span>{LABEL[state]}</span>
        {state === "playing" && <i className="eq"><b /><b /><b /></i>}
      </button>
      {line && <p className={`now ${line.quran ? "quran" : ""}`}>{line.quran && <small>تلاوة</small>}{line.text}</p>}
      {state === "error" && <p className="now err">تعذّر تشغيل الصوت الآن. حاول مرة أخرى.</p>}
    </div>
  );
}
