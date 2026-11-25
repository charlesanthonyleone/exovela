// Exovela live garment: per-zone emissive LED rendering on a concept-render photo.
// Each zone (chest, stomach, sleeves, cuffs, back...) has its own source. Sources draw into small
// per-zone canvases at "LED resolution"; a WebGL2 shader turns every source pixel into an emissive
// LED (or OLED subpixel triad) that follows the knit's folds and shading. The photo is never warped.
import { SOURCES, PRESETS, clips } from './garment-sources.js';

const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uBase, uMaps, uZone, uAtlas;
uniform vec4 uBox[10]; uniform vec4 uAt[10]; uniform float uOn[10];
uniform vec2 uAtlasSize; uniform float uLook, uSel, uPulse, uGlow;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
void main(){
  vec3 base = texture(uBase, v).rgb;
  vec3 m = texture(uMaps, v).rgb;              // r shade (knit texture), g display mask, b spill reach
  float idf = texture(uZone, v).r * 255.;       // zone id * 20
  int id = int(floor(idf/20. + .5)) - 1;
  vec3 col = lin(base);
  vec3 emit = vec3(0.);
  if (id >= 0 && id < 10 && uOn[id] > .5) {
    vec4 bx = uBox[id], at = uAt[id];
    vec2 uv = clamp((v - bx.xy) / bx.zw, 0., .9999);
    vec2 cell = uv * at.zw;
    vec2 ci = floor(cell), f = fract(cell) - .5;
    vec2 tc = (at.xy + ci + .5) / uAtlasSize;
    vec3 px = lin(texture(uAtlas, tc).rgb);
    // soft halo from neighbours, as light spreads in the knit above the LEDs
    vec3 halo = lin(texture(uAtlas, (at.xy + clamp(cell, vec2(.5), at.zw-vec2(.5))) / uAtlasSize).rgb);
    float shade = m.r;
    vec3 e;
    if (uLook < .5) {           // LED: round diodes in a square grid
      float d = length(f);
      float core = smoothstep(.36, .18, d);
      float glow = exp(-d*d*9.);
      e = px * (core*1.25 + glow*.35) + halo * .10;
    } else {                    // OLED: RGB stripe subpixels
      float sx = f.x + .5;
      vec3 sub = vec3(smoothstep(.0,.04,sx)*smoothstep(.31,.27,sx), smoothstep(.35,.39,sx)*smoothstep(.64,.60,sx), smoothstep(.69,.73,sx)*smoothstep(.98,.94,sx));
      float row = smoothstep(.47,.40,abs(f.y));
      e = px * sub * row * 2.6 + halo*.06;
    }
    // light comes through the knit: texture and folds modulate it
    e *= (.45 + .9*shade) * uGlow;
    e = e * 1.3 / (1. + e*.5);
    emit = e * m.g;
    col = mix(col, col*.55, m.g) + emit;
    if (float(id) == uSel) col += vec3(.55,.8,1.) * uPulse * .08 * m.g * (.5+.5*shade);
  }
  // spill: average garment light onto nearby fabric and the deck
  vec3 avg = lin(textureLod(uAtlas, vec2(.5), 10.).rgb);
  col += avg * m.b * .55 * (1. - m.g);
  o = vec4(pow(col, vec3(1./2.2)), 1.);
}`;

function sh(gl, t, s){ const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if(!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });

export class LiveGarment {
  constructor(root, cfg){
    this.root = root; this.cfg = cfg;
    this.canvas = root.querySelector('canvas');
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pitch = cfg.pitch || 10; this.look = 0;
    this.view = cfg.views[0].id;
    this.assign = {};       // zoneId -> { src, opts, span }
    this.zc = {};           // zoneId -> canvas
    this.sel = null; this.pulse = 0;
    this.listeners = [];
    this.visible = false; this.started = false;
    new IntersectionObserver(es => { for (const e of es) { this.visible = e.isIntersecting; if (this.visible) this.start(); clips.setActive(this.visible); } }, { rootMargin: '150px' }).observe(root);
  }
  on(fn){ this.listeners.push(fn); }
  emit(){ this.last = 0; this.listeners.forEach(f => f(this)); }
  zonesInView(){ const v = this.cfg.views.find(x => x.id === this.view); return v.zones; }
  zone(id){ for (const v of this.cfg.views) for (const z of v.zones) if (z.id === id) return z; }
  res(z){
    const v = this.cfg.views.find(x => x.zones.includes(z)) || this.cfg.views[0];
    const p = this.pitch * (z.pitchMul || 1);
    const cols = Math.max(2, Math.round(z.box[2] * v.mmW / p));
    const rows = z.rows || Math.max(1, Math.round(z.box[3] * v.mmW * v.aspectHW / p));
    return [cols, rows];
  }
  async start(){
    if (this.started) return; this.started = true;
    const gl = this.gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) { this.root.classList.add('live-nogl'); return; }
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {}; for (const n of ['uBase','uMaps','uZone','uAtlas','uBox','uAt','uOn','uAtlasSize','uLook','uSel','uPulse','uGlow']) this.U[n] = gl.getUniformLocation(pr, n);
    gl.uniform1i(this.U.uBase, 0); gl.uniform1i(this.U.uMaps, 1); gl.uniform1i(this.U.uZone, 2); gl.uniform1i(this.U.uAtlas, 3);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    this.tex = {}; this.idData = {};
    const big = this.canvas.clientWidth * Math.min(devicePixelRatio || 1, 2) > 900;
    await Promise.all(this.cfg.views.map(async v => {
      const [b, m, z] = await Promise.all([loadImg(big ? v.base2x : v.base), loadImg(v.maps), loadImg(v.zone)]);
      this.tex[v.id] = { base: this.mk(b, gl.LINEAR), maps: this.mk(m, gl.LINEAR), zone: this.mk(z, gl.NEAREST) };
      const c = document.createElement('canvas'); c.width = z.width; c.height = z.height; const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(z, 0, 0);
      this.idData[v.id] = { w: z.width, h: z.height, d: cx.getImageData(0, 0, z.width, z.height).data };
    }));
    this.atlas = document.createElement('canvas'); this.actx = this.atlas.getContext('2d');
    this.atex = gl.createTexture();
    this.layout();
    this.resize(); addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('click', e => this.click(e));
    this.root.classList.add('live-ready');
    if (this.pendingPreset) this.applyPreset(this.pendingPreset);
    // reduced motion: a still frame at a fixed time, refreshed once a second or right after any change
    const loop = t => { requestAnimationFrame(loop); if (!this.visible) return; if (t - (this.last || 0) < (this.reduce ? 1000 : 1000/30)) return; this.last = t; this.frame(this.reduce ? 2 : t/1000); };
    requestAnimationFrame(loop);
  }
  mk(img, filt){
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); return t;
  }
  layout(){
    // pack every zone's LED grid into one atlas, stacked in rows
    let y = 0, w = 0; this.at = {};
    for (const v of this.cfg.views) for (const z of v.zones) {
      if (this.at[z.id]) continue;
      const [c, r] = this.res(z); this.at[z.id] = [0, y, c, r]; y += r + 1; w = Math.max(w, c);
      const zc = this.zc[z.id] || document.createElement('canvas'); zc.width = c; zc.height = r; this.zc[z.id] = zc;
    }
    this.atlas.width = w; this.atlas.height = y;
  }
  setPitch(p){ this.pitch = p; if (this.atlas) this.layout(); this.emit(); }
  setLook(l){ this.look = l; this.emit(); }
  setView(id){ this.view = id; this.emit(); }
  select(id){ this.sel = id; this.pulse = 1; this.emit(); }
  set(zoneId, src, opts = {}, span = null){
    const prev = this.assign[zoneId]; if (prev && prev.inst && prev.inst.dispose && !span) prev.inst.dispose();
    const S = SOURCES[src]; if (!S) return;
    this.assign[zoneId] = { src, opts, span, inst: span ? null : S.create(opts, this) };
    this.emit();
  }
  setSpan(zoneIds, src, opts = {}){
    for (const id of zoneIds) { const p = this.assign[id]; if (p && p.inst && p.inst.dispose) p.inst.dispose(); }
    const inst = SOURCES[src].create(opts, this);
    const key = zoneIds.join('+');
    for (const id of zoneIds) this.assign[id] = { src, opts, span: key, inst, group: zoneIds };
    this.emit();
  }
  applyPreset(p){
    if (!this.atlas) { this.pendingPreset = p; return; }
    for (const id of Object.keys(this.assign)) { const a = this.assign[id]; if (a.inst && a.inst.dispose) a.inst.dispose(); }
    this.assign = {};
    for (const rule of p.zones) {
      if (rule.span) this.setSpan(rule.span, rule.src, rule.opts || {});
      else for (const id of [].concat(rule.zone)) this.set(id, rule.src, { ...(rule.opts || {}), zone: id });
    }
    this.preset = p.id; this.emit();
  }
  draw(t){
    const done = new Set();
    for (const [id, a] of Object.entries(this.assign)) {
      if (!this.zc[id] || !a.inst) continue;
      if (a.span) {
        if (done.has(a.span)) continue; done.add(a.span);
        // a span: render once across the combined grid of its zones (stacked vertically), then split
        const zs = a.group.map(g => this.zc[g]);
        const W = Math.max(...zs.map(c => c.width)), H = zs.reduce((s, c) => s + c.height, 0);
        const tmp = a._tmp || (a._tmp = document.createElement('canvas')); if (tmp.width !== W || tmp.height !== H) { tmp.width = W; tmp.height = H; }
        const tc = tmp.getContext('2d'); a.inst.draw(tc, W, H, t);
        let yy = 0; for (const g of a.group) { const c = this.zc[g]; const cx = c.getContext('2d'); cx.clearRect(0,0,c.width,c.height); cx.drawImage(tmp, 0, yy, W, c.height, 0, 0, c.width, c.height); yy += c.height; this.assign[g]._tmp = tmp; }
      } else {
        const c = this.zc[id]; a.inst.draw(c.getContext('2d'), c.width, c.height, t);
      }
    }
    const ac = this.actx; ac.fillStyle = '#000'; ac.fillRect(0, 0, this.atlas.width, this.atlas.height);
    for (const [id, r] of Object.entries(this.at)) if (this.assign[id]) ac.drawImage(this.zc[id], r[0], r[1]);
  }
  frame(t){
    const gl = this.gl; if (!gl) return;
    this.t = t; this.draw(t); this.frameNo = (this.frameNo || 0) + 1;
    if (this.paused2d) { this.pulse = Math.max(0, this.pulse - 0.04); return; }  // the 3D viewer is showing; it reads the atlas
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.atex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlas); gl.generateMipmap(gl.TEXTURE_2D);
    const T = this.tex[this.view];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.base);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.maps);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.zone);
    const zs = this.zonesInView(); const box = new Float32Array(40), at = new Float32Array(40), on = new Float32Array(10);
    let selIdx = -1;
    zs.forEach(z => { const i = z.idx; box.set(z.box, i*4); at.set(this.at[z.id], i*4); on[i] = this.assign[z.id] ? 1 : 0; if (z.id === this.sel) selIdx = i; });
    gl.uniform4fv(this.U.uBox, box); gl.uniform4fv(this.U.uAt, at); gl.uniform1fv(this.U.uOn, on);
    gl.uniform2f(this.U.uAtlasSize, this.atlas.width, this.atlas.height);
    gl.uniform1f(this.U.uLook, this.look); gl.uniform1f(this.U.uSel, selIdx);
    this.pulse = Math.max(0, this.pulse - 0.04); gl.uniform1f(this.U.uPulse, this.pulse * (0.6 + 0.4*Math.sin(t*12)));
    gl.uniform1f(this.U.uGlow, this.cfg.glow || 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2), r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  hit(e){
    const r = this.canvas.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    const D = this.idData[this.view]; if (!D) return null;
    const x = Math.min(D.w-1, Math.floor(u*D.w)), y = Math.min(D.h-1, Math.floor(v*D.h));
    const id = Math.round(D.d[(y*D.w + x)*4] / 20) - 1; if (id < 0) return null;
    const z = this.zonesInView().find(z => z.idx === id); if (!z) return null;
    return { z, lu: (u - z.box[0]) / z.box[2], lv: (v - z.box[1]) / z.box[3] };
  }
  click(e){
    const h = this.hit(e); if (!h) return; this.tapZone(h.z.id, h.lu, h.lv);
  }
  // a tap at zone-local (lu, lv): plays the source if it takes taps (the game), otherwise selects the zone
  tapZone(id, lu, lv){
    this.last = 0;
    const a = this.assign[id];
    if (a && a.inst && a.inst.tap) {
      if (a.span) { // convert to span-local coordinates
        const tot = a.group.reduce((s, g) => s + this.zc[g].height, 0); let off = 0;
        for (const g of a.group) { if (g === id) break; off += this.zc[g].height; }
        lv = (off + lv * this.zc[id].height) / tot;
      }
      a.inst.tap(lu, lv); return true;
    }
    this.select(id); return false;
  }
}
