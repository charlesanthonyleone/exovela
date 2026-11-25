/* Exovela: garment mockups. Every skin is plain HTML/CSS rendered in a sandboxed iframe (no scripts, no network),
   clipped to the garment silhouette, the same model the real platform proposes. */
(() => {
  const CUTS = {
    hoodie: {
      label: 'Hoodie',
      outline: 'M200 28C152 28 128 58 126 104L72 128C52 138 42 162 38 198L22 360L20 396L62 401L67 368L91 214L95 398L97 432L303 432L305 398L309 214L333 368L338 401L380 396L378 360L362 198C358 162 348 138 328 128L274 104C272 58 248 28 200 28Z',
      shade: 'M160 70C165 48 235 48 240 70C246 100 226 124 200 128C174 124 154 100 160 70Z',
      lines: 'M182 124L178 190M218 124L222 190M140 300L260 300L282 372L118 372ZM97 404L303 404M22 372L66 377M334 377L378 372M150 98Q118 150 91 214M250 98Q282 150 309 214'
    },
    jacket: {
      label: 'Jacket',
      outline: 'M168 74L120 92L70 122C50 132 42 160 38 198L22 360L20 396L62 401L67 368L91 214L95 398L97 432L303 432L305 398L309 214L333 368L338 401L380 396L378 360L362 198C358 160 350 132 330 122L280 92L232 74L200 96Z',
      shade: 'M168 74L184 120L200 96L216 120L232 74L200 96Z',
      lines: 'M168 74L184 120L200 96M232 74L216 120L200 96M200 96L200 432M126 318L172 312M228 312L274 318M97 410L303 410M22 372L66 377M334 377L378 372M120 92Q104 150 91 214M280 92Q296 150 309 214'
    },
    joggers: {
      label: 'Joggers',
      outline: 'M112 20L288 20L294 60L312 300L318 392L320 424L240 428L236 396L214 150L200 120L186 150L164 396L160 428L80 424L82 392L88 300L106 60Z',
      shade: '',
      lines: 'M108 46L292 46M196 46L190 78M204 46L210 78M82 396L162 398M238 398L318 396M112 62Q134 100 122 134M288 62Q266 100 278 134M200 46L200 120'
    }
  };
  const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">`;
  const bars = n => Array.from({ length: n }, (_, i) => `<i style="--i:${i}"></i>`).join('');
  const PRESETS = {
    spectrum: { name: 'Spectrum', a: '#ff2d55', b: '#0a84ff', c: '#05060c', html: '<div class="scan"></div>',
      css: `body{background:linear-gradient(90deg,#ff2d55,#ff9f0a,#ffd60a,#30d158,#64d2ff,#0a84ff,#bf5af2,#ff2d55);background-size:300% 100%;animation:flow calc(var(--s)*9s) linear infinite}
body::after{content:"";position:fixed;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.18),transparent 40%,rgba(0,0,0,.25))}
.scan{position:fixed;left:0;right:0;height:22%;background:linear-gradient(transparent,rgba(255,255,255,.55),transparent);mix-blend-mode:overlay;animation:sweep calc(var(--s)*4s) ease-in-out infinite}
@keyframes flow{to{background-position:300% 0}}@keyframes sweep{0%{top:-25%}100%{top:105%}}` },
    aurora: { name: 'Aurora', a: '#30d158', b: '#bf5af2', c: '#020611', html: '<b class="o1"></b><b class="o2"></b><b class="o3"></b>',
      css: `body{background:var(--c);overflow:hidden}b{position:fixed;width:90vmax;height:60vmax;border-radius:50%;filter:blur(40px);mix-blend-mode:screen;opacity:.85}
.o1{background:var(--a);left:-30vmax;top:10%;animation:d1 calc(var(--s)*11s) ease-in-out infinite alternate}
.o2{background:var(--b);right:-35vmax;top:35%;animation:d2 calc(var(--s)*13s) ease-in-out infinite alternate}
.o3{background:#64d2ff;left:10%;bottom:-40vmax;animation:d1 calc(var(--s)*17s) ease-in-out infinite alternate-reverse}
@keyframes d1{to{transform:translate(30vmax,-12vmax) scale(1.2)}}@keyframes d2{to{transform:translate(-28vmax,18vmax) scale(.9)}}` },
    scanline: { name: 'Scanline', a: '#64d2ff', b: '#ff2d55', c: '#03040a', html: '<div class="g"></div><div class="beam"></div><div class="beam two"></div>',
      css: `body{background:var(--c)}.g{position:fixed;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 1px,transparent 1px 6px)}
.beam{position:fixed;left:0;right:0;height:14%;background:linear-gradient(transparent,var(--a),transparent);box-shadow:0 0 40px var(--a);animation:sweep calc(var(--s)*3.2s) linear infinite}
.beam.two{background:linear-gradient(transparent,var(--b),transparent);box-shadow:0 0 40px var(--b);animation-delay:calc(var(--s)*-1.6s)}
@keyframes sweep{0%{top:-15%}100%{top:105%}}` },
    grid: { name: 'Horizon grid', a: '#bf5af2', b: '#ff9f0a', c: '#07020f', html: '<div class="sun"></div><div class="floor"></div>',
      css: `body{background:linear-gradient(var(--c) 0 48%,#16052b 48%);overflow:hidden;perspective:300px}
.sun{position:fixed;left:50%;top:18%;width:46vw;height:46vw;transform:translateX(-50%);border-radius:50%;background:linear-gradient(var(--b),var(--a));box-shadow:0 0 60px var(--b);-webkit-mask:repeating-linear-gradient(#000 0 9%,transparent 9% 11%);mask:repeating-linear-gradient(#000 0 9%,transparent 9% 11%)}
.floor{position:fixed;left:-50%;right:-50%;top:48%;height:120%;transform-origin:top;transform:rotateX(68deg);background:repeating-linear-gradient(90deg,var(--a) 0 2px,transparent 2px 9%),repeating-linear-gradient(0deg,var(--a) 0 2px,transparent 2px 9%);background-size:100% 100%,100% 40px;animation:run calc(var(--s)*1.6s) linear infinite;filter:drop-shadow(0 0 6px var(--a))}
@keyframes run{to{background-position:0 0,0 40px}}` },
    rain: { name: 'Light rain', a: '#64d2ff', b: '#ffffff', c: '#010309', html: bars(22),
      css: `body{background:var(--c);overflow:hidden}i{position:fixed;top:-30%;left:calc(var(--i)*4.6%);width:2px;height:24%;background:linear-gradient(transparent,var(--a),var(--b));box-shadow:0 0 10px var(--a);animation:fall calc(var(--s)*(1.4s + var(--i)*.07s)) linear infinite;animation-delay:calc(var(--i)*-.37s)}
i:nth-child(3n){filter:hue-rotate(120deg)}i:nth-child(4n){filter:hue-rotate(220deg)}
@keyframes fall{to{transform:translateY(560%)}}` },
    pulse: { name: 'Heartbeat', a: '#ff2d55', b: '#ff9f0a', c: '#080106', html: '<u></u><u></u><u></u><u></u>',
      css: `body{background:radial-gradient(circle at 50% 42%,#3a0614,var(--c) 70%);overflow:hidden}
u{position:fixed;left:50%;top:42%;width:12vw;height:12vw;margin:-6vw 0 0 -6vw;border-radius:50%;border:3px solid var(--a);box-shadow:0 0 24px var(--a),inset 0 0 24px var(--b);animation:ring calc(var(--s)*3.6s) ease-out infinite}
u:nth-child(2){animation-delay:calc(var(--s)*-.9s)}u:nth-child(3){animation-delay:calc(var(--s)*-1.8s)}u:nth-child(4){animation-delay:calc(var(--s)*-2.7s)}
@keyframes ring{0%{transform:scale(.2);opacity:1}100%{transform:scale(9);opacity:0}}` },
    solid: { name: 'Solid', a: '#0a84ff', b: '#64d2ff', c: '#0a84ff', html: '',
      css: `body{background:linear-gradient(160deg,var(--a),var(--b));animation:breathe calc(var(--s)*6s) ease-in-out infinite}
@keyframes breathe{50%{filter:brightness(.82) saturate(1.2)}}` }
  };
  const doc = (p, o = {}) => {
    const a = o.a || p.a, b = o.b || p.b, c = o.c || p.c, s = o.s || 1;
    const css = o.css != null ? o.css : p.css, html = o.html != null ? o.html : p.html;
    return `<!doctype html><html><head>${CSP}<style>:root{--a:${a};--b:${b};--c:${c};--s:${s}}html,body{margin:0;height:100%;overflow:hidden}*{box-sizing:border-box}</style><style>${css}</style></head><body>${html}</body></html>`;
  };
  const svgNS = 'http://www.w3.org/2000/svg';
  const mount = (el, opts = {}) => {
    const cut = opts.cut || el.dataset.cut || 'hoodie';
    el.classList.add('garment');
    el.innerHTML = `<div class="garment-glow"></div><div class="garment-body"><div class="garment-skin"><iframe title="Garment skin preview" sandbox="" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></div></div>
    <svg class="garment-lines" viewBox="0 0 400 440" aria-hidden="true"><path class="g-shade"/><path class="g-out"/><path class="g-det"/></svg>`;
    const frame = el.querySelector('iframe');
    const api = {
      el, frame,
      setCut(c) {
        const C = CUTS[c] || CUTS.hoodie; el.dataset.cut = c;
        el.querySelector('.garment-skin').style.setProperty('--mask', `url("${new URL(`assets/shapes/${c}.svg`, document.baseURI).href}")`);
        el.querySelector('.g-out').setAttribute('d', C.outline);
        el.querySelector('.g-shade').setAttribute('d', C.shade);
        el.querySelector('.g-det').setAttribute('d', C.lines);
      },
      setDoc(html) { el.classList.add('is-swapping'); setTimeout(() => { frame.srcdoc = html; el.classList.remove('is-swapping'); }, opts.fade === false ? 0 : 220); },
      preset(name, o) { const p = PRESETS[name] || PRESETS.spectrum; api.setDoc(doc(p, o)); el.dataset.preset = name; }
    };
    api.setCut(cut);
    frame.srcdoc = doc(PRESETS[opts.preset || el.dataset.preset || 'spectrum'] || PRESETS.spectrum, opts);
    return api;
  };
  window.Exovela = { CUTS, PRESETS, doc, mount };
  document.querySelectorAll('[data-garment]').forEach(el => {
    const g = mount(el);
    const cycle = el.dataset.cycle ? el.dataset.cycle.split(',') : null;
    if (cycle) { let i = 0; setInterval(() => { if (document.hidden) return; i = (i + 1) % cycle.length; g.preset(cycle[i]); }, +(el.dataset.every || 7000)); }
  });
})();
