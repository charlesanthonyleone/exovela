/* Realistic Exovela garments: inner suit + outer shell, canvas textures warped on the mesh. */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createSkin, createSkinCanvas, averageColor, SKIN_LIST } from './skins.js';

const loader = new GLTFLoader();
const cache = new Map();
const texLoader = new THREE.TextureLoader();

function loadTex(url, colorSpace) {
  const t = texLoader.load(url);
  if (colorSpace) t.colorSpace = colorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

let maps;
function getMaps() {
  if (maps) return maps;
  maps = {
    shellN: loadTex('assets/textures/shell_normal.png'),
    shellR: loadTex('assets/textures/shell_rough.png'),
    knitN: loadTex('assets/textures/knit_normal.png'),
    knitR: loadTex('assets/textures/knit_rough.png'),
    ribN: loadTex('assets/textures/rib_normal.png'),
    ribR: loadTex('assets/textures/rib_rough.png'),
    metalN: loadTex('assets/textures/metal_normal.png')
  };
  maps.shellN.repeat.set(4, 4); maps.shellR.repeat.set(4, 4);
  maps.knitN.repeat.set(6, 6); maps.knitR.repeat.set(6, 6);
  maps.ribN.repeat.set(8, 2); maps.ribR.repeat.set(8, 2);
  return maps;
}

function loadModel(name) {
  if (cache.has(name)) return cache.get(name);
  const p = new Promise((res, rej) => loader.load(`assets/models/${name}.glb`, res, undefined, rej));
  cache.set(name, p);
  return p;
}

function makeEnv(renderer) {
  const envScene = new THREE.Scene();
  envScene.add(new THREE.HemisphereLight(0x4466aa, 0x220811, 1.2));
  const cols = [0xff2d55, 0x0a84ff, 0xbf5af2, 0x30d158];
  cols.forEach((c, i) => {
    const l = new THREE.PointLight(c, 4, 10);
    const a = (i / 4) * Math.PI * 2;
    l.position.set(Math.cos(a) * 3, 1.4 + (i % 2) * 0.8, Math.sin(a) * 3);
    envScene.add(l);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(envScene, 0.02).texture;
  pmrem.dispose();
  return tex;
}

function applyMaterials(root, kind, displayTex, envMap) {
  const M = getMaps();
  root.traverse(obj => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    const matName = (obj.material && obj.material.name) || '';
    const common = { envMap, envMapIntensity: 0.7, side: THREE.DoubleSide };
    if (matName === 'display') {
      const m = new THREE.MeshPhysicalMaterial({
        ...common,
        color: 0x111115,
        map: displayTex,
        emissive: 0xffffff,
        emissiveMap: displayTex,
        emissiveIntensity: 1.35,
        roughness: 0.14,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        normalMap: M.shellN,
        normalScale: new THREE.Vector2(0.12, 0.12),
        roughnessMap: M.shellR
      });
      // use UV2 (TEXCOORD_1) for the display maps
      if (m.map) m.map.channel = 1;
      if (m.emissiveMap) m.emissiveMap.channel = 1;
      m.vertexColors = false;
      m.vertexColors = false;
      obj.material = m;
    } else if (matName === 'rib') {
      obj.material = new THREE.MeshPhysicalMaterial({
        ...common, color: 0x121214, roughness: 0.72, metalness: 0,
        normalMap: M.ribN, roughnessMap: M.ribR, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x222226)
      });
    } else if (matName === 'inner' || matName === 'lining' || matName === 'fabric') {
      const knit = matName === 'inner' || matName === 'lining';
      obj.material = new THREE.MeshPhysicalMaterial({
        ...common,
        color: matName === 'lining' ? 0x6a6e78 : knit ? 0x2a2e36 : 0x141416,
        roughness: knit ? 0.82 : 0.62,
        metalness: 0,
        normalMap: knit ? M.knitN : M.shellN,
        roughnessMap: knit ? M.knitR : M.shellR,
        sheen: knit ? 0.55 : 0.2,
        sheenRoughness: 0.7,
        sheenColor: new THREE.Color(knit ? 0x3a3d46 : 0x222226)
      });
    } else if (matName === 'metal') {
      obj.material = new THREE.MeshStandardMaterial({
        ...common, color: 0xc5c8cc, metalness: 1, roughness: 0.28, normalMap: M.metalN, envMapIntensity: 1.1
      });
    } else if (matName === 'pack' || matName === 'dock' || matName === 'cable') {
      obj.material = new THREE.MeshStandardMaterial({
        ...common, color: matName === 'dock' ? 0x2a2c32 : 0x0e1014, metalness: 0.4, roughness: 0.4
      });
    } else if (matName === 'led') {
      obj.material = new THREE.MeshStandardMaterial({
        color: 0x30d158, emissive: 0x30d158, emissiveIntensity: 3, roughness: 0.3, metalness: 0
      });
    } else if (matName === 'cord') {
      obj.material = new THREE.MeshStandardMaterial({ ...common, color: 0x0a0a0c, roughness: 0.8, metalness: 0 });
    }
    if (obj.material) obj.material.vertexColors = false;
  });
}

function addLights(scene) {
  const amb = new THREE.HemisphereLight(0x8aa0c8, 0x14080e, 0.45);
  scene.add(amb);
  const moon = new THREE.DirectionalLight(0xdde6ff, 0.55);
  moon.position.set(4, 8, 3);
  scene.add(moon);
  // pier neon rims
  const rimA = new THREE.PointLight(0xff2d85, 3.2, 8, 1.6);
  rimA.position.set(-1.6, 1.4, 1.4);
  scene.add(rimA);
  const rimB = new THREE.PointLight(0x3aa0ff, 2.8, 8, 1.6);
  rimB.position.set(1.7, 1.2, 1.2);
  scene.add(rimB);
  const rimC = new THREE.PointLight(0xbf5af2, 1.6, 7, 1.8);
  rimC.position.set(0.2, 2.2, -1.4);
  scene.add(rimC);
  const key = new THREE.DirectionalLight(0xfff4e8, 0.35);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const fill = new THREE.PointLight(0xffffff, 0, 5, 2); // driven by display average
  fill.position.set(0, 1.15, 0.55);
  scene.add(fill);
  return { rimA, rimB, rimC, fill, moon, key };
}

function makeFloor() {
  const g = new THREE.Group();
  const tex = texLoader.load('assets/textures/wood_albedo.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  const nrm = texLoader.load('assets/textures/wood_normal.png');
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(2, 1);
  const rough = texLoader.load('assets/textures/wood_rough.png');
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(2, 1);
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex, normalMap: nrm, roughnessMap: rough, roughness: 0.28, metalness: 0.0,
    transparent: true, opacity: 0.95
  });
  // a short run of planks under the garment, fading at edges via vertex alpha? just a disc-ish group of boards
  for (let i = -4; i <= 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.28), mat);
    b.position.set(0, -0.03, i * 0.32);
    g.add(b);
  }
  // under-glow
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 32),
    new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

// -------- shared engine --------
const views = [];
let engine, envMap, clock = 0;

function ensureEngine() {
  if (engine) return engine;
  const gl = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  envMap = makeEnv(renderer);
  engine = { renderer, gl };
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    renderAll(dt, clock);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return engine;
}

function renderAll(dt, t) {
  const { renderer, gl } = engine;
  const reduced = document.documentElement.classList.contains('still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const v of views) {
    if (!v.ready || !v.el.isConnected) continue;
    const r = v.el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    // skip far offscreen (keep a margin)
    if (r.bottom < -40 || r.top > innerHeight + 40) continue;
    v.update(dt, t, reduced);
    const w = Math.max(1, Math.round(r.width * v.dpr));
    const h = Math.max(1, Math.round(r.height * v.dpr));
    if (gl.width !== w || gl.height !== h) renderer.setSize(w, h, false);
    renderer.setViewport(0, 0, w, h);
    renderer.render(v.scene, v.camera);
    const ctx = v.ctx;
    if (v.canvas.width !== w || v.canvas.height !== h) {
      v.canvas.width = w; v.canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(gl, 0, 0);
  }
}

export async function mountGarment(el, opts = {}) {
  ensureEngine();
  el.classList.add('garment', 'garment-3d');
  el.innerHTML = `
    <canvas class="garment-canvas" aria-hidden="true"></canvas>
    <div class="garment-caption"></div>`;
  const canvas = el.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const cut = opts.cut || el.dataset.cut || 'hoodie';
  const skinId = opts.skin || el.dataset.skin || el.dataset.preset || 'aurora';
  const mode = opts.mode || el.dataset.mode || 'assembled'; // assembled | exploded | section
  const showInner = (opts.showInner ?? el.dataset.showInner ?? '1') !== '0';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
  // 70mm-ish: narrower fov, pulled back
  camera.position.set(0.85, 1.25, 3.35);
  camera.lookAt(0, 0.72, 0);

  const lights = addLights(scene);
  const wantFloor = (opts.floor ?? el.dataset.floor ?? '0') === '1';
  const floor = makeFloor();
  floor.visible = wantFloor;
  scene.add(floor);
  // always a soft contact shadow
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.001;
  scene.add(blob);

  const root = new THREE.Group();
  scene.add(root);
  const groupOuter = new THREE.Group();
  const groupInner = new THREE.Group();
  root.add(groupInner, groupOuter);

  const size = (innerWidth < 700) ? 768 : 1024;
  const skinCanvas = createSkinCanvas(size);
  const skin = createSkin(skinId, skinCanvas, opts);
  const dispTex = new THREE.CanvasTexture(skinCanvas);
  dispTex.colorSpace = THREE.SRGBColorSpace;
  dispTex.flipY = true;
  dispTex.anisotropy = 8;
  dispTex.channel = 1;

  const view = {
    el, canvas, ctx, scene, camera, ready: false,
    dpr: Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 2),
    skin, dispTex, cut, mode, showInner, lights, floor,
    groupOuter, groupInner, root,
    spinning: opts.spin !== false,
    yaw: 0.15, pitch: 0, dragging: false,
    targetYaw: 0.15,
    explode: mode === 'exploded' ? 1 : 0,
    section: mode === 'section' ? 1 : 0,
    clip: new THREE.Plane(new THREE.Vector3(-1, 0, 0.15), 0.02)
  };

  // load meshes
  const loadCut = async (c) => {
    view.cut = c;
    groupOuter.clear(); groupInner.clear();
    const [outer, inner] = await Promise.all([
      loadModel(`${c}_outer`),
      showInner || mode !== 'assembled' ? loadModel(`${c}_inner`) : Promise.resolve(null)
    ]);
    const o = outer.scene.clone(true);
    applyMaterials(o, c, dispTex, envMap);
    groupOuter.add(o);
    if (inner) {
      const i = inner.scene.clone(true);
      applyMaterials(i, c, dispTex, envMap);
      groupInner.add(i);
    }
    // recenter: models sit hem at y=0, about 0.8m tall
    root.position.set(0, 0, 0);
    view.ready = true;
  };
  await loadCut(cut);

  // interaction: drag to orbit
  let lastX = 0;
  const onDown = ev => { view.dragging = true; lastX = ev.clientX ?? ev.touches?.[0].clientX; ev.preventDefault(); };
  const onMove = ev => {
    if (!view.dragging) return;
    const x = ev.clientX ?? ev.touches?.[0].clientX;
    view.targetYaw += (x - lastX) * 0.008;
    lastX = x;
  };
  const onUp = () => { view.dragging = false; };
  el.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);

  view.update = (dt, t, reduced) => {
    const rect = el.getBoundingClientRect();
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();

    if (!reduced && !view.skin.state.still) {
      view.skin.tick(t);
      dispTex.needsUpdate = true;
    }
    const [r, g, b] = averageColor(skinCanvas);
    lights.fill.color.setRGB(r, g, b);
    lights.fill.intensity = 2.2;
    lights.fill.position.set(Math.sin(view.yaw) * 0.3, 1.15, 0.55);
    if (view.floor.userData.glow) view.floor.userData.glow.material.color.setRGB(r, g, b);

    // cycle rim hues slowly
    const h = (t * 0.03) % 1;
    lights.rimA.color.setHSL((h + 0.0) % 1, 0.85, 0.55);
    lights.rimB.color.setHSL((h + 0.55) % 1, 0.85, 0.55);
    lights.rimC.color.setHSL((h + 0.8) % 1, 0.75, 0.55);

    // turntable
    if (view.spinning && !view.dragging && !reduced) view.targetYaw += dt * 0.18;
    view.yaw += (view.targetYaw - view.yaw) * 0.08;

    // breathing
    const breath = reduced ? 1 : 1 + 0.012 * Math.sin(t * 1.5);
    const targetExp = view.mode === 'exploded' ? 1 : 0;
    const targetSec = view.mode === 'section' ? 1 : 0;
    const k = Math.min(1, dt * 5);
    view.explode += (targetExp - view.explode) * k;
    view.section += (targetSec - view.section) * k;

    groupOuter.position.set(0, view.explode * 0.50, view.explode * 0.24);
    groupInner.position.set(0, view.explode * -0.10, view.explode * -0.14);
    groupInner.visible = view.showInner || view.explode > 0.05 || view.section > 0.05;
    groupOuter.scale.set(breath, 1, breath);
    root.rotation.set(0.05, view.yaw, 0);

    // cross-section clip
    const clipOn = view.section > 0.2;
    root.traverse(o => {
      if (!o.isMesh) return;
      o.material.clippingPlanes = clipOn ? [view.clip] : [];
      o.material.clipShadows = clipOn;
    });
    engine.renderer.localClippingEnabled = clipOn;


    // Fit camera to the rest pose (ignore yaw/breath so the turntable does not zoom-pulse).
    const savedRot = root.rotation.clone();
    const savedScale = groupOuter.scale.clone();
    root.rotation.set(0, 0, 0);
    groupOuter.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    root.rotation.copy(savedRot);
    groupOuter.scale.copy(savedScale);
    root.updateMatrixWorld(true);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const fov = camera.fov * Math.PI / 180;
      const pad = 1.18;
      const dist = Math.max(
        (size.y * pad) / (2 * Math.tan(fov / 2)),
        (size.x * pad) / (2 * Math.tan(fov / 2) * Math.max(camera.aspect, 0.25))
      ) + size.z * 0.55;
      const dir = new THREE.Vector3(0.42, 0.16, 1).normalize();
      camera.position.copy(center).addScaledVector(dir, Math.max(dist, 1.6));
      camera.up.set(0, 1, 0);
      camera.lookAt(center);
    }
  };

  const api = {
    el, view,
    async setCut(c) { el.dataset.cut = c; await loadCut(c); },
    setSkin(id, colors) {
      skin.setId(id);
      if (colors) skin.setColors(colors.a, colors.b, colors.c);
      el.dataset.skin = id;
    },
    setColors: (a, b, c) => skin.setColors(a, b, c),
    setSpeed: s => skin.setSpeed(s),
    setStill: v => skin.setStill(v),
    setMode(m) { view.mode = m; el.dataset.mode = m; },
    setShowInner(v) { view.showInner = v; },
    setSpin(v) { view.spinning = v; },
    getSkin: () => skin,
    tickNow: t => { skin.tick(t); dispTex.needsUpdate = true; }
  };
  el._exovela = api;
  views.push(view);
  return api;
}

export function mountAll(selector = '[data-garment]') {
  return Promise.all([...document.querySelectorAll(selector)].map(el => {
    const cycle = el.dataset.cycle ? el.dataset.cycle.split(',') : null;
    return mountGarment(el, {
      cut: el.dataset.cut,
      skin: el.dataset.skin || el.dataset.preset,
      mode: el.dataset.mode,
      showInner: el.dataset.showInner,
      spin: el.dataset.spin !== '0'
    }).then(api => {
      if (cycle && cycle.length) {
        let i = 0;
        setInterval(() => {
          if (document.hidden) return;
          i = (i + 1) % cycle.length;
          api.setSkin(cycle[i]);
        }, +(el.dataset.every || 7000));
      }
      return api;
    });
  }));
}

export { SKIN_LIST, views };
