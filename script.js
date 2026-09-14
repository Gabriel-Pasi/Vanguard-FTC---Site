const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Nav scroll state */
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 30), { passive:true });

  /* Hero entrance */
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById('heroTitle').classList.add('play');
      document.getElementById('heroFoot').classList.add('in');
    }, 120);
  });

  /* Hero parallax on the robot render */
  if (!reduceMotion) {
    const render = document.getElementById('heroRender');
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 18;
      const y = (e.clientY / window.innerHeight - 0.5) * 18;
      render.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  /* Generic scroll reveal */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  /* Count-up numerals */
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.getAttribute('data-count'));
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const dur = 1200, start = performance.now();
        function tick(now){
          const p = Math.min((now-start)/dur, 1);
          const eased = 1 - Math.pow(1-p, 3);
          el.textContent = Math.floor(eased * target);
          if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
        }
        requestAnimationFrame(tick);
        countIO.unobserve(el);
      });
    }, { threshold:.6 });
    countIO.observe(el);
  });

  /* Engineering process — highlight steps as they enter view */
  const steps = document.querySelectorAll('.p-step, .p-arrow');
  const stepIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const group = document.querySelectorAll(`[data-i="${e.target.dataset.i}"]`);
        group.forEach((g,idx) => setTimeout(() => g.classList.add('on'), idx*80));
        stepIO.unobserve(e.target);
      }
    });
  }, { threshold:.6 });
  steps.forEach(s => stepIO.observe(s));

  /* Robot scan / reveal panel — organic morph trail (mesma técnica usada
     no restante do site, adaptada para o painel maior desta seção) */
  (function scanRevealPanel(){
    const panel = document.getElementById('robotVisual');
    const front = document.getElementById('robotFront');
    const reveal = document.getElementById('robotBlueprint');
    if (!panel || !front || !reveal) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduceMotion || !finePointer) return;

    const MAX_POINTS = 70, HEAD_R = 0.22, NOISE_AMP = 0.32, BLOB_PTS = 24, FADE = 0.93, SAMPLE = 9;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fCanvas = document.createElement('canvas');
    const rCanvas = document.createElement('canvas');
    const fCtx = fCanvas.getContext('2d');
    const rCtx = rCanvas.getContext('2d');

    let w=0,h=0,baseR=140,trail=[],headR=0,hovering=false,mouse={x:0,y:0},last=null,time=0,running=false;

    function resize(){
      const rect = panel.getBoundingClientRect();
      w = rect.width; h = rect.height;
      baseR = Math.min(w,h) * HEAD_R;
      [fCanvas, rCanvas].forEach(c => { c.width = w*dpr; c.height = h*dpr; });
      fCtx.setTransform(dpr,0,0,dpr,0,0);
      rCtx.setTransform(dpr,0,0,dpr,0,0);
      trail = []; last = null;
    }

    function drawBlob(ctx,cx,cy,r,t,seed){
      if (r < 2) return;
      const pts = [];
      for (let i=0;i<BLOB_PTS;i++){
        const a = (i/BLOB_PTS)*Math.PI*2;
        const n1 = Math.sin(a*3 + t*1.4 + seed)*0.45;
        const n2 = Math.sin(a*5 - t*0.9 + seed*2.3)*0.3;
        const n3 = Math.cos(a*2 + t*1.8 + seed*0.7)*0.25;
        const noise = (n1+n2+n3) * (r*NOISE_AMP);
        const rad = r + noise;
        pts.push([cx+Math.cos(a)*rad, cy+Math.sin(a)*rad]);
      }
      ctx.beginPath();
      for (let i=0;i<pts.length;i++){
        const curr=pts[i], next=pts[(i+1)%pts.length];
        const mid=[(curr[0]+next[0])/2,(curr[1]+next[1])/2];
        if (i===0) ctx.moveTo(mid[0],mid[1]);
        ctx.quadraticCurveTo(curr[0],curr[1],mid[0],mid[1]);
      }
      ctx.closePath(); ctx.fill();
    }

    function tick(){
      const targetR = hovering ? baseR : 0;
      headR += (targetR-headR) * (hovering ? 0.14 : 0.05);

      if (hovering && headR>5){
        if (!last || Math.hypot(mouse.x-last.x, mouse.y-last.y) > SAMPLE){
          trail.push({x:mouse.x,y:mouse.y,r:headR,alpha:1,seed:Math.random()*100});
          last = {x:mouse.x,y:mouse.y};
          if (trail.length > MAX_POINTS) trail.shift();
        }
      }
      trail.forEach(p => { p.alpha *= FADE; p.r *= 0.996; });
      trail = trail.filter(p => p.alpha > 0.01);
      time += 0.016;

      fCtx.clearRect(0,0,w,h);
      fCtx.globalCompositeOperation='source-over';
      fCtx.fillStyle='#fff'; fCtx.fillRect(0,0,w,h);
      fCtx.globalCompositeOperation='destination-out';
      trail.forEach(p => { fCtx.globalAlpha=p.alpha; drawBlob(fCtx,p.x,p.y,p.r,time,p.seed); });
      fCtx.globalAlpha=1; fCtx.globalCompositeOperation='source-over';

      rCtx.clearRect(0,0,w,h);
      rCtx.fillStyle='#fff';
      trail.forEach(p => { rCtx.globalAlpha=p.alpha; drawBlob(rCtx,p.x,p.y,p.r,time,p.seed); });
      rCtx.globalAlpha=1;

      const fu = `url(${fCanvas.toDataURL()})`, ru = `url(${rCanvas.toDataURL()})`;
      front.style.maskImage = fu; front.style.webkitMaskImage = fu;
      reveal.style.maskImage = ru; reveal.style.webkitMaskImage = ru;

      if (hovering || trail.length>0 || headR>0.5) requestAnimationFrame(tick);
      else running = false;
    }
    function startLoop(){ if (!running){ running=true; requestAnimationFrame(tick); } }

    resize();
    window.addEventListener('resize', resize);
    panel.addEventListener('mouseenter', () => { hovering=true; panel.classList.add('active'); startLoop(); });
    panel.addEventListener('mousemove', (e) => {
      const r = panel.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    panel.addEventListener('mouseleave', () => { hovering=false; panel.classList.remove('active'); startLoop(); });
  })();
  /* Fundo animado do hero — pixel liquid suave, reagindo ao cursor */
  (function heroPixelLiquid(){
    const canvas = document.getElementById('heroLiquidBg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const COLS = 80, ROWS = 45;
    const PALETTE = ['#0B0710', '#150029', '#240046', '#5A189A', '#bd9726ff'];


    let w, h, cellW, cellH;
    let ripples = [];
    let time = 0;
    let lastRippleTime = -1;
    let smoothed = null;

    function hexToRgb(hex){
      const n = parseInt(hex.slice(1), 16);
      return [(n>>16)&255, (n>>8)&255, n&255];
    }
    const rgbCache = PALETTE.map(hexToRgb);

    function colorFor(value){
      const n = rgbCache.length - 1;
      const scaled = Math.max(0, Math.min(1, value)) * n;
      const i = Math.floor(scaled);
      const f = scaled - i;
      const c1 = rgbCache[Math.min(i, n)];
      const c2 = rgbCache[Math.min(i+1, n)];
      const r = Math.round(c1[0] + (c2[0]-c1[0])*f);
      const g = Math.round(c1[1] + (c2[1]-c1[1])*f);
      const b = Math.round(c1[2] + (c2[2]-c1[2])*f);
      return `rgb(${r},${g},${b})`;
    }

    function resize(){
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
      cellW = w / COLS;
      cellH = h / ROWS;
      smoothed = new Float32Array(COLS * ROWS);
    }

    function tick(){
      time += 0.015;
      ripples = ripples.filter(r => (time - r.born) < 4.5);

      for (let y = 0; y < ROWS; y++){
        for (let x = 0; x < COLS; x++){
          const nx = x / COLS, ny = y / ROWS;

          const warpX = Math.sin(ny*4 + time*0.3) * 0.25 + Math.sin(ny*9 - time*0.12) * 0.12;
          const warpY = Math.cos(nx*4 - time*0.25) * 0.25 + Math.cos(nx*9 + time*0.15) * 0.12;

          const stripes = Math.sin((nx+warpX)*10 + (ny+warpY)*4 + time*0.4);
          const mask = Math.sin(nx*4 + time*0.05) * Math.cos(ny*4.2 - time*0.04);

          let v = stripes * (0.55 + mask*0.35);

          for (const r of ripples){
            const age = time - r.born;
            const dx = nx - r.x, dy = ny - r.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const decay = Math.max(0, 1 - age/4.5);
            v += Math.sin(dist*8 - age*3) * decay * 0.20;
          }

          let value = (v + 0.9) / 1.8;
          value = Math.pow(Math.max(0,value), 2.6);

          const idx = y*COLS + x;
          const prev = smoothed[idx];
          const next = prev + (value - prev) * 0.15;
          smoothed[idx] = next;

          ctx.fillStyle = colorFor(next);
          ctx.fillRect(Math.floor(x*cellW), Math.floor(y*cellH), Math.ceil(cellW)+1, Math.ceil(cellH)+1);
        }
      }
      if (!reduceMotion) requestAnimationFrame(tick);
    }

    canvas.parentElement.addEventListener('mousemove', (e) => {
      if (time - lastRippleTime < 0.45) return;
      lastRippleTime = time;
      const rect = canvas.getBoundingClientRect();
      ripples.push({ x: (e.clientX-rect.left)/w, y: (e.clientY-rect.top)/h, born: time });
      if (ripples.length > 14) ripples.shift();
    });

    window.addEventListener('resize', resize);
    resize();
    tick();
    if (reduceMotion) tick();
  })();
  /* Mobile nav toggle */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = links.style.display === 'flex';
      links.style.display = open ? 'none' : 'flex';
      links.style.flexDirection = 'column';
      links.style.position = 'fixed';
      links.style.top = '70px';
      links.style.right = '6vw';
      links.style.background = '#100A18';
      links.style.border = '1px solid var(--line)';
      links.style.padding = '22px 28px';
      links.style.gap = '18px';
      links.style.zIndex = '99';
    });
    
  }