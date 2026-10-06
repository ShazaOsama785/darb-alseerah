import { useEffect, useRef } from "react";
import { initSky } from "./sky.js";

export default function Sky({ apiRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const api = initSky(ref.current);
    apiRef.current = api;
    return () => { api.destroy(); apiRef.current = null; };
  }, [apiRef]);
  return (
    <div id="sky" ref={ref} aria-hidden="true">
      <canvas id="cv" />
      <div id="mw" />
      <div id="tw" />
      <div id="hz" />
      <div id="shoot" />
      <div id="sun"><div className="glow" />
        <svg viewBox="-65 -65 130 130"><g stroke="#ffe9a8" strokeWidth="3" strokeLinecap="round" opacity=".8" id="rays" /><circle r="30" fill="#ffe08a" /><circle r="24" fill="#fff1bf" /></svg>
      </div>
      <div id="moon"><svg viewBox="0 0 100 100"><path d="M62 10a42 42 0 1 0 0 80 34 34 0 0 1 0-80z" fill="#F4F1DE" /></svg></div>
      <svg id="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" />
    </div>
  );
}
