// دَالّ — the guide character (SVG from character.html). Eyes follow the pointer, periodic blink.
export const daalSVG = (u) => `<svg viewBox="205 110 620 800" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="دَالّ"><defs>
    <path id="dome-${u}" d="M238 440 C225 330 280 250 360 190 C420 150 480 130 540 132 C640 135 740 190 780 300 C805 360 800 420 785 470 C760 420 715 372 645 352 C580 340 440 338 380 358 C330 378 298 425 285 470 C262 482 244 462 238 440 Z"/>
    <path id="chin-${u}" d="M765 510 C790 560 790 640 775 700 C740 830 640 885 520 885 C400 880 300 800 270 710 C262 680 265 640 240 610 C222 590 225 560 262 520 C300 500 305 540 312 580 C320 690 410 735 512 735 C640 735 715 650 722 560 C725 520 742 480 765 510 Z"/>
    <clipPath id="dc-${u}"><use href="#dome-${u}"/></clipPath>
    <clipPath id="cc-${u}"><use href="#chin-${u}"/></clipPath>
    <clipPath id="fc-${u}"><path d="M340 362 C390 322 450 318 512 318 C580 318 640 326 686 366 C695 400 690 450 695 480 C700 520 722 560 716 600 C700 690 610 730 512 730 C410 730 320 690 308 600 C302 560 328 520 332 480 C336 440 330 400 340 362 Z"/></clipPath>
  </defs>
  <ellipse cx="515" cy="893" rx="190" ry="13" fill="rgba(0,0,0,.2)"/>
  <g class="float">
    <path d="M238 440 C225 330 280 250 360 190 C420 150 480 130 540 132 C640 135 740 190 780 300 C805 360 800 420 785 470 L765 510 C790 560 790 640 775 700 C740 830 640 885 520 885 C400 880 300 800 270 710 C262 680 265 640 240 610 C222 590 225 560 262 520 L250 480 Z" fill="#ffffff" stroke="#151a2e" stroke-width="9" stroke-linejoin="round"/>
    <g class="face">
      <path d="M340 362 C390 322 450 318 512 318 C580 318 640 326 686 366 C695 400 690 450 695 480 C700 520 722 560 716 600 C700 690 610 730 512 730 C410 730 320 690 308 600 C302 560 328 520 332 480 C336 440 330 400 340 362 Z" fill="#D4935F" stroke="#151a2e" stroke-width="8" stroke-linejoin="round"/>
      <g clip-path="url(#fc-${u})"><path d="M280 640 C400 700 620 700 760 600 L760 760 L280 760 Z" fill="#B97A4B" opacity="0.6"/></g>
      <g class="eyes"><rect class="eye" x="423" y="410" width="42" height="110" rx="21" fill="#0b0b0b"/><rect class="eye" x="559" y="410" width="42" height="110" rx="21" fill="#0b0b0b"/></g>
    </g>
    <use href="#dome-${u}" fill="#ffffff" stroke="#151a2e" stroke-width="8" stroke-linejoin="round"/>
    <g clip-path="url(#dc-${u})" fill="none" stroke-linecap="round">
      <path d="M255 410 C300 280 560 190 780 340" stroke="#151a2e" stroke-width="6"/>
      <path d="M262 452 C330 335 560 275 790 452" stroke="#151a2e" stroke-width="6"/>
      <path d="M300 430 C420 335 620 325 745 425" stroke="#9aa5b5" stroke-width="5"/>
      <path d="M330 300 C420 240 600 215 740 270" stroke="#9aa5b5" stroke-width="5"/>
    </g>
    <use href="#chin-${u}" fill="#ffffff" stroke="#151a2e" stroke-width="8" stroke-linejoin="round"/>
    <g clip-path="url(#cc-${u})" fill="none" stroke-linecap="round">
      <path d="M300 690 C380 800 540 830 700 760" stroke="#151a2e" stroke-width="6"/>
      <path d="M280 620 C340 760 480 800 640 770 C720 750 760 650 768 560" stroke="#9aa5b5" stroke-width="5"/>
      <path d="M255 590 C280 650 310 700 360 740" stroke="#9aa5b5" stroke-width="5"/>
      <path d="M742 540 C752 640 705 740 610 792" stroke="#9aa5b5" stroke-width="5"/>
    </g>
  </g></svg>`;

const MAXX = 24, MAXY = 14, cl = (v) => Math.max(-1, Math.min(1, v));
let ptr = null, tick = false, installed = false;

export function lookAll() {
  document.querySelectorAll(".daal").forEach((el) => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    if (!ptr) { ["--ex", "--ey", "--fx", "--fy"].forEach((p) => el.style.setProperty(p, 0)); return; }
    const dx = cl((ptr.x - (r.left + r.width / 2)) / (innerWidth / 2)), dy = cl((ptr.y - (r.top + r.height / 2)) / (innerHeight / 2));
    el.style.setProperty("--ex", dx * MAXX); el.style.setProperty("--ey", dy * MAXY);
    el.style.setProperty("--fx", dx * 4); el.style.setProperty("--fy", dy * 3);
  });
}
export function blinkAll() {
  document.querySelectorAll(".daal").forEach((el) => { el.classList.remove("blink"); void el.offsetWidth; el.classList.add("blink"); });
}
export function installDaalBehavior() {
  if (installed) return; installed = true;
  addEventListener("pointermove", (e) => { ptr = { x: e.clientX, y: e.clientY }; if (tick) return; tick = true; requestAnimationFrame(() => { lookAll(); tick = false; }); }, { passive: true });
  document.addEventListener("pointerleave", () => { ptr = null; lookAll(); });
  document.addEventListener("click", (e) => { if (e.target.closest(".daal")) blinkAll(); });
  setInterval(blinkAll, 4800);
}
