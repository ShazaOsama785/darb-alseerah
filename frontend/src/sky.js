// Imperative vector sky: day -> golden -> sunset -> dusk -> desert night (stars, Milky Way, crescent moon).
// Mounted once by <Sky/>; the page drives it with setTarget(p) where p in [0,1].
export function initSky(root) {
  const $ = (id) => (id === 'sky' ? root : root.querySelector('#' + id));
/* ============ SKY ============ */
const K=['top','mid','hor','cl','m1','l1','l2','l3','s1','s2','s3','fg','fgs','glow','sil','rg'];
const STOPS=[
 {p:0,   top:[120,174,214],mid:[188,216,232],hor:[246,238,220],cl:[255,250,235],m1:[214,196,170],l1:[236,206,150],l2:[226,188,128],l3:[214,172,110],s1:[196,158,112],s2:[184,142,98],s3:[166,124,86],fg:[208,164,106],fgs:[150,112,76],glow:[255,244,214],sil:[74,52,38],rg:[255,255,245]},
 {p:.32, top:[176,112,62],mid:[214,150,84],hor:[240,186,110],cl:[255,226,170],m1:[206,140,80],l1:[226,150,76],l2:[208,128,62],l3:[190,110,54],s1:[150,84,48],s2:[130,70,44],s3:[108,58,40],fg:[188,106,52],fgs:[96,52,36],glow:[255,214,140],sil:[58,34,22],rg:[255,244,210]},
 {p:.5,  top:[78,60,100],mid:[170,88,92],hor:[250,140,76],cl:[255,190,120],m1:[140,76,88],l1:[236,120,64],l2:[212,100,56],l3:[186,84,52],s1:[128,60,70],s2:[104,50,66],s3:[80,42,62],fg:[170,80,50],fgs:[70,38,50],glow:[255,160,90],sil:[40,24,40],rg:[255,214,160]},
 {p:.72, top:[24,34,76],mid:[72,62,116],hor:[180,98,110],cl:[200,130,140],m1:[60,56,104],l1:[112,72,100],l2:[92,60,94],l3:[76,52,88],s1:[46,40,80],s2:[38,34,72],s3:[30,30,64],fg:[84,56,88],fgs:[32,30,64],glow:[196,110,120],sil:[20,20,48],rg:[220,200,230]},
 {p:1,   top:[5,10,26],mid:[14,24,52],hor:[30,44,84],cl:[150,165,210],m1:[24,34,70],l1:[38,52,96],l2:[30,42,84],l3:[26,36,76],s1:[14,20,46],s2:[11,16,40],s3:[8,13,32],fg:[28,40,78],fgs:[9,14,34],glow:[60,80,140],sil:[4,8,20],rg:[196,210,245]}
];
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mixa=(A,B,t)=>A.map((v,i)=>Math.round(lerp(v,B[i],t)));
const rgb=c=>`rgb(${c[0]},${c[1]},${c[2]})`;
function stopAt(p){
  let a=STOPS[STOPS.length-2], b=STOPS[STOPS.length-1];
  for(let i=0;i<STOPS.length-1;i++){ if(p<=STOPS[i+1].p){ a=STOPS[i]; b=STOPS[i+1]; break; } }
  const t=clamp((p-a.p)/(b.p-a.p)), o={}; K.forEach(k=>o[k]=mixa(a[k],b[k],t)); return o;
}
function rnd(seed){ let s=seed; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }

/* y of the dune-2 ridge at a given x (for placing the caravan) */
function bez(a,b,c,d,t){ const u=1-t; return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d; }
function ridge(x){
  const seg=[[640,600,860,590,1100,620,1300,642]]; const [x0,y0,x1,y1,x2,y2,x3,y3]=seg[0];
  let lo=0,hi=1; for(let i=0;i<30;i++){ const m=(lo+hi)/2; if(bez(x0,x1,x2,x3,m)<x) lo=m; else hi=m; }
  const t=(lo+hi)/2, e=.01; const y=bez(y0,y1,y2,y3,t), y2b=bez(y0,y1,y2,y3,Math.min(1,t+e)), xb=bez(x0,x1,x2,x3,Math.min(1,t+e));
  return {y, ang:Math.atan2(y2b-y,xb-x)*180/Math.PI};
}
function buildScene(){
  const r=rnd(5);
  /* faint high streaks */
  let wp=''; for(let i=0;i<7;i++){ const x=r()*1600|0, y=40+r()*200|0, rx=140+r()*260|0; wp+=`<ellipse class="fcl" cx="${x}" cy="${y}" rx="${rx}" ry="${(2+r()*3).toFixed(1)}" transform="rotate(${(-6-r()*6).toFixed(1)} ${x} ${y})" opacity="${(.12+r()*.12).toFixed(2)}"/>`; }
  /* ripples */
  let rp=''; for(let i=0;i<16;i++){ const y=818+i*5.5; let d=`M${-40+r()*60|0} ${y|0}`; for(let x=0;x<1700;x+=110){ d+=` q 55 ${-(2+r()*4).toFixed(1)} 110 0`; } rp+=`<path class="rp" d="${d}"/>`; }
  /* caravan */
  let car=''; [[868,.66],[952,.62],[1034,.66],[1118,.6]].forEach(([x,sc],i)=>{
    const g=ridge(x); car+=`<use href="#cam" class="sil" transform="translate(${x} ${g.y.toFixed(1)}) rotate(${g.ang.toFixed(1)}) scale(${sc})"/>`;
  });
  const g2=ridge(790);
  const walker=`<g transform="translate(790 ${g2.y.toFixed(1)}) scale(.55)" class="fcl" opacity=".92"><path d="M-14 0 L-9 -60 Q0 -72 9 -60 L14 0Z"/><circle cx="0" cy="-70" r="8"/></g>`;
  const d2='M0 706 C200 650 420 616 640 604 C860 592 1100 622 1300 642 C1420 652 1520 650 1600 642';
  const d3='M0 800 C240 748 520 760 780 800 C1060 842 1360 806 1600 776';
  const ringG=(id,x)=>`<g id="${id}" transform="translate(${x} 300)"><circle r="360" fill="url(#halo)"/><circle r="210" class="rfill"/><circle r="210" class="ring" filter="url(#glow)"/></g>`;
  $('scene').innerHTML=`<defs>
    <radialGradient id="halo"><stop offset="0" class="hs" stop-opacity=".55"/><stop offset="1" class="hs" stop-opacity="0"/></radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
    <g id="cam" fill="currentColor">
      <ellipse cx="46" cy="-46" rx="32" ry="14"/><ellipse cx="44" cy="-62" rx="9" ry="11"/>
      <path d="M70 -52 C84 -58 86 -76 90 -90 L104 -88 C107 -84 100 -80 98 -76 C96 -64 94 -54 82 -44Z"/>
      <path d="M24 -40 L21 0 L26 0 L31 -38Z"/><path d="M36 -38 L36 0 L41 0 L43 -38Z"/><path d="M56 -38 L59 0 L64 0 L62 -38Z"/><path d="M66 -42 L72 0 L77 0 L72 -42Z"/>
      <path d="M16 -52 C6 -48 6 -36 8 -26 L11 -26 C10 -36 12 -44 18 -46Z"/>
      <path d="M36 -66 C36 -90 56 -90 56 -66Z"/><circle cx="46" cy="-95" r="6.5"/>
    </g></defs>
  <g id="wp">${wp}</g>
  <path class="fm2" d="M0 520 C140 470 300 450 420 480 C560 520 700 540 900 560 C1150 585 1400 570 1600 580 V900 H0Z" opacity=".85"/>
  <path class="fl1" d="M0 560 C120 480 250 440 360 456 C520 480 620 560 820 596 C1000 628 1250 640 1600 640 V900 H0Z"/>
  <path class="fs1" d="M0 560 C120 480 250 440 360 456 C400 520 330 600 230 660 C140 700 60 720 0 724Z"/>
  <path class="rim" d="M0 560 C120 480 250 440 360 456 C520 480 620 560 820 596"/>
  <path class="fl2" d="${d2} V900 H0Z"/>
  <path class="fs2" d="M0 706 C200 650 420 616 640 604 C520 660 300 700 0 760Z"/>
  <path class="rim" d="${d2}"/>
  ${car}
  <path class="fl3" d="${d3} V900 H0Z"/>
  <path class="rim" d="${d3}"/>
  <path class="fs3" d="M0 842 C300 812 620 840 920 870 C1220 898 1460 870 1600 848 V900 H0Z"/>
  ${rp}
  <rect x="0" y="700" width="1600" height="200" fill="url(#vg)"/>`;
}
buildScene();

function paintSky(p){
  p=clamp(p); const s=stopAt(p);
  $('sky').style.background=`linear-gradient(180deg,${rgb(s.top)} 0%,${rgb(s.mid)} 46%,${rgb(s.hor)} 80%)`;
  const sc=$('scene'); K.forEach(k=>sc.style.setProperty('--'+k,s[k].join(',')));
  sc.style.setProperty('--m2',mixa(s.m1,s.hor,.5).join(','));
  $('wp').style.opacity=clamp(1-(p-.5)/.3);
  /* classic sun (rays) sinks behind the dunes, crescent moon rises */
  const sp=clamp(p/.64), sun=$('sun'), sx=lerp(18,74,sp), sy=lerp(9,70,Math.pow(sp,1.15));
  sun.style.left=sx+'%'; sun.style.top=sy+'%'; sun.style.opacity=clamp(1-(p-.56)/.12);
  sun.style.filter=`hue-rotate(${-Math.round(clamp(p/.55)*26)}deg) saturate(${1+clamp(p/.55)*.7})`;
  const mp=clamp((p-.6)/.4), moon=$('moon');
  moon.style.top=lerp(86,17,mp)+'%'; moon.style.opacity=clamp((p-.6)/.18);
  const hz=$('hz'); hz.style.left=sx+'%'; hz.style.background=`radial-gradient(ellipse at center,rgba(${s.glow.join(',')},.5) 0%,rgba(${s.glow.join(',')},0) 66%)`; hz.style.opacity=clamp(1-(p-.62)/.2)*.9;
  const so=clamp((p-.46)/.3);
  $('cv').style.opacity=so; $('tw').style.opacity=so; $('mw').style.opacity=clamp((p-.58)/.3)*.95;
  skyNight=p>.72;
}
let skyCur=0, skyTgt=0, skyNight=false;
let raf=0; (function loop(){ const d=skyTgt-skyCur; if(Math.abs(d)>.0004){ skyCur+=d*.09; paintSky(skyCur); } raf=requestAnimationFrame(loop); })();
function setSkyNow(p){ skyTgt=skyCur=p; paintSky(p); }
(function buildRays(){ let h=''; for(let i=0;i<14;i++){ const a=i*Math.PI*2/14; h+=`<line x1="${Math.cos(a)*38}" y1="${Math.sin(a)*38}" x2="${Math.cos(a)*(i%2?50:58)}" y2="${Math.sin(a)*(i%2?50:58)}"/>`; } $('rays').innerHTML=h; })();
function paintStars(){
  const cv=$('cv'), dpr=Math.min(devicePixelRatio||1,2), w=innerWidth, h=innerHeight;
  cv.width=w*dpr; cv.height=h*dpr; const c=cv.getContext('2d'); c.scale(dpr,dpr); c.clearRect(0,0,w,h);
  const tints=['#ffffff','#fff4dc','#dfe8ff','#ffe9d2','#cfe0ff'];
  const dot=(x,y,r,a)=>{ c.globalAlpha=a; c.fillStyle=tints[(Math.random()*tints.length)|0]; c.beginPath(); c.arc(x,y,r,0,6.2832); c.fill(); };
  const horizon=h*.68;
  for(let i=0;i<Math.round(w*h/380);i++){ const y=Math.random()*horizon; const r=Math.random()<.04?1.4+Math.random()*.6:.35+Math.random()*.75; dot(Math.random()*w,y,r,.25+Math.random()*.75); }
  const ax=w*.04, ay=h*.78, bx=w*.96, by=h*.06, dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy), nx=-dy/L, ny=dx/L, sig=Math.min(w,h)*.085;
  for(let i=0;i<Math.round(w*h/140);i++){
    const t=Math.random(); const g=(Math.random()+Math.random()+Math.random()-1.5)*sig*1.4;
    const x=ax+dx*t+nx*g, y=ay+dy*t+ny*g; if(y>horizon||y<0||x<0||x>w) continue;
    dot(x,y,.3+Math.random()*.55,.15+Math.random()*.55);
  }
  c.globalAlpha=1;
  let t=''; for(let i=0;i<64;i++){ const s=(1.6+Math.random()*2.4).toFixed(1); t+=`<i style="left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*62).toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:${(Math.random()*4).toFixed(1)}s;animation-duration:${(2.5+Math.random()*3).toFixed(1)}s"></i>`; }
  $('tw').innerHTML=t;
}
paintStars(); let rzT; const onRz=()=>{ clearTimeout(rzT); rzT=setTimeout(paintStars,250); }; addEventListener('resize',onRz);
const shootT=setInterval(()=>{ if(!skyNight) return; const s=$('shoot'); s.style.left=(40+Math.random()*50)+'%'; s.style.top=(5+Math.random()*28)+'%'; s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); },9000);


  paintSky(0);
  return {
    setTarget(p) { skyTgt = Math.min(1, Math.max(0, p)); },
    setNow(p) { setSkyNow(Math.min(1, Math.max(0, p))); },
    destroy() { cancelAnimationFrame(raf); clearInterval(shootT); clearTimeout(rzT); removeEventListener('resize', onRz); }
  };
}
