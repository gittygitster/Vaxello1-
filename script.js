const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Three.js hero device ---------------- */
(function initDevice(){
  const canvas = document.getElementById('device-canvas');
  const wrap = document.getElementById('device-canvas-wrap');
  if(!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 6);

  function size(){
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  window.addEventListener('resize', size);

  // the device: a rounded, thin disc — a stylized NFC chip
  const bodyGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.22, 64);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111114,
    metalness: 0.6,
    roughness: 0.25,
    emissive: 0x0a1a1c,
    emissiveIntensity: 0.4
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2.6;
  scene.add(body);

  // glowing ring inlay
  const ringGeo = new THREE.TorusGeometry(0.7, 0.02, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x4EEBFF });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.6;
  ring.position.z = 0.12;
  scene.add(ring);

  // NFC wave rings — expanding toruses
  const waveRings = [];
  for(let i=0;i<3;i++){
    const g = new THREE.TorusGeometry(1.3 + i*0.35, 0.008, 8, 80);
    const m = new THREE.MeshBasicMaterial({ color: 0x8568FF, transparent: true, opacity: 0.35 - i*0.08 });
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = Math.PI / 2.6;
    mesh.userData.offset = i * 1.3;
    scene.add(mesh);
    waveRings.push(mesh);
  }

  // ambient + point lighting for a premium metallic look
  scene.add(new THREE.AmbientLight(0x404050, 1.2));
  const key = new THREE.PointLight(0x4EEBFF, 6, 10);
  key.position.set(2, 2, 3);
  scene.add(key);
  const rim = new THREE.PointLight(0x8568FF, 4, 10);
  rim.position.set(-2, -1, 2);
  scene.add(rim);

  // fine particles drifting around the device
  const particleCount = 60;
  const positions = new Float32Array(particleCount * 3);
  for(let i=0;i<particleCount;i++){
    const r = 1.6 + Math.random()*1.6;
    const theta = Math.random()*Math.PI*2;
    const y = (Math.random()-0.5)*1.5;
    positions[i*3] = Math.cos(theta)*r;
    positions[i*3+1] = y;
    positions[i*3+2] = Math.sin(theta)*r*0.4;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x4EEBFF, size: 0.02, transparent: true, opacity: 0.55 });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  let t = 0;
  function animate(){
    t += prefersReducedMotion ? 0 : 0.01;
    body.rotation.z = Math.sin(t*0.5) * 0.15;
    ring.rotation.z = body.rotation.z;
    particles.rotation.y = t * 0.15;

    waveRings.forEach((mesh, i)=>{
      const local = (t*0.6 + mesh.userData.offset) % 3.6;
      const scale = 0.5 + local * 0.35;
      mesh.scale.set(scale, scale, 1);
      mesh.material.opacity = Math.max(0, 0.4 - local*0.11);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ---------------- signal pulse tied to scroll ---------------- */
(function signalPulse(){
  const pulse = document.getElementById('signal-pulse');
  if(!pulse) return;
  function update(){
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const frac = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    pulse.style.top = (frac * 100) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ---------------- GSAP scroll reveals ---------------- */
if(typeof gsap !== 'undefined'){
  gsap.registerPlugin(ScrollTrigger);
  const items = document.querySelectorAll('.reveal');
  items.forEach((el, i)=>{
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: prefersReducedMotion ? 0 : 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none'
      },
      delay: prefersReducedMotion ? 0 : (i % 4) * 0.05
    });
  });
} else {
  document.querySelectorAll('.reveal').forEach(el=>{ el.style.opacity = 1; el.style.transform = 'none'; });
}

/* ---------------- animated stat counters ---------------- */
function animateCounter(el){
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const isStatic = el.dataset.static === 'true';
  if(isStatic || prefersReducedMotion){ el.textContent = target + suffix; return; }

  const duration = 1400;
  const start = performance.now();
  function tick(now){
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if(progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const counterEls = document.querySelectorAll('.stat-num[data-target]');
if(counterEls.length){
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){ animateCounter(entry.target); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.6 });
  counterEls.forEach(el => obs.observe(el));
}

/* ---------------- FAQ accordion ---------------- */
document.querySelectorAll('.faq-item').forEach(item=>{
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', ()=>{
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(o=>{
      o.classList.remove('open');
      o.querySelector('.faq-a').style.maxHeight = null;
    });
    if(!isOpen){
      item.classList.add('open');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});

/* ---------------- interactive NFC demo ---------------- */
(function demo(){
  const tag = document.getElementById('demo-tag');
  if(!tag) return;
  const steps = [
    document.getElementById('demo-step-1'),
    document.getElementById('demo-step-2'),
    document.getElementById('demo-step-3')
  ];
  let running = false;

  function reset(){ steps.forEach(s => s.classList.remove('active')); }

  function run(){
    if(running) return;
    running = true;
    reset();
    steps.forEach((s, i)=>{
      setTimeout(()=>{ s.classList.add('active'); if(i === steps.length-1){ setTimeout(()=>{ reset(); running = false; }, 1600); } }, i*650);
    });
  }

  tag.addEventListener('click', run);
  tag.addEventListener('keypress', (e)=>{ if(e.key === 'Enter' || e.key === ' ') run(); });
})();
