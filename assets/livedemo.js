// Live demo: plays a video channel on the display panel of a concept-render hoodie.
// The photo is never warped. A WebGL2 shader maps the video into the panel mask,
// bends it with a displacement map taken from the fabric folds, multiplies it by the
// photo's own shading, and spills the panel's light onto nearby fabric.
const VS = `#version 300 es
in vec2 p; out vec2 v; void main(){ v = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uBase, uMaps, uWarp, uA, uB;
uniform vec4 uBox;        // panel box in image uv (x,y,w,h)
uniform vec2 uCoverA, uCoverB; // video cover scale per channel
uniform float uMix, uTime, uGrid, uCols, uRows, uGain, uHasA, uHasB;
vec2 cover(vec2 uv, vec2 s){ return (uv-.5)*s+.5; }
vec3 vid(sampler2D t, vec2 uv, vec2 s, float lod){ return textureLod(t, clamp(cover(uv,s),.001,.999), lod).rgb; }
vec3 srgb2lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 lin2srgb(vec3 c){ return pow(max(c,0.), vec3(1./2.2)); }
void main(){
  vec3 base = texture(uBase, v).rgb;
  vec3 m = texture(uMaps, v).rgb;       // r: shade, g: panel mask, b: spill reach
  vec3 w = texture(uWarp, v).rgb;       // r,g: fold displacement (0.5 = none), b: fold depth
  vec2 uv = (v - uBox.xy) / uBox.zw;
  vec2 disp = (w.rg - .5) * vec2(.06, .05);
  vec2 suv = uv + disp;
  float lodBias = 0.;
  if (uGrid > .5) { suv = (floor(suv*vec2(uCols,uRows))+.5)/vec2(uCols,uRows); }
  // transition: a scan line sweeps down; below it the old channel, above it the new one
  float edge = uMix*1.25 - .12;
  float wipe = smoothstep(edge-.004, edge+.004, uv.y);       // 1 = still old channel
  vec3 a = uHasA > .5 ? vid(uA, suv, uCoverA, lodBias) : vec3(0.);
  vec3 b = uHasB > .5 ? vid(uB, suv, uCoverB, lodBias) : vec3(0.);
  float trans = uMix >= 1. ? 0. : 1.;
  vec3 c = mix(b, a * (1. - .35*uMix), wipe * trans);
  float scan = trans * exp(-pow((uv.y-edge)*90., 2.)) * step(0.,uMix);
  c += vec3(.55,.75,.9) * scan * .6;
  // a little bloom inside the panel, as light scatters in the top film
  vec3 glowA = uHasA > .5 ? vid(uA, suv, uCoverA, 4.) : vec3(0.);
  vec3 glowB = uHasB > .5 ? vid(uB, suv, uCoverB, 4.) : vec3(0.);
  c += .12 * mix(glowB, glowA, wipe * trans);
  vec3 lc = srgb2lin(c);
  if (uGrid > .5) {
    vec2 cell = fract((uv + disp) * vec2(uCols,uRows)) - .5;
    float d = length(cell);
    float dot_ = smoothstep(.48, .22, d);
    lc = lc * mix(.18, 1., dot_) * 1.45;
  }
  // fabric shading from the photo: folds darken, highlights lift
  float shade = m.r;
  float s = pow(shade, 1.15) * 1.45 + w.b*.0;
  vec3 panel = lc * s * uGain;
  panel = panel * 1.35 / (1. + panel * .55);   // soft knee: bright content rolls off instead of clipping
  // a dark, slightly glossy surface where the panel is off, plus the photo's sheen
  vec3 off = srgb2lin(base);
  vec3 lit = off*.35 + panel;
  // spill: light from the nearest part of the panel falls on nearby fabric and the deck
  vec2 nuv = clamp(uv, .02, .98);
  vec3 avgA = uHasA > .5 ? vid(uA, nuv, uCoverA, 6.) : vec3(0.);
  vec3 avgB = uHasB > .5 ? vid(uB, nuv, uCoverB, 6.) : vec3(0.);
  vec3 avg = srgb2lin(mix(avgB, avgA, uMix < 1. ? (1.-uMix) : 0.));
  vec3 outside = srgb2lin(base) + avg * m.b * (.20 + 1.6*dot(srgb2lin(base),vec3(.3,.5,.2)));
  vec3 col = mix(outside, lit, m.g);
  o = vec4(lin2srgb(col), 1.);
}`;

function sh(gl, t, s){ const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if(!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
function loadImg(src){ return new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

class LiveDemo {
  constructor(root){
    this.root = root; this.cfg = JSON.parse(root.dataset.live);
    this.canvas = root.querySelector('canvas');
    this.buttons = [...document.querySelectorAll('[data-channel]')];
    this.gridBtn = document.querySelector('[data-led-grid]');
    this.status = document.querySelector('[data-live-status]');
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cur = null; this.prev = null; this.mix = 1; this.grid = 0; this.visible = false; this.started = false;
    const io = new IntersectionObserver(es => { for (const e of es) { this.visible = e.isIntersecting; if (this.visible) this.start(); this.playPause(); } }, { rootMargin: '200px' });
    io.observe(root);
  }
  async start(){
    if (this.started) return; this.started = true;
    const gl = this.gl = this.canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) { this.root.classList.add('live-nogl'); return; }
    const pr = this.pr = gl.createProgram();
    gl.attachShader(pr, sh(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = n => gl.getUniformLocation(pr, n);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    const big = this.canvas.clientWidth * Math.min(devicePixelRatio || 1, 2) > 900;
    const [base, maps, warp] = await Promise.all([loadImg(big ? this.cfg.base2x : this.cfg.base), loadImg(this.cfg.maps), loadImg(this.cfg.warp)]);
    this.tex = { base: this.mk(0, base), maps: this.mk(1, maps), warp: this.mk(2, warp), a: this.mk(3, null, true), b: this.mk(4, null, true) };
    gl.uniform1i(this.u('uBase'), 0); gl.uniform1i(this.u('uMaps'), 1); gl.uniform1i(this.u('uWarp'), 2); gl.uniform1i(this.u('uA'), 3); gl.uniform1i(this.u('uB'), 4);
    gl.uniform4fv(this.u('uBox'), this.cfg.box);
    gl.uniform1f(this.u('uCols'), this.cfg.cols); gl.uniform1f(this.u('uRows'), this.cfg.rows); gl.uniform1f(this.u('uGain'), this.cfg.gain || 1);
    this.slots = [{ tex: this.tex.a, el: null, cover: [1,1] }, { tex: this.tex.b, el: null, cover: [1,1] }];
    this.resize(); addEventListener('resize', () => this.resize());
    this.buttons.forEach(b => b.addEventListener('click', () => this.select(b.dataset.channel)));
    this.gridBtn?.addEventListener('click', () => { this.grid = this.grid ? 0 : 1; this.gridBtn.setAttribute('aria-pressed', String(!!this.grid)); if (this.reduce) this.draw(); });
    this.root.classList.add('live-ready');
    this.select(this.cfg.channels[0].id, true);
    if (!this.reduce) this.loop();
  }
  mk(unit, img, video){
    const gl = this.gl, t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, video ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
    return t;
  }
  resize(){
    const dpr = Math.min(devicePixelRatio || 1, 2), r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    if (this.gl) { this.gl.viewport(0, 0, this.canvas.width, this.canvas.height); if (this.reduce) this.draw(); }
  }
  source(ch){
    const hd = this.canvas.clientWidth * Math.min(devicePixelRatio || 1, 2) > 760;
    const v = document.createElement('video');
    const webm = v.canPlayType('video/webm; codecs="vp9"');
    return `assets/video/ch-${ch}-${hd ? 'hd' : 'sd'}.${webm ? 'webm' : 'mp4'}`;
  }
  makeEl(ch){
    if (this.reduce) { const i = new Image(); i.src = `assets/video/ch-${ch}-poster.jpg`; i.ready = new Promise(r => { i.onload = r; }); return i; }
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.src = this.source(ch);
    v.ready = new Promise(r => v.addEventListener('canplay', r, { once: true }));
    v.play().catch(() => {});
    return v;
  }
  async select(id, first){
    if (this.cur && this.cur.id === id) return;
    const ch = this.cfg.channels.find(c => c.id === id); if (!ch) return;
    this.buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.channel === id)));
    if (this.status) this.status.textContent = `Now showing: ${ch.label}`;
    const el = this.makeEl(id);
    const token = this.token = {};
    await el.ready;
    if (token !== this.token) { if (el.pause) { el.pause(); el.removeAttribute('src'); el.load(); } return; }
    // move current into slot A (old), new into slot B
    const old = this.cur;
    if (this.prev && this.prev !== old) this.drop(this.prev);
    this.prev = old;
    this.slots[0].el = old ? old.el : null; this.slots[0].cover = old ? old.cover : [1,1];
    const vw = el.videoWidth || el.naturalWidth, vh = el.videoHeight || el.naturalHeight;
    const pa = (this.cfg.box[2] * this.cfg.aspect) / this.cfg.box[3]; // panel w/h in pixels
    const va = vw / vh;
    const cover = va > pa ? [pa / va, 1] : [1, va / pa];
    this.cur = { id, el, cover };
    this.slots[1].el = el; this.slots[1].cover = cover;
    this.mix = (first || this.reduce) ? 1 : 0; this.t0 = performance.now();
    if (this.reduce) { this.upload(0); this.upload(1); this.draw(); }
  }
  drop(entry){ const el = entry.el; if (el && el.pause) { el.pause(); el.removeAttribute('src'); el.load(); } }
  playPause(){ for (const s of [this.cur, this.prev]) { const el = s && s.el; if (el && el.play) { if (this.visible) el.play().catch(() => {}); else el.pause(); } } }
  upload(i){
    const s = this.slots[i], gl = this.gl; if (!s.el) return false;
    if (s.el.readyState !== undefined && s.el.readyState < 2) return false;
    gl.activeTexture(gl.TEXTURE3 + i); gl.bindTexture(gl.TEXTURE_2D, s.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s.el); gl.generateMipmap(gl.TEXTURE_2D);
    return true;
  }
  draw(){
    const gl = this.gl, dur = 900;
    if (this.mix < 1) this.mix = Math.min(1, (performance.now() - this.t0) / dur);
    const hasB = this.upload(1), hasA = this.mix < 1 ? this.upload(0) : false;
    if (this.mix >= 1 && this.prev) { this.drop(this.prev); this.prev = null; this.slots[0].el = null; }
    gl.uniform1f(this.u('uHasA'), hasA ? 1 : 0); gl.uniform1f(this.u('uHasB'), hasB ? 1 : 0);
    gl.uniform2fv(this.u('uCoverA'), this.slots[0].cover); gl.uniform2fv(this.u('uCoverB'), this.slots[1].cover);
    gl.uniform1f(this.u('uMix'), this.mix); gl.uniform1f(this.u('uGrid'), this.grid); gl.uniform1f(this.u('uTime'), performance.now() / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  loop(){
    let last = 0;
    const f = t => { requestAnimationFrame(f); if (!this.visible || t - last < 1000 / 31) return; last = t; this.draw(); };
    requestAnimationFrame(f);
  }
}
document.querySelectorAll('[data-live]').forEach(el => new LiveDemo(el));
