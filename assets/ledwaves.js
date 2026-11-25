/* Exovela: LED light waves + pointer glow trail, drawn between the night scene and the page. */
(() => {
  const cv = document.createElement('canvas');
  cv.className = 'led-waves'; cv.setAttribute('aria-hidden', 'true');
  const sceneEl = document.querySelector('.scene');
  (sceneEl && sceneEl.nextSibling) ? sceneEl.parentNode.insertBefore(cv, sceneEl.nextSibling) : document.body.prepend(cv);
  const ctx = cv.getContext('2d'); if (!ctx) return;
  let W = 0, H = 0, D = 1, t = 0, last = performance.now(), raf = 0;
  const root = document.documentElement;
  const still = () => root.classList.contains('still');
  const size = () => { W = innerWidth; H = innerHeight; D = Math.min(devicePixelRatio || 1, 2); cv.width = W * D; cv.height = H * D; ctx.setTransform(D, 0, 0, D, 0, 0); };
  size(); addEventListener('resize', size);
  const waves = [
    { y: .50, amp: .045, k: 1.6, sp: .32, hue: 0,   w: 1.6, a: .55 },
    { y: .555, amp: .03, k: 2.3, sp: -.24, hue: 120, w: 1.2, a: .45 },
    { y: .595, amp: .02, k: 3.1, sp: .42, hue: 240, w: 1.0, a: .40 },
    { y: .44, amp: .06, k: 1.1, sp: .18, hue: 300, w: 2.2, a: .22 }
  ];
  const trail = [];
  addEventListener('pointermove', e => { trail.push({ x: e.clientX, y: e.clientY, age: 0 }); if (trail.length > 48) trail.shift(); }, { passive: true });
  const drawWave = (wv, time) => {
    const step = Math.max(8, W / 140);
    const base = H * wv.y, amp = H * wv.amp * (W < 700 ? .7 : 1);
    let px = 0, py = 0;
    for (let x = -step; x <= W + step; x += step) {
      const u = x / W;
      const y = base + Math.sin(u * Math.PI * 2 * wv.k + time * wv.sp * 2) * amp + Math.sin(u * 9 + time * .7) * amp * .18;
      if (x > -step) {
        const hue = (wv.hue + u * 360 + time * 40) % 360;
        const pulse = .55 + .45 * Math.sin(u * 14 - time * 2.2);
        ctx.strokeStyle = `hsla(${hue},100%,62%,${wv.a * .16 * pulse})`; ctx.lineWidth = wv.w * 14;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        ctx.strokeStyle = `hsla(${hue},100%,${70 + 15 * pulse}%,${wv.a * pulse})`; ctx.lineWidth = wv.w;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      }
      px = x; py = y;
    }
  };
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!still()) t += dt;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const wv of waves) drawWave(wv, t);
    for (let i = trail.length - 1; i >= 0; i--) { trail[i].age += dt; if (trail[i].age > .7) trail.splice(i, 1); }
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i], f = 1 - b.age / .7;
      const hue = (t * 90 + i * 9) % 360;
      ctx.strokeStyle = `hsla(${hue},100%,65%,${.18 * f})`; ctx.lineWidth = 16 * f;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = `hsla(${hue},100%,80%,${.8 * f})`; ctx.lineWidth = 2 * f;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); } });
})();
