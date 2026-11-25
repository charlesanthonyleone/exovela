// Controls for the live garments: preset looks, free mode per zone, display look, 3D, pair view, outfit sync, idea demos.
import { LiveGarment } from './garment-live.js';
import { SOURCES, PRESETS, SHOE_PRESETS, OUTFIT, TOE_OK, CLIPS, CODE_SAMPLES, CodeSource, bus, game, sim, mirrorScreen, clips } from './garment-sources.js';
import { SWEATER, SHOE } from './garment-config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };
const store = key => ({ get(d){ try { return JSON.parse(localStorage.getItem(key)) ?? d; } catch { return d; } }, set(v){ try { localStorage.setItem(key, JSON.stringify(v)); } catch {} } });
export const adSlot = store('exovela.adslot');
const outfit = store('exovela.outfit');   // { on, look }
const stages = {};                         // kind -> api, so the sweater can drive the shoe on the home page

const KINDS = {
  sweater: { cfg: SWEATER, presets: PRESETS, first: 'mix',
    zones: [['chest','Chest'],['stomach','Stomach'],['sleeveL','Left sleeve'],['sleeveR','Right sleeve'],['cuffs','Cuffs'],['back','Back']],
    ids: z => z === 'cuffs' ? ['cuffL','cuffR'] : [z], drawZone: 'back', gameZone: 'chest', adZone: 'back',
    spans: { torso: [['chest','stomach'], 'y', 'the chest and stomach'], all: [['chest','stomach','back','sleeveL','sleeveR','cuffL','cuffR'], null, 'every zone, each framed on its own'] } },
  shoe: { cfg: SHOE, presets: SHOE_PRESETS, first: 'show',
    zones: [['outer','Outer side'],['inner','Inner side'],['heel','Heel'],['toe','Toe cap'],['tongue','Tongue'],['sole','Sole strip']],
    ids: z => [z], drawZone: 'outer', gameZone: 'outer', adZone: 'heel',
    spans: { wrap: [['outer','heel','inner'], 'x', 'one picture wrapped from the outer side around the heel to the inner side'], all: [['outer','inner','heel','toe','tongue','sole'], null, 'every zone, each framed on its own'] } },
};

// Photo / 3D switch for a stage. The 3D viewer (three.js) loads only when first asked for.
function mount3D(root, g, kind, onReady){
  const stage = $('.lg-stage', root), btns = $$('[data-mode3d]', root), ctl = $('[data-3dctl]', root), note = $('[data-note]', root);
  const photoNote = note ? note.textContent : '';
  let viewer = null, loading = false, hintT;
  const set = async on => {
    btns.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode3d === '1') === on)));
    if (on) {
      if (!viewer) {
        if (loading) return; loading = true; stage.classList.add('is-loading3d');
        try { const { Viewer3D } = await import('./garment3d-view.js'); const v = new Viewer3D(stage, g, kind); await v.ready; viewer = v; onReady && onReady(v); }
        catch (e) { console.warn(e); loading = false; stage.classList.remove('is-loading3d'); btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode3d === '0'))); if (note) note.textContent = '3D needs WebGL, which this browser has turned off'; return; }
        loading = false; stage.classList.remove('is-loading3d');
      }
      viewer.show(); g.paused2d = true; stage.classList.add('is3d'); root.classList.add('mode-3d'); if (ctl) ctl.hidden = false;
      if (note) note.textContent = kind === 'shoe' ? 'Simulated LEDs on a licensed 3D shoe model, retextured' : 'Simulated LEDs on our 3D sweater model';
      if (g.view === 'back') viewer.face('back');
      stage.classList.add('hint-on'); clearTimeout(hintT); hintT = setTimeout(() => stage.classList.remove('hint-on'), 4200);
    } else {
      if (viewer) viewer.hide(); g.paused2d = false; g.last = 0; stage.classList.remove('is3d', 'hint-on'); root.classList.remove('mode-3d'); if (ctl) ctl.hidden = true; if (note) note.textContent = photoNote;
    }
    root.dispatchEvent(new CustomEvent('mode3d', { detail: on }));
  };
  btns.forEach(b => b.addEventListener('click', () => set(b.dataset.mode3d === '1')));
  const spin = $('[data-spin]', root);
  if (spin) { if (matchMedia('(prefers-reduced-motion: reduce)').matches) spin.setAttribute('aria-pressed', 'false');
    spin.addEventListener('click', () => { const on = spin.getAttribute('aria-pressed') !== 'true'; spin.setAttribute('aria-pressed', String(on)); viewer && viewer.setSpin(on); }); }
  $('[data-reset]', root)?.addEventListener('click', () => viewer && viewer.reset());
  return { set, face: v => { if (viewer && viewer.on) viewer.face(v); }, get viewer(){ return viewer; }, get on(){ return !!(viewer && viewer.on); } };
}

function mountGarment(root){
  const kind = root.dataset.liveGarment, K = KINDS[kind];
  const g = new LiveGarment($('.lg-stage', root), K.cfg);
  let zone = K.zones[0][0];
  const status = $('[data-lg-status]', root);
  const say = t => { if (status) status.textContent = t; };
  const zoneLabel = id => (K.zones.find(z => z[0] === id) || [, id])[1];

  // view (front/back, or left/right foot), display look, pitch
  const viewBtns = $$('[data-view]', root);
  let v3 = null;
  const setView = v => { g.setView(v); viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v))); if (v3 && kind === 'sweater') v3.face(v); };
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('[data-look]', root).forEach(b => b.addEventListener('click', () => { g.setLook(+b.dataset.look); $$('[data-look]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  $$('[data-pitch]', root).forEach(b => b.addEventListener('click', () => { g.setPitch(+b.dataset.pitch); $$('[data-pitch]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));

  // pair (shoe): both feet in 3D, and whether the right foot matches or mirrors the left
  const pairBtn = $('[data-pair]', root);
  const syncPair = () => { const v = v3 && v3.viewer; if (v && pairBtn) v.setPair(pairBtn.getAttribute('aria-pressed') === 'true'); };
  v3 = mount3D(root, g, kind, () => { syncPair(); const v = v3.viewer; v.setPairMode(g.pairMode); });
  pairBtn?.addEventListener('click', () => { const on = pairBtn.getAttribute('aria-pressed') !== 'true'; pairBtn.setAttribute('aria-pressed', String(on));
    if (on && !v3.on) v3.set(true).then(syncPair); else syncPair(); say(on ? 'Both shoes. Drag to look at the pair from the front.' : 'One shoe.'); });
  $$('[data-pairmode]', root).forEach(b => b.addEventListener('click', () => { const m = b.dataset.pairmode; g.setPairMode(m); v3.viewer && v3.viewer.setPairMode(m);
    $$('[data-pairmode]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    say(m === 'match' ? 'Match: text and pictures read the right way on both feet.' : 'Mirror: the right foot is the left foot\'s reflection, like a symmetric pattern.'); }));

  // preset looks
  const presetBox = $('[data-presets]', root);
  const presetBtns = [];
  const applyLook = (p, quiet) => {
    if (p.id === 'stealth') { setStealth(true); mark(p.id); say('Stealth: every zone dark at once. It looks like a plain ' + (kind === 'shoe' ? 'sneaker.' : 'sweater.')); return; }
    setStealth(false, true);
    g.applyPreset(p); mark(p.id);
    const ad = adSlot.get({ on: false }); if (ad.on && p.id !== 'stealth') g.set(K.adZone, 'ad');
    if (!quiet) say(`${p.label}${p.note ? ': ' + p.note.charAt(0).toLowerCase() + p.note.slice(1) : ''}.${ad.on ? ' Your ad slot is on, so the ' + (kind === 'shoe' ? 'heel' : 'back') + ' shows it.' : ''}`);
    if (kind === 'sweater') { const o = outfit.get({ on: false }); o.look = p.id; outfit.set(o); if (o.on && stages.shoe) stages.shoe.follow(p.id); }
    root.querySelectorAll('[data-sim]').forEach(el => el.hidden = !p.sim);
  };
  if (presetBox) for (const p of K.presets) { const b = h('button', { type: 'button', class: 'preset' + (p.sim ? ' preset-sim' : ''), 'data-preset': p.id, 'aria-pressed': 'false', onclick: () => applyLook(p) }, h('span', { class: `sw sw-${kind === 'shoe' ? 'shoe-' : ''}${p.id}` }), p.label, p.sim ? h('small', {}, 'simulated') : null); presetBtns.push(b); presetBox.append(b); }
  const mark = id => presetBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === id)));

  // stealth: one tap and everything goes dark
  const stealthBtns = $$('[data-stealth]', root);
  const setStealth = (on, quiet) => { g.setStealth(on); stealthBtns.forEach(b => { b.setAttribute('aria-pressed', String(on)); });
    if (kind === 'sweater' && outfit.get({}).on && stages.shoe) stages.shoe.stealth(on);
    if (!quiet) say(on ? 'Stealth on. Tap again to light back up.' : 'Lights back on.'); };
  stealthBtns.forEach(b => b.addEventListener('click', () => setStealth(b.getAttribute('aria-pressed') !== 'true')));

  // mode tabs: Looks / Free mode
  const tabs = $$('[data-tab]', root), panes = $$('[data-pane]', root);
  const showTab = t => { tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t))); panes.forEach(p => p.hidden = p.dataset.pane !== t); };
  tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // free mode: zone chips + sources
  const zoneBox = $('[data-zones]', root);
  const zoneBtns = zoneBox ? K.zones.map(([id, label]) => h('button', { type: 'button', class: 'chip', 'data-z': id, 'aria-pressed': String(id === zone), onclick: () => pickZone(id) }, label)) : [];
  zoneBox?.append(...zoneBtns);
  const pickZone = id => { zone = id; zoneBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.z === id)));
    if (kind === 'sweater') { if (id === 'back' && g.view !== 'back') setView('back'); if ((id === 'chest' || id === 'stomach') && g.view !== 'front') setView('front'); }
    g.select(K.ids(id)[0]);
    let extra = '';
    if (kind === 'shoe' && id === 'inner' && !v3.on) extra = ' The inner side faces the other shoe, so it only shows in 3D. Switch to 3D and tap Pair.';
    if (kind === 'shoe' && id === 'toe') extra = ' The toe cap creases and scuffs, so it takes color, stripes and pulses. Pictures and text stay on the side panels.';
    say(`Editing: ${zoneLabel(id)}.${extra}`); };
  g.on(() => { if (!g.sel) return; const z = kind === 'sweater' && g.sel.startsWith('cuff') ? 'cuffs' : g.sel; if (z !== zone && K.zones.some(q => q[0] === z)) { zone = z; zoneBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.z === z))); } });
  const assign = (src, opts = {}) => {
    setStealth(false, true);
    if (kind === 'shoe' && zone === 'toe' && !TOE_OK.has(src)) {
      const color = src === 'video' ? null : (opts.color || '#33e6ff');
      g.set('toe', 'solid', color ? { color } : { match: opts.clip, breathe: true });
      say(`The toe cap bends every step, so ${SOURCES[src].label.toLowerCase()} would crease. It gets a matching color instead.`); mark(null); return;
    }
    for (const id of K.ids(zone)) g.set(id, src, { ...opts, zone: id }); mark(null);
  };

  const srcTabs = $$('[data-src]', root), srcPanes = $$('[data-srcpane]', root);
  const showSrc = s => { srcTabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.src === s))); srcPanes.forEach(p => p.hidden = p.dataset.srcpane !== s); onSrc[s] && onSrc[s](); if (userPick) revealPane(s); };
  let userPick = false; const revealPane = s => { const pane = srcPanes.find(p => p.dataset.srcpane === s); const ph = pane && (pane.querySelector('.phone') || pane); if (!ph) return; const r = ph.getBoundingClientRect(); if (r.bottom > innerHeight - 8) { const dy = Math.min(r.bottom - innerHeight + 24, r.top - 72); if (dy > 0) scrollBy({ top: dy, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } };
  srcTabs.forEach(b => b.addEventListener('click', () => { userPick = true; showSrc(b.dataset.src); }));
  const onSrc = {
    draw(){ if (kind === 'sweater' ? (zone === 'chest' || zone === 'stomach') : zone === 'toe') pickZone(K.drawZone); assign('draw'); },
    game(){ if (kind === 'sweater' ? (zone !== 'chest' && zone !== 'stomach') : (zone !== 'outer' && zone !== 'inner')) pickZone(K.gameZone); assign('ttt'); say(`Your move. Tap a square on the ${kind} or the phone.`); },
    mirror(){ assign('mirror'); },
    ad(){ renderAd(); },
  };

  // shows
  const showsBox = $('[data-shows]', root), spanSel = $('[data-span]', root);
  if (showsBox) for (const c of CLIPS) showsBox.append(h('button', { type: 'button', class: 'chan', onclick: () => {
      const span = spanSel ? spanSel.value : 'zone', S = K.spans[span];
      setStealth(false, true);
      if (S && S[1]) { g.setSpan(S[0], 'video', { clip: c.id }, S[1]); }
      else if (S) { for (const id of S[0]) (kind === 'shoe' && id === 'toe') ? g.set(id, 'solid', { match: c.id }) : g.set(id, 'video', { clip: c.id }); }
      else assign('video', { clip: c.id });
      mark(null); say(`${c.label} on ${S ? S[2] : 'this zone'}.`); } },
    h('img', { src: `assets/video/ch-${c.id}-poster.jpg`, alt: '', width: 60, height: 80, loading: 'lazy' }), h('span', {}, c.label), h('small', {}, c.kind)));

  // patterns & widgets
  $$('[data-pat]', root).forEach(b => b.addEventListener('click', () => { const o = b.dataset.opts ? JSON.parse(b.dataset.opts) : {}; assign(b.dataset.pat, o); if (!(kind === 'shoe' && zone === 'toe' && !TOE_OK.has(b.dataset.pat))) say(`${b.textContent.trim()} on the ${zoneLabel(zone).toLowerCase()}.`); }));
  const color = $('[data-solid]', root); color && color.addEventListener('input', () => assign('solid', { color: color.value }));
  const handle = $('[data-handle]', root); handle && handle.addEventListener('change', () => { bus.handle = handle.value || '@yourname'; assign('ticker', { text: bus.handle }); });

  // phone mirror mock shows the same simulated screen
  const mirrorCv = $('[data-mirror]', root);
  if (mirrorCv) { const mx = mirrorCv.getContext('2d'); const pane = $('[data-srcpane="mirror"]', root); const tick = t => { requestAnimationFrame(tick); if (!pane.hidden) { mx.imageSmoothingEnabled = false; mx.drawImage(mirrorScreen(t/1000), 0, 0, mirrorCv.width, mirrorCv.height); } }; requestAnimationFrame(tick); }

  // code mode
  const code = $('[data-code]', root), err = $('[data-code-err]', root);
  const runCode = () => {
    if (kind === 'shoe' && zone === 'toe') { assign('code'); return; }
    const a = g.assign[K.ids(zone)[0]]; let src;
    if (a && a.inst instanceof CodeSource) { a.inst.setCode(code.value); src = a.inst; }
    else { assign('code', { code: code.value }); src = g.assign[K.ids(zone)[0]].inst; }
    src.listeners.add(s => { err.textContent = s.err ? 'Error: ' + s.err : 'Running.'; });
  };
  $('[data-run]', root)?.addEventListener('click', runCode);
  $$('[data-sample]', root).forEach(b => b.addEventListener('click', () => { code.value = CODE_SAMPLES[b.dataset.sample]; runCode(); }));
  if (code) code.value = CODE_SAMPLES.plasma;

  // draw mode: phone draw pad and text pad
  const pad = $('[data-pad]', root);
  if (pad) {
    const px = pad.getContext('2d'); let cur = null;
    const redraw = () => { px.fillStyle = '#0b0d12'; px.fillRect(0, 0, pad.width, pad.height); px.lineCap = px.lineJoin = 'round'; px.lineWidth = 6;
      for (const s of bus.strokes) { px.strokeStyle = s.color; px.beginPath(); s.pts.forEach((p, i) => i ? px.lineTo(p[0]*pad.width, p[1]*pad.height) : px.moveTo(p[0]*pad.width, p[1]*pad.height)); px.stroke(); } };
    const pt = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    pad.addEventListener('pointerdown', e => { pad.setPointerCapture(e.pointerId); cur = { color: bus.drawColor, pts: [pt(e)] }; bus.strokes.push(cur); bus.text = ''; redraw(); });
    pad.addEventListener('pointermove', e => { if (!cur) return; cur.pts.push(pt(e)); redraw(); });
    pad.addEventListener('pointerup', () => { cur = null; });
    $$('[data-ink]', root).forEach(b => b.addEventListener('click', () => { bus.drawColor = b.dataset.ink; bus.textColor = b.dataset.ink; }));
    $('[data-clear]', root)?.addEventListener('click', () => { bus.strokes.length = 0; bus.text = ''; redraw(); });
    redraw();
    const ptabs = $$('[data-ptab]', root), ppanes = $$('[data-ppane]', root);
    ptabs.forEach(b => b.addEventListener('click', () => { ptabs.forEach(x => x.setAttribute('aria-selected', String(x === b))); ppanes.forEach(p => p.hidden = p.dataset.ppane !== b.dataset.ptab); }));
    const txt = $('[data-text]', root);
    $('[data-send]', root)?.addEventListener('click', () => { bus.text = txt.value.trim(); bus.strokes.length = 0; redraw(); assign('draw'); say(`Sent to the ${zoneLabel(zone).toLowerCase()}.`); });
  }

  // game: phone grid mirrors the garment board
  const grid = $('[data-ttt]', root), gstat = $('[data-ttt-status]', root);
  if (grid) {
    const cells = [...Array(9)].map((_, i) => h('button', { type: 'button', class: 'ttt-cell', 'aria-label': `Square ${i+1}`, onclick: () => game.play(i) }));
    grid.append(...cells);
    const sync = () => { cells.forEach((c, i) => { c.textContent = game.b[i]; c.dataset.m = game.b[i]; }); gstat.textContent = game.status; };
    game.listeners.add(sync); sync();
    $('[data-ttt-new]', root)?.addEventListener('click', () => game.reset());
  }

  // ad slot: belongs to the account, not the garment
  const adToggles = $$('[data-ad-toggle]', root);
  const renderAd = () => { const s = adSlot.get({ on: false }); const st = $('[data-ad-state]', root); if (st) st.textContent = s.on ? 'On. Showing on the sweater back and the shoe heel.' : 'Off.';
    adToggles.forEach(b => { b.setAttribute('aria-pressed', String(!!s.on)); b.textContent = s.on ? 'Turn the slot off' : 'Turn the slot on'; }); };
  adToggles.forEach(b => b.addEventListener('click', () => { const s = adSlot.get({ on: false }); s.on = !s.on; adSlot.set(s);
    if (s.on) { g.set(K.adZone, 'ad'); if (kind === 'sweater') setView('back'); } else g.set(K.adZone, 'off'); renderAd(); }));
  renderAd();
  $('[data-off]', root)?.addEventListener('click', () => { assign('off'); say('Zone off.'); });

  // idea demos (all simulated)
  $('[data-brake]', root)?.addEventListener('click', () => { sim.brake(); say('Simulated stop: the heel goes full red for a moment, like a brake light.'); });
  $('[data-stepnow]', root)?.addEventListener('click', () => { sim.stepT0 = performance.now() / 1000; });
  const nearby = $('[data-nearby]', root);
  nearby?.addEventListener('click', () => {
    const keep = g.assign.back; const prevView = g.view; g.set('back', 'card'); setView('back');
    say('Simulated: another Exovela wearer walked by, so your back shows your calling card for 8 seconds.');
    clearTimeout(nearby._t); nearby._t = setTimeout(() => { if (keep) g.set('back', keep.src, keep.opts); else g.set('back', 'off'); setView(prevView); }, 8000);
  });

  // outfit sync toggle (home page): the sweater's look drives the shoe
  const syncBtns = $$('[data-outfit]', root);
  const renderSync = () => { const o = outfit.get({ on: false }); syncBtns.forEach(b => { b.setAttribute('aria-pressed', String(!!o.on)); }); };
  syncBtns.forEach(b => b.addEventListener('click', () => { const o = outfit.get({ on: false }); o.on = !o.on; outfit.set(o); $$('[data-outfit]').forEach(x => x.setAttribute('aria-pressed', String(o.on)));
    if (o.on && stages.shoe && stages.sweater) stages.shoe.follow(stages.sweater.look() || 'mix');
    say(o.on ? 'Outfit sync on: pick a sweater look and the shoes follow.' : 'Outfit sync off.'); }));
  renderSync();

  const api = stages[kind] = {
    g, look: () => g.preset,
    follow(id){ const p = K.presets.find(x => x.id === (OUTFIT[id] || id)); if (p) { applyLook(p, true); say(`Synced with the sweater: ${p.label}.`); } },
    stealth(on){ setStealth(on, true); },
  };

  // first look
  const o = outfit.get({ on: false });
  const firstId = kind === 'shoe' && o.on && o.look ? (OUTFIT[o.look] || K.first) : K.first;
  applyLook(K.presets.find(p => p.id === firstId), true);
  if (kind === 'shoe' && o.on && o.look) say(`Synced with your sweater look.`);
  showTab('looks'); if (srcTabs.length) showSrc('shows');
  if (kind === 'sweater') { window.__lg = g; window.__v3 = v3; } else { window.__shoe = g; window.__v3shoe = v3; }
}

document.querySelectorAll('[data-live-garment]').forEach(mountGarment);
