/* Exovela skin engine: full-motion canvases painted onto the garment display UVs.
   Atlas: front (0.02–0.48, 0.30–0.98), back (0.52–0.98, 0.30–0.98), sleeves (v 0.02–0.28). */
export const SKIN_LIST = [
  { id: 'aurora', name: 'Northern Lights', kind: 'cinematic', power: 'medium' },
  { id: 'cartoon', name: 'Channel 7', kind: 'show', power: 'medium' },
  { id: 'solstice', name: 'Solstice', kind: 'still', power: 'low' },
  { id: 'pulse', name: 'Pulse', kind: 'music', power: 'medium' },
  { id: 'profile', name: 'Profile', kind: 'profile', power: 'low' },
  { id: 'overdrive', name: 'Overdrive', kind: 'motion', power: 'high' },
  { id: 'grid', name: 'Horizon Grid', kind: 'motion', power: 'medium' }
];

const TAU = Math.PI * 2;

export function createSkinCanvas(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

export function createSkin(id, canvas, opts = {}) {
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  const S = canvas.width;
  const state = {
    id,
    a: opts.a || '#64d2ff',
    b: opts.b || '#bf5af2',
    c: opts.c || '#05060c',
    speed: opts.speed || 1,
    still: false,
    name: opts.profileName || 'VELA',
    status: opts.status || 'out on the pier',
    track: opts.track || 'Night Bus — 120 bpm'
  };
  // offscreen layers
  const layer = document.createElement('canvas');
  layer.width = layer.height = S;
  const lx = layer.getContext('2d');

  const front = { x: S * 0.02, y: S * 0.30, w: S * 0.46, h: S * 0.68 };
  const back  = { x: S * 0.52, y: S * 0.30, w: S * 0.46, h: S * 0.68 };
  const sleeveL = { x: S * 0.02, y: S * 0.02, w: S * 0.46, h: S * 0.26 };
  const sleeveR = { x: S * 0.52, y: S * 0.02, w: S * 0.46, h: S * 0.26 };

  function hexRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function rgba(h, a) { const [r,g,b]=hexRgb(h); return `rgba(${r},${g},${b},${a})`; }

  function paintAtlas(drawFront) {
    // fill base
    ctx.fillStyle = state.c;
    ctx.fillRect(0, 0, S, S);
    // front
    ctx.save(); ctx.beginPath();
    ctx.rect(front.x, front.y, front.w, front.h); ctx.clip();
    ctx.translate(front.x, front.y);
    drawFront(ctx, front.w, front.h, 1);
    ctx.restore();
    // back (slightly dimmer, mirrored)
    ctx.save(); ctx.beginPath();
    ctx.rect(back.x, back.y, back.w, back.h); ctx.clip();
    ctx.translate(back.x + back.w, back.y); ctx.scale(-1, 1);
    ctx.globalAlpha = 0.85;
    drawFront(ctx, back.w, back.h, 0.7);
    ctx.restore();
    // sleeves: cropped strip of the same art
    for (const sl of [sleeveL, sleeveR]) {
      ctx.save(); ctx.beginPath();
      ctx.rect(sl.x, sl.y, sl.w, sl.h); ctx.clip();
      ctx.translate(sl.x, sl.y - sl.h * 0.6);
      ctx.globalAlpha = 0.9;
      drawFront(ctx, sl.w, sl.h * 2.2, 0.6);
      ctx.restore();
    }
    // faint atlas gutters (panel seams)
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(front.x, front.y, front.w, front.h);
    ctx.strokeRect(back.x, back.y, back.w, back.h);
    ctx.strokeRect(sleeveL.x, sleeveL.y, sleeveL.w, sleeveL.h);
    ctx.strokeRect(sleeveR.x, sleeveR.y, sleeveR.w, sleeveR.h);
  }

  // ---- skins ----
  function aurora(t, w, h, c, k) {
    c.fillStyle = '#020611'; c.fillRect(0, 0, w, h);
    // stars
    c.fillStyle = '#e8f0ff';
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 97) % 200) / 200 * w;
      const sy = ((i * 53) % 200) / 200 * h * 0.55;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      c.globalAlpha = tw * 0.8 * k;
      c.fillRect(sx, sy, 1.5, 1.5);
    }
    c.globalAlpha = 1;
    // curtains
    const cols = [state.a, state.b, '#30d158', '#64d2ff'];
    for (let n = 0; n < 5; n++) {
      c.save();
      const x0 = w * (0.1 + n * 0.18) + Math.sin(t * 0.3 + n) * w * 0.05;
      const grd = c.createLinearGradient(x0, h * 0.05, x0 + w * 0.08, h * 0.75);
      grd.addColorStop(0, rgba(cols[n % cols.length], 0));
      grd.addColorStop(0.25, rgba(cols[n % cols.length], 0.65 * k));
      grd.addColorStop(1, rgba(cols[n % cols.length], 0));
      c.fillStyle = grd;
      c.beginPath();
      c.moveTo(x0, 0);
      for (let y = 0; y <= h; y += 8) {
        const x = x0 + Math.sin(y * 0.02 + t * 0.8 + n) * (18 + n * 6) + Math.sin(y * 0.05 + t * 1.4) * 8;
        c.lineTo(x, y);
      }
      c.lineTo(x0 + 70, h); c.lineTo(x0 + 70, 0); c.closePath(); c.fill();
      c.restore();
    }
    // ground glow
    const g = c.createRadialGradient(w * 0.5, h * 0.95, 0, w * 0.5, h * 0.95, w * 0.6);
    g.addColorStop(0, rgba(state.a, 0.25)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }

  // original cartoon "show" — not any licensed property
  const walkers = [
    { x: 0.15, hue: 18, hat: true,  name: 'Pip' },
    { x: 0.42, hue: 200, hat: false, name: 'Dot' },
    { x: 0.7,  hue: 120, hat: false, name: 'Nim', dog: true }
  ];
  function cartoon(t, w, h, c, k) {
    const beat = (t * 2) % 1;
    // sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7ec8e3'); sky.addColorStop(0.55, '#c9e7f2'); sky.addColorStop(1, '#8dcf7a');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    // scrolling buildings
    c.fillStyle = '#2a3a4a';
    const scroll = (t * 40) % 120;
    for (let i = -1; i < 10; i++) {
      const x = i * 80 - scroll;
      const bh = 80 + ((i * 17) % 70);
      c.fillStyle = `hsl(${220 + (i % 3) * 18}, 28%, ${28 + (i % 4) * 6}%)`;
      c.fillRect(x, h * 0.42 - bh, 64, bh + h * 0.1);
      c.fillStyle = '#ffe08a';
      for (let wy = 0; wy < 5; wy++) for (let wx = 0; wx < 3; wx++) {
        if (((i + wx + wy) % 3) !== 0) c.fillRect(x + 10 + wx * 16, h * 0.42 - bh + 8 + wy * 16, 8, 8);
      }
    }
    // sidewalk
    c.fillStyle = '#6b6b70'; c.fillRect(0, h * 0.62, w, h * 0.38);
    c.fillStyle = '#8a8a90';
    for (let i = 0; i < 8; i++) c.fillRect(((i * 90 - t * 80) % (w + 90)) - 20, h * 0.62, 40, 6);
    // characters
    function person(px, py, hue, hat, frame) {
      const bob = Math.sin(frame * TAU) * 4;
      const leg = Math.sin(frame * TAU) * 10;
      c.save(); c.translate(px, py + bob);
      c.fillStyle = `hsl(${hue}, 70%, 55%)`;
      c.beginPath(); c.arc(0, -38, 16, 0, TAU); c.fill(); // head
      c.fillStyle = '#f2c8a0';
      c.beginPath(); c.arc(0, -36, 12, 0, TAU); c.fill();
      if (hat) { c.fillStyle = `hsl(${hue}, 70%, 35%)`; c.fillRect(-14, -54, 28, 8); c.fillRect(-8, -66, 16, 14); }
      c.fillStyle = `hsl(${hue}, 65%, 40%)`;
      c.fillRect(-14, -22, 28, 28); // body
      c.fillStyle = `hsl(${hue}, 65%, 30%)`;
      c.fillRect(-14, 6, 12, 22 + leg);
      c.fillRect(2, 6, 12, 22 - leg);
      c.fillRect(-22, -18, 10, 18); c.fillRect(12, -18, 10, 18);
      c.restore();
    }
    function dog(px, py, frame) {
      const bob = Math.sin(frame * TAU * 2) * 3;
      c.save(); c.translate(px, py + bob);
      c.fillStyle = '#d7a15a';
      c.fillRect(-16, -10, 28, 16);
      c.beginPath(); c.arc(14, -8, 8, 0, TAU); c.fill();
      c.fillStyle = '#c4893e'; c.fillRect(18, -6, 10, 4);
      c.fillRect(-16, 6, 6, 10 + Math.sin(frame * TAU) * 4);
      c.fillRect(-4, 6, 6, 10 - Math.sin(frame * TAU) * 4);
      c.fillRect(6, 6, 6, 10 + Math.cos(frame * TAU) * 4);
      c.fillRect(-20, -4, 6, 8); // ear
      c.restore();
    }
    const fr = t * 2.2;
    walkers.forEach((wkr, i) => {
      const px = ((wkr.x + t * 0.06 * (i === 2 ? 1.2 : 1)) % 1.2) * w - w * 0.1;
      if (wkr.dog) dog(px, h * 0.70, fr + i);
      else person(px, h * 0.70, wkr.hue, wkr.hat, fr + i);
    });
    // lower-third, like a broadcast
    c.fillStyle = 'rgba(0,0,0,0.72)'; c.fillRect(0, h * 0.86, w, h * 0.14);
    c.fillStyle = state.a; c.fillRect(0, h * 0.86, 8, h * 0.14);
    c.fillStyle = '#fff'; c.font = `700 ${Math.max(14, h * 0.045)}px ui-sans-serif,sans-serif`;
    c.fillText('CHANNEL 7  ·  PIER STREET', 18, h * 0.92);
    c.font = `500 ${Math.max(11, h * 0.03)}px ui-sans-serif,sans-serif`;
    c.fillStyle = '#cfe'; c.fillText('an original short  ·  playing on the shell', 18, h * 0.97);
  }

  function solstice(t, w, h, c, k) {
    // epic still with a very slow drift and grain — a ridge under a huge moon
    const drift = (state.still ? 0 : Math.sin(t * 0.15) * 8);
    c.save(); c.translate(drift, 0);
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1020'); sky.addColorStop(0.45, '#2a1630'); sky.addColorStop(0.7, '#c45a2a'); sky.addColorStop(1, '#1a0c10');
    c.fillStyle = sky; c.fillRect(-20, 0, w + 40, h);
    // moon
    const mx = w * 0.7, my = h * 0.28, mr = Math.min(w, h) * 0.18;
    const halo = c.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3);
    halo.addColorStop(0, 'rgba(255,220,170,0.85)'); halo.addColorStop(0.25, 'rgba(255,180,100,0.25)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(mx, my, mr * 3, 0, TAU); c.fill();
    c.fillStyle = '#f3e1c3'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    c.fillStyle = 'rgba(160,130,100,0.25)';
    c.beginPath(); c.ellipse(mx - mr * 0.3, my, mr * 0.4, mr * 0.28, 0.3, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(mx + mr * 0.2, my + mr * 0.25, mr * 0.25, mr * 0.2, 0, 0, TAU); c.fill();
    // ridge
    c.fillStyle = '#12080a';
    c.beginPath(); c.moveTo(-20, h);
    c.lineTo(-20, h * 0.72);
    c.quadraticCurveTo(w * 0.2, h * 0.5, w * 0.45, h * 0.62);
    c.quadraticCurveTo(w * 0.7, h * 0.78, w + 20, h * 0.58);
    c.lineTo(w + 20, h); c.closePath(); c.fill();
    // a standing stone, not a person
    c.fillStyle = '#1a0e10';
    c.beginPath();
    c.moveTo(w * 0.28, h * 0.78);
    c.lineTo(w * 0.31, h * 0.48);
    c.lineTo(w * 0.36, h * 0.47);
    c.lineTo(w * 0.34, h * 0.78);
    c.closePath(); c.fill();
    const glow = c.createLinearGradient(w * 0.31, h * 0.47, w * 0.31, h * 0.7);
    glow.addColorStop(0, rgba(state.a, 0.55)); glow.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = glow; c.fillRect(w * 0.305, h * 0.47, 6, h * 0.2);
    c.restore();
    // grain
    if (k > 0.5) {
      const g = c.getImageData(0, 0, Math.min(w, 4), 1); // no, too expensive
    }
    c.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 200; i++) c.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }

  function pulse(t, w, h, c, k) {
    c.fillStyle = '#050308'; c.fillRect(0, 0, w, h);
    const bpm = 120;
    const beat = (t * (bpm / 60)) % 1;
    const kick = Math.pow(1 - beat, 2.4);
    const mid = 0.5 + 0.5 * Math.sin(t * 5.2);
    const hi = 0.5 + 0.5 * Math.sin(t * 17);
    const cx = w / 2, cy = h * 0.46;
    // rings
    for (let i = 6; i >= 0; i--) {
      const r = (i + 1) * Math.min(w, h) * 0.08 * (1 + kick * 0.25);
      c.beginPath(); c.arc(cx, cy, r, 0, TAU);
      c.strokeStyle = i % 2 ? rgba(state.a, 0.18 + kick * 0.5) : rgba(state.b, 0.16 + kick * 0.4);
      c.lineWidth = 3 + kick * 6; c.stroke();
    }
    // bars along the bottom
    const n = 24;
    for (let i = 0; i < n; i++) {
      const env = 0.3 + 0.7 * Math.abs(Math.sin(t * 4 + i * 0.5)) * (0.5 + 0.5 * Math.sin(t * 2 + i));
      const bh = h * 0.28 * (env * (0.5 + kick * 0.5 + mid * 0.3));
      const bw = w / n * 0.62;
      const x = (i + 0.2) * (w / n);
      const g = c.createLinearGradient(0, h, 0, h - bh);
      g.addColorStop(0, state.a); g.addColorStop(1, state.b);
      c.fillStyle = g;
      c.fillRect(x, h - bh - h * 0.06, bw, bh);
    }
    // center disc
    c.fillStyle = rgba(state.a, 0.8);
    c.beginPath(); c.arc(cx, cy, 10 + kick * 16, 0, TAU); c.fill();
  }

  function profile(t, w, h, c, k) {
    c.fillStyle = '#0a0c14'; c.fillRect(0, 0, w, h);
    // wallpaper doodle
    c.strokeStyle = rgba(state.a, 0.35); c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      for (let x = 0; x < w; x += 8) {
        const y = h * 0.3 + i * 18 + Math.sin(x * 0.02 + t * 0.8 + i) * 16;
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    // avatar tile
    const ax = w * 0.08, ay = h * 0.12, as = Math.min(w, h) * 0.28;
    c.fillStyle = '#12151f'; c.fillRect(ax, ay, as, as);
    c.strokeStyle = state.a; c.lineWidth = 3; c.strokeRect(ax, ay, as, as);
    // a geometric mark, not a face
    c.save(); c.translate(ax + as / 2, ay + as / 2);
    c.rotate(t * 0.2);
    c.fillStyle = state.b;
    c.beginPath(); for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU; c.lineTo(Math.cos(a) * as * 0.32, Math.sin(a) * as * 0.32);
    } c.closePath(); c.fill();
    c.restore();
    // name + status
    c.fillStyle = '#fff';
    c.font = `700 ${Math.max(18, h * 0.07)}px ui-sans-serif,sans-serif`;
    c.fillText(state.name, ax + as + 16, ay + 36);
    c.fillStyle = rgba(state.a, 1);
    c.font = `500 ${Math.max(12, h * 0.035)}px ui-sans-serif,sans-serif`;
    c.fillText(state.status, ax + as + 16, ay + 64);
    // now playing
    const py = h * 0.72;
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(w * 0.08, py, w * 0.84, h * 0.16);
    c.fillStyle = state.b; c.fillRect(w * 0.08, py, 6, h * 0.16);
    c.fillStyle = '#fff'; c.font = `600 ${Math.max(12, h * 0.032)}px ui-sans-serif,sans-serif`;
    c.fillText('NOW ON THIS SHELL', w * 0.12, py + h * 0.055);
    c.fillStyle = '#c8d0e0'; c.font = `500 ${Math.max(12, h * 0.03)}px ui-sans-serif,sans-serif`;
    c.fillText(state.track, w * 0.12, py + h * 0.11);
    // progress
    const prog = (t * 0.05) % 1;
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(w * 0.12, py + h * 0.13, w * 0.7, 3);
    c.fillStyle = state.a; c.fillRect(w * 0.12, py + h * 0.13, w * 0.7 * prog, 3);
  }

  function overdrive(t, w, h, c, k) {
    c.fillStyle = '#03010a'; c.fillRect(0, 0, w, h);
    // streak field
    for (let i = 0; i < 48; i++) {
      const z = ((i * 0.07 + t * 0.35) % 1);
      const x = ((i * 73) % 200) / 200 * w;
      const y = z * h;
      const len = 20 + (1 - z) * 80;
      const g = c.createLinearGradient(x, y, x, y - len);
      g.addColorStop(0, rgba(i % 2 ? state.a : state.b, 0.9));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x, y - len, 2 + (1 - z) * 3, len);
    }
    // plasma orbs
    for (let i = 0; i < 5; i++) {
      const x = w * (0.2 + 0.15 * i) + Math.sin(t * 0.8 + i) * 30;
      const y = h * 0.45 + Math.cos(t * 0.6 + i * 1.3) * h * 0.2;
      const r = 40 + 20 * Math.sin(t + i);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(i % 2 ? state.a : state.b, 0.85));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    // scan bar
    const sy = ((t * 0.4) % 1) * h;
    const sg = c.createLinearGradient(0, sy - 30, 0, sy + 30);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.28)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg; c.fillRect(0, sy - 30, w, 60);
  }

  function grid(t, w, h, c, k) {
    c.fillStyle = '#07020f'; c.fillRect(0, 0, w, h);
    // sun
    const sunY = h * 0.38, sunR = w * 0.22;
    const sg = c.createLinearGradient(w / 2, sunY - sunR, w / 2, sunY + sunR);
    sg.addColorStop(0, state.b); sg.addColorStop(1, state.a);
    c.fillStyle = sg; c.beginPath(); c.arc(w / 2, sunY, sunR, 0, TAU); c.fill();
    // sun bars (mask)
    c.fillStyle = '#07020f';
    for (let i = 0; i < 10; i++) c.fillRect(0, sunY - sunR + i * (sunR * 2 / 10) + (t * 8 % 12), w, 5);
    // floor
    c.save();
    c.beginPath(); c.rect(0, h * 0.5, w, h * 0.5); c.clip();
    c.strokeStyle = rgba(state.a, 0.7); c.lineWidth = 1.5;
    const vanishingX = w / 2, vanishingY = h * 0.5;
    for (let i = -12; i <= 12; i++) {
      c.beginPath(); c.moveTo(vanishingX, vanishingY); c.lineTo(vanishingX + i * w * 0.18, h); c.stroke();
    }
    const scroll = (t * 80) % 50;
    for (let i = 0; i < 20; i++) {
      const y = h * 0.5 + Math.pow(i / 20, 1.6) * h * 0.5 + scroll * 0.4;
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    c.restore();
  }

  const drawers = { aurora, cartoon, solstice, pulse, profile, overdrive, grid };

  function tick(time) {
    const t = (state.still ? state._hold || 0 : time * state.speed);
    if (!state.still) state._hold = t;
    const draw = drawers[state.id] || aurora;
    paintAtlas((c, w, h, k) => draw(t, w, h, c, k));
  }

  tick(0);
  return {
    canvas, state, tick,
    setColors(a, b, c) { if (a) state.a = a; if (b) state.b = b; if (c) state.c = c; },
    setSpeed(s) { state.speed = s; },
    setStill(v) { state.still = v; },
    setId(id) { state.id = id; },
    setProfile(p) { Object.assign(state, p); }
  };
}

export function averageColor(canvas) {
  const ctx = canvas.getContext('2d');
  const w = 16, h = 16;
  const tmp = averageColor._t || (averageColor._t = document.createElement('canvas'));
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d', { willReadFrequently: true });
  t.drawImage(canvas, 0, 0, w, h);
  const d = t.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = w * h;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
  return [r / n / 255, g / n / 255, b / n / 255];
}
