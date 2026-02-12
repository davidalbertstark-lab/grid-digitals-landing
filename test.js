(function () {
  const cfg = {
    baseDensity: 0.00006, 
    maxParticles: 160, 
    minParticles: 18, 
    linkDist: 120, 
    nodeRadius: [1.0, 2.6], 
    hueRange: [150, 200], 
    bgAlpha: 0.08, 
    lineWidth: 0.6,
    lineAlpha: 0.9,
    mouseInfluence: 92,
    mouseForce: 0.95, 
    throttlePointerMs: 16,
    idleRefreshMs: 800, 
  };

  // Detect reduced motion
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    const c = document.getElementById("global-bg");
    const ctx = c.getContext("2d");
    function staticFill() {
      c.width = innerWidth * devicePixelRatio;
      c.height = innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.fillStyle = "rgba(2,6,8,0.88)";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      const g = ctx.createRadialGradient(
        innerWidth * 0.7,
        innerHeight * 0.2,
        20,
        innerWidth * 0.7,
        innerHeight * 0.2,
        Math.max(innerWidth, innerHeight) * 0.6
      );
      g.addColorStop(0, "rgba(0,242,254,0.06)");
      g.addColorStop(1, "rgba(0,176,80,0.01)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, innerWidth, innerHeight);
    }
    window.addEventListener("resize", staticFill, { passive: true });
    staticFill();
    return;
  }

  // Canvas init
  const canvas = document.getElementById("global-bg");
  const ctx = canvas.getContext("2d", { alpha: true });
  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let W = 0,
    H = 0,
    area = 0;

  // State
  let particles = [];
  let grid = null;
  let cols = 0,
    rows = 0,
    cellSize = Math.max(100, cfg.linkDist);
  let raf = null;
  let idleTimer = null;
  let running = true;

  // Mouse pooling (throttled)
  const mouse = { x: -9999, y: -9999, active: false, lastEvent: 0 };
  function pointerEvent(e) {
    const now = performance.now();
    if (now - mouse.lastEvent < cfg.throttlePointerMs) return;
    mouse.lastEvent = now;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }
  window.addEventListener("pointermove", pointerEvent, { passive: true });
  window.addEventListener("pointerdown", pointerEvent, { passive: true });
  window.addEventListener(
    "pointerleave",
    () => {
      mouse.active = false;
    },
    { passive: true }
  );

  // Visibility/pause handling
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else {
      running = true;
      lastTs = performance.now();
      raf = requestAnimationFrame(loop);
    }
  });

  // Resize & re-init
  function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    );
    const h = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    );
    W = Math.max(300, Math.floor(w));
    H = Math.max(200, Math.floor(h));
    area = W * H;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const desired = Math.round(area * cfg.baseDensity);
    const capped = Math.max(
      cfg.minParticles,
      Math.min(cfg.maxParticles, desired)
    );
    const previous = particles.length;
    rebuildParticles(capped, previous);
    cellSize = Math.max(90, cfg.linkDist);
    cols = Math.ceil(W / cellSize);
    rows = Math.ceil(H / cellSize);
    grid = new Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = [];
  }
  window.addEventListener("resize", throttle(resize, 120), { passive: true });
  resize();

  // Particle constructor
  function makeParticle(x, y, r, hue) {
    return {
      x: x !== undefined ? x : Math.random() * W,
      y: y !== undefined ? y : Math.random() * H,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r:
        r !== undefined
          ? r
          : cfg.nodeRadius[0] +
            Math.random() * (cfg.nodeRadius[1] - cfg.nodeRadius[0]),
      hue:
        hue !== undefined
          ? hue
          : cfg.hueRange[0] +
            Math.random() * (cfg.hueRange[1] - cfg.hueRange[0]),
      id: Math.random().toString(36).slice(2, 9),
    };
  }

  // Rebuild particle list adaptively
  function rebuildParticles(targetCount, prevCount) {
    if (particles.length === 0) {
      particles = new Array(targetCount).fill(0).map(() => makeParticle());
      return;
    }
    if (targetCount > particles.length) {
      const add = targetCount - particles.length;
      for (let i = 0; i < add; i++) particles.push(makeParticle());
    } else if (targetCount < particles.length) {
      particles.length = targetCount;
    }
  }

  // Spatial hash helpers
  function clearGrid() {
    for (let i = 0; i < grid.length; i++) grid[i].length = 0;
  }
  function gridKey(x, y) {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    return cx + cy * cols;
  }
  function populateGrid() {
    clearGrid();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const key = gridKey(p.x, p.y);
      if (key >= 0 && key < grid.length) grid[key].push(p);
    }
  }
  function nearbyParticles(p) {
    const cx = Math.floor(p.x / cellSize);
    const cy = Math.floor(p.y / cellSize);
    const found = [];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const kx = cx + ox,
          ky = cy + oy;
        if (kx < 0 || ky < 0 || kx >= cols || ky >= rows) continue;
        const bucket = grid[kx + ky * cols];
        for (let j = 0; j < bucket.length; j++) found.push(bucket[j]);
      }
    }
    return found;
  }

  // Main loop
  let lastTs = performance.now();
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(40, ts - lastTs);
    lastTs = ts;

    ctx.fillStyle = `rgba(2,6,10,${cfg.bgAlpha})`;
    ctx.fillRect(0, 0, W, H);

    populateGrid();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // motion + boundary bounce
      p.x += p.vx * (dt * 0.06);
      p.y += p.vy * (dt * 0.06);
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      if (p.y > H + 20) p.y = -20;

      // mouse repulsion
      if (mouse.active) {
        const mx = p.x - mouse.x;
        const my = p.y - mouse.y;
        const md = Math.hypot(mx, my);
        if (md < cfg.mouseInfluence) {
          const push = (1 - md / cfg.mouseInfluence) * cfg.mouseForce;
          p.vx += (mx / Math.max(0.0001, md)) * push * 0.18;
          p.vy += (my / Math.max(0.0001, md)) * push * 0.18;
        }
      }

      // slight drift / damping
      p.vx += (Math.random() - 0.5) * 0.03;
      p.vy += (Math.random() - 0.5) * 0.03;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    // draw connections
    ctx.lineWidth = cfg.lineWidth;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 12);
      g.addColorStop(0, `hsla(${a.hue},92%,55%,0.95)`);
      g.addColorStop(0.45, `hsla(${a.hue + 18},92%,55%,0.12)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r * 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${a.hue} 92% 55%)`;
      ctx.fill();

      const near = nearbyParticles(a);
      for (let j = 0; j < near.length; j++) {
        const b = near[j];
        if (b === a) continue;
        const dx = a.x - b.x,
          dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d > cfg.linkDist || d < 8) continue;
        const alpha = (1 - d / cfg.linkDist) * 0.9;
        const hue = Math.round((a.hue + b.hue) * 0.5);
        ctx.strokeStyle = `hsla(${hue},92%,64%,${alpha * 0.55})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (mouse.active) {
      raf = requestAnimationFrame(loop);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        mouse.active = false;
      }, 1200);
    } else {
      cancelAnimationFrame(raf);
      idleTimer = setTimeout(() => {
        if (running) raf = requestAnimationFrame(loop);
      }, cfg.idleRefreshMs);
    }
  }

  raf = requestAnimationFrame(loop);

  // helper: throttle
  function throttle(fn, ms) {
    let t = 0;
    return function () {
      const now = Date.now();
      if (now - t > ms) {
        t = now;
        fn.apply(this, arguments);
      }
    };
  }

  // gentle movement variation
  setInterval(() => {
    for (let p of particles) {
      p.vx += (Math.random() - 0.5) * 0.06;
      p.vy += (Math.random() - 0.5) * 0.06;
    }
  }, 1200);

  // expose small API
  window.__globalBg = {
    resize,
    particles,
    setDensity(d) {
      cfg.baseDensity = d;
      resize();
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    },
  };
})();


(function(){
  const canvas = document.getElementById('intro-vortex');
  const ctx = canvas.getContext('2d', { alpha: true });
  let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
  let particles = [], clusters = [];
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function computeCount(){
    const area = Math.max(120000, w * h);
    const base = Math.min(160, Math.round(area / 90000));
    return base;
  }

  function resize(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    w = Math.ceil(canvas.clientWidth || window.innerWidth);
    h = Math.ceil(canvas.clientHeight || window.innerHeight);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function initParticles(){
    particles = [];
    clusters = [];
    const clusterCount = Math.max(2, Math.round((w / 800)));
    for(let i = 0; i < clusterCount; i++){
      const cx = (0.12 + 0.76 * (i / (clusterCount - 1))) * w + (Math.random() - 0.5) * 60;
      const cy = (0.28 + 0.44 * Math.sin(i * 1.1)) * h + (Math.random() - 0.5) * 40;
      clusters.push({ cx, cy, rad: 60 + Math.random() * 140, spin: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.9), phase: Math.random() * Math.PI * 2 });
    }

    const count = computeCount();
    for(let i = 0; i < count; i++){
      const cid = Math.floor(Math.random() * clusters.length);
      const c = clusters[cid];
      const ang = Math.random() * Math.PI * 2;
      const r = c.rad * (0.2 + Math.random() * 1.0);
      const px = c.cx + Math.cos(ang) * r;
      const py = c.cy + Math.sin(ang) * r;
      particles.push({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 0.8 + Math.random() * 1.8,
        cid,
        life: Math.random() * 9000
      });
    }
  }

  function field(x, y, t){
    return Math.sin(x * 0.0019 + t * 0.0009) * 1.1 + Math.cos(y * 0.0014 - t * 0.0007) * 0.9;
  }

  let mouse = { x: -9999, y: -9999, active: false }, pendingMouse = false;
  window.addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    pendingMouse = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { mouse.active = false; });

  let last = performance.now();
  function frame(ts){
    if(prefersReduced) return;
    const dt = Math.min(36, ts - last); last = ts;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(6,8,10,0.16)';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    clusters.forEach((c, ci) => {
      c.phase += 0.0008 * (1 + ci * 0.01);
      c.cx += Math.cos(c.phase * 0.35 + ci) * 0.04;
      c.cy += Math.sin(c.phase * 0.28 + ci) * 0.04;
    });

    let avgSpeed = 0;
    for(let i = 0; i < particles.length; i++){
      const p = particles[i];
      const c = clusters[p.cid];
      const dx = c.cx - p.x, dy = c.cy - p.y;
      const dist = Math.hypot(dx, dy) + 0.0001;
      const targetR = c.rad * (0.6 + 0.3 * Math.sin(c.phase * 0.6 + i));
      const radial = (dist - targetR);
      p.vx += (dx / dist) * (radial * 0.003) - dy / dist * (0.0013 * c.spin);
      p.vy += (dy / dist) * (radial * 0.003) + dx / dist * (0.0013 * c.spin);

      const ang = field(p.x, p.y, ts);
      p.vx += Math.cos(ang) * 0.008;
      p.vy += Math.sin(ang) * 0.008;

      if(mouse.active){
        const dxm = p.x - mouse.x, dym = p.y - mouse.y;
        const md = Math.hypot(dxm, dym) + 0.0001;
        if(md < 200){
          const push = (1 - md / 200) * 0.9;
          p.vx += (dxm / md) * push * 0.8;
          p.vy += (dym / md) * push * 0.8;
        }
      }

      p.vx *= 0.92; p.vy *= 0.92;
      p.x += p.vx * (dt * 0.06);
      p.y += p.vy * (dt * 0.06);

      if(p.x < -40) p.x = w + 40;
      if(p.x > w + 40) p.x = -40;
      if(p.y < -40) p.y = h + 40;
      if(p.y > h + 40) p.y = -40;

      if(i % 5 === 0){
        const gx = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 12);
        gx.addColorStop(0, `rgba(200,255,208,0.95)`);
        gx.addColorStop(0.5, `rgba(0,242,254,0.12)`);
        gx.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gx;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 10, 0, Math.PI * 2); ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,255,160,0.98)`;
      ctx.fill();

      avgSpeed += Math.hypot(p.vx, p.vy);
    }

    ctx.lineWidth = 0.6;
    for(let i = 0; i < particles.length; i += 7){
      for(let j = i + 1; j < i + 4 && j < particles.length; j++){
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if(d < 140){
          ctx.strokeStyle = `rgba(0,242,254,${0.08 * (1 - d / 140)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          const mx = (a.x + b.x) / 2 + Math.sin(last * 0.0007 + i) * 6;
          const my = (a.y + b.y) / 2 + Math.cos(last * 0.0008 + j) * 6;
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
        }
      }
    }

    const coreIntensity = Math.min(1, (avgSpeed / Math.max(1, particles.length)) * 3.0);
    document.getElementById('intro-title').style.textShadow = `0 6px 30px rgba(0,242,254,${0.06 + coreIntensity * 0.04})`;

    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);

  if(prefersReduced){
    canvas.style.display = 'none';
  }

  window.__introVortex = { resize };
})();


/* ===========================
   Headline Morph + Tabs + Magnetic Effect
   =========================== */
(function(){
  const morph = document.getElementById('intro-morph');
  const words = ['foundations','momentum','clarity','scale'];
  let midx = 0;
  setInterval(() => {
    midx = (midx + 1) % words.length;
    morph.animate([{ opacity: 0, transform: 'translateY(8px) scale(.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.28,1)' });
    morph.textContent = words[midx];
  }, 2200);

  const tabsWrap = document.getElementById('service-tabs');
  const tabs = Array.from(tabsWrap.querySelectorAll('.tab'));
  const underline = document.getElementById('tab-underline');

  function placeUnderline(activeEl){
    if(!activeEl) return;
    const wrapRect = tabsWrap.getBoundingClientRect();
    const r = activeEl.getBoundingClientRect();
    const width = Math.round(r.width * 0.9);
    const left = Math.round(r.left - wrapRect.left + (r.width - width) / 2);
    underline.style.width = width + 'px';
    underline.style.transform = `translateX(${left}px)`;
  }

  window.setTimeout(() => { placeUnderline(tabs[0]); }, 80);

  let active = tabs[0];
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      active.setAttribute('aria-pressed', 'false');
      t.setAttribute('aria-pressed', 'true');
      active.classList.remove('scaled');
      active = t;
      active.classList.add('scaled');
      placeUnderline(active);
      document.getElementById('tab-hint').textContent = 'Showing: ' + active.textContent;
    });

    let rafId = null;
    t.addEventListener('pointermove', (e) => {
      if(rafId) return;
      rafId = requestAnimationFrame(() => {
        const rect = t.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const dy = (e.clientY - rect.top - rect.height / 2) / rect.height;
        t.style.transform = `translate(${dx * 6}px, ${dy * -6}px) scale(1.02)`;
        rafId = null;
      });
    }, { passive: true });

    t.addEventListener('pointerleave', () => {
      t.style.transform = '';
    });

    t.addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); t.click(); }
    });
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => placeUnderline(active), 120);
  });
})();
