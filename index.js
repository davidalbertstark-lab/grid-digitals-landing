/* ===========================================================
   GLOBAL HELPERS
   =========================================================== */
// $ -> shorthand for querySelector (first match)
// $$ -> shorthand for querySelectorAll (all matches as array)
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

/* ===========================================================
   TYPEWRITER (humanized typing effect)
   =========================================================== */
(function typewriter(){
  const textEl = document.getElementById('typedText');
  const phrase = "Accelerate Your\nBusiness Growth"; 
  const chars = phrase.split('');
  let idx = 0;

  // varied delays to mimic human typing speed
  let humanDelays = [40, 50, 60, 75, 90];
  const rng = (arr) => arr[Math.floor(Math.random()*arr.length)];

  // function to type one character at a time
  const typeChar = () => {
    if(idx >= chars.length) return; // stop when done

    const ch = chars[idx++];
    if(ch === '\n') textEl.innerHTML += '<br>'; 
    else textEl.innerHTML += ch;

    // small caret jitter effect
    document.querySelector('.caret').style.transform = 'scale(1.02)';
    setTimeout(()=> document.querySelector('.caret').style.transform = '', 80);

    // add random pauses (longer on spaces and commas)
    const base = rng(humanDelays);
    let extra = (ch === ' ' ? 90 : 0);
    if(ch === ',') extra = 140;
    setTimeout(typeChar, base + extra);
  };

  // start typing after small delay
  setTimeout(typeChar, 360);
})();

/* ===========================================================
   CTA BUTTON (tilt + ripple + overlay)
   =========================================================== */
(function ctaButton(){
  const btn = document.getElementById('startToday');
  btn.dataset.tilt = "1";

  // tilt effect when moving pointer
  btn.addEventListener('pointermove', (e)=>{
    const r = btn.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width - 0.5;
    const ry = (e.clientY - r.top) / r.height - 0.5;
    const tx = rx * 8, ty = ry * 6;
    btn.style.transform = `perspective(600px) translateZ(0) rotateX(${ -ty }deg) rotateY(${ tx }deg) scale(1.02)`;

    // subtle overlay shift
    btn.style.setProperty('--overlayX', `${(rx+0.5)*100}%`);
    btn.style.setProperty('--overlayY', `${(ry+0.5)*100}%`);
  });

  // reset on leave
  btn.addEventListener('pointerleave', ()=> btn.style.transform = '');

  // ripple effect on click
  btn.addEventListener('pointerdown', (e)=>{
    const r = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = (e.clientX - r.left) + 'px';
    ripple.style.top = (e.clientY - r.top) + 'px';
    ripple.style.width = ripple.style.height = Math.max(r.width, r.height) + 'px';
    btn.appendChild(ripple);

    requestAnimationFrame(()=> {
      ripple.style.transition = 'transform .55s cubic-bezier(.2,.9,.28,1), opacity .55s';
      ripple.style.transform = 'translate(-50%,-50%) scale(1)';
      ripple.style.opacity = '0';
    });

    setTimeout(()=> ripple.remove(), 650);
  });
})();

/* ===========================================================
   HERO CANVAS GRID BACKGROUND
   =========================================================== */
(function heroGridCanvas(){
  const canvas = document.getElementById('heroGrid');
  const ctx = canvas.getContext('2d');
  let w = canvas.width = canvas.clientWidth;
  let h = canvas.height = canvas.clientHeight;

  // update on resize
  function resize(){
    w = canvas.width = canvas.clientWidth;
    h = canvas.height = canvas.clientHeight;
    initNodes();
  }
  window.addEventListener('resize', resize);

  // generate grid nodes
  let nodes = [];
  const cols = 14; 
  const rows = Math.round(cols * (h/w));

  function initNodes(){
    nodes = [];
    const gapX = w / (cols+1);
    const gapY = h / (rows+1);
    for(let i=1;i<=cols;i++){
      for(let j=1;j<=rows;j++){
        const x = i*gapX + (Math.random()-0.5)*gapX*0.45;
        const y = j*gapY + (Math.random()-0.5)*gapY*0.45;
        nodes.push({
          x,y,
          ox:x, oy:y,
          vx:(Math.random()-0.5)*0.2,
          vy:(Math.random()-0.5)*0.2,
          r: 0.8 + Math.random()*1.6,
          hue: 180 + Math.random()*30,
        });
      }
    }
  }
  initNodes();

  let t0 = performance.now();
  function draw(now){
    const dt = now - t0; t0 = now;
    ctx.clearRect(0,0,w,h);

    // subtle gradient background
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, 'rgba(0,242,254,0.02)');
    g.addColorStop(1, 'rgba(0,176,80,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // move + draw nodes
    for(let n of nodes){
      n.ox += Math.sin(now/3000 + n.x*0.0003)*0.03;
      n.oy += Math.cos(now/2500 + n.y*0.0003)*0.03;
      n.x += (n.ox - n.x) * 0.02 + n.vx;
      n.y += (n.oy - n.y) * 0.02 + n.vy;

      // glowing effect
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r*10);
      rg.addColorStop(0, `hsla(${n.hue},90%,60%,0.12)`);
      rg.addColorStop(0.6, `hsla(${n.hue},90%,55%,0.04)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r*8, 0, Math.PI*2); ctx.fill();
    }

    // draw connecting lines
    ctx.lineWidth = 0.6;
    for(let i=0;i<nodes.length;i++){
      const a = nodes[i];
      for(let j=i+1;j<nodes.length;j++){
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if(d2 < 10000){ 
          const alpha = 0.08 * (1 - d2/10000);
          ctx.strokeStyle = `rgba(0,242,254,${alpha})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    // sine-wave "data ripple"
    ctx.beginPath();
    for(let x=0;x<w;x+=6){
      const y = h*0.68 + Math.sin((now/800) + x*0.015)*8 + Math.cos((now/1200)+x*0.022)*6;
      ctx.lineTo(x,y);
    }
    ctx.strokeStyle = 'rgba(0,176,80,0.04)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // reduced motion fallback
  const prm = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(prm.matches || window.innerWidth < 720){
    canvas.style.opacity = 0.6;
  }
})();

/* ===========================================================
   NAVIGATION, CURSOR & PARTICLES (from Unreal Nav)
   =========================================================== */

/* ---------- MAGNETIC LINKS ---------- */
(function magneticLinks(){
  const links = $$('.magnetic');
  links.forEach(link=>{
    link.addEventListener('mousemove', e=>{
      const rect = link.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width/2;
      const my = e.clientY - rect.top - rect.height/2;
      const tx = mx * 0.18; 
      const ty = my * 0.12;
      link.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.02)`;
    });
    link.addEventListener('mouseleave', ()=> link.style.transform = '');
    link.addEventListener('focus', ()=> link.style.transform = 'scale(1.02)');
    link.addEventListener('blur', ()=> link.style.transform = '');
  });
})();

/* ---------- MOBILE MENU ---------- */
(function mobileMenu(){
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const panel = mobileMenu.querySelector('.panel');
  const closeBtn = $('#mobileClose');
  const focusableSelector = 'a[href], button:not([disabled])';
  let lastActive = null;

  function open(){
    lastActive = document.activeElement;
    mobileMenu.classList.add('open');
    mobileMenu.style.pointerEvents = 'auto';
    mobileMenu.setAttribute('aria-hidden','false');
    hamburger.setAttribute('aria-expanded','true');
    setTimeout(()=> panel.classList.add('visible'), 16);
    const first = panel.querySelector(focusableSelector);
    if(first) first.focus();
    document.addEventListener('keydown', onKey);
  }
  function close(){
    panel.classList.remove('visible');
    mobileMenu.classList.remove('open');
    mobileMenu.style.pointerEvents = 'none';
    mobileMenu.setAttribute('aria-hidden','true');
    hamburger.setAttribute('aria-expanded','false');
    if(lastActive) lastActive.focus();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e){
    if(e.key === 'Escape') close();
    if(e.key === 'Tab'){
      const focusables = Array.from(panel.querySelectorAll(focusableSelector));
      if(focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus() }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus() }
    }
  }
  hamburger.addEventListener('click', ()=>{
    const openState = hamburger.getAttribute('aria-expanded') === 'true';
    if(openState) close(); else open();
  });
  closeBtn.addEventListener('click', close);
  $$('#mobileLinks a').forEach(a=> a.addEventListener('click', close));
})();

/* ---------- CURSOR FOLLOWER ---------- */
(function cursorFollower(){
  const follower = $('#cursorFollower');
  let mouse = {x:-1000,y:-1000};

  document.addEventListener('mousemove', e=>{
    mouse.x = e.clientX; mouse.y = e.clientY;
    follower.style.left = mouse.x + 'px';
    follower.style.top = mouse.y + 'px';
  });
  const interactives = Array.from(document.querySelectorAll('a, button, .magnetic, .cta, .icon-btn'));
  interactives.forEach(el=>{
    el.addEventListener('pointerenter', ()=> follower.style.transform = 'translate(-50%,-50%) scale(.95)');
    el.addEventListener('pointerleave', ()=> follower.style.transform = 'translate(-50%,-50%) scale(.45)');
  });
  document.addEventListener('mouseleave', ()=> follower.style.opacity = 0);
  document.addEventListener('mouseenter', ()=> follower.style.opacity = 0.9);
})();

/* ---------- PARTICLE BACKGROUND ---------- */
(function particles(){
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  let particles = [];
  const count = Math.max(28, Math.round((w*h)/90000));

  function rand(min,max){ return Math.random()*(max-min)+min }

  function reset(){
    particles = [];
    for(let i=0;i<count;i++){
      particles.push({
        x: rand(0,w), y: rand(0,h),
        r: rand(0.6,2.6),
        vx: rand(-0.3,0.3), vy: rand(-0.15,0.15),
        hue: rand(160,200), life: rand(200,700),
      });
    }
  }
  reset();
  function resize(){ w=canvas.width=innerWidth; h=canvas.height=innerHeight; reset(); }
  addEventListener('resize', resize);

  function draw(){
    ctx.clearRect(0,0,w,h);
    for(let p of particles){
      p.x += p.vx; p.y += p.vy;
      if(p.x < -20) p.x = w + 20;
      if(p.x > w + 20) p.x = -20;
      if(p.y < -20) p.y = h + 20;
      if(p.y > h + 20) p.y = -20;
      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*12);
      g.addColorStop(0, `hsla(${p.hue},90%,60%,0.12)`);
      g.addColorStop(0.5, `hsla(${p.hue+20},90%,55%,0.06)`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.arc(p.x,p.y,p.r*8,0,Math.PI*2);
      ctx.fill();
    }
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a = particles[i], b = particles[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const d2 = dx*dx + dy*dy;
        if(d2 < 70000){
          const alpha = 0.028 - d2/70000*0.028;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = `rgba(0,242,254,${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---------- AUTO-HIGHLIGHT NAV ON SCROLL ---------- */
(function navAutoHighlight(){
  const links = $$('#primaryNav a');
  const sections = ['hero','about','work','pricing','contact']
    .map(id=> document.getElementById(id))
    .filter(Boolean);

  window.addEventListener('scroll', ()=>{
    const y = window.scrollY + 140;
    let chosen = links[0];
    for(let i=0;i<sections.length;i++){
      const s = sections[i];
      if(!s) continue;
      if(s.offsetTop <= y) chosen = links[i] || chosen;
    }
    links.forEach(l=> l.classList.remove('active'));
    if(chosen) chosen.classList.add('active');
  });
})();


/* ===========================================================
   SOLUTIONS TITLE - Assemble letters and force "Not Noise"
   - Preserves normal spaces between words
   - Ensures the full phrase "Not Noise" appears on a new line
   - Letters animate into place when title is in view
   - DOES NOT change color (per requirement)
   =========================================================== */
(function solutionsTitleAnimation_fixNotNoise(){

  const solTitle = document.getElementById('solutionsTitle');
  if(!solTitle) return; // safety: bail if element missing

  // Read raw text (keep internal spacing)
  const rawText = solTitle.textContent || '';
  // Phrase that must be forced to the next line (case-sensitive)
  const BREAK_PHRASE = 'Not Noise';

  // Prepare segments: head (before "Not Noise") and tail ("Not Noise" and any following text)
  let head = rawText;
  let tail = '';

  const idx = rawText.indexOf(BREAK_PHRASE);
  if(idx !== -1){
    head = rawText.slice(0, idx);       // everything before "Not Noise"
    tail = rawText.slice(idx);          // "Not Noise" + whatever follows (usually just "Not Noise")
  }

  // Clear existing content so we rebuild it with spans & preserved spaces
  solTitle.innerHTML = '';

  // Array to collect only letter spans (we animate spans; text nodes for spaces are not included)
  const spans = [];

  function appendCharsAsSpans(str){
    for(let i = 0; i < str.length; i++){
      const c = str[i];
      if(c === '\n' || c === '\r'){
        // explicit line break in source → create a <br>
        solTitle.appendChild(document.createElement('br'));
      } else if(c === ' '){
        // real space preserved as text node (keeps normal spacing)
        solTitle.appendChild(document.createTextNode(' '));
      } else {
        // create span for visible characters (letters, punctuation)
        const span = document.createElement('span');
        span.textContent = c;
        span.style.display = 'inline-block';
        // scatter starting position & rotation for assembly animation
        span.style.transform = `translate(${(Math.random()-0.5)*200}px, ${(Math.random()-0.5)*200}px) rotate(${Math.random()*720-360}deg)`;
        span.style.opacity = '0';
        // DO NOT change color here — per your requirement
        spans.push(span);
        solTitle.appendChild(span);
      }
    }
  }

  // Append head part first (preserving spaces). Trim trailing whitespace BEFORE the forced line break
  // This prevents stray whitespace from attaching weirdly to the previous line.
  const headTrimmed = head.replace(/\s+$/,'');
  appendCharsAsSpans(headTrimmed);

  // If we have a tail (i.e., the BREAK_PHRASE was found), force a new line, then append tail characters
  if(tail){
    solTitle.appendChild(document.createElement('br')); // force full new line before the tail
    // If tail started with unnecessary whitespace, trim leading whitespace so the line starts cleanly
    const tailTrimmed = tail.replace(/^\s+/,'');
    appendCharsAsSpans(tailTrimmed);
  }

  // Animation: bring each span into place with stagger
  const animateTitle = () => {
    spans.forEach((span, i) => {
      setTimeout(() => {
        span.style.transition = 'transform 0.8s ease, opacity 0.8s ease';
        span.style.transform = 'translate(0,0) rotate(0deg)';
        span.style.opacity = '1';
      }, i * 35);
    });
  };

  // Observe when element comes into view (30% visible) — then animate
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        animateTitle();
        // optional: disconnect so it doesn't re-trigger repeatedly
        io.disconnect();
      }
    });
  }, { threshold: 0.3 });

  io.observe(solTitle);

})(); // end IIFE


/* =====================================================
   Underground Particle Grid Background Effect
   ===================================================== */
(function(){

  // === Get canvas and drawing context ===
  const canvas = document.getElementById("edgeBg");
  const ctx = canvas.getContext("2d");

  // Variables to hold width, height, and particles array
  let w, h, particles;

  /* =====================================================
     Function: resize
     - Sets canvas size to match window
     - Creates particle objects with random properties
  ===================================================== */
  function resize(){
    // Set canvas width & height equal to the window size
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    // Create an empty particle array
    particles = [];

    // Generate 120 particles with random positions and velocity
    for(let i = 0; i < 120; i++){
      particles.push({
        x: Math.random() * w,   // random x position
        y: Math.random() * h,   // random y position
        vx: (Math.random() - 0.5) * 0.8, // velocity in x (-0.4 to +0.4)
        vy: (Math.random() - 0.5) * 0.8, // velocity in y (-0.4 to +0.4)
        r: 1 + Math.random() * 2         // radius between 1 and 3
      });
    }
  }

  // Run resize once at start
  resize();

  // Recalculate particles & canvas size whenever window is resized
  window.addEventListener("resize", resize);

  /* =====================================================
     Function: draw
     - Updates particle positions
     - Draws particles as glowing dots
     - Connects nearby particles with lines
     - Repeats using requestAnimationFrame
  ===================================================== */
  function draw(){
    // Clear canvas before each new frame
    ctx.clearRect(0, 0, w, h);

    // === Update & draw each particle ===
    for(let p of particles){
      // Update position based on velocity
      p.x += p.vx;
      p.y += p.vy;

      // Bounce particles when hitting canvas edges
      if(p.x < 0 || p.x > w) p.vx *= -1;
      if(p.y < 0 || p.y > h) p.vy *= -1;

      // Draw particle as a small cyan glowing circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,242,254,0.7)"; // glowing cyan
      ctx.fill();
    }

    // === Connect close particles with lines ===
    for(let i = 0; i < particles.length; i++){
      for(let j = i + 1; j < particles.length; j++){
        let dx = particles[i].x - particles[j].x;
        let dy = particles[i].y - particles[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // If particles are close enough, draw a connecting line
        if(dist < 120){
          ctx.strokeStyle = `rgba(0,242,254,${1 - dist / 120})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Continuously repeat the animation
    requestAnimationFrame(draw);
  }

  // Start the animation loop
  draw();

})(); // End of self-executing function


(function(){
  /* ============================================================
     UNREAL SUPPORT JS — reactive canvas, title animation, micro-UX
     ============================================================ */

  /* ---------- Canvas background for support section ---------- */
  const canvas = document.getElementById('supportCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, points = [];

  // Initialize canvas size and points
  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initPoints();
  }

  // Populate points array with random small glowing points
  function initPoints(){
    points = [];
    const count = Math.max(60, Math.round((W*H)/90000)); // responsive number
    for(let i=0;i<count;i++){
      points.push({
        x: Math.random()*W,
        y: Math.random()*H,
        vx: (Math.random()-0.5)*0.6,
        vy: (Math.random()-0.5)*0.6,
        r: 0.8 + Math.random()*1.8,
        hue: 185 + Math.random()*40
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // Track cursor for point repulsion
  const cursor = {x: -9999, y: -9999};
  window.addEventListener('mousemove', e => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    cursor.x = -9999; cursor.y = -9999;
  });

  // Draw canvas points + connections + subtle gradient
  function drawCanvas(){
    ctx.clearRect(0,0,W,H);

    // subtle background gradient
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, 'rgba(0,242,254,0.01)');
    g.addColorStop(1, 'rgba(0,176,80,0.01)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // update and draw points
    for(const p of points){
      p.x += p.vx;
      p.y += p.vy;

      // wrap around edges
      if(p.x < -20) p.x = W + 20;
      if(p.x > W + 20) p.x = -20;
      if(p.y < -20) p.y = H + 20;
      if(p.y > H + 20) p.y = -20;

      // cursor repulsion
      const dx = p.x - cursor.x;
      const dy = p.y - cursor.y;
      const d2 = dx*dx + dy*dy;
      if(cursor.x > -9999 && d2 < 14000){
        const f = 1 - d2/14000;
        p.x += dx * 0.03 * f;
        p.y += dy * 0.03 * f;
      }

      // draw glowing point
      const rg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*10);
      rg.addColorStop(0, `hsla(${p.hue},90%,60%,0.12)`);
      rg.addColorStop(0.6, `hsla(${p.hue+20},90%,55%,0.03)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*8,0,Math.PI*2);
      ctx.fill();
    }

    // draw connecting lines between nearby points
    ctx.lineWidth = 0.5;
    for(let i=0;i<points.length;i++){
      for(let j=i+1;j<points.length;j++){
        const a = points[i], b = points[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if(d2 < 9000){
          ctx.strokeStyle = `rgba(0,242,254,${0.04 * (1 - d2/9000)})`;
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(drawCanvas);
  }
  drawCanvas();

  /* ---------- Title letter assembly ---------- */
  const titleEl = document.getElementById('supportTitle');
  const original = titleEl.textContent;
  titleEl.textContent = '';
  const spans = [];

  // Split text into spans while preserving spaces
  for(const ch of original){
    if(ch === ' '){
      titleEl.appendChild(document.createTextNode(' '));
    } else {
      const s = document.createElement('span');
      s.textContent = ch;
      s.style.display = 'inline-block';
      s.style.opacity = 0;
      s.style.transform = `translate(${50 + Math.random()*300}px, ${Math.random()*80-40}px) rotate(${Math.random()*90-45}deg)`;
      titleEl.appendChild(s);
      spans.push(s);
    }
  }

  // Assemble letters into place with optional canvas shockwave
  function assembleTitle(){
    if(titleEl.dataset.assembled) return;
    titleEl.dataset.assembled = '1';

    spans.forEach((s,i)=>{
      setTimeout(()=>{
        s.style.transition = 'transform 650ms var(--ease), opacity 500ms linear';
        s.style.transform = 'translate(0,0) rotate(0deg)';
        s.style.opacity = 1;
      }, i*30);
    });

    // shockwave effect on nearby points
    const rect = titleEl.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const pushStrength = 18;

    points.forEach(p=>{
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.sqrt(dx*dx + dy*dy);
      if(d < 400){
        p.vx += (dx/d) * (pushStrength * (1 - d/400));
        p.vy += (dy/d) * (pushStrength * (1 - d/400));
      }
    });

    // emit tiny particles from title
    for(let k=0;k<28;k++){
      setTimeout(()=> spawnTinyParticle(cx + (Math.random()-0.5)*rect.width, cy + (Math.random()-0.5)*rect.height), k*12);
    }

    // reset assembly flag when title leaves viewport
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(!en.isIntersecting){
          delete titleEl.dataset.assembled;
        }
      });
    }, {threshold:0.1});
    io.observe(titleEl);
  }

  function spawnTinyParticle(x,y){
    const p = { x, y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6, life:0, max:30 + Math.random()*30, hue: 180 + Math.random()*40 };
    const anim = setInterval(()=>{
      p.x += p.vx; p.y += p.vy; p.life++;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${p.hue},100%,60%,${1 - p.life/p.max})`;
      ctx.fill();
      if(p.life >= p.max) clearInterval(anim);
    },16);
  }

  new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting) assembleTitle();
    });
  }, {threshold:0.42}).observe(titleEl);

  /* ---------- Micro-UX: support cards, accordion, resource tiles ---------- */

  // Tilt effect on support cards
  document.querySelectorAll('.support-card').forEach(card=>{
    card.addEventListener('pointermove', ev=>{
      const r = card.getBoundingClientRect();
      const rx = (ev.clientX - r.left)/r.width - 0.5;
      const ry = (ev.clientY - r.top)/r.height - 0.5;
      card.style.transform = `translateY(-6px) rotateX(${-ry*4}deg) rotateY(${rx*6}deg)`;
      card.style.boxShadow = `0 30px 80px rgba(0,176,80,0.08)`;
    });
    card.addEventListener('pointerleave', ()=>{
      card.style.transform = '';
      card.style.boxShadow = '';
    });
    card.addEventListener('focus', ()=> card.style.transform = 'translateY(-6px)');
    card.addEventListener('blur', ()=> card.style.transform = '');
  });

  // Accordion toggle & keyboard navigation
  document.querySelectorAll('.accordion .acc-item').forEach(item=>{
    const btn = item.querySelector('.acc-btn');
    const panel = item.querySelector('.acc-panel');

    btn.addEventListener('click', ()=>{
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if(open){ panel.hidden = true; item.dataset.open = 'false'; }
      else{ panel.hidden = false; item.dataset.open = 'true'; }
    });

    btn.addEventListener('keydown', e=>{
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        e.preventDefault();
        const items = Array.from(document.querySelectorAll('.accordion .acc-item'));
        const idx = items.indexOf(item);
        const nextIdx = e.key === 'ArrowDown' ? Math.min(items.length-1, idx+1) : Math.max(0, idx-1);
        items[nextIdx].querySelector('.acc-btn').focus();
      }
    });
  });

  // Resource tiles click & keyboard support
  document.querySelectorAll('.resource-tile').forEach(tile=>{
    tile.addEventListener('click', ()=>{
      tile.animate([{transform:'scale(1)'},{transform:'scale(0.98)'},{transform:'scale(1)'}], {duration:260});
    });
    tile.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' ') tile.click();
    });
  });

})();


(function(){
  /* === Unreal JS: Pre-Footer Particle Background === */

  // Select the canvas element and get 2D context
  const canvas = document.getElementById('preFooterCanvas');
  const ctx = canvas.getContext('2d');

  // Canvas dimensions and particle storage
  let W, H, particles = [];

  /* ---------- Resize handler ---------- */
  function resize() {
    W = canvas.width = window.innerWidth;   // Update canvas width
    H = canvas.height = window.innerHeight; // Update canvas height
    initParticles();                        // Re-initialize particles for new size
  }

  window.addEventListener('resize', resize); // Recalculate on window resize
  resize();                                  // Initial sizing on page load

  /* ---------- Initialize particles ---------- */
  function initParticles() {
    particles = [];
    const count = 80; // total number of particles

    for(let i=0; i<count; i++){
      particles.push({
        x: Math.random() * W,            // random horizontal position
        y: Math.random() * H,            // random vertical position
        r: Math.random() * 2 + 1,        // radius between 1 and 3
        vx: (Math.random() - 0.5) * 0.6, // horizontal velocity
        vy: (Math.random() - 0.5) * 0.6, // vertical velocity
        hue: 180 + Math.random() * 60     // color hue for variety
      });
    }
  }

  /* ---------- Animation loop ---------- */
  function draw() {
    // Clear canvas for new frame
    ctx.clearRect(0, 0, W, H);

    // Update and draw each particle
    for(const p of particles){
      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off edges
      if(p.x < 0 || p.x > W) p.vx *= -1;
      if(p.y < 0 || p.y > H) p.vy *= -1;

      // Draw particle as a circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, 0.6)`; // semi-transparent color
      ctx.fill();
    }

    // Request next animation frame
    requestAnimationFrame(draw);
  }

  draw(); // Start animation
})();


/* ===========================================================
   UNREAL JS: Scroll-triggered Offers Animation
   =========================================================== */
(function(){
  // ===== Select all offer elements =====
  const offers = document.querySelectorAll('.offer');

  // ===== Helper: Initialize offer styles =====
  // Start off-screen and invisible
  const initOffer = (el) => {
    el.style.transform = 'translateY(100px)'; // 100px below final position
    el.style.opacity = '0';                   // hidden
    el.style.transition = 'all 1s ease';      // smooth animation
  };

  // ===== Helper: Animate offer into view =====
  const animateOffer = (el) => {
    el.style.transform = 'translateY(0)'; // move to final position
    el.style.opacity = '1';               // fade in
  };

  // ===== IntersectionObserver Callback =====
  // Trigger when element enters viewport
  const observerCallback = (entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animateOffer(entry.target);
      }
    });
  };

  // ===== Create IntersectionObserver =====
  // Threshold 0.2 means observer triggers when 20% of element is visible
  const observer = new IntersectionObserver(observerCallback, { threshold: 0.2 });

  // ===== Initialize all offers and observe them =====
  offers.forEach(offer => {
    initOffer(offer);       // set initial hidden state
    observer.observe(offer); // start observing scroll visibility
  });
})();

(() => {

  // Grab offer cards and CTA buttons
  const cards = Array.from(document.querySelectorAll('.offer-card'));
  const ctas = Array.from(document.querySelectorAll('.card-cta'));

  // --------- Magnetic Tilt Effect on Hover ----------
  cards.forEach(card => {
    // Pointer hover movement for 3D tilt
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width - 0.5; // x relative to center
      const ry = (e.clientY - rect.top) / rect.height - 0.5; // y relative to center
      const tx = rx * 10; // rotateY
      const ty = ry * 8;  // rotateX
      card.style.transform = `translateY(-8px) rotateX(${-ty}deg) rotateY(${tx}deg) scale(1.01)`;
    });

    // Reset tilt when pointer leaves
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  // --------- CTA Ripple Effect ----------
  function ripple(node, e) {
    const rect = node.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'mini-ripple'; // make sure your CSS handles this class
    span.style.left = (e.clientX - rect.left) + 'px';
    span.style.top = (e.clientY - rect.top) + 'px';
    span.style.width = span.style.height = Math.max(rect.width, rect.height) + 'px';
    node.appendChild(span);

    // Animate ripple: scale and fade
    requestAnimationFrame(() => {
      span.style.transition = 'transform .6s cubic-bezier(.2,.9,.28,1), opacity .6s';
      span.style.transform = 'translate(-50%,-50%) scale(1)';
      span.style.opacity = '0';
    });

    // Remove ripple element after animation
    setTimeout(() => span.remove(), 700);
  }

  // Attach ripple effect to all CTA buttons
  ctas.forEach(cta => {
    cta.addEventListener('pointerdown', (e) => {
      ripple(cta, e);
    });
  });
})();

