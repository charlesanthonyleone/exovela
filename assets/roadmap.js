/* Pant shell color zones: a flat 2D preview of the large-zone colorways. */
const host = document.getElementById('pants');
const box = document.getElementById('swatches');
const sw = [['Midnight', '#1e3a8a', '#0a2a5e'], ['Signal red', '#c8102e', '#7a0a1c'], ['Forest', '#14532d', '#0b2e19'], ['Violet', '#5b21b6', '#2e1065'], ['Sand', '#c2a878', '#8a7552'], ['Graphite', '#3a3f4a', '#1f2430']];
const paint = (a, b) => { if (host) host.style.background = `linear-gradient(180deg, ${a} 0 48%, #0b0d11 48% 49%, ${b} 49% 100%)`; };
if (box) {
  box.innerHTML = '';
  sw.forEach(([n, a, b], i) => {
    const el = document.createElement('button'); el.className = 'chip'; el.setAttribute('aria-pressed', String(i === 0));
    el.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${a};margin-right:8px"></span>${n}`;
    el.addEventListener('click', () => { box.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === el))); paint(a, b); });
    box.appendChild(el);
  });
}
paint(sw[0][1], sw[0][2]);
