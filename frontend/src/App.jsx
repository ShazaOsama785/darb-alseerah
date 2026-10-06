import { useCallback, useEffect, useRef, useState } from "react";
import Sky from "./Sky.jsx";
import Home from "./Home.jsx";
import Reader from "./Reader.jsx";
import ChatSheet from "./ChatSheet.jsx";
import { Flame } from "./icons.jsx";
import logo from "./assets/logo.png";
import { getChapters } from "./api.js";
import { installDaalBehavior } from "./daal.js";
import { useStore } from "./store.js";

const ar = (n) => Number(n).toLocaleString("ar-EG");

export default function App() {
  const store = useStore();
  const { S, effStreak } = store;
  const [chapters, setChapters] = useState([]), [loadErr, setLoadErr] = useState(false);
  const [open, setOpen] = useState(null);   // { id, resume }
  const [chat, setChat] = useState(null);   // chat context
  const skyApi = useRef(null);

  useEffect(() => { installDaalBehavior(); getChapters().then(setChapters).catch(() => setLoadErr(true)); }, []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", S.pref.theme); document.documentElement.style.setProperty("--fz", S.pref.fz); }, [S.pref]);
  useEffect(() => { document.body.classList.toggle("reading", !!open); document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  const close = useCallback(() => setOpen(null), []);
  const closeChat = useCallback(() => setChat(null), []);
  const on = S.last === new Date().toLocaleDateString("en-CA");

  return (
    <>
      <Sky apiRef={skyApi} />
      <header id="bar">
        <div className="brand"><img src={logo} alt="دَرْب السيرة" /></div>
        <div className="chip"><Flame off={!on} /><span>{ar(effStreak)}</span><small>{effStreak === 1 ? "يوم" : "أيام"} متتالية</small></div>
      </header>
      <Home chapters={chapters} loadErr={loadErr} store={store} active={!open} skyApi={skyApi}
        onOpen={(id, resume) => setOpen({ id, resume })} onAsk={() => setChat({ mode: "home" })} />
      {open && <Reader key={open.id} chId={open.id} resume={open.resume} chapters={chapters} store={store} skyApi={skyApi} chatOpen={!!chat}
        onClose={close} onOpenChapter={(id) => setOpen({ id, resume: false })} onAsk={setChat} />}
      {chat && <ChatSheet ctx={chat} onClose={closeChat} />}
    </>
  );
}
