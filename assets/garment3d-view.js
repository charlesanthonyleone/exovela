// Exovela interactive 3D viewer. Loads authored meshes (meshopt-compressed GLB) and shades the LED zones on them.
// Sweater: authored in Blender for Exovela (folds, set-in sleeve seams, side seams, rib hem/cuffs, rolled collar, baked AO).
// Shoe: "Materials Variants Shoe" by Shopify, CC BY 4.0 (github.com/KhronosGroup/glTF-Sample-Assets), retextured and re-zoned by Exovela.
// The zone pixels come straight from the LiveGarment atlas, so every look and mode shows on the model live.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';

const PI = Math.PI, TAU = PI * 2;
const mobile = matchMedia('(pointer: coarse)').matches;
const TS = mobile ? 1024 : 2048;
// zone order matches the zid baked into the meshes; sizes in metres (zone width, height) keep LED cells square
const MODELS = {
  sweater: { url: 'assets/models/sweater.glb', zones: ['chest', 'stomach', 'back', 'sleeveL', 'sleeveR', 'cuffL', 'cuffR'],
    size: { chest: [.38, .253], stomach: [.38, .275], back: [.38, .539], sleeveL: [.179, .518], sleeveR: [.179, .518], cuffL: [.16, .066], cuffR: [.16, .066] },
    fit: 1.1, dir: [.1, .08, 1] },
  shoe: { url: 'assets/models/shoe.glb', zones: ['outer', 'inner', 'heel', 'toe', 'tongue', 'sole'],
    size: { outer: [.13, .085], inner: [.13, .085], heel: [.10, .074], toe: [.11, .062], tongue: [.06, .063], sole: [.32, .03] },
    fit: 1.55, dir: [.16, .3, 1] },
};

const TL = new THREE.TextureLoader();
const texCache = {};
function tex(url, { srgb = false, repeat = false, an = 8, flip = false } = {}){
  if (texCache[url]) return texCache[url];
  const t = TL.load(url); t.flipY = flip; t.anisotropy = an; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return texCache[url] = t;
}

// LED zones on a physical fabric material. One shared uniform block per garment; uFlip is per material (pair mirroring).
function ledMaterial(base, U, flip = 0){
  const m = new THREE.MeshPhysicalMaterial(base);
  m.userData.flip = { value: flip };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, { uFlip: m.userData.flip });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 zuv; attribute float zid; varying vec2 vZuv; varying float vZid; varying vec2 vKuv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZuv = zuv; vZid = zid; vKuv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vZuv; varying float vZid; varying vec2 vKuv;
uniform sampler2D uAtlas, uKnitH; uniform vec2 uAtSize; uniform vec4 uAt[8]; uniform vec4 uZ[8]; uniform float uOn[8]; uniform vec4 uXf[8];
uniform float uLook, uSel, uPulse, uGain, uFade, uFlip, uHasH;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  int zi = int(vZid + .5);
  vec2 zu = vZuv;
  if (vZid > -.5 && uFlip > .5 && uXf[zi].x > .5) zu.x = 1. - zu.x;
  if (vZid > -.5 && zu.x >= 0. && zu.x <= 1. && zu.y >= 0. && zu.y <= 1. && uOn[zi] > .5) {
    vec4 at = uAt[zi], zz = uZ[zi];
    vec2 cell = zu * zz.xy; vec2 ci = min(floor(cell), zz.xy - 1.); vec2 f = fract(cell) - .5;
    vec3 px = texture2D(uAtlas, (at.xy + ci + .5) / uAtSize).rgb; px = pow(px, vec3(2.2));
    float asp = zz.z; vec3 e; float ppc = 1. / max(max(fwidth(cell.x), fwidth(cell.y)), 1e-4); float dotk = smoothstep(2.2, 6., ppc);
    if (uLook < .5) { float d = length(f * vec2(max(asp, 1.), max(1. / asp, 1.)));
      e = px * (smoothstep(.40, .16, d) * 1.3 + exp(-d * d * 7.) * .4) + px * .05; }
    else { float sx = f.x + .5; vec3 sub = vec3(smoothstep(.0,.05,sx)*smoothstep(.32,.27,sx), smoothstep(.35,.40,sx)*smoothstep(.65,.60,sx), smoothstep(.68,.73,sx)*smoothstep(1.,.95,sx));
      e = px * sub * smoothstep(.48, .38, abs(f.y)) * 2.7 + px * .03; }
    e = mix(px * .95, e, dotk);
    float kh = uHasH > .5 ? texture2D(uKnitH, vKuv).g : .7;
    e *= (.5 + .85 * kh) * uGain * uFade;
    totalEmissiveRadiance += e;
    diffuseColor.rgb *= mix(1., .72, uFade);
    if (abs(vZid - uSel) < .5) totalEmissiveRadiance += vec3(.35, .55, .8) * uPulse * .12;
  }
}`);
  };
  m.customProgramCacheKey = () => 'exovela-led-2' + (base.vertexColors ? 'v' : '') + (base.map ? 'm' : '');
  return m;
}
function makeU(){
  return { uAtlas: { value: null }, uAtSize: { value: new THREE.Vector2(1, 1) }, uAt: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uZ: { value: Array.from({ length: 8 }, () => new THREE.Vector4(1, 1, 1, 0)) }, uOn: { value: new Array(8).fill(0) }, uXf: { value: Array.from({ length: 8 }, () => new THREE.Vector4(1, 0, 0, 0)) },
    uLook: { value: 0 }, uSel: { value: -1 }, uPulse: { value: 0 }, uGain: { value: 1.6 }, uFade: { value: 1 }, uKnitH: { value: null }, uHasH: { value: 0 } };
}

// glTF stores the zone coordinates in TEXCOORD_1 and the zone id (+1) in TEXCOORD_2.x
function prepGeometry(geo){
  if (geo.userData.prepped) return geo; geo.userData.prepped = true;
  const u1 = geo.getAttribute('uv1'), u2 = geo.getAttribute('uv2'), n = geo.getAttribute('position').count;
  const zuv = new Float32Array(n * 2), zid = new Float32Array(n);
  for (let i = 0; i < n; i++) { zuv[i*2] = u1 ? u1.getX(i) : -1; zuv[i*2+1] = u1 ? u1.getY(i) : -1; zid[i] = u2 ? Math.round(u2.getX(i)) - 1 : -1; }
  geo.setAttribute('zuv', new THREE.BufferAttribute(zuv, 2)); geo.setAttribute('zid', new THREE.BufferAttribute(zid, 1));
  geo.deleteAttribute('uv1'); geo.deleteAttribute('uv2');
  return geo;
}

let loader = null;
function load(url){
  if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
  return new Promise((res, rej) => loader.load(url, res, undefined, rej));
}

export class Viewer3D {
  constructor(stage, garment, kind){
    this.stage = stage; this.g = garment; this.kind = kind; this.on = false; this.spin = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.M = MODELS[kind]; this.U = makeU(); this.mats = []; this.meshes = []; this.pair = false; this.pairMode = 'match';
    const cv = this.canvas = document.createElement('canvas'); cv.className = 'lg-3d'; cv.setAttribute('aria-label', `3D ${kind}. Drag to rotate, pinch or scroll to zoom, two fingers or right-drag to move.`); cv.setAttribute('role', 'img');
    stage.insertBefore(cv, stage.querySelector('.lg-over'));
    if (this.M.bg) stage.style.setProperty('--bg3d', `url(${this.M.bg})`);
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const S = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(new RoomEnvironment(), .04).texture; S.environmentIntensity = .32; pm.dispose();
    // night pier lighting, matched to the photo: cool key from the front, teal rail light left, pink rail light right
    const key = this.key = new THREE.DirectionalLight('#e9eef8', 1.7); key.position.set(.8, 1.9, 2.2); key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); key.shadow.radius = 5; key.shadow.bias = -.0003; key.shadow.normalBias = .015;
    S.add(key, key.target);
    const teal = new THREE.DirectionalLight('#21dcff', 1.25); teal.position.set(-2.2, .5, -.6);
    const pink = new THREE.DirectionalLight('#ff3d9e', 1.1); pink.position.set(2.2, .45, -.7);
    const fill = new THREE.DirectionalLight('#8fa6d8', .35); fill.position.set(0, -.6, 2);
    S.add(teal, pink, fill, new THREE.HemisphereLight('#7d90b8', '#07080b', .3));
    this.ready = this.build().then(() => this.setup());
  }
  async build(){
    const M = this.M, U = this.U, an = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const gltf = await load(M.url);
    const root = this.root = new THREE.Group();
    const model = gltf.scene;
    let base;
    if (this.kind === 'sweater') {
      const kn = { n: tex('assets/textures/sw-knit-n.webp', { repeat: true, an, flip: true }), ah: tex('assets/textures/sw-knit-ah.webp', { repeat: true, an, flip: true }) };
      const rb = { n: tex('assets/textures/sw-rib-n.webp', { repeat: true, an, flip: true }), ah: tex('assets/textures/sw-rib-ah.webp', { repeat: true, an, flip: true }) };
      U.uKnitH.value = kn.ah; U.uHasH.value = 1;
      const mk = T => ({ color: '#24262c', roughness: .94, metalness: 0, sheen: 1, sheenRoughness: .5, sheenColor: new THREE.Color('#4d5566'), vertexColors: true,
        normalMap: T.n, normalScale: new THREE.Vector2(1.25, 1.25), aoMap: T.ah, aoMapIntensity: .9, side: THREE.DoubleSide });
      base = { knit: mk(kn), rib: mk(rb) };
    } else {
      const s = TS;
      const orm = tex(`assets/textures/shoe-orm-${s}.webp`, { an });
      base = { shoe: { map: tex(`assets/textures/shoe-color-${s}.webp`, { srgb: true, an }), normalMap: tex(`assets/textures/shoe-normal-${s}.webp`, { an }), normalScale: new THREE.Vector2(1, -1),
        aoMap: orm, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 0, sheen: .4, sheenRoughness: .6, sheenColor: new THREE.Color('#3a3f4a'), side: THREE.FrontSide } };
    }
    model.traverse(o => {
      if (!o.isMesh) return;
      prepGeometry(o.geometry);
      const name = o.material && o.material.name;
      const b = base[name] || base.knit || base.shoe;
      // the baked AO lives in vertex colors; keep it but don't let it go to black
      if (b.vertexColors && o.geometry.getAttribute('color')) { const c = o.geometry.getAttribute('color'); for (let i = 0; i < c.count; i++) { const a = .35 + .65 * c.getX(i); c.setXYZ(i, a, a, a); } c.needsUpdate = true; }
      else if (b.vertexColors) b.vertexColors = false;
      const mat = ledMaterial(b, U, 0); this.mats.push(mat); o.material = mat;
      o.castShadow = o.receiveShadow = true; this.meshes.push(o);
    });
    root.add(model); this.model = model;
    if (this.kind === 'shoe') {
      // the right shoe of the pair: a mirrored copy with its own materials, so it can flip the art for "Match"
      const twin = this.twin = model.clone(true); twin.scale.z = -1; twin.position.z = -.13; twin.position.x = .015; twin.visible = false;
      twin.traverse(o => { if (!o.isMesh) return; const mat = ledMaterial(o.material.userData.base || base.shoe, U, 1); this.mats.push(mat); o.material = mat; this.meshes.push(o); });
      root.add(twin);
    }
    this.scene.add(root);
  }
  setup(){
    const S = this.scene, key = this.key, cv = this.canvas, kind = this.kind;
    const box = new THREE.Box3().setFromObject(this.model), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const sc = key.shadow.camera, ext = Math.max(size.x, size.y, size.z) * .9; sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.near = .1; sc.far = 8; key.target.position.copy(ctr);
    const fy = kind === 'shoe' ? box.min.y : box.min.y - .09;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ext * 6, ext * 6), new THREE.ShadowMaterial({ opacity: .5 })); floor.rotation.x = -PI/2; floor.position.y = fy; floor.receiveShadow = true; S.add(floor);
    const bc = document.createElement('canvas'); bc.width = bc.height = 128; const bx = bc.getContext('2d'); const gr = bx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 128, 128);
    const blob = this.blob = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.25, size.z * 1.7 + .05), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false }));
    blob.rotation.x = -PI/2; blob.position.set(ctr.x, fy + .001, ctr.z); S.add(blob);
    const cam = this.camera = new THREE.PerspectiveCamera(30, 1, .01, 20);
    this.fit = { ctr, size }; this.controls = new OrbitControls(cam, cv);
    const C = this.controls; C.enableDamping = true; C.dampingFactor = .08; C.screenSpacePanning = true; C.autoRotateSpeed = 1.4; C.rotateSpeed = .8;
    C.maxPolarAngle = PI * .56; C.target.copy(ctr);
    this.resize(); this.placeCamera(); C.saveState();
    C.addEventListener('start', () => { this.user = true; this.dirty = true; clearTimeout(this.idle); });
    C.addEventListener('end', () => { this.idle = setTimeout(() => { this.user = false; }, 3500); });
    C.addEventListener('change', () => { this.dirty = true; });
    new ResizeObserver(() => { this.resize(); this.dirty = true; }).observe(this.stage);
    // tap a zone on the model: plays the game, or picks the zone
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
    cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY, performance.now()]; });
    cv.addEventListener('pointerup', e => { if (!down) return; const [x, y, t] = down; down = null;
      if (Math.hypot(e.clientX - x, e.clientY - y) > 6 || performance.now() - t > 450) return;
      const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(this.meshes.filter(m => m.visible && m.parent.visible), false)[0]; if (!hit) return;
      const gg = hit.object.geometry, zid = gg.attributes.zid.getX(hit.face.a); if (zid < 0) return;
      const zu = gg.attributes.zuv, vA = new THREE.Vector2().fromBufferAttribute(zu, hit.face.a), vB = new THREE.Vector2().fromBufferAttribute(zu, hit.face.b), vC = new THREE.Vector2().fromBufferAttribute(zu, hit.face.c);
      const p = gg.attributes.position, a = new THREE.Vector3().fromBufferAttribute(p, hit.face.a), b = new THREE.Vector3().fromBufferAttribute(p, hit.face.b), c = new THREE.Vector3().fromBufferAttribute(p, hit.face.c);
      const lp = hit.object.worldToLocal(hit.point.clone()), uv = THREE.Triangle.getInterpolation(lp, a, b, c, vA, vB, vC, new THREE.Vector2());
      const id = this.M.zones[Math.round(zid)];
      if (hit.object.material.userData.flip.value > .5 && this.pairMode === 'match') uv.x = 1 - uv.x;
      if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) { this.g.select(id); return; }
      this.g.tapZone(id, uv.x, uv.y); this.dirty = true; });
    this.visible = true; new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }).observe(this.stage);
    const loop = () => { requestAnimationFrame(loop); this.frame(); }; requestAnimationFrame(loop);
  }
  setPair(on){
    if (!this.twin) return; this.pair = on; this.twin.visible = on;
    const box = new THREE.Box3().setFromObject(this.root); this.fit.size = box.getSize(new THREE.Vector3()); this.fit.ctr = box.getCenter(new THREE.Vector3());
    this.controls.target.copy(this.fit.ctr); this.placeCamera(on ? 'pair' : 'front'); this.controls.saveState(); this.dirty = true;
  }
  setPairMode(m){ this.pairMode = m; this.dirty = true; }
  placeCamera(face = 'front'){
    const { ctr, size } = this.fit, cam = this.camera, a = cam.aspect, tf = Math.tan(cam.fov * PI / 360);
    const w = this.kind === 'shoe' ? Math.max(size.x, size.z) : size.x;
    const d = Math.max(size.y / 2 / tf, w / 2 / (tf * a)) * this.M.fit + size.z * .3;
    this.dist = d; this.controls.minDistance = d * .3; this.controls.maxDistance = d * 2.2;
    const dir = face === 'pair' ? new THREE.Vector3(-.75, .42, .62) : new THREE.Vector3(...this.M.dir);
    if (face === 'back') dir.z *= -1, dir.x *= -1;
    cam.position.copy(ctr).addScaledVector(dir.normalize(), d); cam.lookAt(ctr);
  }
  face(view){
    if (!this.controls) return;
    const C = this.controls, from = Math.atan2(this.camera.position.x - C.target.x, this.camera.position.z - C.target.z);
    let to = view === 'back' ? PI : 0; let dlt = ((to - from + PI) % TAU + TAU) % TAU - PI;
    this.anim = { t0: performance.now(), from, dlt }; this.dirty = true;
  }
  reset(){ if (!this.controls) return; this.controls.reset(); this.anim = null; this.dirty = true; }
  setSpin(on){ this.spin = on; this.dirty = true; }
  show(){ this.on = true; this.canvas.style.display = 'block'; this.resize(); this.dirty = true; }
  hide(){ this.on = false; this.canvas.style.display = 'none'; }
  resize(){
    const r = this.stage.getBoundingClientRect(); if (!r.width || !this.camera) return;
    this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix();
  }
  frame(){
    if (!this.on || !this.visible || !this.controls) return;
    const C = this.controls, g = this.g, U = this.U;
    if (this.anim) { const k = Math.min(1, (performance.now() - this.anim.t0) / 700), e = k < .5 ? 2*k*k : 1 - (-2*k + 2) ** 2 / 2;
      const off = new THREE.Vector3().subVectors(this.camera.position, C.target), sp = new THREE.Spherical().setFromVector3(off); sp.theta = this.anim.from + this.anim.dlt * e;
      this.camera.position.copy(C.target).add(new THREE.Vector3().setFromSpherical(sp)); this.camera.lookAt(C.target); if (k >= 1) this.anim = null; this.dirty = true; }
    C.autoRotate = this.spin && !this.user && !this.anim;
    C.update();
    const at = g.atlas;
    if (at && at.width) {
      if (!this.tex || this.texW !== at.width || this.texH !== at.height) {
        if (this.tex) this.tex.dispose();
        const t = this.tex = new THREE.CanvasTexture(at); t.flipY = false; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
        this.texW = at.width; this.texH = at.height; U.uAtlas.value = t; U.uAtSize.value.set(at.width, at.height);
      }
      if (g.frameNo !== this.lastFrame) { this.lastFrame = g.frameNo; this.tex.needsUpdate = true; this.dirty = true; }
      this.M.zones.forEach((id, i) => { const r = g.at[id]; if (!r) { U.uOn.value[i] = 0; return; }
        U.uAt.value[i].set(r[0], r[1], r[2], r[3]); const [wm, hm] = this.M.size[id]; U.uZ.value[i].set(r[2], r[3], (wm / r[2]) / (hm / r[3]), 0); U.uOn.value[i] = g.assign[id] ? 1 : 0;
        U.uXf.value[i].x = this.pairMode === 'match' ? 1 : 0; });
      U.uLook.value = g.look; U.uSel.value = this.M.zones.indexOf(g.sel); U.uPulse.value = g.pulse || 0;
      const fade = g.fade ?? 1; if (Math.abs(U.uFade.value - fade) > .001) { U.uFade.value = fade; this.dirty = true; }
    }
    if (this.dirty || C.autoRotate) { this.renderer.render(this.scene, this.camera); this.dirty = false; }
  }
}
