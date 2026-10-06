import { useId, useMemo } from "react";
import { daalSVG } from "./daal.js";

export default function Daal({ width, think = false, onClick, className = "", style }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = useMemo(() => daalSVG("d" + uid), [uid]);
  return (
    <span className={`daal ${think ? "think" : ""} ${className}`} style={{ width, ...style }} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
