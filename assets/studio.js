import { SKIN_LIST } from './garment3d.js';

function ready() {
  return window.ExovelaGarments
    ? Promise.resolve(window.ExovelaGarments)
    : new Promise(r => document.addEventListener('exovela-ready', e => r(e.detail), { once: true }));
}

const $ = id => document.getElementById(id);

ready().then(apis => {
  const host = document.getElementById('stage');
  if (!host) return;
  const api = host._exovela || apis.find(a => a.el === host);
  if (!api) return;
  api.setSpin(true);

  let credits = 20;
  const grid = $('presets');
  if (grid) {
    grid.innerHTML = '';
    SKIN_LIST.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'preset';
      b.dataset.k = s.id;
      b.setAttribute('aria-pressed', String(i === 0));
      b.innerHTML = `<span class="preset-swatch" data-skin="${s.id}"></span><span>${s.name}<small>${s.kind}</small></span>`;
      b.addEventListener('click', () => choose(s.id));
      grid.appendChild(b);
    });
    // paint swatches with mini canvases
    import('./skins.js').then(({ createSkin, createSkinCanvas }) => {
      grid.querySelectorAll('.preset-swatch').forEach(el => {
        const c = createSkinCanvas(192);
        const sk = createSkin(el.dataset.skin, c);
        sk.tick(1.2);
        el.style.backgroundImage = `url(${c.toDataURL('image/jpeg', 0.7)})`;
        el.style.backgroundSize = 'cover';
      });
    });
  }

  function choose(id) {
    api.setSkin(id);
    grid?.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === id)));
    const meta = SKIN_LIST.find(s => s.id === id);
    const name = $('skin-name'); if (name) name.textContent = `${meta?.name || id} · ${meta?.kind || 'skin'}`;
    const power = $('power'); if (power) power.textContent = `Power estimate: ${meta?.power || 'medium'}`;
    syncCode(id);
  }

  document.querySelectorAll('[data-cut].chip').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cut].chip').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    api.setCut(btn.dataset.cut);
  }));

  const tabs = [...document.querySelectorAll('[role=tab]')];
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      const p = $(x.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
  }));

  const applySettings = () => {
    const a = $('c-a')?.value, b = $('c-b')?.value, c = $('c-c')?.value;
    api.setColors(a, b, c);
    const speed = +($('speed')?.value || 1);
    api.setSpeed(speed);
    if ($('speed-v')) $('speed-v').textContent = speed.toFixed(2).replace(/0$/, '') + '×';
    const bright = +($('bright')?.value || 100);
    if ($('bright-v')) $('bright-v').textContent = bright + '%';
    const canvas = host.querySelector('canvas');
    if (canvas) canvas.style.filter = api.getSkin().state.still ? `brightness(${bright / 100})` : `brightness(${bright / 100})`;
    if (api.view.mode === 'off' || api.getSkin().state._off) canvas && (canvas.style.filter = 'brightness(0.06)');
  };
  ['c-a', 'c-b', 'c-c', 'speed', 'bright'].forEach(id => $(id)?.addEventListener('input', applySettings));

  document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    const m = btn.dataset.mode;
    api.setStill(m === 'still' || m === 'off');
    api.getSkin().state._off = m === 'off';
    applySettings();
  }));

  function syncCode(id) {
    const html = $('code-html'), css = $('code-css');
    if (!html || !css) return;
    const meta = SKIN_LIST.find(s => s.id === id) || SKIN_LIST[0];
    html.value = `<!-- ${meta.name}: motion skin running on the shell -->\n<div class="skin" data-kind="${meta.kind}"></div>`;
    css.value = `:root{\n  --a: ${api.getSkin().state.a};\n  --b: ${api.getSkin().state.b};\n  --c: ${api.getSkin().state.c};\n  --s: ${api.getSkin().state.speed};\n}\n/* Skins on a real garment are compiled from this file\n   plus the motion source. Scripts and network calls are blocked. */\nbody{background:var(--c)}`;
  }

  const banned = /<\s*script|javascript:|@import|url\(\s*['"]?\s*(https?:|\/\/)/i;
  $('apply')?.addEventListener('click', () => {
    const html = $('code-html').value, css = $('code-css').value;
    if (banned.test(html) || banned.test(css)) {
      $('code-status').textContent = 'Blocked: scripts, imports and remote URLs aren’t allowed in a skin.';
      return;
    }
    const col = [...css.matchAll(/--([abc])\s*:\s*(#[0-9a-fA-F]{3,8})/g)];
    const got = {};
    col.forEach(m => got[m[1]] = m[2]);
    api.setColors(got.a, got.b, got.c);
    const sp = css.match(/--s\s*:\s*([0-9.]+)/);
    if (sp) api.setSpeed(+sp[1]);
    if ($('c-a') && got.a) $('c-a').value = got.a;
    if ($('c-b') && got.b) $('c-b').value = got.b;
    if ($('c-c') && got.c) $('c-c').value = got.c;
    $('code-status').textContent = 'Applied colors and speed to the garment. Motion skins keep their own drawing code; a production build compiles the full file onto the shell.';
  });
  $('reset')?.addEventListener('click', () => {
    choose(api.getSkin().state.id);
    $('code-status').textContent = 'Reset to the preset.';
  });

  const COLORS = { red: '#ff2d55', crimson: '#c8102e', orange: '#ff9f0a', gold: '#ffc542', yellow: '#ffd60a', green: '#30d158', lime: '#a3ff12', mint: '#63e6be', teal: '#14b8a6', cyan: '#64d2ff', blue: '#0a84ff', navy: '#1e3a8a', purple: '#bf5af2', violet: '#8b5cf6', pink: '#ff6ec7', magenta: '#ff2bd6', white: '#f5f7ff', silver: '#c0c7d6', black: '#05060c' };
  const STYLES = [
    [/aurora|northern|lights|calm|dream|nebula/, 'aurora'],
    [/cartoon|show|channel|street|pip|toon/, 'cartoon'],
    [/still|solstice|epic|paint|art|ridge|moon/, 'solstice'],
    [/music|pulse|beat|club|bass|react/, 'pulse'],
    [/profile|myspace|status|name|bio/, 'profile'],
    [/grid|synth|retro|80s|outrun|sunset|horizon/, 'grid'],
    [/overdrive|streak|fast|hype|cyber|laser/, 'overdrive']
  ];
  const ideas = ['slow purple and teal aurora', 'original street cartoon', 'epic solstice still', 'club pulse, fast', 'my profile on the shell'];
  const box = $('ideas');
  if (box) {
    box.innerHTML = '';
    ideas.forEach(t => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = t;
      b.addEventListener('click', () => { $('prompt').value = t; });
      box.appendChild(b);
    });
  }
  $('gen')?.addEventListener('click', () => {
    const q = ($('prompt').value || '').toLowerCase().trim();
    if (!q) { $('ai-status').textContent = 'Describe a look first, or tap one of the examples.'; return; }
    if (credits <= 0) { $('ai-status').textContent = 'Out of demo credits. Reload the page to reset them.'; return; }
    let style = 'aurora';
    for (const [re, s] of STYLES) if (re.test(q)) { style = s; break; }
    const found = Object.keys(COLORS).filter(c => new RegExp(`\\b${c}\\b`).test(q))
      .sort((x, y) => q.search(new RegExp(`\\b${x}\\b`)) - q.search(new RegExp(`\\b${y}\\b`)));
    choose(style);
    if (found[0] || found[1]) api.setColors(found[0] && COLORS[found[0]], found[1] && COLORS[found[1]]);
    api.setSpeed(/fast|quick|hype|energetic/.test(q) ? 1.8 : /slow|calm|chill|gentle/.test(q) ? 0.5 : 1);
    if ($('speed')) { $('speed').value = api.getSkin().state.speed; }
    credits--; if ($('credits')) $('credits').textContent = credits;
    applySettings();
    $('ai-status').textContent = `Drafted a skin in the ${SKIN_LIST.find(s=>s.id===style)?.name} style${found.length ? ', in ' + found.slice(0, 2).join(' and ') : ''}. Open the Code tab, or drag the garment to turn it.`;
  });

  choose(api.getSkin().state.id || 'aurora');
});
