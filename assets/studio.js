(() => {
  const E = window.Exovela; if (!E) return;
  const $ = id => document.getElementById(id);
  const stage = E.mount($('stage'), { preset: 'spectrum' });
  let state = { preset: 'spectrum', a: E.PRESETS.spectrum.a, b: E.PRESETS.spectrum.b, c: E.PRESETS.spectrum.c, s: 1, html: null, css: null, custom: false, mode: 'live', bright: 100 };
  let credits = 20;
  const POWER = { spectrum: 'high', aurora: 'medium', scanline: 'low', grid: 'medium', rain: 'low', pulse: 'low', solid: 'high' };
  const render = (fade = true) => {
    const p = E.PRESETS[state.preset];
    let css = state.css != null ? state.css : p.css;
    if (state.mode === 'still') css += '\n*{animation-play-state:paused!important}';
    stage.setDoc(E.doc(p, { a: state.a, b: state.b, c: state.c, s: (1 / state.s).toFixed(3), css, html: state.html }));
    const f = state.mode === 'off' ? 'brightness(.05)' : `brightness(${state.bright / 100})`;
    stage.frame.style.filter = f;
    $('skin-name').textContent = `${state.custom ? 'Custom · from ' : ''}${p.name}${state.custom ? '' : ' · preset'}`;
    $('power').textContent = state.mode === 'off' ? 'Power estimate: idle' : `Power estimate: ${POWER[state.preset] || 'medium'}${state.bright > 100 ? ' (boosted)' : ''}`;
  };
  // presets grid
  const grid = $('presets');
  Object.entries(E.PRESETS).forEach(([k, p]) => {
    const b = document.createElement('button'); b.className = 'preset'; b.dataset.k = k; b.setAttribute('aria-pressed', String(k === 'spectrum'));
    b.innerHTML = `<iframe sandbox="" tabindex="-1" aria-hidden="true" loading="lazy"></iframe><span>${p.name}</span>`;
    b.querySelector('iframe').srcdoc = E.doc(p);
    b.addEventListener('click', () => choose(k));
    grid.appendChild(b);
  });
  const syncColors = () => { $('c-a').value = state.a; $('c-b').value = state.b; $('c-c').value = state.c; };
  const syncCode = () => { const p = E.PRESETS[state.preset]; $('code-html').value = state.html != null ? state.html : p.html; $('code-css').value = state.css != null ? state.css : p.css; };
  const choose = k => {
    const p = E.PRESETS[k]; state = { ...state, preset: k, a: p.a, b: p.b, c: p.c, html: null, css: null, custom: false };
    grid.querySelectorAll('.preset').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    syncColors(); syncCode(); render();
  };
  // cut
  document.querySelectorAll('[data-cut].chip').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cut].chip').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    stage.setCut(btn.dataset.cut);
  }));
  // tabs
  const tabs = [...document.querySelectorAll('[role=tab]')];
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); $(x.getAttribute('aria-controls')).hidden = !on; });
  }));
  // settings
  ['a', 'b', 'c'].forEach(k => $('c-' + k).addEventListener('input', e => { state[k] = e.target.value; clearTimeout(render.t); render.t = setTimeout(() => render(false), 120); }));
  $('speed').addEventListener('input', e => { state.s = +e.target.value; $('speed-v').textContent = state.s.toFixed(2).replace(/0$/, '') + '×'; clearTimeout(render.t); render.t = setTimeout(() => render(false), 150); });
  $('bright').addEventListener('input', e => { state.bright = +e.target.value; $('bright-v').textContent = state.bright + '%'; if (state.mode !== 'off') stage.frame.style.filter = `brightness(${state.bright / 100})`; });
  document.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === btn))); state.mode = btn.dataset.mode; render();
  }));
  // code
  const banned = /<\s*script|javascript:|@import|url\(\s*['"]?\s*(https?:|\/\/)/i;
  $('apply').addEventListener('click', () => {
    const html = $('code-html').value, css = $('code-css').value;
    if (banned.test(html) || banned.test(css)) { $('code-status').textContent = 'Blocked: scripts, imports and remote URLs aren\u2019t allowed in a skin. Everything else is fine.'; return; }
    const tooFast = [...css.matchAll(/animation[^;{}]*?(\d*\.?\d+)(m?s)\b/g)].some(m => (m[2] === 'ms' ? +m[1] / 1000 : +m[1]) < .34 && /steps|infinite/.test(m[0]));
    state.html = html; state.css = css; state.custom = true; render();
    $('code-status').textContent = tooFast ? 'Applied. Warning: an animation looks faster than 3 cycles per second. The real platform would hold it for a safety review.' : 'Applied to the garment.';
  });
  $('reset').addEventListener('click', () => { choose(state.preset); $('code-status').textContent = 'Reset to the preset code.'; });
  // AI (offline keyword demo)
  const COLORS = { red: '#ff2d55', crimson: '#c8102e', orange: '#ff9f0a', gold: '#ffc542', yellow: '#ffd60a', green: '#30d158', lime: '#a3ff12', mint: '#63e6be', teal: '#14b8a6', cyan: '#64d2ff', blue: '#0a84ff', navy: '#1e3a8a', purple: '#bf5af2', violet: '#8b5cf6', pink: '#ff6ec7', magenta: '#ff2bd6', white: '#f5f7ff', silver: '#c0c7d6', black: '#05060c' };
  const STYLES = [[/aurora|northern|lights|calm|dream|nebula|cloud|smoke/, 'aurora'], [/rain|matrix|fall|drip|code/, 'rain'], [/grid|synth|retro|80s|outrun|sunset|horizon/, 'grid'], [/scan|cyber|laser|beam|tech|future/, 'scanline'], [/heart|pulse|beat|ring|bass|music|club/, 'pulse'], [/rainbow|spectrum|pride|prism|all colors/, 'spectrum'], [/solid|plain|clean|minimal|simple|one color/, 'solid']];
  const ideas = ['slow purple and teal aurora', 'retro sunset grid', 'blue rain, fast', 'red heartbeat for a club night', 'clean solid navy'];
  ideas.slice(0, 3).forEach(t => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = t; b.addEventListener('click', () => { $('prompt').value = t; }); $('ideas').appendChild(b); });
  $('gen').addEventListener('click', () => {
    const q = ($('prompt').value || '').toLowerCase().trim();
    if (!q) { $('ai-status').textContent = 'Describe a look first, or tap one of the examples.'; return; }
    if (credits <= 0) { $('ai-status').textContent = 'Out of demo credits. Reload the page to reset them.'; return; }
    let style = 'spectrum'; for (const [re, s] of STYLES) if (re.test(q)) { style = s; break; }
    const found = Object.keys(COLORS).filter(c => new RegExp(`\\b${c}\\b`).test(q));
    choose(style);
    if (found[0]) state.a = COLORS[found[0]];
    if (found[1]) state.b = COLORS[found[1]];
    state.s = /fast|quick|hype|energetic/.test(q) ? 1.8 : /slow|calm|chill|gentle/.test(q) ? .5 : 1;
    $('speed').value = state.s; $('speed-v').textContent = state.s + '×';
    credits--; $('credits').textContent = credits; syncColors(); render();
    $('ai-status').textContent = `Drafted a ${E.PRESETS[style].name.toLowerCase()} skin${found.length ? ' in ' + found.slice(0, 2).join(' and ') : ''}. Open the Code tab to see and edit it.`;
  });
  syncCode();
})();
