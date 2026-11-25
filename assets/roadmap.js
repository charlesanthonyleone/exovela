(() => {
  const E = window.Exovela; if (!E) return;
  const g = E.mount(document.getElementById('pants'), { cut: 'joggers', preset: 'solid' });
  const sw = [['Midnight', '#1e3a8a', '#0a84ff'], ['Signal red', '#ff2d55', '#ff9f0a'], ['Forest', '#14532d', '#30d158'], ['Violet', '#5b21b6', '#bf5af2'], ['Sand', '#c2a878', '#efe2c4'], ['Graphite', '#1f2430', '#4b5563']];
  const box = document.getElementById('swatches');
  sw.forEach(([n, a, b], i) => {
    const el = document.createElement('button'); el.className = 'chip'; el.setAttribute('aria-pressed', String(i === 0));
    el.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,${a},${b});margin-right:8px;vertical-align:-1px"></span>${n}`;
    el.addEventListener('click', () => { box.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === el))); g.preset('solid', { a, b }); });
    box.appendChild(el);
  });
  g.preset('solid', { a: sw[0][1], b: sw[0][2] });
})();
