/* Exovela photo composites: a still photograph with light that moves on top of it.
   Nothing in the photo is warped. Overlays are additive light (stars, LED rails, water glints)
   and the shell's screen content, multiplied by the photo's own fold shading and clipped to the shell. */
import { createSkin, createSkinCanvas } from './skins.js';

const TAU = Math.PI * 2;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });

// cover-fit the frame (same aspect as the photo) inside the host, honoring a focus point
function fit(host, frame, ar, fx) {
  const W = host.clientWidth, H = host.clientHeight;
  let w = W, h = W / ar;
  if (h < H) { h = H; w = H * ar; }
  const x = Math.min(0, Math.max(W - w, W * 0.5 - w * fx));
  frame.style.width = w + 'px'; frame.style.height = h + 'px';
  frame.style.transform = `translate(${x}px, ${(H - h) / 2}px)`;
}

async function mount(host) {
  const cfg = JSON.parse(host.dataset.composite);
  const frame = host.querySelector('.cmp-frame');
  const ar = cfg.ar || 16 / 9;
  const fxFor = () => (innerWidth <= 900 ? (cfg.fxMobile ?? 0.5) : (cfg.fx ?? 0.5));
  const doFit = () => fit(host, frame, ar, fxFor());
  doFit(); new ResizeObserver(doFit).observe(host);

  const cv = document.createElement('canvas');
  cv.className = 'cmp-fx'; cv.setAttribute('aria-hidden', 'true');
  frame.appendChild(cv);
  const ctx = cv.getContext('2d');

  const [shade, led, water, stars] = await Promise.all([
    cfg.screen ? loadImg(cfg.screen.shade) : null,
    cfg.led ? loadImg(cfg.led) : null,
    cfg.water ? loadImg(cfg.water) : null,
    cfg.stars ? fetch(cfg.stars).then(r => r.json()) : null
  ]);

  // screen content
  let skin, skinCv, ids = cfg.screen?.cycle || ['aurora'], idx = 0;
  if (cfg.screen) {
    skinCv = createSkinCanvas(512);
    skin = createSkin(ids[0], skinCv, cfg.screen.opts || {});
    if (ids.length > 1) setInterval(() => { if (!document.hidden && !reduced()) { idx = (idx + 1) % ids.length; skin.setId(ids[idx]); } }, cfg.screen.every || 7000);
  }
  const off = document.createElement('canvas'); const ox = off.getContext('2d');
  const tmp = document.createElement('canvas'); const tx = tmp.getContext('2d');

  // stable per-star phase/speed so every star shimmers on its own
  const starData = (stars || []).map((s, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453; const f = r - Math.floor(r);
    const g = Math.sin(i * 78.233) * 12543.21; const f2 = g - Math.floor(g);
    return { x: s[0], y: s[1], k: Math.min(1, s[2] / 120), c: s[3], ph: f * TAU, sp: 0.6 + f2 * 1.9 };
  });

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(host);

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(frame.clientWidth * dpr), h = Math.round(frame.clientHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; off.width = Math.ceil(w / 2); off.height = Math.ceil(h / 2); }
    return [w, h];
  }

  function draw(t) {
    const [w, h] = size();
    ctx.clearRect(0, 0, w, h);
    // 1. screen content on the shell
    if (cfg.screen && shade) {
      const b = cfg.screen.box; // in photo fractions
      const bx = b[0] * w, by = b[1] * h, bw = b[2] * w, bh = b[3] * h;
      skin.tick(t);
      const S = skinCv.width;
      // front panel of the atlas, cover-fit into the shell box
      const sx = S * 0.02, sy = S * 0.30, sw = S * 0.46, sh = S * 0.68;
      const scale = Math.max(bw / sw, bh / sh);
      const tw = Math.ceil(bw), th = Math.ceil(bh);
      if (tmp.width !== tw || tmp.height !== th) { tmp.width = tw; tmp.height = th; }
      tx.globalCompositeOperation = 'source-over';
      tx.drawImage(skinCv, sx, sy, sw, sh, (bw - sw * scale) / 2, (bh - sh * scale) / 2, sw * scale, sh * scale);
      tx.globalCompositeOperation = 'multiply';
      tx.drawImage(shade, 0, 0, tw, th);            // fold shading from the photo
      tx.globalCompositeOperation = 'destination-in';
      tx.drawImage(shade, 0, 0, tw, th);            // clip to the screen area (alpha)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(tmp, bx, by);
      // soft spill of the screen color onto the deck
      if (cfg.screen.spill) {
        const p = cfg.screen.spill; const g = ctx.createRadialGradient(p[0] * w, p[1] * h, 0, p[0] * w, p[1] * h, p[2] * w);
        const [r, gg, bb] = avg(skinCv);
        g.addColorStop(0, `rgba(${r},${gg},${bb},0.22)`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    // 2. stars: each one breathes at its own rate and phase
    if (starData.length) {
      for (const s of starData) {
        const a = 0.55 * s.k * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)) ** 3;
        if (a < 0.02) continue;
        const x = s.x * w, y = s.y * h, r = (0.6 + 0.9 * s.k) * (w / 1920 + 0.4);
        ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
    // 3. LED rails: a slow travelling wave of brightness, masked to the strips
    if (led) {
      const W2 = off.width, H2 = off.height;
      ox.globalCompositeOperation = 'source-over';
      ox.clearRect(0, 0, W2, H2);
      const ph = (t * 0.06) % 1;
      const g = ox.createLinearGradient(0, H2 * 0.55, W2, H2);
      for (let i = 0; i <= 8; i++) {
        const p = i / 8; const v = 0.5 + 0.5 * Math.sin((p - ph) * TAU * 2);
        g.addColorStop(p, `rgba(255,255,255,${(0.05 + 0.32 * v ** 2).toFixed(3)})`);
      }
      ox.fillStyle = g; ox.fillRect(0, H2 * 0.5, W2, H2 * 0.5);
      ox.globalCompositeOperation = 'destination-in'; ox.drawImage(led, 0, 0, W2, H2);
      ctx.drawImage(off, 0, 0, w, h);
    }
    // 4. water: fine horizontal glints drifting across the reflections
    if (water) {
      const W2 = off.width, H2 = off.height;
      ox.globalCompositeOperation = 'source-over';
      ox.clearRect(0, 0, W2, H2);
      const rows = 56;
      for (let i = 0; i < rows; i++) {
        const y = H2 * (0.57 + 0.43 * (i / rows) ** 1.25);
        const thick = 0.6 + 1.6 * (i / rows);
        const a = 0.10 + 0.14 * (0.5 + 0.5 * Math.sin(t * (0.7 + (i % 7) * 0.13) + i * 2.1));
        const off1 = ((t * (8 + (i % 5) * 3) + i * 37) % 140) / 140;
        const g = ox.createLinearGradient(0, 0, W2 * 0.62, 0);
        for (let k = 0; k <= 6; k++) { const p = k / 6; const v = 0.5 + 0.5 * Math.sin((p + off1) * TAU * 3); g.addColorStop(p, `rgba(255,255,255,${(a * v ** 4).toFixed(3)})`); }
        ox.fillStyle = g; ox.fillRect(0, y, W2 * 0.62, thick);
      }
      ox.globalCompositeOperation = 'destination-in'; ox.drawImage(water, 0, 0, W2, H2);
      ctx.drawImage(off, 0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  const tiny = document.createElement('canvas'); tiny.width = tiny.height = 8; const tyx = tiny.getContext('2d', { willReadFrequently: true });
  let lastAvg = [120, 200, 255], avgAt = -1;
  function avg(c) {
    const now = performance.now(); if (now - avgAt < 250) return lastAvg; avgAt = now;
    const S = c.width; tyx.drawImage(c, S * 0.02, S * 0.30, S * 0.46, S * 0.68, 0, 0, 8, 8);
    const d = tyx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    return (lastAvg = [r / 64 | 0, g / 64 | 0, b / 64 | 0]);
  }

  const t0 = performance.now();
  if (reduced()) { draw(4); host.classList.add('cmp-ready'); return; }
  let last = 0;
  const loop = now => { if (visible && !document.hidden && now - last > 31) { last = now; draw((now - t0) / 1000); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  host.classList.add('cmp-ready');
}

const start = () => document.querySelectorAll('[data-composite]').forEach(el => mount(el).catch(e => console.warn('composite', e)));
if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 600 }); else setTimeout(start, 200);
