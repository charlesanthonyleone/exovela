import { createPier, mountPierGear } from './pier.js';
import { mountAll, mountGarment, SKIN_LIST } from './garment3d.js';

const pier = createPier();
mountPierGear(pier);
window.ExovelaPier = pier;

const ready = mountAll().then(apis => {
  window.ExovelaGarments = apis;
  // pump garment glow into the pier water
  const hero = apis[0];
  if (hero && pier.setGlow) {
    const tick = () => {
      try {
        const [r, g, b] = (hero.getSkin && hero.view)
          ? [hero.view.lights.fill.color.r, hero.view.lights.fill.color.g, hero.view.lights.fill.color.b]
          : [0.3, 0.4, 1];
        pier.setGlow(r, g, b, 0.8, undefined);
      } catch {}
      requestAnimationFrame(tick);
    };
    tick();
  }
  document.dispatchEvent(new CustomEvent('exovela-ready', { detail: apis }));
  return apis;
});

window.Exovela = {
  SKIN_LIST,
  ready,
  mountGarment,
  get apis() { return window.ExovelaGarments || []; }
};

document.addEventListener('exovela-ready', () => {
  const host = document.getElementById('assembly');
  if (!host || !host._exovela) return;
  const api = host._exovela;
  document.querySelectorAll('[data-viewcut]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-viewcut]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    api.setCut(btn.dataset.viewcut);
  }));
  document.querySelectorAll('[data-viewmode]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-viewmode]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    api.setMode(btn.dataset.viewmode);
    api.setShowInner(true);
  }));
});
