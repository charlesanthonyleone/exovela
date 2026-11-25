/* Exovela neon LED pier — original scene, no third-party plates or photos besides procedural textures we generated. */
import * as THREE from 'three';

const TAU = Math.PI * 2;

const waterVert = /* glsl */`
uniform float T;
varying vec3 vWPos;
varying vec3 vWNrm;
varying vec3 vView;
varying float vFoam;
struct Wave { vec2 dir; float amp; float wl; float speed; };
Wave waves[5];
vec3 gerstner(vec3 p, Wave w, inout vec3 tangent, inout vec3 binormal) {
  float k = 6.28318530718 / w.wl;
  float a = w.amp;
  float q = 1.0 / (k * a * 5.0 + 0.001);
  float c = sqrt(9.8 / k);
  vec2 d = normalize(w.dir);
  float f = k * (dot(d, p.xz) - c * w.speed * T);
  float sf = sin(f), cf = cos(f);
  p.x += q * a * d.x * cf;
  p.z += q * a * d.y * cf;
  p.y += a * sf;
  tangent += vec3(-q * d.x * d.x * k * a * sf, d.x * k * a * cf, -q * d.x * d.y * k * a * sf);
  binormal += vec3(-q * d.x * d.y * k * a * sf, d.y * k * a * cf, -q * d.y * d.y * k * a * sf);
  return p;
}
void main(){
  waves[0] = Wave(vec2(1.0, 0.25), 0.12, 14.0, 1.00);
  waves[1] = Wave(vec2(0.6, 0.8),  0.07, 8.0,  1.15);
  waves[2] = Wave(vec2(-0.7, 0.5), 0.045, 5.2, 0.9);
  waves[3] = Wave(vec2(0.2, -1.0), 0.03, 3.4, 1.3);
  waves[4] = Wave(vec2(0.9, -0.4), 0.02, 2.1, 1.6);
  vec3 p = position;
  vec3 tangent = vec3(1,0,0);
  vec3 binormal = vec3(0,0,1);
  for (int i=0;i<5;i++) p = gerstner(p, waves[i], tangent, binormal);
  vec3 n = normalize(cross(binormal, tangent));
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWPos = wp.xyz;
  vWNrm = normalize(mat3(modelMatrix) * n);
  vView = cameraPosition - vWPos;
  vFoam = p.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const waterFrag = /* glsl */`
uniform float T;
uniform vec3 moonDir;
uniform vec3 moonCol;
uniform vec3 uGlow;       // garment average color
uniform vec3 uGlowPos;    // world pos of garment light
uniform float uGlowAmt;
uniform int nLeds;
uniform vec4 leds[40];    // xyz, hue 0-1
varying vec3 vWPos;
varying vec3 vWNrm;
varying vec3 vView;
varying float vFoam;
vec3 hsv(float h, float s, float v){
  vec3 c = clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), c, s);
}
vec3 sky(vec3 rd){
  float e = max(rd.y, 0.0);
  vec3 col = mix(vec3(0.012, 0.02, 0.05), vec3(0.001, 0.002, 0.008), pow(e, 0.45));
  col += vec3(0.25, 0.04, 0.18) * exp(-e * 8.0) * 0.35; // magenta horizon
  col += vec3(0.04, 0.16, 0.28) * exp(-e * 14.0);
  // moon disc + halo
  float md = dot(rd, normalize(moonDir));
  float ang = acos(clamp(md, -1.0, 1.0));
  col += moonCol * (exp(-ang*80.0)*1.4 + exp(-ang*12.0)*0.12 + exp(-ang*4.0)*0.03);
  return col;
}
void main(){
  vec3 n = normalize(vWNrm);
  vec3 v = normalize(vView);
  vec3 rd = reflect(-v, n);
  vec3 col = sky(rd);
  // deep water
  vec3 deep = vec3(0.002, 0.01, 0.02);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 5.0);
  col = mix(deep, col, 0.25 + 0.75 * fres);
  // moon glitter path
  float sp = pow(max(dot(rd, normalize(moonDir)), 0.0), 400.0);
  col += moonCol * sp * 1.6;
  // LED reflections
  for (int i=0;i<40;i++){
    if (i >= nLeds) break;
    vec3 lp = leds[i].xyz;
    float hue = leds[i].w + T * 0.07;
    vec3 lc = hsv(fract(hue), 0.85, 1.0);
    vec3 ldir = normalize(lp - vWPos);
    float dist = length(lp - vWPos);
    float att = 1.0 / (1.0 + dist*dist*0.02);
    float spec = pow(max(dot(rd, ldir), 0.0), 80.0);
    float rim = pow(max(dot(n, ldir), 0.0), 3.0);
    col += lc * (spec * 2.2 + rim * 0.08) * att * 1.8;
  }
  // traveling neon light-waves through the swells
  float lw = sin(vWPos.x * 0.35 + vWPos.z * 0.18 - T * 1.3);
  float waveBand = smoothstep(0.4, 1.0, lw) * smoothstep(0.15, -0.02, vWPos.y); // more in troughs/slopes
  vec3 waveCol = hsv(fract(T * 0.05 + vWPos.z * 0.02), 0.9, 1.0);
  col += waveCol * waveBand * 0.22 * (0.5 + 0.5 * n.y);
  // garment bounce
  if (uGlowAmt > 0.0) {
    vec3 gdir = uGlowPos - vWPos;
    float gd = length(gdir);
    vec3 gn = gdir / max(gd, 0.001);
    float gatt = uGlowAmt / (1.0 + gd*gd*0.15);
    col += uGlow * (pow(max(dot(rd, gn),0.0), 40.0) * 1.5 + max(dot(n, gn),0.0) * 0.2) * gatt;
  }
  // foam on peaks
  float foam = smoothstep(0.08, 0.16, vFoam);
  col = mix(col, vec3(0.55, 0.65, 0.75), foam * 0.18);
  // haze
  float dist = length(vView);
  float fog = 1.0 - exp(-dist * 0.012);
  col = mix(col, vec3(0.01, 0.015, 0.03), fog);
  col = col / (1.0 + col * 0.5);
  col = pow(col, vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}
`;

const starVert = /* glsl */`
attribute float size;
attribute vec3 color;
attribute float phase;
uniform float T;
varying vec3 vCol;
varying float vTw;
void main(){
  vTw = 0.55 + 0.45 * sin(T * (1.4 + phase * 2.2) + phase * 6.28);
  vCol = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (340.0 / -mv.z) * (0.85 + 0.55 * vTw);
  gl_Position = projectionMatrix * mv;
}
`;
const starFrag = /* glsl */`
varying vec3 vCol;
varying float vTw;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p,p);
  if (d > 1.0) discard;
  float a = exp(-d * 4.2) * vTw;
  gl_FragColor = vec4(vCol, 1.0) * a;
}
`;

function hsv(h, s, v) {
  const f = (n, k = (n + h * 6) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return new THREE.Color(f(5), f(3), f(1));
}

export function createPier(opts = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const settings = loadSettings(reduced);

  // DOM
  const wrap = document.createElement('div');
  wrap.className = 'scene';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<div id="scene-fb" class="scene-fallback"></div>`;
  document.body.prepend(wrap);
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-gl';
  wrap.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x02040a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050814, 0.016);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  // looking down the pier, horizon ~ mid-low
  camera.position.set(1.6, 2.35, 7.5);
  camera.lookAt(0.2, 1.15, -28);

  // ---------- sky (hemisphere + moon sprite + stars) ----------
  const skyGeo = new THREE.SphereGeometry(180, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { T: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vP;
      void main(){
        vec3 n = normalize(vP);
        float e = max(n.y, 0.0);
        vec3 col = mix(vec3(0.02,0.035,0.07), vec3(0.0015,0.0025,0.01), pow(e, 0.5));
        col += vec3(0.35, 0.06, 0.22) * exp(-e*7.0) * 0.45;
        col += vec3(0.05, 0.16, 0.28) * exp(-e*16.0);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // stars
  const isMobile = () => innerWidth < 700;
  const starCount = isMobile() ? 900 : 2200;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const starSize = new Float32Array(starCount);
  const starPhase = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    // hemisphere
    const u = Math.random(), v = Math.random();
    const th = u * TAU;
    const ph = Math.acos(Math.sqrt(v)); // more at zenith? actually this clusters mid. Use ph = acos(1-v)*0.5 for upper
    const r = 160;
    const y = Math.abs(Math.cos(Math.acos(1 - v * 0.85)));
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    starPos[i*3] = rr * Math.cos(th) * r;
    starPos[i*3+1] = y * r + 2;
    starPos[i*3+2] = rr * Math.sin(th) * r - 10;
    const hue = Math.random(); // full spectrum, independently
    const c = hsv(hue, 0.55 + Math.random() * 0.45, 0.85 + Math.random() * 0.15);
    starCol[i*3] = c.r; starCol[i*3+1] = c.g; starCol[i*3+2] = c.b;
    starSize[i] = 1.0 + Math.pow(Math.random(), 3.2) * 4.5;
    starPhase[i] = Math.random() * TAU;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { T: { value: 0 } },
    vertexShader: starVert,
    fragmentShader: starFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  // moon
  const moonTex = new THREE.TextureLoader().load('assets/textures/moon.png');
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moonMat = new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false, toneMapped: false });
  const moon = new THREE.Sprite(moonMat);
  // place upper right in camera view — we'll update to stay in a world position
  moon.position.set(22, 22, -50);
  moon.scale.set(8, 8, 1);
  scene.add(moon);
  // halo
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeHaloTex(),
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.45
  }));
  halo.position.copy(moon.position);
  halo.scale.set(18, 18, 1);
  scene.add(halo);
  const moonDir = moon.position.clone().normalize();

  // ---------- water ----------
  const wSeg = isMobile() ? 80 : 180;
  const waterGeo = new THREE.PlaneGeometry(220, 220, wSeg, wSeg);
  waterGeo.rotateX(-Math.PI / 2);
  const ledUniforms = [];
  for (let i = 0; i < 40; i++) ledUniforms.push(new THREE.Vector4());
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      T: { value: 0 },
      moonDir: { value: moonDir },
      moonCol: { value: new THREE.Color(1.0, 0.92, 0.8) },
      uGlow: { value: new THREE.Color(0, 0, 0) },
      uGlowPos: { value: new THREE.Vector3(1.2, 1.2, 3.5) },
      uGlowAmt: { value: 0 },
      nLeds: { value: 0 },
      leds: { value: ledUniforms }
    },
    vertexShader: waterVert,
    fragmentShader: waterFrag
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0;
  scene.add(water);

  // ---------- pier ----------
  const TEX = 'assets/textures/';
  const loader = new THREE.TextureLoader();
  const woodAlbedo = loader.load(TEX + 'wood_albedo.png');
  const woodRough = loader.load(TEX + 'wood_rough.png');
  const woodNormal = loader.load(TEX + 'wood_normal.png');
  for (const t of [woodAlbedo, woodRough, woodNormal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  woodAlbedo.colorSpace = THREE.SRGBColorSpace;
  woodAlbedo.repeat.set(1, 4);
  woodRough.repeat.set(1, 4);
  woodNormal.repeat.set(1, 4);

  const woodMat = new THREE.MeshPhysicalMaterial({
    map: woodAlbedo, roughnessMap: woodRough, normalMap: woodNormal,
    roughness: 0.4, metalness: 0.0, envMapIntensity: 0.6,
    normalScale: new THREE.Vector2(0.8, 0.8)
  });

  const pier = new THREE.Group();
  scene.add(pier);
  const plankW = 0.38, plankH = 0.08, plankL = 4.2, gap = 0.04;
  const nPlank = 11;
  const pierLen = 70;
  const nAlong = Math.floor(pierLen / (plankW + gap));
  const plankGeo = new THREE.BoxGeometry(plankW, plankH, plankL);
  // instanced planks across width, repeated along z (pier along -Z, width along X... wait
  // I want the pier receding along -Z, width along X. Each plank's long axis should be across the pier (X) so we see board ends receding.
  // plank length = width of pier ~ 4.2m, plank width (the walking-direction thickness) = 0.38
  const plankGeo2 = new THREE.BoxGeometry(plankL, plankH, plankW); // X is long (across), Z is short (along)
  const planks = new THREE.InstancedMesh(plankGeo2, woodMat, nAlong);
  planks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < nAlong; i++) {
    const z = 6 - i * (plankW + gap);
    dummy.position.set(0, 1.02 + Math.sin(i * 1.7) * 0.006, z);
    dummy.rotation.y = (Math.sin(i * 3.1) * 0.01);
    dummy.updateMatrix();
    planks.setMatrixAt(i, dummy.matrix);
  }
  pier.add(planks);

  // stringers under planks
  const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, pierLen), woodMat);
  const s1 = stringer.clone(); s1.position.set(-1.5, 0.88, 6 - pierLen / 2); pier.add(s1);
  const s2 = stringer.clone(); s2.position.set(1.5, 0.88, 6 - pierLen / 2); pier.add(s2);

  // pilings
  const pileGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.2, 8);
  for (let i = 0; i < 16; i++) {
    for (const x of [-2.05, 2.05]) {
      const z = 5 - i * 4.2;
      const pile = new THREE.Mesh(pileGeo, woodMat);
      pile.position.set(x, -0.3, z);
      pier.add(pile);
    }
  }

  // rails + LED strips
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1a120e, roughness: 0.7, metalness: 0.1 });
  const ledGroup = new THREE.Group();
  pier.add(ledGroup);
  const ledPositions = []; // world
  function makeStrip(x, y, z0, z1, y2 = null) {
    const len = Math.abs(z1 - z0);
    const mid = (z0 + z1) / 2;
    const geo = new THREE.BoxGeometry(0.025, 0.02, len);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.2,
      roughness: 0.3, metalness: 0.0, toneMapped: true
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, mid);
    ledGroup.add(m);
    // sample points along strip for water reflections
    const n = 8;
    for (let i = 0; i < n; i++) {
      const z = z0 + (z1 - z0) * (i / (n - 1));
      ledPositions.push({ x, y, z, meshHueOffset: Math.abs(z) * 0.03 + (x > 0 ? 0.2 : 0), mat });
    }
    return mat;
  }
  const ledMats = [];
  // two rails, top and mid, both sides
  const zStart = 6, zEnd = 6 - pierLen;
  for (const x of [-2.05, 2.05]) {
    // posts
    for (let i = 0; i < 18; i++) {
      const z = zStart - i * 4;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.09), railMat);
      post.position.set(x, 1.55, z);
      pier.add(post);
      // wrap LED on post
      const wrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.08, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.5 })
      );
      wrap.position.set(x, 2.05, z);
      ledGroup.add(wrap);
      ledMats.push(wrap.material);
      ledPositions.push({ x, y: 2.05, z, meshHueOffset: i * 0.07, mat: wrap.material });
    }
    // rail beams
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, pierLen), railMat);
    top.position.set(x, 2.08, (zStart + zEnd) / 2); pier.add(top);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, pierLen), railMat);
    mid.position.set(x, 1.55, (zStart + zEnd) / 2); pier.add(mid);
    ledMats.push(makeStrip(x, 2.14, zStart, zEnd));
    ledMats.push(makeStrip(x, 1.61, zStart, zEnd));
  }

  // haze planes catching neon (cheap volumetric)
  const hazeTex = makeHazeTex();
  for (let i = 0; i < 6; i++) {
    const h = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 4),
      new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.18, fog: true, side: THREE.DoubleSide })
    );
    h.position.set(0, 1.8, 4 - i * 10);
    h.rotation.y = 0;
    scene.add(h);
  }

  // fill lights (a few real lights near the camera for the first span)
  const keyLights = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight(0xff44aa, 2.5, 18, 1.8);
    const z = 4 - i * 6;
    l.position.set(i % 2 ? 2.05 : -2.05, 2.1, z);
    scene.add(l);
    keyLights.push(l);
  }
  scene.add(new THREE.AmbientLight(0x1a2233, 0.35));
  const moonLight = new THREE.DirectionalLight(0xcfe0ff, 0.35);
  moonLight.position.copy(moon.position);
  scene.add(moonLight);

  // garment bounce light — updated from outside
  const bounce = new THREE.PointLight(0x88aaff, 0, 12, 2);
  bounce.position.set(1.4, 1.5, 4.2);
  scene.add(bounce);

  function resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 1.4 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let time = 0, last = performance.now(), raf = 0, glowCol = new THREE.Color();

  function applyLedColors(t) {
    // cycle hue along the pier
    const used = Math.min(ledPositions.length, 40);
    waterMat.uniforms.nLeds.value = used;
    for (let i = 0; i < used; i++) {
      const p = ledPositions[i];
      const hue = (p.meshHueOffset + t * 0.08) % 1;
      const c = hsv(hue, 0.85, 1);
      if (p.mat && p.mat.emissive) p.mat.emissive.copy(c);
      waterMat.uniforms.leds.value[i].set(p.x, p.y, p.z, hue);
    }
    keyLights.forEach((l, i) => {
      const hue = (i * 0.14 + t * 0.08) % 1;
      l.color.copy(hsv(hue, 0.8, 1));
    });
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const running = settings.water || settings.sky;
    if (running && !root.classList.contains('still')) time += dt;
    if (settings.sky) {
      starMat.uniforms.T.value = time;
      starPoints.visible = true;
    } else {
      starMat.uniforms.T.value = 0;
    }
    if (settings.water) {
      waterMat.uniforms.T.value = time;
      applyLedColors(time);
    } else {
      applyLedColors(0);
    }
    // faint camera sway
    if (running) {
      camera.position.x = 1.6 + Math.sin(time * 0.12) * 0.08;
      camera.position.y = 2.35 + Math.sin(time * 0.09) * 0.04;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });

  function setGlow(r, g, b, amt, pos) {
    glowCol.setRGB(r, g, b);
    waterMat.uniforms.uGlow.value.copy(glowCol);
    waterMat.uniforms.uGlowAmt.value = amt;
    bounce.color.copy(glowCol);
    bounce.intensity = amt * 4;
    if (pos) {
      waterMat.uniforms.uGlowPos.value.copy(pos);
      bounce.position.copy(pos);
    }
  }

  return { renderer, scene, camera, setGlow, settings, canvas, resize };
}

function makeHaloTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,245,220,0.85)');
  grd.addColorStop(0.2, 'rgba(255,230,190,0.28)');
  grd.addColorStop(0.55, 'rgba(180,200,255,0.06)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeHazeTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 0);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.3, 'rgba(255,80,180,0.35)');
  grd.addColorStop(0.5, 'rgba(80,180,255,0.35)');
  grd.addColorStop(0.7, 'rgba(180,80,255,0.3)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 64);
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, 0, 64);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, '#fff'); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, 256, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

const KEY = 'exovela.scene.v2';
function loadSettings(reduced) {
  const def = { water: !reduced, sky: !reduced };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') return { water: !!(s.water ?? def.water), sky: !!(s.sky ?? def.sky) };
  } catch {}
  return def;
}
function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }

export function mountPierGear(pier) {
  const box = document.createElement('div');
  box.className = 'scene-set';
  box.innerHTML = `
    <div id="scene-panel" class="scene-panel" role="dialog" aria-label="Scene settings" hidden>
      <label><input type="checkbox" id="set-ocean"> Water &amp; pier animation</label>
      <label><input type="checkbox" id="set-sky"> Stars, moon &amp; lights</label>
      <p>Off shows a still frame. Defaults follow your system's reduced-motion setting.</p>
    </div>
    <button id="gear" class="scene-gear" aria-expanded="false" aria-label="Scene settings" title="Scene settings">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>
    </button>`;
  document.body.appendChild(box);
  const panel = box.querySelector('#scene-panel');
  const gear = box.querySelector('#gear');
  const o = box.querySelector('#set-ocean');
  const s = box.querySelector('#set-sky');
  o.checked = pier.settings.water;
  s.checked = pier.settings.sky;
  const apply = () => {
    pier.settings.water = o.checked;
    pier.settings.sky = s.checked;
    saveSettings(pier.settings);
    document.documentElement.classList.toggle('still', !o.checked && !s.checked);
  };
  o.addEventListener('change', apply);
  s.addEventListener('change', apply);
  apply();
  gear.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    gear.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => { if (!e.target.closest('.scene-set')) { panel.hidden = true; gear.setAttribute('aria-expanded', 'false'); } });
}
