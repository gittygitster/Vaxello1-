// Vaxello — full-page neuron network background
// Each neuron is a small soma with branching dendrites (not a plain dot).
// Nearby neurons are linked by thin synapse lines, and discrete signal
// pulses travel along those lines over time — like impulses firing down
// the page as you scroll — rather than the whole mesh flashing in sync.

const canvas = document.getElementById('neuron-canvas');
const ctx = canvas.getContext('2d');

let width, height, docHeight;
let neurons = [];
let pulses = [];
let t = 0;

const NEURON_COUNT_DESKTOP = 42;
const NEURON_COUNT_MOBILE = 22;
const MAX_LINK_DIST = 190;

function resize(){
  width = window.innerWidth;
  height = window.innerHeight;
  docHeight = document.documentElement.scrollHeight;
  canvas.width = width;
  canvas.height = height;
}

function makeDendrites(seedAngleSpread, branchCount){
  const segments = [];

  function grow(x, y, angle, length, depth, w){
    if(depth > 2 || length < 4) return;
    const jitter = (Math.random() - 0.5) * 0.5;
    const nx = x + Math.cos(angle + jitter) * length;
    const ny = y + Math.sin(angle + jitter) * length;
    segments.push({ x1: x, y1: y, x2: nx, y2: ny, w });

    const children = depth === 0 ? 2 : (Math.random() > 0.45 ? 1 : 2);
    for(let i=0;i<children;i++){
      const spread = (Math.random() - 0.5) * 1.4;
      grow(nx, ny, angle + spread, length * (0.55 + Math.random()*0.15), depth+1, w*0.6);
    }
  }

  for(let i=0;i<branchCount;i++){
    const angle = (i / branchCount) * Math.PI * 2 + Math.random()*0.6;
    grow(0, 0, angle, 10 + Math.random()*8, 0, 1.4);
  }
  return segments;
}

function makeNeurons(){
  const count = width < 700 ? NEURON_COUNT_MOBILE : NEURON_COUNT_DESKTOP;
  neurons = [];
  for(let i=0;i<count;i++){
    neurons.push({
      id: i,
      xFrac: Math.random(),
      yFrac: Math.random(),
      somaR: Math.random()*1.3 + 1.6,
      driftX: (Math.random()-0.5) * 0.015,
      driftY: (Math.random()-0.5) * 0.015,
      pulseOffset: Math.random() * Math.PI * 2,
      dendrites: makeDendrites(1, 3 + Math.floor(Math.random()*2))
    });
  }
}

function currentScrollFrac(){
  const max = docHeight - height;
  if(max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}

function maybeSpawnPulse(links){
  if(Math.random() < 0.035 && links.length){
    const link = links[Math.floor(Math.random()*links.length)];
    pulses.push({ a: link.a, b: link.b, progress: 0, speed: 0.012 + Math.random()*0.01 });
  }
}

function draw(loop = true){
  t += 0.008;
  ctx.clearRect(0,0,width,height);

  currentScrollFrac();

  const points = neurons.map(n=>{
    n.xFrac += n.driftX * 0.0006;
    n.yFrac += n.driftY * 0.0006;
    if(n.xFrac < 0) n.xFrac = 1;
    if(n.xFrac > 1) n.xFrac = 0;

    const yInDoc = n.yFrac * docHeight;
    const yOnScreen = yInDoc - window.scrollY;
    return {
      id: n.id,
      x: n.xFrac * width,
      y: yOnScreen,
      somaR: n.somaR,
      dendrites: n.dendrites,
      pulseOffset: n.pulseOffset
    };
  }).filter(p => p.y > -140 && p.y < height + 140);

  const byId = {};
  points.forEach(p => byId[p.id] = p);

  const links = [];
  for(let i=0;i<points.length;i++){
    for(let j=i+1;j<points.length;j++){
      const a = points[i], b = points[j];
      const dx = a.x-b.x, dy = a.y-b.y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if(dist < MAX_LINK_DIST){
        links.push({ a: a.id, b: b.id, dist });
      }
    }
  }

  links.forEach(link=>{
    const a = byId[link.a], b = byId[link.b];
    if(!a || !b) return;
    const alpha = (1 - link.dist/MAX_LINK_DIST) * 0.16;
    ctx.strokeStyle = `rgba(139,90,190,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  maybeSpawnPulse(links);
  pulses = pulses.filter(p => p.progress < 1 && byId[p.a] && byId[p.b]);
  pulses.forEach(p=>{
    p.progress += p.speed;
    const a = byId[p.a], b = byId[p.b];
    if(!a || !b) return;
    const px = a.x + (b.x - a.x) * p.progress;
    const py = a.y + (b.y - a.y) * p.progress;
    const fade = Math.sin(p.progress * Math.PI);

    const grad = ctx.createRadialGradient(px,py,0,px,py,10);
    grad.addColorStop(0, `rgba(232,201,255,${0.9*fade})`);
    grad.addColorStop(1, `rgba(217,70,239,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px,py,9,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${0.85*fade})`;
    ctx.beginPath();
    ctx.arc(px,py,1.3,0,Math.PI*2);
    ctx.fill();
  });

  points.forEach(p=>{
    const pulse = 0.5 + 0.5 * Math.sin(t*1.6 + p.pulseOffset);
    const branchAlpha = 0.18 + pulse * 0.1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = `rgba(196,160,230,${branchAlpha})`;
    ctx.lineCap = 'round';
    p.dendrites.forEach(seg=>{
      ctx.lineWidth = seg.w;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    });
    ctx.restore();

    const glowR = p.somaR * 3.2;
    const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glowR);
    grad.addColorStop(0, `rgba(216,180,254,${0.55 + pulse*0.15})`);
    grad.addColorStop(1, `rgba(168,85,247,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x,p.y,glowR,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle = `rgba(240,230,250,0.95)`;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.somaR,0,Math.PI*2);
    ctx.fill();
  });

  if(loop) requestAnimationFrame(draw);
}

function onScroll(){ /* scroll position is read directly inside draw() */ }

window.addEventListener('resize', ()=>{ resize(); makeNeurons(); });
window.addEventListener('scroll', onScroll, { passive: true });

resize();
makeNeurons();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(prefersReducedMotion){
  draw(false);
} else {
  requestAnimationFrame(draw);
}
