// Vaxello — full-page neuron network background
// Draws a field of "neurons" connected by synapses. As the page is scrolled,
// nearby connections briefly brighten and pulse, like a signal firing down
// the page — one continuous network from hero to footer.

const canvas = document.getElementById('neuron-canvas');
const ctx = canvas.getContext('2d');

let width, height, docHeight;
let neurons = [];
let scrollProgress = 0;

const NEURON_COUNT_DESKTOP = 90;
const NEURON_COUNT_MOBILE = 45;
const MAX_LINK_DIST = 160;

function resize(){
  width = window.innerWidth;
  height = window.innerHeight;
  docHeight = document.documentElement.scrollHeight;
  canvas.width = width;
  canvas.height = height;
}

function makeNeurons(){
  const count = width < 700 ? NEURON_COUNT_MOBILE : NEURON_COUNT_DESKTOP;
  neurons = [];
  for(let i=0;i<count;i++){
    neurons.push({
      // position as a fraction of the full document, so the field feels
      // continuous as you scroll rather than repeating per-screen
      xFrac: Math.random(),
      yFrac: Math.random(),
      r: Math.random() * 1.6 + 0.8,
      driftX: (Math.random()-0.5) * 0.02,
      driftY: (Math.random()-0.5) * 0.02,
      pulseOffset: Math.random() * Math.PI * 2
    });
  }
}

function currentScrollFrac(){
  const max = docHeight - height;
  if(max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}

let t = 0;

function draw(loop = true){
  t += 0.01;
  ctx.clearRect(0,0,width,height);

  const scrollFrac = currentScrollFrac();
  const viewTopFrac = scrollFrac * (1 - height/docHeight);

  // compute screen positions for neurons currently near the viewport
  const points = neurons.map(n=>{
    n.xFrac += n.driftX * 0.0006;
    n.yFrac += n.driftY * 0.0006;
    if(n.xFrac < 0) n.xFrac = 1;
    if(n.xFrac > 1) n.xFrac = 0;

    const yInDoc = n.yFrac * docHeight;
    const yOnScreen = yInDoc - window.scrollY;
    return {
      x: n.xFrac * width,
      y: yOnScreen,
      r: n.r,
      pulseOffset: n.pulseOffset
    };
  }).filter(p => p.y > -100 && p.y < height + 100);

  // draw links
  for(let i=0;i<points.length;i++){
    for(let j=i+1;j<points.length;j++){
      const a = points[i], b = points[j];
      const dx = a.x-b.x, dy = a.y-b.y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if(dist < MAX_LINK_DIST){
        const alpha = (1 - dist/MAX_LINK_DIST) * 0.35;
        const pulse = 0.5 + 0.5 * Math.sin(t*2 + a.pulseOffset + scrollFrac*8);
        ctx.strokeStyle = `rgba(168,85,247,${alpha * (0.4 + 0.6*pulse)})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.stroke();
      }
    }
  }

  // draw neuron nodes
  points.forEach(p=>{
    const pulse = 0.5 + 0.5 * Math.sin(t*2.4 + p.pulseOffset);
    const glow = 4 + pulse*4;
    const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glow*3);
    grad.addColorStop(0, `rgba(216,180,254,${0.8})`);
    grad.addColorStop(1, `rgba(168,85,247,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x,p.y, glow*3, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = `rgba(236,231,245,0.9)`;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
  });

  if(loop) requestAnimationFrame(draw);
}

function onScroll(){
  scrollProgress = currentScrollFrac();
}

window.addEventListener('resize', ()=>{ resize(); });
window.addEventListener('scroll', onScroll, { passive: true });

resize();
makeNeurons();
onScroll();

// respect reduced motion preference: still render a static field, no animation loop
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(prefersReducedMotion){
  draw(false); // draw once, no loop
} else {
  requestAnimationFrame(draw);
}
