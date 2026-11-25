(() => {
  const root = document.documentElement; root.classList.add('js');
  const btn = document.querySelector('.menu-toggle'), nav = document.getElementById('site-nav');
  if (btn && nav) {
    const set = open => { btn.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); btn.textContent = open ? 'Close' : 'Menu'; };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    matchMedia('(min-width:901px)').addEventListener('change', () => set(false));
  }
  const here = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.site-nav a').forEach(a => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in'));
  const bar = document.querySelector('.read-progress');
  const tl = document.querySelector('.timeline');
  const onScroll = () => {
    if (bar) { const h = root.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`; }
    if (tl) { const r = tl.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height)); tl.style.setProperty('--fill', (p * 100).toFixed(1) + '%'); }
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
  const links = [...document.querySelectorAll('.toc a[href^="#"]')];
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(es => {
      const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (v) links.forEach(a => a.classList.toggle('is-current', a === map.get(v.target.id)));
    }, { rootMargin: '-12% 0px -70% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
})();
