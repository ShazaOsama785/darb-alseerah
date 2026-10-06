import { useEffect, useMemo, useRef, useState } from "react";
import Daal from "./Daal.jsx";
import { Check, ChevL, ChevR, Flame, HomeIc } from "./icons.jsx";
import { getChapter, postCheck } from "./api.js";
import ListenBar from "./ListenBar.jsx";
import { canListen, useNarration } from "./useNarration.js";

const ar = (n) => Number(n).toLocaleString("ar-EG");
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const paras = (t) => String(t || "").split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>);
const LEVELS = { good: { t: "ممتاز", c: "hi" }, partial: { t: "جيد", c: "mid" }, needs_review: { t: "يحتاج مراجعة", c: "lo" } };
const THEMES = { light: "فاتح", sepia: "سيبيا", dark: "داكن" };
const MAX_DETAILS = 5500;   // نفس حد الباك: أطول من كده الـcheck بيتخفي

function Tools({ pref, setPref }) {
  return (
    <div className="tools">
      <span className="themes">{Object.keys(THEMES).map((t) => <button key={t} className={`tdot ${t} ${pref.theme === t ? "on" : ""}`} title={THEMES[t]} aria-label={`مظهر ${THEMES[t]}`} onClick={() => setPref({ theme: t })} />)}</span>
      <button className="fzb" aria-label="تصغير الخط" onClick={() => setPref({ fz: Math.max(0.8, +(pref.fz - 0.1).toFixed(2)) })}>أ−</button>
      <button className="fzb" aria-label="تكبير الخط" onClick={() => setPref({ fz: Math.min(1.6, +(pref.fz + 0.1).toFixed(2)) })}>أ+</button>
    </div>
  );
}

/* ---- understanding check: the learner writes a summary, the backend (/api/check) evaluates it ---- */
function CheckBox({ ev, chId, store, onBack, onPrev, onNext, hasPrev }) {
  const [ans, setAns] = useState(""), [st, setSt] = useState("idle"), [res, setRes] = useState(null);
  const saved = store.S.check[ev.id];
  const submit = async () => {
    setSt("loading");
    try {
      const d = await postCheck(ev.id, ans);
      setRes(d); setSt("result"); store.saveCheck(ev.id, d.understanding_level); store.touch();
      if (d.understanding_level !== "needs_review") store.markEvent(chId, ev.id);
    } catch { setSt("error"); }
  };
  const lv = res && LEVELS[res.understanding_level];
  const li = (a) => (a && a.length ? <ul>{a.slice(0, 4).map((x, i) => <li key={i}>{x}</li>)}</ul> : null);
  return (
    <>
      <article className="rcard">
        <span className="tag">اختبر فهم هذا الحدث</span><h2>{ev.title}</h2><hr />
        {st !== "result" && <>
          <p>لخّص بكلماتك أهم ما فهمته من هذا الحدث، ثم اضغط «تحقق من فهمي».</p>
          {saved && <div className="meta"><span>آخر نتيجة: {LEVELS[saved.level]?.t}</span></div>}
          <textarea className="sum" value={ans} maxLength={600} placeholder="اكتب ملخصك هنا" onChange={(e) => setAns(e.target.value)} />
          <button className="btn coral" disabled={ans.trim().length < 10 || st === "loading"} onClick={submit}>{st === "loading" ? "جارٍ التحقق…" : "تحقق من فهمي"}</button>
          {st === "error" && <div className="res"><p>تعذّر التحقق من إجابتك الآن. يمكنك المحاولة مرة أخرى أو متابعة الرحلة.</p></div>}
        </>}
        {st === "result" && <div className="res">
          <span className={`score ${lv.c}`}>{lv.t}</span>
          <p>{res.feedback}</p>
          {res.understood.length > 0 && <><h4>ما أصبت فيه</h4>{li(res.understood)}</>}
          {res.missing.length > 0 && <><h4>ما يمكن إضافته</h4>{li(res.missing)}</>}
          {res.misunderstood.length > 0 && <><h4>يحتاج تصحيحاً</h4>{li(res.misunderstood)}</>}
          {res.review_snippets.length > 0 && <><h4>مقتطفات للمراجعة من نص الحدث</h4>{res.review_snippets.map((t, i) => <blockquote key={i}>{t}</blockquote>)}</>}
          <div className="evnav"><button className="btn ghost" onClick={() => { setSt("idle"); setRes(null); setAns(""); }}>أعد المحاولة</button><button className="btn" onClick={onNext}><span>متابعة</span><ChevL /></button></div>
        </div>}
      </article>
      <div className="evnav"><button className="btn ghost" onClick={onBack}>العودة إلى الحدث</button>{hasPrev && <button className="btn ghost" onClick={onPrev}><ChevR /><span>الحدث السابق</span></button>}</div>
    </>
  );
}

export default function Reader({ chId, resume, chapters, store, skyApi, chatOpen, onClose, onOpenChapter, onAsk }) {
  const { S, evDone, effStreak, setPref } = store;
  const root = useRef(null);
  const [ch, setCh] = useState(null), [err, setErr] = useState(false);
  const [view, setView] = useState("event"), [ei, setEi] = useState(0), [cq, setCq] = useState(null);
  const [jump, setJump] = useState(false), [orig, setOrig] = useState(false);
  const chIndex = chapters.findIndex((c) => c.id === chId), nextCh = chapters[chIndex + 1];
  const narration = useNarration();

  useEffect(() => {
    let alive = true; setCh(null); setErr(false); setView("event"); setCq(null); setJump(false);
    getChapter(chId).then((d) => {
      if (!alive) return; setCh(d);
      const all = d.sections.flatMap((s) => s.events); let i = 0;
      if (resume) { const k = all.findIndex((e) => !evDone(chId, e.id)); i = k < 0 ? 0 : k; }
      setEi(i);
    }).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [chId]); // eslint-disable-line

  const all = useMemo(() => (ch ? ch.sections.flatMap((s) => s.events.map((e) => ({ ...e, _sec: s.title }))) : []), [ch]);
  const ev = all[ei], lessons = ch?.lessons || [], quiz = ch?.quiz || [];
  const hasL = lessons.length > 0, hasQ = quiz.length > 0;
  const canCheck = !!ev && typeof ev.details === "string" && ev.details.length <= MAX_DETAILS;

  useEffect(() => { if (ch) store.touch(); }, [ch, ei, view]); // eslint-disable-line
  useEffect(() => { setOrig(false); setJump(false); }, [ei, view]);
  useEffect(() => { narration.stop(); }, [chId, ei, view, orig]); // eslint-disable-line -- moving away silences the narration
  useEffect(() => { if (root.current) root.current.scrollTop = 0; }, [ei, view, ch]);
  useEffect(() => { if (ch && chIndex >= 0) skyApi.current?.setTarget((chIndex + ei / Math.max(all.length, 1)) / chapters.length); }, [ch, ei, chIndex, all.length, chapters.length, skyApi]);
  useEffect(() => { const f = (e) => e.key === "Escape" && !chatOpen && onClose(); addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [onClose, chatOpen]);

  // «أين نحن الآن على الخريطة»: موقع الحدث الحالي من الداتا، وإلا آخر موقع معروف قبله في الفصل، وإلا أقرب موقع بعده
  const loc = useMemo(() => {
    if (!all.length) return null;
    for (let k = ei; k >= 0; k--) if (all[k].geo) return { ...all[k].geo, kind: k === ei ? "exact" : "prev" };
    for (let k = ei + 1; k < all.length; k++) if (all[k].geo) return { ...all[k].geo, kind: "next" };
    return null;
  }, [all, ei]);
  const mapUrl = loc ? `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}` : null;

  const done = ch ? (S.ch[chId] ? 100 : Math.round((all.filter((e) => evDone(chId, e.id)).length / Math.max(all.length, 1)) * 100)) : 0;
  const chatCtx = () => (ch && ev && (view === "event" || view === "check")) ? { mode: "event", chapter_id: chId, event_id: ev.id, title: ev.title } : { mode: "chapter", chapter_id: chId, title: ch?.title };

  const complete = () => { store.markChapter(chId); setView("done"); };
  const startQuiz = (fresh) => {
    if (!cq || fresh) setCq({ k: 0, score: 0, ans: [], fin: false, qs: quiz.map((x) => ({ ...x, o: shuffle(x.options.map((t, i) => ({ t, ok: i === x.answer }))) })) });
    setView("cquiz");
  };
  const finishEvents = () => { if (hasL) setView("lessons"); else if (hasQ) startQuiz(true); else complete(); };
  const next = () => { store.markEvent(chId, ev.id); if (ei < all.length - 1) { setEi(ei + 1); setView("event"); } else finishEvents(); };
  const prev = () => { if (ei > 0) { setEi(ei - 1); setView("event"); } };
  const toEvent = (i = ei) => { setEi(i); setView("event"); };
  const evIndex = (id) => all.findIndex((e) => e.id === id);
  const PrevBtn = () => (ei > 0 ? <button className="btn ghost" onClick={prev}><ChevR /><span>الحدث السابق</span></button> : null);
  const BackBtn = () => <button className="btn ghost" onClick={() => toEvent()}>العودة إلى الحدث</button>;

  let body = null;
  if (err) body = <div className="rcard"><h2>تعذّر تحميل الفصل</h2><p>تأكد من تشغيل الباك ثم أعد المحاولة.</p></div>;
  else if (!ch || !ev) body = <div className="rcard"><p>جارٍ التحميل…</p></div>;
  else if (view === "event") {
    const chips = [
      ev.hijri_year && `${ev.hijri_year}${ev.month ? " · " + ev.month : ""}`,
      ev.gregorian_year && `${ev.gregorian_approx ? "نحو " : ""}${ev.gregorian_year} م`,
      ev.nubuwwa_year && `سنة ${ev.nubuwwa_year} من النبوة`,
      ev.place && `المكان: ${ev.place}`,
    ].filter(Boolean);
    const showStory = !!ev.story && !orig;
    const stem = showStory ? (ev.story_audio ? `${ev.id}.story` : null) : (ev.audio ? String(ev.id) : null);   // pre-generated narration
    body = <>
      {ei === 0 && ch.intro && <div className="intro"><span className="tag">بداية الفصل</span>{paras(ch.intro)}</div>}
      <article className="rcard">
        <div className="evtop"><button className="idx" onClick={() => setJump(!jump)}><span>الحدث {ar(ei + 1)} من {ar(all.length)}</span><ChevL /></button></div>
        {jump && <div className="jl">{all.map((x, k) => <button key={x.id} className={k === ei ? "cur" : ""} onClick={() => toEvent(k)}><span className="n">{evDone(chId, x.id) ? <Check /> : ar(k + 1)}</span>{x.title}</button>)}</div>}
        {ev._sec && ev._sec !== ev.title && <span className="tag">{ev._sec}</span>}
        <h2>{ev.title}</h2>
        {(chips.length > 0 || ev.date_needs_review) && <div className="meta">{chips.map((c) => <span key={c}>{c}</span>)}{ev.date_needs_review && <span>التاريخ تقريبي</span>}</div>}
        {ev.story && <div className="seg"><button className={!orig ? "on" : ""} onClick={() => setOrig(false)}>الصياغة القصصية</button><button className={orig ? "on" : ""} onClick={() => setOrig(true)}>النص الأصلي</button></div>}
        {canListen(stem) && <ListenBar narration={narration} stem={stem} text={`${ev.title}.\n${showStory ? ev.story : ev.details}`} />}
        <hr />{paras(ev.story && !orig ? ev.story : ev.details)}
        {(ev.lesson || ev.page) && <div className="ibra">{ev.lesson && <div><b>العبرة:</b> {ev.lesson}</div>}{ev.page && <div className="pg">الرحيق المختوم، ص {ev.page}</div>}</div>}
      </article>
      <div className="evnav"><PrevBtn />{canCheck && <button className="btn coral" onClick={() => setView("check")}>اختبر فهم هذا الحدث</button>}
        <button className="btn" onClick={next}><span>{ei < all.length - 1 ? "الحدث التالي" : "إنهاء الأحداث"}</span><ChevL /></button></div>
    </>;
  } else if (view === "check") {
    body = <CheckBox key={ev.id} ev={ev} chId={chId} store={store} hasPrev={ei > 0} onBack={() => toEvent()} onPrev={prev}
      onNext={() => { if (ei < all.length - 1) { setEi(ei + 1); setView("event"); } else finishEvents(); }} />;
  } else if (view === "lessons") {
    body = <>
      {ch.conclusion && <div className="intro"><span className="tag">خاتمة الفصل</span>{paras(ch.conclusion)}</div>}
      {lessons.map((l, i) => { const k = l.event_id ? evIndex(l.event_id) : -1;
        return <div className="lcard" key={i}><h3>{ar(i + 1)}. {l.title}</h3><p>{l.text}</p>{k >= 0 && <button className="rel" onClick={() => toEvent(k)}>الحدث المرتبط: {all[k].title}</button>}</div>; })}
      <div className="evnav"><BackBtn /><PrevBtn />{hasQ && <button className="btn coral" onClick={() => startQuiz(false)}>اختبار الفصل</button>}<button className="btn" onClick={complete}>إنهاء الفصل</button></div>
    </>;
  } else if (view === "cquiz" && cq) {
    const n = cq.qs.length, nav = <div className="evnav"><BackBtn /><PrevBtn /></div>;
    if (cq.fin) body = <>
      <div className="cqbox" style={{ textAlign: "center" }}><span className="tag" style={{ color: "var(--coral)", fontWeight: 700, fontSize: 13 }}>نتيجة اختبار الفصل</span>
        <h2 style={{ fontSize: 36, margin: "6px 0" }}>{ar(cq.score)} من {ar(n)}</h2><p style={{ color: "var(--muted)" }}>{cq.score === n ? "ممتاز، فهمت الفصل جيداً." : "يمكنك مراجعة الأحداث ثم إعادة الاختبار."}</p>
        <div className="evnav" style={{ justifyContent: "center" }}><button className="btn ghost" onClick={() => startQuiz(true)}>أعد الاختبار</button><button className="btn" onClick={complete}>إنهاء الفصل</button></div></div>{nav}</>;
    else {
      const q = cq.qs[cq.k], a = cq.ans[cq.k], answered = a !== undefined, k = q.event_id ? evIndex(q.event_id) : -1;
      const pick = (j) => setCq((o) => { const ans = o.ans.slice(); ans[o.k] = j; return { ...o, ans, score: o.score + (o.qs[o.k].o[j].ok ? 1 : 0) }; });
      body = <>
        <div className="cqbox"><div className="dots">{cq.qs.map((_, j) => <i key={j} className={j <= cq.k ? "on" : ""} />)}</div>
          <div className="qn" style={{ textAlign: "center" }}>سؤال {ar(cq.k + 1)} من {ar(n)}</div><div className="qq">{q.q}</div>
          <div className="opts">{q.o.map((o, j) => <button key={j} className={`opt ${answered ? (o.ok ? "ok" : j === a ? "bad" : "") : ""}`} onClick={() => !answered && pick(j)}>{o.t}</button>)}</div>
          {answered && <div className="fb"><b style={{ color: q.o[a].ok ? "#2e9b62" : "#d65a4a" }}>{q.o[a].ok ? "إجابة صحيحة." : "ليست هذه."}</b> {q.explanation}</div>}
          {answered && k >= 0 && <button className="rel" onClick={() => toEvent(k)}>الحدث المرتبط: {all[k].title}</button>}
          <div className="evnav"><button className="btn ghost" onClick={complete}>تخطي الاختبار</button>
            {answered && <button className="btn" onClick={() => setCq((o) => (o.k < n - 1 ? { ...o, k: o.k + 1 } : { ...o, fin: true }))}>{cq.k < n - 1 ? "السؤال التالي" : "عرض النتيجة"}</button>}</div></div>{nav}</>;
    }
  } else if (view === "done") {
    body = <div className="donebox"><Daal width={120} style={{ margin: "0 auto" }} /><h2>أحسنت، أتممت الفصل</h2>
      <p>أنهيت «{ch.title}». {nextCh ? "جاهز للفصل التالي؟" : "وهذا آخر فصل في الدرب."}</p>
      <div className="evnav">{nextCh && <button className="btn coral" onClick={() => onOpenChapter(nextCh.id)}>الفصل التالي</button>}<button className={`btn ${nextCh ? "ghost" : ""}`} onClick={onClose}>قائمة الفصول</button></div></div>;
  }

  return (
    <section id="reader" className="on" ref={root}>
      <div className="rwrap">
        <div className="rtop"><button className="back" onClick={onClose}><span>الرئيسية</span><HomeIc /></button><Tools pref={S.pref} setPref={setPref} />
          <div className="chip" style={{ fontSize: 13 }}><Flame off={S.last !== new Date().toLocaleDateString("en-CA")} /><span>{ar(effStreak)}</span></div></div>
        {ch && <div className="strip"><div className="ct">الفصل {ar(chIndex + 1)} من {ar(chapters.length)}<b>{ch.title}</b></div>
          <div className="pbar"><i style={{ width: done + "%" }} /></div>
          {(hasL || hasQ || mapUrl) && <div className="cbtns">{hasL && <button className={`cb ${view === "lessons" ? "on" : ""}`} onClick={() => setView("lessons")}>دروس وعبر من الفصل</button>}{hasQ && <button className={`cb ${view === "cquiz" ? "on" : ""}`} onClick={() => startQuiz(false)}>اختبار الفصل كاملًا</button>}
            {mapUrl && <a className="cb" href={mapUrl} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>أين نحن الآن على الخريطة</a>}</div>}
          {loc && <div className="loc">{{ exact: "موقع هذا الحدث", prev: "آخر موقع معروف", next: "أقرب موقع في الفصل" }[loc.kind]}: {loc.name}</div>}</div>}
        {body}
      </div>
      <button className="floatd on low" aria-label="اسأل دَالّ" onClick={() => onAsk(chatCtx())}><span className="tip">اسأل دَالّ</span><Daal width={92} /></button>
    </section>
  );
}
