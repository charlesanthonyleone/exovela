// Sources for the live garment. Each source draws one frame into a small canvas at LED resolution.
// Everything here is original: procedural art, our own video loops, and user input from the demo.
const TAU = Math.PI * 2;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const bus = { strokes: [], text: 'hey cute girl with the ladybug glasses', textColor: '#ff5fa2', drawColor: '#8fd8ff', listeners: new Set(), handle: '@yourname' };
const hsl = (h, s, l) => `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;
function cover(ctx, src, sw, sh, w, h){ const s = Math.max(w / sw, h / sh); const dw = sw * s, dh = sh * s; ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); }

// ---------- shared video clips (one element per clip, created on demand) ----------
export const clips = {
  els: {}, active: true,
  get(id){
    if (this.els[id]) return this.els[id];
    if (reduce) { const i = new Image(); i.src = `assets/video/ch-${id}-poster.jpg`; this.els[id] = i; return i; }
    const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
    const webm = v.canPlayType('video/webm; codecs="vp9"');
    v.src = `assets/video/ch-${id}-sd.${webm ? 'webm' : 'mp4'}`; v.play().catch(() => {});
    this.els[id] = v; return v;
  },
  setActive(a){ this.active = a; for (const v of Object.values(this.els)) if (v.play) { a ? v.play().catch(() => {}) : v.pause(); } },
  avg: {},
  average(id){ // matching color for "video layout" looks, sampled twice a second
    const el = this.els[id]; if (!el) return '#223';
    const now = performance.now(); const a = this.avg[id];
    if (a && now - a.t < 500) return a.c;
    const c = this._c || (this._c = document.createElement('canvas')); c.width = c.height = 4; const x = c.getContext('2d', { willReadFrequently: true });
    try { x.drawImage(el, 0, 0, 4, 4); const d = x.getImageData(0, 0, 4, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
      const n = d.length / 4; const col = `rgb(${r/n*0.8|0},${g/n*0.8|0},${b/n*0.8|0})`; this.avg[id] = { t: now, c: col }; return col; } catch { return '#223'; }
  }
};
export const CLIPS = [
  { id: 'santa', label: 'Dancing Santa', kind: 'Holiday special' },
  { id: 'surf', label: 'Surf', kind: 'Your show' },
  { id: 'ocean', label: 'Night ocean', kind: 'Ambient' },
  { id: 'aurora', label: 'Aurora', kind: 'Ambient' },
  { id: 'rain', label: 'City rain', kind: 'Ambient' },
];

// ---------- text on a tiny grid ----------
function pixText(ctx, str, x, y, size, color, align = 'left'){ ctx.fillStyle = color; ctx.font = `700 ${size}px ui-monospace, Menlo, Consolas, monospace`; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.fillText(str, x, y); }
function wrap(ctx, str, maxW){ const words = str.split(/\s+/); const lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }

// ---------- sources ----------
export const SOURCES = {
  off: { label: 'Off', create: () => ({ draw(c, w, h){ c.fillStyle = '#000'; c.fillRect(0, 0, w, h); } }) },
  video: { label: 'Show', create: o => ({ draw(c, w, h){ const el = clips.get(o.clip); c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      const vw = el.videoWidth || el.naturalWidth, vh = el.videoHeight || el.naturalHeight; if (vw) cover(c, el, vw, vh, w, h); } }) },
  solid: { label: 'Solid', create: o => ({ draw(c, w, h, t){ c.fillStyle = o.match ? clips.average(o.match) : (o.color || '#334'); c.fillRect(0, 0, w, h);
      if (o.breathe) { c.fillStyle = `rgba(0,0,0,${0.25 + 0.25*Math.sin(t*1.3)})`; c.fillRect(0, 0, w, h); } } }) },
  flannel: { label: 'Flannel', create: o => {
      const pal = [['#7a1f1f','#141414','#d9b44a'],['#1f3a5f','#0e1622','#c9d3df'],['#2f5130','#121a12','#e0c36a'],['#5a2a6e','#150d1c','#e7a6c9'],['#8a4b14','#1b120a','#f0e2c4'],['#0f5b5b','#081a1a','#f2b84b']];
      let i = (o.seed || 0) % pal.length, j = (i + 1) % pal.length, t0 = 0;
      const lerp = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = s => (((pa >> s) & 255) * (1-k) + ((pb >> s) & 255) * k) | 0; return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
      return { draw(c, w, h, t){
        if (!t0) t0 = t; if (t - t0 > 1.1) { t0 = t; i = j; j = (j + 1 + ((Math.random()*3)|0)) % pal.length; }
        const k = Math.min(1, (t - t0) / 0.35), P = pal[i].map((a, n) => lerp(a, pal[j][n], k));
        const u = Math.max(4, Math.round(Math.min(w, h) / 3.2)), off = ((t0 * 7) | 0) % u;
        c.fillStyle = P[0]; c.fillRect(0, 0, w, h);
        c.globalAlpha = .55; c.fillStyle = P[1];
        for (let x = -u + off; x < w; x += u) c.fillRect(x, 0, Math.ceil(u * .42), h);
        for (let y = -u + off; y < h; y += u) c.fillRect(0, y, w, Math.ceil(u * .42));
        c.globalAlpha = .8; c.fillStyle = P[2];
        for (let x = -u + off + (u * .7 | 0); x < w; x += u) c.fillRect(x, 0, 1, h);
        for (let y = -u + off + (u * .7 | 0); y < h; y += u) c.fillRect(0, y, w, 1);
        c.globalAlpha = 1; } }; } },
  plasma: { label: 'Psychedelic', create: o => { let img; return { draw(c, w, h, t){
      if (!img || img.width !== w || img.height !== h) img = c.createImageData(w, h); const d = img.data, p = o.phase || 0, sp = o.speed || 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w * 6, v = y / h * 6 * (h / w);
        const s = Math.sin(u + t*sp) + Math.sin(v*1.3 - t*1.1*sp) + Math.sin((u + v + t*.7*sp)*.8) + Math.sin(Math.hypot(u-3, v-3)*1.6 - t*1.7*sp);
        const hue = (s * 60 + t * 40 + p) % 360; const [r, g, b] = hsv(hue, 1, .95); const i = (y*w + x) * 4; d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255; }
      c.putImageData(img, 0, 0); } }; } },
  stripes: { label: 'Stripes', create: o => ({ draw(c, w, h, t){ // vertical stripes: they survive arm movement
      const n = o.n || 4, cols = o.colors || null; const sw = Math.max(1, w / n);
      for (let i = -1; i <= n + 1; i++) { const x = i * sw + ((t * (o.speed ?? 4)) % (sw * 2)) - sw; c.fillStyle = cols ? cols[(i + 100) % cols.length] : hsl(t*30 + i*40, 90, 55); c.fillRect(Math.floor(x), 0, Math.ceil(sw), h); } } }) },
  snow: { label: 'Snow', create: o => { const fl = []; return { draw(c, w, h, t){
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, o.top || '#06122b'); g.addColorStop(1, o.bottom || '#1b2c4d'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      while (fl.length < Math.max(8, w*h/40)) fl.push({ x: Math.random()*w, y: Math.random()*h, s: .3 + Math.random()*.8, z: Math.random() });
      c.fillStyle = '#fff'; for (const f of fl) { f.y += f.s * (h/90) * 1.2; f.x += Math.sin(t*1.5 + f.z*9) * .08; if (f.y > h) { f.y = -1; f.x = Math.random()*w; } c.globalAlpha = .5 + f.z*.5; c.fillRect(f.x|0, f.y|0, f.z > .7 ? 2 : 1, f.z > .7 ? 2 : 1); }
      c.globalAlpha = 1; if (o.ground) { c.fillStyle = '#dfe8f5'; c.fillRect(0, h - Math.max(1, h*.08|0), w, h); } } }; } },
  fireplace: { label: 'Fireplace', create: o => { let heat, W = 0, H = 0; return { draw(c, w, h, t){
      // brick surround framed inside the torso, classic cellular fire inside the firebox
      c.fillStyle = '#2a0f08'; c.fillRect(0, 0, w, h);
      const bw = Math.max(3, w/12|0), bh = Math.max(2, h/16|0);
      for (let y = 0; y < h; y += bh) for (let x = -((y/bh)%2)*bw/2; x < w; x += bw) { c.fillStyle = ((x*7+y*3)|0) % 3 ? '#5b2216' : '#6e2c1c'; c.fillRect(x+1|0, y+1|0, bw-1, bh-1); }
      const fx = w*.18|0, fy = h*.34|0, fw = w*.64|0, fh = h*.56|0;
      if (W !== fw || H !== fh) { W = fw; H = fh; heat = new Float32Array(W*H); }
      for (let x = 0; x < W; x++) heat[(H-1)*W + x] = .75 + Math.random()*.25;
      for (let y = 0; y < H-1; y++) for (let x = 0; x < W; x++) { const s = heat[(y+1)*W + Math.min(W-1, Math.max(0, x + ((Math.random()*3)|0) - 1))]; heat[y*W+x] = Math.max(0, s - Math.random()*(2.6/H)); }
      const img = c.createImageData(W, H), d = img.data;
      for (let i = 0; i < W*H; i++) { const v = heat[i]; d[i*4] = Math.min(255, v*420); d[i*4+1] = Math.min(255, Math.max(0, v*v*300 - 20)); d[i*4+2] = Math.max(0, v*v*v*200 - 80); d[i*4+3] = 255; }
      c.fillStyle = '#050202'; c.fillRect(fx, fy, fw, fh); c.putImageData(img, fx, fy);
      c.fillStyle = '#3b2416'; c.fillRect(0, fy - Math.max(2, h*.06|0), w, Math.max(2, h*.06|0)); // mantel
      c.fillStyle = '#1f6b3a'; for (let x = 0; x < w; x += 3) c.fillRect(x, fy - Math.max(3, h*.09|0), 2, 2); // garland
      c.fillStyle = '#ffd36b'; for (let x = 1; x < w; x += 6) if (Math.sin(t*3 + x) > 0) c.fillRect(x, fy - Math.max(3, h*.09|0), 1, 1);
    } }; } },
  eq: { label: 'Equalizer', create: o => { const lv = []; return { draw(c, w, h, t){
      c.fillStyle = '#05030a'; c.fillRect(0, 0, w, h); const n = o.vertical ? Math.max(3, h/6|0) : Math.max(6, w/5|0);
      for (let i = 0; i < n; i++) { const target = .25 + .7*Math.abs(Math.sin(t*2.1 + i*.7) * Math.sin(t*1.3 + i*1.9)); lv[i] = Math.max(target, (lv[i] || 0) * .9);
        const L = lv[i];
        if (o.vertical) { const bh = h/n; const len = L*w; for (let x = 0; x < len; x++) { c.fillStyle = hsl(140 - x/w*140, 95, 55); c.fillRect(x, i*bh+1|0, 1, Math.max(1, bh-1|0)); } }
        else { const bw = w/n; const len = L*h; for (let y = 0; y < len; y++) { c.fillStyle = hsl(140 - y/h*140, 95, 55); c.fillRect(i*bw+1|0, h-1-y, Math.max(1, bw-1|0), 1); } } } } }; } },
  grid: { label: 'Neon grid', create: o => ({ draw(c, w, h, t){
      const g = c.createLinearGradient(0, 0, 0, h*.5); g.addColorStop(0, '#1a0633'); g.addColorStop(1, '#ff3d8b'); c.fillStyle = g; c.fillRect(0, 0, w, h*.5); c.fillStyle = '#0a0216'; c.fillRect(0, h*.5, w, h*.5);
      c.fillStyle = '#ffcf5a'; const r = Math.min(w, h)*.22; c.beginPath(); c.arc(w/2, h*.5, r, Math.PI, 0); c.fill();
      c.fillStyle = '#1a0633'; for (let k = 0; k < 4; k++) c.fillRect(w/2 - r, h*.5 - r*(.15 + k*.2), r*2, Math.max(1, r*.07));
      c.strokeStyle = '#33e6ff'; c.lineWidth = 1;
      for (let k = 0; k < 8; k++) { const z = ((k + (t*1.2)%1) / 8); const y = h*.5 + (h*.5) * z*z; c.beginPath(); c.moveTo(0, y|0 + .5); c.lineTo(w, y|0 + .5); c.stroke(); }
      for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(w/2 + k*w*.04, h*.5); c.lineTo(w/2 + k*w*.25, h); c.stroke(); } } }) },
  warp: { label: 'Warp', create: o => { const st = []; return { draw(c, w, h, t){
      c.fillStyle = 'rgba(0,0,8,.55)'; c.fillRect(0, 0, w, h); while (st.length < 70) st.push({ a: Math.random()*TAU, r: Math.random(), s: .01 + Math.random()*.03, hue: 180 + Math.random()*140 });
      for (const s of st) { s.r += s.s * (1 + s.r*3); if (s.r > 1.2) { s.r = 0; s.a = Math.random()*TAU; }
        const R = s.r * Math.hypot(w, h)/2; const x = w/2 + Math.cos(s.a)*R, y = h/2 + Math.sin(s.a)*R; c.fillStyle = hsl(s.hue, 80, 50 + s.r*40); c.fillRect(x|0, y|0, s.r > .6 ? 2 : 1, 1); } } }; } },
  streaks: { label: 'Streaks', create: o => { const s = []; return { draw(c, w, h, t){ // vertical motion only, safe on sleeves
      c.fillStyle = 'rgba(0,0,6,.5)'; c.fillRect(0, 0, w, h); while (s.length < w*1.2) s.push({ x: Math.random()*w|0, y: Math.random()*h, v: .5 + Math.random()*2 });
      for (const p of s) { p.y += p.v; if (p.y > h) { p.y = -3; p.x = Math.random()*w|0; } c.fillStyle = o.color || hsl(200 + p.x*6, 90, 60); c.fillRect(p.x, p.y|0, 1, 3); } } }; } },
  ticker: { label: 'Ticker', create: o => { let off = 0; return { draw(c, w, h, t){
      c.fillStyle = o.bg || '#05060a'; c.fillRect(0, 0, w, h); const txt = (o.text || bus.handle) + '   ·   ';
      const vertical = o.vertical ?? (h > w * 1.6); const size = Math.max(6, Math.min(vertical ? w : h, 16) * .82 | 0);
      c.save(); if (vertical) { c.translate(w, 0); c.rotate(Math.PI/2); }
      const L = vertical ? h : w, S = vertical ? w : h; c.font = `700 ${size}px ui-monospace, Menlo, monospace`; const tw = c.measureText(txt).width; off = (off + (o.speed || .6)) % tw;
      for (let x = -off; x < L; x += tw) pixText(c, txt, x, (S - size)/2, size, o.color || '#8fd8ff'); c.restore(); } }; } },
  clock: { label: 'Clock', create: o => ({ draw(c, w, h, t){
      c.fillStyle = o.bg || '#05060a'; c.fillRect(0, 0, w, h); const d = new Date(); const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
      const size = Math.max(7, Math.min(w*.5, h/3.2) | 0); pixText(c, hh, w*.47, h*.3, size, o.color || '#eef0f3', 'center'); pixText(c, mm, w*.47, h*.3 + size*1.1, size, o.color || '#eef0f3', 'center');
      c.fillStyle = o.accent || '#8fd8ff'; const s = d.getSeconds() / 60; c.fillRect(w*.2|0, h*.85|0, Math.max(1, (w*.6*s)|0), Math.max(1, h*.02|0)); } }) },
  temp: { label: 'Temperature', create: o => ({ draw(c, w, h, t){
      c.fillStyle = o.bg || '#05060a'; c.fillRect(0, 0, w, h); const size = Math.max(7, Math.min(w*.48, h/3.6) | 0);
      c.fillStyle = '#ffcf5a'; const r = Math.max(2, w*.18); c.beginPath(); c.arc(w/2, h*.2, r, 0, TAU); c.fill();
      pixText(c, `${o.value ?? 48}°`, w/2, h*.38, size, o.color || '#eef0f3', 'center'); pixText(c, 'F', w/2, h*.38 + size*1.1, size*.8|0, '#a6acb7', 'center'); } }) },
  mirror: { label: 'Phone mirror', create: o => ({ draw(c, w, h, t){ const s = mirrorScreen(t); c.fillStyle = '#000'; c.fillRect(0, 0, w, h); const k = Math.min(w / s.width, h / s.height); c.drawImage(s, (w - s.width*k)/2, (h - s.height*k)/2, s.width*k, s.height*k); } }) },
  draw: { label: 'Draw', create: o => ({ draw(c, w, h, t){
      c.fillStyle = '#04050a'; c.fillRect(0, 0, w, h);
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const s of bus.strokes) { c.strokeStyle = s.color; c.lineWidth = Math.max(1, w/48); c.beginPath(); s.pts.forEach((p, i) => i ? c.lineTo(p[0]*w, p[1]*h) : c.moveTo(p[0]*w, p[1]*h)); c.stroke(); }
      if (bus.text) { const size = Math.max(6, Math.round(w / 9)); c.font = `700 ${size}px ui-monospace, Menlo, monospace`; const lines = wrap(c, bus.text, w*.92);
        const lh = size * 1.12, y0 = Math.max(1, (h - lines.length*lh)/2); const blink = .85 + .15*Math.sin(t*4);
        c.globalAlpha = blink; lines.forEach((ln, i) => pixText(c, ln, w/2, y0 + i*lh, size, bus.textColor, 'center')); c.globalAlpha = 1; } } }) },
  ttt: { label: 'Tic-tac-toe', create: o => game },
  ad: { label: 'Ad slot', create: o => ({ draw(c, w, h, t){
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b1d3a'); g.addColorStop(1, '#3a0b2e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (w < 28) { c.strokeStyle = '#ffcf5a'; c.lineWidth = 1; c.strokeRect(.5, .5, w-1, h-1); const k = .5 + .5*Math.sin(t*2.4); const s2 = Math.max(5, Math.min(w*.62, h*.4) | 0);
        pixText(c, 'AD', w/2, h/2 - s2*.6, s2, `rgba(255,207,90,${.7+.3*k})`, 'center'); return; }
      const r = Math.min(w, h) * .2; c.strokeStyle = '#ffcf5a'; c.lineWidth = Math.max(1, r*.25); c.beginPath(); c.arc(w/2, h*.34, r, t*1.5, t*1.5 + TAU*.75); c.stroke();
      const size = Math.max(6, w/8|0); pixText(c, 'SAMPLE AD', w/2, h*.6, size, '#eef0f3', 'center'); pixText(c, 'your slot · A-0142', w/2, h*.6 + size*1.25, Math.max(5, size*.55|0), '#8fd8ff', 'center');
      c.fillStyle = '#ffcf5a'; c.fillRect(1, 1, Math.max(4, w*.12|0), Math.max(3, h*.06|0)); } }) },
  code: { label: 'Code', create: o => new CodeSource(o.code || CODE_SAMPLES.plasma) },
};
export function hsv(h, s, v){ h = ((h % 360) + 360) % 360 / 60; const i = Math.floor(h), f = h - i, p = v*(1-s), q = v*(1-s*f), u = v*(1-s*(1-f)); const m = [[v,u,p],[q,v,p],[p,v,u],[p,q,v],[u,p,v],[v,p,q]][i % 6]; return m.map(x => x*255|0); }

// ---------- simulated phone screen, shared with the phone mock in the panel ----------
let _ms; export function mirrorScreen(t){
  const c = _ms || (_ms = Object.assign(document.createElement('canvas'), { width: 90, height: 160 })); const x = c.getContext('2d');
  x.fillStyle = '#0b0d12'; x.fillRect(0, 0, 90, 160);
  x.fillStyle = '#eef0f3'; x.font = '700 8px ui-monospace, monospace'; x.textBaseline = 'top'; x.fillText(new Date().toTimeString().slice(0, 5), 6, 4);
  const g = x.createLinearGradient(10, 20, 80, 90); g.addColorStop(0, hsl(t*20, 80, 55)); g.addColorStop(1, hsl(t*20 + 120, 80, 40)); x.fillStyle = g; x.fillRect(10, 22, 70, 70);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(45, 57, 12 + 3*Math.sin(t*4), 0, TAU); x.fill();
  x.fillStyle = '#eef0f3'; x.font = '700 9px ui-sans-serif, sans-serif'; x.fillText('Night Drive', 10, 100); x.fillStyle = '#8a909c'; x.font = '7px ui-sans-serif, sans-serif'; x.fillText('your playlist', 10, 112);
  x.fillStyle = '#2a2e38'; x.fillRect(10, 126, 70, 3); x.fillStyle = '#8fd8ff'; x.fillRect(10, 126, 70 * ((t / 30) % 1), 3);
  x.fillStyle = '#eef0f3'; x.beginPath(); x.moveTo(40, 136); x.lineTo(52, 142); x.lineTo(40, 148); x.fill(); x.fillRect(24, 138, 3, 8); x.fillRect(63, 138, 3, 8);
  return c;
}

// ---------- tic-tac-toe, playable on the garment or the phone ----------
export const game = {
  b: Array(9).fill(''), status: 'Your move. You are X.', win: null, listeners: new Set(),
  reset(){ this.b = Array(9).fill(''); this.win = null; this.status = 'Your move. You are X.'; this.notify(); },
  notify(){ this.listeners.forEach(f => f()); },
  line(){ const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for (const l of L) { const [a,b,c] = l; if (this.b[a] && this.b[a] === this.b[b] && this.b[a] === this.b[c]) return l; } return null; },
  play(i){
    if (this.win || this.b[i]) return; this.b[i] = 'X'; if (this.end()) return;
    setTimeout(() => { const i2 = this.ai(); if (i2 >= 0) this.b[i2] = 'O'; this.end() || (this.status = 'Your move.'); this.notify(); }, 350);
    this.status = 'Thinking…'; this.notify();
  },
  end(){ const l = this.line(); if (l) { this.win = l; this.status = this.b[l[0]] === 'X' ? 'You win. Tap new game.' : 'O wins. Tap new game.'; this.notify(); return true; }
    if (this.b.every(Boolean)) { this.win = []; this.status = 'Draw. Tap new game.'; this.notify(); return true; } return false; },
  ai(){ const open = this.b.map((v, i) => v ? -1 : i).filter(i => i >= 0); const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const who of ['O','X']) for (const l of L) { const v = l.map(i => this.b[i]); if (v.filter(x => x === who).length === 2 && v.includes('')) return l[v.indexOf('')]; }
    if (!this.b[4]) return 4; return open[(Math.random()*open.length)|0] ?? -1; },
  tap(u, v){ const i = Math.min(2, u*3|0) + 3*Math.min(2, v*3|0); this.play(i); },
  draw(c, w, h, t){
    c.fillStyle = '#04050a'; c.fillRect(0, 0, w, h); const s = Math.min(w, h) * .9, x0 = (w - s)/2, y0 = (h - s)/2, cs = s/3;
    c.fillStyle = '#3a4150'; for (let k = 1; k < 3; k++) { c.fillRect(x0 + k*cs|0, y0, 1, s); c.fillRect(x0, y0 + k*cs|0, s, 1); }
    c.lineWidth = Math.max(1, cs*.12);
    this.b.forEach((m, i) => { const cx = x0 + (i%3 + .5)*cs, cy = y0 + ((i/3|0) + .5)*cs, r = cs*.3; const hot = this.win && this.win.includes(i) && Math.sin(t*10) > 0;
      if (m === 'X') { c.strokeStyle = hot ? '#fff' : '#ff5fa2'; c.beginPath(); c.moveTo(cx-r, cy-r); c.lineTo(cx+r, cy+r); c.moveTo(cx+r, cy-r); c.lineTo(cx-r, cy+r); c.stroke(); }
      if (m === 'O') { c.strokeStyle = hot ? '#fff' : '#8fd8ff'; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke(); } });
  }
};

// ---------- code mode: user code runs in its own worker, never on the page ----------
export const CODE_SAMPLES = {
  plasma: `// Plasma. led.w × led.h pixels, t in seconds.
for (let y = 0; y < led.h; y++)
  for (let x = 0; x < led.w; x++) {
    const v = Math.sin(x/5 + t) + Math.sin(y/4 - t*1.3) + Math.sin((x+y)/7 + t*.7);
    led.set(x, y, ...led.hsv(v*60 + t*40, 1, 1));
  }`,
  ticker: `// Scrolling ticker
led.fill(4, 6, 12);
led.text('CODE ON YOUR SLEEVE  ·  ', -((t*20) % 160), led.h/2 - 4, [143, 216, 255]);
led.text('CODE ON YOUR SLEEVE  ·  ', 160 - ((t*20) % 160), led.h/2 - 4, [143, 216, 255]);`,
  life: `// Rain of dots
led.fill(0, 0, 8);
for (let i = 0; i < 40; i++) {
  const x = (i * 37) % led.w, y = ((t * (8 + i % 5) * 3) + i * 13) % led.h;
  led.set(x, y | 0, 120, 255, 180);
}`,
};
const WORKER = `
let fn = null, W = 1, H = 1, buf;
const font = new OffscreenCanvas(256, 24), fx = font.getContext('2d', { willReadFrequently: true });
const led = {
  get w(){ return W; }, get h(){ return H; },
  set(x, y, r, g, b){ x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y*W + x)*4; buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255; },
  fill(r, g, b){ for (let i = 0; i < W*H; i++) { buf[i*4] = r; buf[i*4+1] = g; buf[i*4+2] = b; buf[i*4+3] = 255; } },
  clear(){ led.fill(0, 0, 0); },
  rect(x, y, w, h, r, g, b){ for (let j = y|0; j < (y+h)|0; j++) for (let i = x|0; i < (x+w)|0; i++) led.set(i, j, r, g, b); },
  hsv(h, s, v){ h = ((h % 360) + 360) % 360 / 60; const i = Math.floor(h), f = h - i, p = v*(1-s), q = v*(1-s*f), u = v*(1-s*(1-f)); return [[v,u,p],[q,v,p],[p,v,u],[p,q,v],[u,p,v],[v,p,q]][i % 6].map(x => x*255|0); },
  text(str, x, y, rgb = [255,255,255], size = 8){ fx.clearRect(0, 0, 256, 24); fx.font = '700 ' + size + 'px monospace'; fx.textBaseline = 'top'; fx.fillStyle = '#fff'; fx.fillText(String(str), 0, 0);
    const wd = Math.min(256, Math.ceil(fx.measureText(String(str)).width)), d = fx.getImageData(0, 0, Math.max(1, wd), size + 2).data;
    for (let j = 0; j < size + 2; j++) for (let i = 0; i < wd; i++) if (d[(j*wd + i)*4 + 3] > 110) led.set(x + i, y + j, rgb[0], rgb[1], rgb[2]); },
};
onmessage = e => {
  const m = e.data;
  if (m.code !== undefined) { try { fn = new Function('led', 't', '"use strict";' + m.code); postMessage({ ok: true }); } catch (err) { fn = null; postMessage({ error: String(err.message || err) }); } return; }
  W = m.w; H = m.h; buf = new Uint8ClampedArray(W*H*4);
  if (fn) { try { fn(led, m.t); } catch (err) { postMessage({ error: String(err.message || err) }); fn = null; } }
  postMessage({ frame: buf, w: W, h: H }, [buf.buffer]);
};`;
let workerURL;
export class CodeSource {
  constructor(code){ this.code = code; this.err = ''; this.busy = false; this.img = null; this.listeners = new Set(); this.boot(); }
  boot(){
    if (this.w) this.w.terminate();
    workerURL = workerURL || URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }));
    this.w = new Worker(workerURL); this.busy = false; this.sent = 0;
    this.w.onmessage = e => { const m = e.data; if (m.error) { this.err = m.error; this.notify(); } if (m.ok) { this.err = ''; this.notify(); } if (m.frame) { this.img = new ImageData(m.frame, m.w, m.h); this.busy = false; } };
    this.w.postMessage({ code: this.code });
  }
  setCode(c){ this.code = c; this.boot(); }
  notify(){ this.listeners.forEach(f => f(this)); }
  draw(c, w, h, t){
    // a watchdog: a frame that takes longer than a second means a runaway loop; stop it
    if (this.busy && performance.now() - this.sent > 1000) { this.err = 'Stopped: a frame took longer than one second.'; this.w.terminate(); this.w = null; this.notify(); }
    if (this.w && !this.busy) { this.busy = true; this.sent = performance.now(); this.w.postMessage({ w, h, t }); }
    if (this.img && this.img.width === w && this.img.height === h) c.putImageData(this.img, 0, 0); else { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); }
  }
  dispose(){ if (this.w) this.w.terminate(); this.w = null; }
}

// ---------- preset looks (motion-aware: every zone is self-contained) ----------
const T = ['chest', 'stomach'];
export const PRESETS = [
  { id: 'flannel', label: 'Flannel', note: 'Colors and lines change about once a second', zones: [
    { zone: ['chest'], src: 'flannel', opts: { seed: 0 } }, { zone: ['stomach'], src: 'flannel', opts: { seed: 0 } }, { zone: ['back'], src: 'flannel', opts: { seed: 0 } },
    { zone: ['sleeveL', 'sleeveR'], src: 'flannel', opts: { seed: 0 } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#3a0d0d' } } ] },
  { id: 'show', label: 'Show + socials', note: 'Your show on the torso and back, handles on the sleeves', zones: [
    { span: T, src: 'video', opts: { clip: 'surf' } }, { zone: ['back'], src: 'video', opts: { clip: 'surf' } },
    { zone: ['sleeveL', 'sleeveR'], src: 'ticker', opts: { text: '@yourname', color: '#eef0f3', bg: '#0b1a24' } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { match: 'surf' } } ] },
  { id: 'fireplace', label: 'Snowy fireplace', note: 'A fire framed inside the torso, snow on the sleeves', zones: [
    { span: T, src: 'fireplace' }, { zone: ['back'], src: 'snow', opts: { ground: true } },
    { zone: ['sleeveL', 'sleeveR'], src: 'snow' }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#ff8a2a', breathe: true } } ] },
  { id: 'psych', label: 'Psychedelic', note: 'Plasma on the torso, vertical stripes on the sleeves', zones: [
    { span: T, src: 'plasma' }, { zone: ['back'], src: 'plasma', opts: { phase: 120, speed: .8 } },
    { zone: ['sleeveL', 'sleeveR'], src: 'stripes', opts: { n: 3 } }, { zone: ['cuffL', 'cuffR'], src: 'stripes', opts: { n: 6, speed: 10 } } ] },
  { id: 'layout', label: 'Video layout', note: 'Video on the stomach, a matching color around it, clock and weather on the sleeves', zones: [
    { zone: ['stomach'], src: 'video', opts: { clip: 'ocean' } }, { zone: ['chest', 'back', 'cuffL', 'cuffR'], src: 'solid', opts: { match: 'ocean' } },
    { zone: ['sleeveL'], src: 'clock' }, { zone: ['sleeveR'], src: 'temp', opts: { value: 48 } } ] },
  { id: 'santa', label: 'Dancing Santa', note: 'Holiday special', zones: [
    { span: T, src: 'video', opts: { clip: 'santa' } }, { zone: ['back'], src: 'video', opts: { clip: 'santa' } },
    { zone: ['sleeveL', 'sleeveR'], src: 'snow' }, { zone: ['cuffL', 'cuffR'], src: 'stripes', opts: { n: 6, colors: ['#d61f2c', '#f4f4f4'], speed: 3 } } ] },
  { id: 'surf', label: 'Surf', zones: [
    { span: T, src: 'video', opts: { clip: 'surf' } }, { zone: ['back'], src: 'video', opts: { clip: 'surf' } },
    { zone: ['sleeveL', 'sleeveR'], src: 'stripes', opts: { n: 4, colors: ['#0f7c8c', '#e9f2ef'], speed: 2 } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#e0b878' } } ] },
  { id: 'ocean', label: 'Night ocean', zones: [
    { span: T, src: 'video', opts: { clip: 'ocean' } }, { zone: ['back'], src: 'video', opts: { clip: 'ocean' } },
    { zone: ['sleeveL', 'sleeveR'], src: 'solid', opts: { color: '#06305a', breathe: true } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#19d3ff' } } ] },
  { id: 'eq', label: 'Equalizer', note: 'Bars on the torso, level meters down the sleeves', zones: [
    { span: T, src: 'eq' }, { zone: ['back'], src: 'eq' }, { zone: ['sleeveL', 'sleeveR'], src: 'eq', opts: { vertical: true } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#22ff88', breathe: true } } ] },
  { id: 'grid', label: 'Neon grid', zones: [
    { span: T, src: 'grid' }, { zone: ['back'], src: 'grid' }, { zone: ['sleeveL', 'sleeveR'], src: 'streaks', opts: { color: '#ff3d8b' } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#33e6ff' } } ] },
  { id: 'warp', label: 'Warp speed', zones: [
    { span: T, src: 'warp' }, { zone: ['back'], src: 'warp' }, { zone: ['sleeveL', 'sleeveR'], src: 'streaks' }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#5b6cff' } } ] },
  { id: 'aurora', label: 'Aurora', zones: [
    { span: T, src: 'video', opts: { clip: 'aurora' } }, { zone: ['back'], src: 'video', opts: { clip: 'aurora' } }, { zone: ['sleeveL', 'sleeveR'], src: 'solid', opts: { match: 'aurora' } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#36ff9a' } } ] },
  { id: 'rain', label: 'City rain', zones: [
    { span: T, src: 'video', opts: { clip: 'rain' } }, { zone: ['back'], src: 'video', opts: { clip: 'rain' } }, { zone: ['sleeveL', 'sleeveR'], src: 'streaks', opts: { color: '#3fd7c8' } }, { zone: ['cuffL', 'cuffR'], src: 'solid', opts: { color: '#ff4fb0' } } ] },
  { id: 'mix', label: 'Mixed zones', note: 'Each zone doing its own thing', zones: [
    { zone: ['chest'], src: 'code', opts: {} }, { zone: ['stomach'], src: 'video', opts: { clip: 'santa' } }, { zone: ['back'], src: 'ad' },
    { zone: ['sleeveL'], src: 'clock' }, { zone: ['sleeveR'], src: 'ticker', opts: { text: '@yourname' } }, { zone: ['cuffL', 'cuffR'], src: 'stripes', opts: { n: 4 } } ] },
];
