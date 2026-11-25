/* Animated 2D previews of skins (front panel only), for listings. No WebGL. */
import { createSkin, createSkinCanvas } from './skins.js';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tiles = [];
document.querySelectorAll('[data-skin-tile]').forEach(el => {
  const src = createSkinCanvas(384);
  const skin = createSkin(el.dataset.skinTile, src, {});
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  el.appendChild(cv);
  const t = { el, src, skin, cv, ctx: cv.getContext('2d'), on: false };
  new IntersectionObserver(es => { t.on = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(el);
  tiles.push(t);
});
function paint(t, time) {
  const w = Math.round(t.el.clientWidth * Math.min(devicePixelRatio || 1, 2)), h = Math.round(t.el.clientHeight * Math.min(devicePixelRatio || 1, 2));
  if (!w || !h) return;
  if (t.cv.width !== w || t.cv.height !== h) { t.cv.width = w; t.cv.height = h; }
  t.skin.tick(time);
  const S = t.src.width; t.ctx.drawImage(t.src, S * 0.02, S * 0.30, S * 0.46, S * 0.68, 0, 0, w, h);
}
const t0 = performance.now();
if (reduced) tiles.forEach(t => paint(t, 3));
else { let last = 0; const loop = now => { if (now - last > 33) { last = now; tiles.forEach(t => t.on && paint(t, (now - t0) / 1000)); } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
