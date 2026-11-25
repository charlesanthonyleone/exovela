// Controls for the live garment demo: preset looks, free mode per zone, display look, phone mocks.
import { LiveGarment } from './garment-live.js';
import { SOURCES, PRESETS, CLIPS, CODE_SAMPLES, CodeSource, bus, game, mirrorScreen } from './garment-sources.js';
import { SWEATER, SHOE } from './garment-config.js';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); return e; };
const AD_KEY = 'exovela.adslot';
export const adSlot = { get(){ try { return JSON.parse(localStorage.getItem(AD_KEY)) || { on: false }; } catch { return { on: false }; } }, set(v){ try { localStorage.setItem(AD_KEY, JSON.stringify(v)); } catch {} } };

const SWEATER_ZONES = [['chest','Chest'],['stomach','Stomach'],['sleeveL','Left sleeve'],['sleeveR','Right sleeve'],['cuffs','Cuffs'],['back','Back']];
const zoneIds = z => z === 'cuffs' ? ['cuffL','cuffR'] : [z];

function mountSweater(root){
  const g = new LiveGarment($('.lg-stage', root), SWEATER);
  const ui = $('.lg-panel', root);
  let zone = 'chest', mode = 'looks';
  const status = $('[data-lg-status]', root);
  const say = t => { if (status) status.textContent = t; };

  // view toggle and display controls on the stage
  const viewBtns = [...root.querySelectorAll('[data-view]')];
  const setView = v => { g.setView(v); viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v))); };
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  root.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => { g.setLook(+b.dataset.look); root.querySelectorAll('[data-look]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  root.querySelectorAll('[data-pitch]').forEach(b => b.addEventListener('click', () => { g.setPitch(+b.dataset.pitch); root.querySelectorAll('[data-pitch]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));

  // preset looks
  const presetBox = $('[data-presets]', root);
  const presetBtns = PRESETS.map(p => h('button', { type: 'button', class: 'preset', 'data-preset': p.id, 'aria-pressed': 'false', onclick: () => { g.applyPreset(p); mark(p.id); say(`${p.label}${p.note ? ': ' + p.note.toLowerCase() : ''}.`); } }, h('span', { class: 'sw sw-' + p.id }), p.label));
  presetBox.append(...presetBtns);
  const mark = id => presetBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === id)));

  // mode tabs: Looks / Free mode
  const tabs = [...root.querySelectorAll('[data-tab]')];
  const panes = [...root.querySelectorAll('[data-pane]')];
  const showTab = t => { mode = t; tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t))); panes.forEach(p => p.hidden = p.dataset.pane !== t); };
  tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // free mode: zone chips + sources
  const zoneBox = $('[data-zones]', root);
  const zoneBtns = SWEATER_ZONES.map(([id, label]) => h('button', { type: 'button', class: 'chip', 'data-z': id, 'aria-pressed': String(id === zone), onclick: () => pickZone(id) }, label));
  zoneBox.append(...zoneBtns);
  const pickZone = id => { zone = id; zoneBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.z === id))); if (id === 'back' && g.view !== 'back') setView('back'); if ((id === 'chest' || id === 'stomach') && g.view !== 'front') setView('front'); g.select(zoneIds(id)[0]); say(`Editing: ${SWEATER_ZONES.find(z => z[0] === id)[1]}.`); };
  g.on(() => {}); // keep for future
  const assign = (src, opts = {}) => { for (const id of zoneIds(zone)) g.set(id, src, { ...opts, zone: id }); mark(null); };

  const srcTabs = [...root.querySelectorAll('[data-src]')], srcPanes = [...root.querySelectorAll('[data-srcpane]')];
  const showSrc = s => { srcTabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.src === s))); srcPanes.forEach(p => p.hidden = p.dataset.srcpane !== s); onSrc[s] && onSrc[s](); };
  srcTabs.forEach(b => b.addEventListener('click', () => showSrc(b.dataset.src)));
  const onSrc = {
    draw(){ if (zone === 'chest' || zone === 'stomach') pickZone('back'); assign('draw'); },
    game(){ if (zone !== 'chest' && zone !== 'stomach') pickZone('chest'); assign('ttt'); say('Your move. Tap a square on the sweater or the phone.'); },
    mirror(){ assign('mirror'); },
    ad(){ renderAd(); },
  };

  // shows
  const showsBox = $('[data-shows]', root);
  const spanSel = $('[data-span]', root);
  for (const c of CLIPS) showsBox.append(h('button', { type: 'button', class: 'chan', onclick: () => {
      const span = spanSel ? spanSel.value : 'zone';
      if (span === 'torso') { g.setSpan(['chest','stomach'], 'video', { clip: c.id }); pickZone('chest'); }
      else if (span === 'all') { for (const id of ['chest','stomach','back','sleeveL','sleeveR','cuffL','cuffR']) g.set(id, 'video', { clip: c.id }); }
      else assign('video', { clip: c.id });
      mark(null); say(`${c.label} on ${span === 'torso' ? 'the chest and stomach' : span === 'all' ? 'every zone, each framed on its own' : 'this zone'}.`); } },
    h('img', { src: `assets/video/ch-${c.id}-poster.jpg`, alt: '', width: 60, height: 80, loading: 'lazy' }), h('span', {}, c.label), h('small', {}, c.kind)));

  // patterns & widgets
  root.querySelectorAll('[data-pat]').forEach(b => b.addEventListener('click', () => { const o = b.dataset.opts ? JSON.parse(b.dataset.opts) : {}; assign(b.dataset.pat, o); say(`${b.textContent.trim()} on this zone.`); }));
  const color = $('[data-solid]', root); color && color.addEventListener('input', () => assign('solid', { color: color.value }));
  const handle = $('[data-handle]', root); handle && handle.addEventListener('change', () => { bus.handle = handle.value || '@yourname'; assign('ticker', { text: bus.handle }); });

  // phone mirror mock shows the same simulated screen
  const mirrorCv = $('[data-mirror]', root);
  if (mirrorCv) { const mx = mirrorCv.getContext('2d'); const tick = t => { requestAnimationFrame(tick); if (!$('[data-srcpane="mirror"]', root).hidden) { mx.imageSmoothingEnabled = false; mx.drawImage(mirrorScreen(t/1000), 0, 0, mirrorCv.width, mirrorCv.height); } }; requestAnimationFrame(tick); }

  // code mode
  const code = $('[data-code]', root), err = $('[data-code-err]', root);
  let codeSrc = null;
  const runCode = () => {
    const a = g.assign[zoneIds(zone)[0]];
    if (a && a.inst instanceof CodeSource) { a.inst.setCode(code.value); codeSrc = a.inst; }
    else { assign('code', { code: code.value }); codeSrc = g.assign[zoneIds(zone)[0]].inst; }
    codeSrc.listeners.add(s => { err.textContent = s.err ? 'Error: ' + s.err : 'Running.'; });
  };
  $('[data-run]', root)?.addEventListener('click', runCode);
  root.querySelectorAll('[data-sample]').forEach(b => b.addEventListener('click', () => { code.value = CODE_SAMPLES[b.dataset.sample]; runCode(); }));
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
    root.querySelectorAll('[data-ink]').forEach(b => b.addEventListener('click', () => { bus.drawColor = b.dataset.ink; bus.textColor = b.dataset.ink; }));
    $('[data-clear]', root)?.addEventListener('click', () => { bus.strokes.length = 0; bus.text = ''; redraw(); });
    redraw();
    const ptabs = [...root.querySelectorAll('[data-ptab]')], ppanes = [...root.querySelectorAll('[data-ppane]')];
    ptabs.forEach(b => b.addEventListener('click', () => { ptabs.forEach(x => x.setAttribute('aria-selected', String(x === b))); ppanes.forEach(p => p.hidden = p.dataset.ppane !== b.dataset.ptab); }));
    const txt = $('[data-text]', root);
    $('[data-send]', root)?.addEventListener('click', () => { bus.text = txt.value.trim(); bus.strokes.length = 0; redraw(); assign('draw'); say(`Sent to the ${SWEATER_ZONES.find(z => z[0] === zone)[1].toLowerCase()}.`); });
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

  // ad mode: the slot belongs to the account, not the garment
  const adBox = $('[data-ad]', root);
  const renderAd = () => { const s = adSlot.get(); $('[data-ad-state]', root).textContent = s.on ? 'On. Showing on the sweater back and the shoe heel.' : 'Off.'; $('[data-ad-toggle]', root).setAttribute('aria-pressed', String(!!s.on)); $('[data-ad-toggle]', root).textContent = s.on ? 'Turn the slot off' : 'Turn the slot on'; };
  $('[data-ad-toggle]', root)?.addEventListener('click', () => { const s = adSlot.get(); s.on = !s.on; adSlot.set(s); if (s.on) { g.set('back', 'ad'); setView('back'); } else g.set('back', 'off'); renderAd(); });
  if (adBox) renderAd();

  $('[data-off]', root)?.addEventListener('click', () => { assign('off'); say('Zone off.'); });

  // first look: mixed zones, so every zone is visibly doing its own thing
  const first = PRESETS.find(p => p.id === 'mix'); g.applyPreset(first); mark('mix');
  if (adSlot.get().on) g.set('back', 'ad');
  showTab('looks'); showSrc('shows');
  window.__lg = g;
}

function mountShoe(root){
  const g = new LiveGarment($('.lg-stage', root), SHOE);
  const status = $('[data-lg-status]', root); const say = t => status && (status.textContent = t);
  const looks = {
    ad: [{ zone: ['quarter'], src: 'flannel' }, { zone: ['heel'], src: 'ad' }],
    show: [{ zone: ['quarter'], src: 'video', opts: { clip: 'surf' } }, { zone: ['heel'], src: 'solid', opts: { match: 'surf' } }],
    fire: [{ zone: ['quarter'], src: 'fireplace' }, { zone: ['heel'], src: 'solid', opts: { color: '#ff8a2a', breathe: true } }],
    psych: [{ zone: ['quarter'], src: 'plasma' }, { zone: ['heel'], src: 'stripes', opts: { n: 3 } }],
    grid: [{ zone: ['quarter'], src: 'grid' }, { zone: ['heel'], src: 'streaks', opts: { color: '#ff3d8b' } }],
    ticker: [{ zone: ['quarter'], src: 'ticker', opts: { text: '@yourname', color: '#eef0f3', bg: '#0b1a24', vertical: false } }, { zone: ['heel'], src: 'clock' }],
    ocean: [{ zone: ['quarter'], src: 'video', opts: { clip: 'ocean' } }, { zone: ['heel'], src: 'solid', opts: { color: '#19d3ff' } }],
  };
  const btns = [...root.querySelectorAll('[data-shoe]')];
  const apply = id => { const z = looks[id].map(r => (r.zone[0] === 'heel' && adSlot.get().on && id !== 'ad') ? { zone: ['heel'], src: 'ad' } : r); g.applyPreset({ id, zones: z }); btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.shoe === id))); say(adSlot.get().on ? 'Your ad slot is on, so the heel shows it in every look.' : ''); };
  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.shoe)));
  root.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => { g.setLook(+b.dataset.look); root.querySelectorAll('[data-look]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
  const adB = $('[data-ad-toggle]', root);
  const sync = () => { const s = adSlot.get(); if (adB) { adB.setAttribute('aria-pressed', String(!!s.on)); adB.textContent = s.on ? 'Ad slot on (from your account)' : 'Ad slot off'; } };
  adB?.addEventListener('click', () => { const s = adSlot.get(); s.on = !s.on; adSlot.set(s); sync(); apply(btns.find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.shoe || 'psych'); });
  sync(); apply('psych');
  window.__shoe = g;
}

document.querySelectorAll('[data-live-garment="sweater"]').forEach(mountSweater);
document.querySelectorAll('[data-live-garment="shoe"]').forEach(mountShoe);
