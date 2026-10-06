import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Daal from "./Daal.jsx";
import { Check } from "./icons.jsx";

const ROW = 124;
const ar = (n) => Number(n).toLocaleString("ar-EG");
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export default function Home({ chapters, loadErr, store, active, skyApi, onOpen, onAsk }) {
  const { S, doneCount } = store;
  const wrap = useRef(null);
  const [W, setW] = useState(520);

  useLayoutEffect(() => {
    const f = () => setW(Math.min((wrap.current?.clientWidth || 580) - 32, 548));
    f(); addEventListener("resize", f); return () => removeEventListener("resize", f);
  }, []);
  // scrolling the road drives the sky: day -> sunset -> desert night
  useEffect(() => {
    if (!active) return;
    const f = () => { const m = document.documentElement.scrollHeight - innerHeight; skyApi.current?.setTarget(m > 0 ? scrollY / m : 0); };
    f(); addEventListener("scroll", f, { passive: true }); return () => removeEventListener("scroll", f);
  }, [active, skyApi, chapters.length]);

  const N = chapters.length;
  const full = (c) => !!S.ch[c.id] || doneCount(c.id) >= c.n_events;
  const cur = chapters.findIndex((c) => !full(c));
  const started = Object.keys(S.done).length > 0 || Object.keys(S.ch).length > 0;
  const finished = chapters.filter(full).length;

  let bubble = "أهلاً بك. أنا دَالّ، دليلك في هذا الدرب. هيا نبدأ من الفصل الأول.", cta = "ابدأ الرحلة";
  if (started && cur === -1) { bubble = "أتممت الدرب كله. يمكنك العودة إلى أي فصل متى شئت."; cta = "راجع من البداية"; }
  else if (started) { bubble = `أهلاً بعودتك. وصلنا إلى الفصل ${ar(cur + 1)}: ${chapters[cur].title}.`; cta = "أكمل من حيث توقفت"; }

  const amp = Math.min(W * 0.27, 120), H = N * ROW + 150;
  const pts = chapters.map((_, i) => ({ x: W / 2 + Math.sin(i * 0.95 + 0.4) * amp, y: 60 + i * ROW }));
  const seg = (a, b) => `C ${a.x} ${a.y + ROW * 0.55}, ${b.x} ${b.y - ROW * 0.55}, ${b.x} ${b.y}`;
  const path = (upto) => pts.length ? pts.slice(1, upto + 1).reduce((d, p, i) => d + " " + seg(pts[i], p), `M ${pts[0].x} ${pts[0].y}`) : "";
  let lastFull = -1; chapters.forEach((c, i) => { if (full(c)) lastFull = i; });

  return (
    <main id="home" ref={wrap}>
      <section className="hero">
        <h1>دَرْب السيرة</h1>
        <p>رحلة هادئة بين أحداث السيرة النبوية، حدثاً بعد حدث.</p>
        <div className="hero-row">
          <div className="bubble">{loadErr ? "تعذّر تحميل الفصول. تأكد من تشغيل الباك." : bubble}</div>
          <Daal width={170} style={{ cursor: "pointer" }} onClick={onAsk} />
        </div>
        <div className="cta">
          <button className="btn coral" disabled={!N} onClick={() => onOpen(chapters[cur === -1 ? 0 : cur].id, started && cur !== -1)}>{cta}</button>
          <button className="btn ghost" onClick={onAsk}>اسأل دَالّ</button>
        </div>
        <div className="pnote">{N ? `أتممت ${ar(finished)} من ${ar(N)} فصلاً` : ""}</div>
      </section>

      {N > 0 && (
        <section id="road" style={{ width: W, height: H }}>
          <svg className="trail" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <path d={path(N - 1)} fill="none" stroke="rgba(10,18,40,.18)" strokeWidth="22" strokeLinecap="round" transform="translate(0 5)" />
            <path d={path(N - 1)} fill="none" stroke="#F4F1DE" strokeOpacity=".88" strokeWidth="18" strokeLinecap="round" />
            {lastFull >= 0 && <path d={path(Math.min(lastFull + 1, N - 1))} fill="none" stroke="#F2CC8F" strokeWidth="18" strokeLinecap="round" />}
            <path d={path(N - 1)} fill="none" stroke="#1B2A4A" strokeOpacity=".35" strokeWidth="2" strokeDasharray="1 10" strokeLinecap="round" />
          </svg>
          {chapters.map((c, i) => {
            const p = pts[i], dn = S.ch[c.id] ? c.n_events : doneCount(c.id), isFull = full(c), isCur = i === cur;
            const circ = 2 * Math.PI * 35, off = circ * (1 - Math.min(dn, c.n_events) / Math.max(c.n_events, 1));
            return (
              <div key={c.id}>
                <button className={`node ${isFull ? "done" : ""} ${isCur ? "cur" : ""}`} style={{ left: p.x - 33, top: p.y - 33 }} aria-label={c.title} onClick={() => onOpen(c.id, false)}>
                  <svg className="ring" viewBox="0 0 78 78"><circle cx="39" cy="39" r="35" fill="none" stroke="rgba(244,241,222,.55)" strokeWidth="4" />
                    {dn > 0 && !isFull && <circle cx="39" cy="39" r="35" fill="none" stroke="#F2CC8F" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} />}</svg>
                  {isFull ? <Check cls="ck" /> : ar(i + 1)}
                </button>
                <div className="lab" title={c.title} style={{ left: clamp(p.x, 105, W - 105), top: p.y + 40 }}>{c.title}<small>{ar(c.n_events)} حدث</small></div>
              </div>
            );
          })}
          {cur >= 0 && (() => { const p = pts[cur], side = p.x < W / 2 ? 1 : -1; return <Daal className="road-daal" width={70} style={{ left: clamp(p.x + side * 64 - 35, 2, W - 72), top: p.y - 62, position: "absolute" }} />; })()}
          <div className="end-flag" style={{ top: pts[N - 1].y + 92 }}>نهاية الدرب</div>
        </section>
      )}
    </main>
  );
}
