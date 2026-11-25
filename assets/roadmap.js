function ready() {
  return window.ExovelaGarments
    ? Promise.resolve(window.ExovelaGarments)
    : new Promise(r => document.addEventListener('exovela-ready', e => r(e.detail), { once: true }));
}
ready().then(() => {
  const host = document.getElementById('pants');
  if (!host) return;
  const api = host._exovela;
  if (!api) return;
  api.setCut('joggers');
  api.setSkin('solstice');
  api.setSpin(true);
  const sw = [['Midnight', '#1e3a8a', '#0a84ff'], ['Signal red', '#ff2d55', '#ff9f0a'], ['Forest', '#14532d', '#30d158'], ['Violet', '#5b21b6', '#bf5af2'], ['Sand', '#c2a878', '#efe2c4'], ['Graphite', '#1f2430', '#4b5563']];
  const box = document.getElementById('swatches');
  if (!box) return;
  box.innerHTML = '';
  sw.forEach(([n, a, b], i) => {
    const el = document.createElement('button'); el.className = 'chip'; el.setAttribute('aria-pressed', String(i === 0));
    el.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,${a},${b});margin-right:8px;vertical-align:-1px"></span>${n}`;
    el.addEventListener('click', () => {
      box.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === el)));
      api.setSkin('solstice', { a, b, c: a });
      api.setColors(a, b, a);
    });
    box.appendChild(el);
  });
  api.setColors(sw[0][1], sw[0][2], sw[0][1]);
});
