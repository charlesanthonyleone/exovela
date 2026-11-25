// Exovela interactive 3D viewer: procedural knit sweater and sneaker meshes, LED zones shaded on the surface.
// The zone pixels come straight from the LiveGarment atlas, so every look and mode shows on the model live.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const PI = Math.PI, TAU = PI * 2;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// smooth (Catmull-Rom style) interpolation through [x, y] keys
function key(x, ks){
  const n = ks.length; if (x <= ks[0][0]) return ks[0][1]; if (x >= ks[n-1][0]) return ks[n-1][1];
  let i = 1; while (x > ks[i][0]) i++;
  const [x0, y0] = ks[i-1], [x1, y1] = ks[i], h = x1 - x0, t = (x - x0) / h;
  const m = j => { const a = ks[Math.max(0, j-1)], b = ks[Math.min(n-1, j+1)]; return (b[1] - a[1]) / (b[0] - a[0]); };
  const m0 = m(i-1) * h, m1 = m(i) * h, t2 = t*t, t3 = t2*t;
  return (2*t3 - 3*t2 + 1)*y0 + (t3 - 2*t2 + t)*m0 + (-2*t3 + 3*t2)*y1 + (t3 - t2)*m1;
}

// ---------- mesh builder: parametric patches with analytic-ish normals ----------
class Builder {
  constructor(){ this.p = []; this.n = []; this.uv = []; this.zuv = []; this.zid = []; this.ix = []; }
  patch(F, [u0, u1, nu], [v0, v1, nv], o = {}){
    const base = this.p.length / 3, du = (u1 - u0) * 1e-3, dv = (v1 - v0) * 1e-3;
    for (let j = 0; j <= nv; j++) { const v = v0 + (v1 - v0) * j / nv;
      for (let i = 0; i <= nu; i++) { const u = u0 + (u1 - u0) * i / nu;
        const P = F(u, v), A = F(u + du, v), B = F(u - du, v), C = F(u, v + dv), D = F(u, v - dv);
        const ax = A[0]-B[0], ay = A[1]-B[1], az = A[2]-B[2], bx = C[0]-D[0], by = C[1]-D[1], bz = C[2]-D[2];
        let nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx; let l = Math.hypot(nx, ny, nz);
        const out = o.out ? o.out(u, v, P) : [P[0], 0, P[2]];
        if (l < 1e-14) { nx = out[0]; ny = out[1]; nz = out[2]; l = Math.hypot(nx, ny, nz) || 1; }
        if (nx*out[0] + ny*out[1] + nz*out[2] < 0) l = -l;
        this.p.push(P[0], P[1], P[2]); this.n.push(nx/l, ny/l, nz/l);
        const t = o.uv ? o.uv(u, v, P) : [u, v]; this.uv.push(t[0], t[1]);
        const z = o.zuv ? o.zuv(u, v) : [-1, -1]; this.zuv.push(z[0], z[1]); this.zid.push(o.zid ?? -1);
      } }
    const W = nu + 1;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j*W + i, b = a + 1, c = a + W, d = c + 1; this.ix.push(a, b, d, a, d, c); }
  }
  geometry(){
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('zuv', new THREE.Float32BufferAttribute(this.zuv, 2));
    g.setAttribute('zid', new THREE.Float32BufferAttribute(this.zid, 1));
    g.setIndex(this.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.ix, 1) : new THREE.Uint16BufferAttribute(this.ix, 1));
    g.computeBoundingSphere(); return g;
  }
}

// ---------- the sweater ----------
// y up (m), front is +z, wearer's left (sleeveL) is +x. Zones match the 2D demo ids.
const SW_ZONES = ['chest', 'stomach', 'back', 'sleeveL', 'sleeveR', 'cuffL', 'cuffR'];
const SY = 1.2;   // body length stretch applied after building
const SW_SIZE = { chest: [.44, .22*SY], stomach: [.44, .2*SY], back: [.44, .435*SY], sleeveL: [.15, .45], sleeveR: [.15, .45], cuffL: [.31, .07], cuffR: [.31, .07] };
function buildSweater(){
  const knit = new Builder(), dark = new Builder();
  const NE = 2.7;
  const A = y => key(y, [[0,.246],[.07,.25],[.15,.272],[.38,.279],[.47,.27],[.53,.247]]);
  const B = y => key(y, [[0,.116],[.07,.119],[.16,.128],[.33,.136],[.45,.13],[.53,.104]]);
  const sect = th => { const s = Math.sin(th), c = Math.cos(th); return [Math.sign(s)*Math.abs(s)**(2/NE), Math.sign(c)*Math.abs(c)**(2/NE)]; };
  const torso = (th, y) => {
    const [sx, sz] = sect(th);
    const side = Math.exp(-(((Math.abs(Math.sin(th)) - 1) / .16) ** 2));
    const f = .0065*Math.sin(y*36 + th*2.2)*side*ss(.44, .12, y) + .003*Math.sin(th*9 + y*8)*ss(.22, .07, y) + .002*Math.sin(th*6 - y*19);
    return [sx*(A(y) + f), y, sz*(B(y) + f)];
  };
  const tuv = (th, y) => [th / TAU * 1.36 / .075, y / .075];
  const YT = .53, YB = .066, TF = .84;
  const ZF = .74;   // panel half-angle
  const front = (yb, yt) => (u, v) => [(u + ZF) / (2*ZF), (yt - v) / (yt - yb)];
  knit.patch(torso, [-TF, TF, 90], [YB, .295, 60], { uv: tuv, zid: 1, zuv: front(.085, .293) });
  knit.patch(torso, [-TF, TF, 90], [.295, YT, 60], { uv: tuv, zid: 0, zuv: front(.297, .52) });
  knit.patch(torso, [PI - TF, PI + TF, 90], [YB, YT, 120], { uv: tuv, zid: 2, zuv: (u, v) => [(u - (PI - ZF)) / (2*ZF), (.52 - v) / (.52 - .085)] });
  knit.patch(torso, [TF, PI - TF, 50], [YB, YT, 120], { uv: tuv });
  knit.patch(torso, [PI + TF, TAU - TF, 50], [YB, YT, 120], { uv: tuv });
  // yoke: shoulders rounding up to the neckline
  const nx = .083, nz = .073, nzc = -.012, yN = th => .586 - .022*Math.cos(th);
  const yoke = (th, w) => { const r = torso(th, YT), e = 1 - (1 - w) ** 1.25;
    return [lerp(r[0], nx*Math.sin(th), e), r[1] + (yN(th) - r[1]) * (1 - (1 - w) ** 2) + .013*Math.sin(PI*w)*Math.abs(Math.sin(th)), lerp(r[2], nz*Math.cos(th) + nzc, e)]; };
  knit.patch(yoke, [0, TAU, 160], [0, 1, 26], { uv: (u, w) => [u / TAU * 1.2 / .075, w * .16 / .075], out: (u, w, P) => [P[0], .9, P[2] - nzc] });
  // crew collar: a rib band that rolls up and folds inside
  const collar = (th, w) => { const rib = .024*Math.cos(th*96) * (.35 + .65*Math.sin(PI*Math.min(w, 1)));
    let rf, y; if (w <= 1) { rf = 1 + .05*w + .1*Math.sin(PI*w) + rib; y = yN(th) - .004 + .021*Math.sin(w*PI/2); } else { rf = .95 + .1*(2 - w); y = yN(th) + .017 - .03*(w - 1); }
    return [nx*rf*Math.sin(th), y, nz*rf*Math.cos(th) + nzc]; };
  knit.patch(collar, [0, TAU, 480], [0, 2, 20], { uv: (u, w) => [u / TAU * .5 / .03, w * .03 / .03], out: (u, w, P) => w <= 1 ? [P[0], 0, P[2] - nzc] : [-P[0], 0, -(P[2] - nzc)] });
  // hem rib, sewn on slightly proud of the body
  const hem = (th, y) => { const [sx, sz] = sect(th); const pull = .955 + .045*ss(0, .066, y); const roll = -.004*Math.max(0, 1 - y/.007) ** 2;
    const rib = .0024*Math.cos(th*150); const a = A(.066)*pull + .0016 + rib + roll, b = B(.066)*pull + .0016 + rib + roll; return [sx*a, y, sz*b]; };
  knit.patch(hem, [0, TAU, 720], [0, .074, 12], { uv: (u, y) => [u / TAU * 1.3 / .03, y / .03] });
  dark.patch((th, r) => { const [sx, sz] = sect(th); return [sx*A(0)*.95*r, .012, sz*B(0)*.95*r]; }, [0, TAU, 64], [0, 1, 2], { out: () => [0, -1, 0] });
  dark.patch((th, r) => [nx*.97*r*Math.sin(th), .55, nz*.97*r*Math.cos(th) + nzc], [0, TAU, 64], [0, 1, 2], { out: () => [0, 1, 0] });
  // sleeves: dropped shoulder, hanging out at about 33 degrees, bunching above the cuff
  for (const sg of [1, -1]) {
    const N = 200, L = .64, C = [], T = [], Z = [], O = [];
    let c = [sg*.2, .474, -.004];
    for (let k = 0; k <= N; k++) { const s = k / N * L, b = ss(.16, .42, s), a = lerp(.6, .47, b);
      let d = [sg*Math.sin(a), -Math.cos(a), lerp(0, .1, b)]; const l = Math.hypot(...d); d = d.map(x => x / l);
      C.push(c.slice()); T.push(d); let z = [0, 0, 1]; const dz = d[2]; z = [z[0] - d[0]*dz, z[1] - d[1]*dz, z[2] - d[2]*dz]; const lz = Math.hypot(...z); z = z.map(x => x / lz); Z.push(z);
      const o = [z[1]*d[2] - z[2]*d[1], z[2]*d[0] - z[0]*d[2], z[0]*d[1] - z[1]*d[0]]; O.push(o.map(x => x*sg));
      c = [c[0] + d[0]*L/N, c[1] + d[1]*L/N, c[2] + d[2]*L/N]; }
    const at = (s, arr) => { const f = Math.min(N, Math.max(0, s / L * N)), i = Math.min(N - 1, Math.floor(f)), t = f - i; return arr[i].map((x, q) => lerp(x, arr[i+1][q], t)); };
    const R = s => key(s, [[0,.102],[.1,.089],[.3,.078],[.45,.071],[.52,.066],[.56,.06]]);
    const sleeve = (th, s) => { const cc = at(s, C), z = at(s, Z), o = at(s, O);
      const bunch = .0058*Math.sin(s*118 + 1.4*Math.sin(th*2 + s*9)) * ss(.34, .45, s) * ss(.57, .5, s) + .0022*Math.sin(th*5 + s*31);
      const r = R(s) + bunch, e = .93;
      return [cc[0] + r*(Math.cos(th)*z[0]*e + Math.sin(th)*o[0]), cc[1] + r*(Math.cos(th)*z[1]*e + Math.sin(th)*o[1]), cc[2] + r*(Math.cos(th)*z[2]*e + Math.sin(th)*o[2])]; };
    const out = (th, s, P) => { const cc = at(s, C); return [P[0]-cc[0], P[1]-cc[1], P[2]-cc[2]]; };
    const zid = sg > 0 ? 3 : 4;
    knit.patch(sleeve, [-PI, PI, 110], [0, .556, 150], { out, zid, uv: (th, s) => [th / TAU * .46 / .075, s / .075],
      zuv: (th, s) => [sg > 0 ? (th + .35) / 2.1 : (1.75 - th) / 2.1, (s - .07) / .43] });
    const cuff = (th, s) => { const cc = at(s, C), z = at(s, Z), o = at(s, O);
      const k = ss(.548, .63, s), r = .049 + .004*Math.sin(PI*k) + .0017*Math.cos(th*60) - .006*Math.max(0, (s - .624) / .008) ** 2;
      return [cc[0] + r*(Math.cos(th)*z[0] + Math.sin(th)*o[0]), cc[1] + r*(Math.cos(th)*z[1] + Math.sin(th)*o[1]), cc[2] + r*(Math.cos(th)*z[2] + Math.sin(th)*o[2])]; };
    knit.patch(cuff, [-PI, PI, 300], [.546, .632, 12], { out, zid: sg > 0 ? 5 : 6, uv: (th, s) => [th / TAU * .3 / .03, s / .03], zuv: (th, s) => [(th + PI) / TAU, (s - .55) / .075] });
    dark.patch((th, r) => { const cc = at(.628, C), z = at(.628, Z), o = at(.628, O), q = .044*r; return [cc[0] + q*(Math.cos(th)*z[0] + Math.sin(th)*o[0]), cc[1] + q*(Math.cos(th)*z[1] + Math.sin(th)*o[1]), cc[2] + q*(Math.cos(th)*z[2] + Math.sin(th)*o[2])]; },
      [0, TAU, 40], [0, 1, 2], { out: () => at(.63, T) });
  }
  const kg = knit.geometry(), dg = dark.geometry(); kg.scale(1, SY, 1); dg.scale(1, SY, 1);
  return { knit: kg, dark: dg, zones: SW_ZONES, size: SW_SIZE };
}

// ---------- the sneaker ----------
// toe at -x, heel at +x, lateral side faces +z (the side the 2D demo shows).
const SH_ZONES = ['quarter', 'heel'];
const SH_SIZE = { quarter: [.105, .05], heel: [.07, .055] };
function buildShoe(){
  const up = new Builder(), sole = new Builder(), rub = new Builder(), pad = new Builder();
  const L = .29, W = .052;
  const sOf = ph => (1 - Math.cos(ph)) / 2;
  const outl = ph => { const s = sOf(ph), g = .8 + .22*Math.exp(-(((s - .28)/.22) ** 2)) - .05*Math.exp(-(((s - .56)/.12) ** 2)); return [-L/2 + s*L, Math.sin(ph)*W*g]; };
  const yb = s => .018*Math.max(0, 1 - s/.22) ** 2 + .004*Math.max(0, (s - .86)/.14) ** 2;
  const yt = s => yb(s) + .021 + .013*ss(.25, .8, s);
  const soleP = (ph, k) => { const s = sOf(ph), [x, z] = outl(ph), rf = 1 + .045*Math.sin(PI*k) ** .8 - .03*(1 - k) ** 3; return [x*rf, yb(s) + (yt(s) - yb(s))*k, z*rf]; };
  const sOut = (ph, k, P) => [P[0], 0, P[2]];
  rub.patch(soleP, [0, TAU, 200], [0, .2, 6], { out: sOut, uv: (ph, k) => [ph * 3, k] });
  sole.patch(soleP, [0, TAU, 200], [.2, 1, 16], { out: sOut, uv: (ph, k) => [ph * 3, k] });
  rub.patch((ph, r) => { const [x, z] = outl(ph), q = .97*r; const X = x*q; return [X, yb((X + L/2)/L) + .0005, z*q]; }, [0, TAU, 120], [0, 1, 8], { out: () => [0, -1, 0] });
  // sole top: closes the ledge between the sidewall and the upper
  { const bse = ph => { const s = sOf(ph), [x, z] = outl(ph); return [x*.975, yt(s) - .002, z*.965]; };
    sole.patch((ph, q) => { const a = soleP(ph, 1), b = bse(ph); return [lerp(a[0], b[0], q), lerp(a[1], b[1] + .001, q), lerp(a[2], b[2], q)]; }, [0, TAU, 200], [0, 1, 3], { out: () => [0, 1, 0], uv: (ph, q) => [ph * 3, q] }); }
  // upper: lofted from an inset sole outline to the top line, with a quarter-ellipse profile
  const base = ph => { const s = sOf(ph), [x, z] = outl(ph); return [x*.975, yt(s) - .002, z*.965]; };
  const top = ph => { const s = sOf(ph), [xb, , zb0] = base(ph), zb = Math.abs(zb0);
    const thr = ss(.33, .39, s), col = ss(.6, .7, s);
    const zE = .021 + .006*ss(.36, .62, s), yE = .06 + .028*ss(.36, .64, s), yR = .03 + .03*ss(0, .36, s);
    const yC = key(s, [[.6,.088],[.72,.079],[.82,.068],[.93,.077],[1,.086]]);
    const zT = lerp(lerp(0, zE, thr), zb*.8, col), yT = yt(s) + lerp(lerp(yR, yE, thr), yC, col);
    const xT = xb + .016*Math.max(0, 1 - s/.14) ** 1.5 - .008*ss(.9, 1, s); return [xT, yT, zT]; };
  const upper = (ph, t) => { const s = sOf(ph), b = base(ph), T = top(ph), sg = Math.sin(ph) >= 0 ? 1 : -1, zb = Math.abs(b[2]);
    const e = 1 - Math.cos(t*PI/2), f = Math.sin(t*PI/2);
    return [b[0] + (T[0] - b[0])*e + .007*Math.sin(PI*t)*ss(.85, 1, s), b[1] + (T[1] - b[1])*f, sg*(zb + (T[2] - zb)*e)]; };
  const uOut = (ph, t, P) => [P[0] * .4, (P[1] - .03) * .8, P[2]];
  const uUV = (ph, t) => [ph / TAU * .62 / .03, t * .08 / .03];
  const seg = [[0, 1.41], [1.41, 2.16, 0, (ph, t) => [(ph - 1.41)/.75, 1 - (t - .1)/.72]], [2.16, 2.37], [2.37, 3.91, 1, (ph, t) => [(ph - 2.37)/1.54, 1 - (t - .12)/.75]], [3.91, 4.12], [4.12, 4.87, 0, (ph, t) => [(ph - 4.12)/.75, 1 - (t - .1)/.72]], [4.87, TAU]];
  for (const [a, b, zid, zuv] of seg) up.patch(upper, [a, b, Math.max(8, Math.round((b - a) * 40))], [0, 1, 46], { out: uOut, uv: uUV, zid: zid ?? -1, zuv });
  // tongue, collar padding, laces, heel loop
  const yTg = s => yt(s) + lerp(.05, .082, ss(.33, .64, s)) + .03*ss(.64, .82, s);
  pad.patch((q, s) => [-L/2 + s*L, yTg(s) + .007*(1 - q*q), q*.03*(1 - .2*ss(.6, .8, s))], [-1, 1, 24], [.34, .8, 60], { out: () => [0, 1, 0], uv: (q, s) => [q * 2, s * 10] });
  const tube = (pts, r, B) => { const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); return new THREE.TubeGeometry(curve, Math.max(16, pts.length * 6), r, 10, false); };
  const colPts = []; const p0 = Math.acos(1 - 2*.6);
  for (let k = 0; k <= 60; k++) { const ph = lerp(p0, TAU - p0, k / 60), P = upper(ph, 1); colPts.push([P[0] - .002, P[1] - .002, P[2]*.97]); }
  const extras = [tube(colPts, .0075)];
  for (let i = 0; i < 5; i++) { const s1 = .385 + i*.042, s2 = s1 + .022, a = top(Math.acos(1 - 2*s1)), b = top(Math.acos(1 - 2*s2)), m = (s1 + s2) / 2;
    extras.push(tube([[a[0], a[1] - .002, a[2]], [-L/2 + m*L, yTg(m) + .011, 0], [b[0], b[1] - .002, -b[2]]], .0023));
    extras.push(tube([[b[0], b[1] - .002, b[2]], [-L/2 + m*L, yTg(m) + .0085, 0], [a[0], a[1] - .002, -a[2]]], .0021)); }
  const h1 = upper(PI - .16, 1), h2 = upper(PI + .16, 1);
  extras.push(tube([[h1[0], h1[1] - .006, h1[2]], [h1[0] + .006, h1[1] + .012, h1[2]*.6], [h2[0] + .006, h2[1] + .012, h2[2]*.6], [h2[0], h2[1] - .006, h2[2]]], .0035));
  return { knit: up.geometry(), sole: sole.geometry(), rub: rub.geometry(), pad: pad.geometry(), extras, zones: SH_ZONES, size: SH_SIZE, target: [0, .045, 0] };
}

// ---------- materials ----------
let TEX = null;
function textures(renderer){
  if (TEX) return TEX;
  const L = new THREE.TextureLoader(), an = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ld = u => { const t = L.load(u); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = an; return t; };
  return TEX = { n: ld('assets/textures/knit3d_normal.webp'), h: ld('assets/textures/knit3d_height.webp') };
}
function ledMaterial(renderer, opts){
  const T = textures(renderer);
  const m = new THREE.MeshPhysicalMaterial({ color: opts.color, roughness: .93, metalness: 0, sheen: 1, sheenRoughness: .55, sheenColor: new THREE.Color(opts.sheen || '#555b66'),
    normalMap: T.n, normalScale: new THREE.Vector2(opts.ns || 1.1, opts.ns || 1.1), side: THREE.DoubleSide });
  const U = m.userData.U = { uAtlas: { value: null }, uAtSize: { value: new THREE.Vector2(1, 1) }, uAt: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uZ: { value: Array.from({ length: 8 }, () => new THREE.Vector4(1, 1, 1, 0)) }, uOn: { value: new Array(8).fill(0) }, uLook: { value: 0 }, uSel: { value: -1 }, uPulse: { value: 0 }, uKnitH: { value: T.h }, uGain: { value: opts.gain || 1.6 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 zuv; attribute float zid; varying vec2 vZuv; varying float vZid;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZuv = zuv; vZid = zid;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vZuv; varying float vZid;
uniform sampler2D uAtlas, uKnitH; uniform vec2 uAtSize; uniform vec4 uAt[8]; uniform vec4 uZ[8]; uniform float uOn[8]; uniform float uLook, uSel, uPulse, uGain;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  int zi = int(vZid + .5);
  if (vZid > -.5 && vZuv.x >= 0. && vZuv.x <= 1. && vZuv.y >= 0. && vZuv.y <= 1. && uOn[zi] > .5) {
    vec4 at = uAt[zi], zz = uZ[zi];
    vec2 cell = vZuv * zz.xy; vec2 ci = min(floor(cell), zz.xy - 1.); vec2 f = fract(cell) - .5;
    vec3 px = texture2D(uAtlas, (at.xy + ci + .5) / uAtSize).rgb; px = pow(px, vec3(2.2));
    float asp = zz.z; vec3 e; float ppc = 1. / max(max(fwidth(cell.x), fwidth(cell.y)), 1e-4); float dotk = smoothstep(2.2, 6., ppc);
    if (uLook < .5) { float d = length(f * vec2(max(asp, 1.), max(1. / asp, 1.))) ;
      e = px * (smoothstep(.40, .16, d) * 1.3 + exp(-d * d * 7.) * .4) + px * .05; }
    else { float sx = f.x + .5; vec3 sub = vec3(smoothstep(.0,.05,sx)*smoothstep(.32,.27,sx), smoothstep(.35,.40,sx)*smoothstep(.65,.60,sx), smoothstep(.68,.73,sx)*smoothstep(1.,.95,sx));
      e = px * sub * smoothstep(.48, .38, abs(f.y)) * 2.7 + px * .03; }
    e = mix(px * .95, e, dotk);
    float kh = texture2D(uKnitH, vNormalMapUv).r;
    e *= (.5 + .85 * kh) * uGain;
    totalEmissiveRadiance += e;
    diffuseColor.rgb *= .75;
    if (abs(vZid - uSel) < .5) totalEmissiveRadiance += vec3(.35, .55, .8) * uPulse * .12;
  }
}`);
  };
  m.customProgramCacheKey = () => 'exovela-led';
  return m;
}

// ---------- viewer ----------
export class Viewer3D {
  constructor(stage, garment, kind){
    this.stage = stage; this.g = garment; this.kind = kind; this.on = false; this.spin = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cv = this.canvas = document.createElement('canvas'); cv.className = 'lg-3d'; cv.setAttribute('aria-label', `3D ${kind}. Drag to rotate, pinch or scroll to zoom, two fingers or right-drag to move.`); cv.setAttribute('role', 'img');
    stage.insertBefore(cv, stage.querySelector('.lg-over'));
    const mobile = matchMedia('(pointer: coarse)').matches;
    const R = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const S = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(new RoomEnvironment(), .04).texture; S.environmentIntensity = .42; pm.dispose();
    const key = new THREE.DirectionalLight('#fff4e8', 2.1); key.position.set(1.2, 2.2, 1.8); key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); key.shadow.radius = 6; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    S.add(key, key.target);
    const teal = new THREE.DirectionalLight('#28e0ff', .95); teal.position.set(-2, .8, -1.6);
    const pink = new THREE.DirectionalLight('#ff3fa6', .85); pink.position.set(2, .6, -1.8);
    S.add(teal, pink, new THREE.HemisphereLight('#9fb4d6', '#0a0b0f', .35));
    const M = this.build(kind, R);
    const box = new THREE.Box3().setFromObject(M), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const sc = key.shadow.camera, ext = Math.max(size.x, size.y, size.z) * .8; sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.near = .1; sc.far = 8; key.target.position.copy(ctr);
    // floor: soft shadow catcher plus a contact blob
    const fy = kind === 'shoe' ? box.min.y : box.min.y - .09;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ext * 6, ext * 6), new THREE.ShadowMaterial({ opacity: .45 })); floor.rotation.x = -PI/2; floor.position.y = fy; floor.receiveShadow = true; S.add(floor);
    const bc = document.createElement('canvas'); bc.width = bc.height = 128; const bx = bc.getContext('2d'); const gr = bx.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); bx.fillStyle = gr; bx.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.2, size.z * 1.6 + .05), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false }));
    blob.rotation.x = -PI/2; blob.position.set(ctr.x, fy + .001, ctr.z); S.add(blob);
    const cam = this.camera = new THREE.PerspectiveCamera(30, 1, .01, 20);
    this.fit = { ctr, size }; this.controls = new OrbitControls(cam, cv);
    const C = this.controls; C.enableDamping = true; C.dampingFactor = .08; C.screenSpacePanning = true; C.autoRotateSpeed = 1.4; C.rotateSpeed = .8;
    C.maxPolarAngle = PI * .56; C.target.copy(ctr);
    this.resize(); this.placeCamera(); C.saveState();
    C.addEventListener('start', () => { this.user = true; this.dirty = true; clearTimeout(this.idle); });
    C.addEventListener('end', () => { this.idle = setTimeout(() => { this.user = false; }, 3500); });
    C.addEventListener('change', () => { this.dirty = true; });
    new ResizeObserver(() => { this.resize(); this.dirty = true; }).observe(stage);
    // tap a zone on the model: plays the game, or picks the zone
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
    cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY, performance.now()]; });
    cv.addEventListener('pointerup', e => { if (!down) return; const [x, y, t] = down; down = null;
      if (Math.hypot(e.clientX - x, e.clientY - y) > 6 || performance.now() - t > 450) return;
      const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObject(this.ledMesh, false)[0]; if (!hit) return;
      const gg = this.ledMesh.geometry, zid = gg.attributes.zid.getX(hit.face.a); if (zid < 0) return;
      const zu = gg.attributes.zuv, vA = new THREE.Vector2().fromBufferAttribute(zu, hit.face.a), vB = new THREE.Vector2().fromBufferAttribute(zu, hit.face.b), vC = new THREE.Vector2().fromBufferAttribute(zu, hit.face.c);
      const p = gg.attributes.position, a = new THREE.Vector3().fromBufferAttribute(p, hit.face.a), b = new THREE.Vector3().fromBufferAttribute(p, hit.face.b), c = new THREE.Vector3().fromBufferAttribute(p, hit.face.c);
      const lp = this.ledMesh.worldToLocal(hit.point.clone()), uv = THREE.Triangle.getInterpolation(lp, a, b, c, vA, vB, vC, new THREE.Vector2());
      const id = this.M.zones[Math.round(zid)];
      if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) { this.g.select(id); return; }
      this.g.tapZone(id, uv.x, uv.y); this.dirty = true; });
    this.visible = true; new IntersectionObserver(es => { this.visible = es[0].isIntersecting; }).observe(stage);
    const loop = () => { requestAnimationFrame(loop); this.frame(); }; requestAnimationFrame(loop);
  }
  build(kind, R){
    const M = this.M = kind === 'shoe' ? buildShoe() : buildSweater();
    const g = new THREE.Group();
    const led = this.mat = ledMaterial(R, kind === 'shoe' ? { color: '#26282d', ns: .9, gain: 1.7 } : { color: '#2a2c32', ns: 1.15, gain: 1.6 });
    if (kind === 'shoe') { M.knit.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 1.6; }); }
    const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    this.ledMesh = mk(M.knit, led);
    if (M.dark) mk(M.dark, new THREE.MeshStandardMaterial({ color: '#060608', roughness: 1, side: THREE.DoubleSide }));
    if (M.sole) mk(M.sole, new THREE.MeshPhysicalMaterial({ color: '#e9e6df', roughness: .62, clearcoat: .15, clearcoatRoughness: .6 }));
    if (M.rub) mk(M.rub, new THREE.MeshStandardMaterial({ color: '#141518', roughness: .85, side: THREE.DoubleSide }));
    if (M.pad) mk(M.pad, ledMaterial(R, { color: '#1d1e22', ns: .8 }));
    if (M.extras) { const lm = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: .7 }); for (const e of M.extras) mk(e, lm); }
    this.scene.add(g); return g;
  }
  placeCamera(face = 'front'){
    const { ctr, size } = this.fit, cam = this.camera, a = cam.aspect, tf = Math.tan(cam.fov * PI / 360);
    const w = this.kind === 'shoe' ? Math.max(size.x, size.z) : size.x;
    const d = Math.max(size.y / 2 / tf, w / 2 / (tf * a)) * (this.kind === 'shoe' ? 1.65 : 1.12) + size.z * .3;
    this.dist = d; this.controls.minDistance = d * .35; this.controls.maxDistance = d * 2.2;
    const dir = this.kind === 'shoe' ? new THREE.Vector3(.18, .32, 1) : new THREE.Vector3(.12, .1, 1);
    if (face === 'back') dir.z *= -1, dir.x *= -1;
    cam.position.copy(ctr).addScaledVector(dir.normalize(), d); cam.lookAt(ctr);
  }
  face(view){ // turn the model to the front or back with a short animation
    const C = this.controls, from = Math.atan2(this.camera.position.x - C.target.x, this.camera.position.z - C.target.z);
    let to = view === 'back' ? PI : 0; let dlt = ((to - from + PI) % TAU + TAU) % TAU - PI;
    this.anim = { t0: performance.now(), from, dlt }; this.dirty = true;
  }
  reset(){ this.controls.reset(); this.anim = null; this.dirty = true; }
  setSpin(on){ this.spin = on; this.dirty = true; }
  show(){ this.on = true; this.canvas.style.display = 'block'; this.resize(); this.dirty = true; }
  hide(){ this.on = false; this.canvas.style.display = 'none'; }
  resize(){
    const r = this.stage.getBoundingClientRect(); if (!r.width) return;
    this.renderer.setSize(r.width, r.height, false); this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix();
  }
  frame(){
    if (!this.on || !this.visible) return;
    const C = this.controls, g = this.g;
    if (this.anim) { const k = Math.min(1, (performance.now() - this.anim.t0) / 700), e = k < .5 ? 2*k*k : 1 - (-2*k + 2) ** 2 / 2;
      const off = new THREE.Vector3().subVectors(this.camera.position, C.target), sp = new THREE.Spherical().setFromVector3(off); sp.theta = this.anim.from + this.anim.dlt * e;
      this.camera.position.copy(C.target).add(new THREE.Vector3().setFromSpherical(sp)); this.camera.lookAt(C.target); if (k >= 1) this.anim = null; this.dirty = true; }
    C.autoRotate = this.spin && !this.user && !this.anim;
    C.update();
    // LED atlas from the 2D engine
    const at = g.atlas;
    if (at && at.width) {
      const U = this.mat.userData.U;
      if (!this.tex || this.tex.image !== at || this.texW !== at.width || this.texH !== at.height) {
        if (this.tex) this.tex.dispose();
        const t = this.tex = new THREE.CanvasTexture(at); t.flipY = false; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace;
        this.texW = at.width; this.texH = at.height; U.uAtlas.value = t; U.uAtSize.value.set(at.width, at.height);
      }
      if (g.frameNo !== this.lastFrame) { this.lastFrame = g.frameNo; this.tex.needsUpdate = true; this.dirty = true; }
      this.M.zones.forEach((id, i) => { const r = g.at[id]; if (!r) { U.uOn.value[i] = 0; return; }
        U.uAt.value[i].set(r[0], r[1], r[2], r[3]); const [wm, hm] = this.M.size[id]; U.uZ.value[i].set(r[2], r[3], (wm / r[2]) / (hm / r[3]), 0); U.uOn.value[i] = g.assign[id] ? 1 : 0; });
      U.uLook.value = g.look; U.uSel.value = this.M.zones.indexOf(g.sel); U.uPulse.value = g.pulse || 0;
    }
    if (this.dirty || C.autoRotate) { this.renderer.render(this.scene, this.camera); this.dirty = false; }
  }
}
