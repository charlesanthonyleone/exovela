// Builds the static pages: wraps each src/*.html body with the shared head, header, scene and footer.
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const NAV = [['index.html', 'Home'], ['how-it-works.html', 'How it works'], ['studio.html', 'Studio'], ['marketplace.html', 'Marketplace'], ['roadmap.html', 'Roadmap'], ['proof-of-concept.html', 'Proof of concept']];
const mark = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff2d55"/><stop offset=".35" stop-color="#ffd60a"/><stop offset=".6" stop-color="#30d158"/><stop offset=".8" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient></defs><path d="M16 2.5C10.5 2.5 7.5 6.6 7.4 11.2L3.6 13.4 2.5 27.5h6.2l1-9.6.3 11.6h12l.3-11.6 1 9.6h6.2l-1.1-14.1-3.8-2.2C24.5 6.6 21.5 2.5 16 2.5Z" fill="none" stroke="url(#bm)" stroke-width="1.8" stroke-linejoin="round"/><path d="M12.5 10.8c.4-2.4 1.6-3.8 3.5-3.8s3.1 1.4 3.5 3.8c-.9 2-2.1 3-3.5 3s-2.6-1-3.5-3Z" fill="url(#bm)" opacity=".9"/></svg>`;
const header = `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="header-inner">
<a class="brand" href="index.html" aria-label="Exovela home">${mark}<span class="brand-name">EXOVELA</span></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
<nav id="site-nav" class="site-nav" aria-label="Main">${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
</div></header>`;
const footer = `<footer class="site-footer"><div class="footer-inner">
<div><a class="brand" href="index.html">${mark}<span class="brand-name">EXOVELA</span></a>
<p style="margin-top:14px">A two-layer garment whose outer shell is a display. An invention by Charles Anthony Leone.</p>
<p class="fine">Concept stage. No product exists yet, and every garment on this site is an illustration rendered in your browser. No patent application has been filed; the proof-of-concept page is an invention disclosure draft, not legal advice.</p></div>
<div class="footer-links"><span class="label">Explore</span>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
<div class="footer-links"><span class="label">About the sky</span>
<p class="fine">The stars here glow in full color, the way they might look with no atmosphere or ozone filtering and scattering their light.</p>
<p class="fine">The stars and moon are rendered for this scene. No stock photographs are used.</p>
<p class="fine">© <span id="year">2026</span> Charles Anthony Leone</p></div>
</div></footer>`;
const scene = ``;
const gear = ``;
for (const f of readdirSync('src').filter(f => f.endsWith('.html'))) {
  const raw = readFileSync(`src/${f}`, 'utf8');
  const m = raw.match(/^<!--\s*([\s\S]*?)-->\s*/);
  const meta = Object.fromEntries((m ? m[1] : '').split('\n').map(l => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map(x => [x[1], x[2].trim()]));
  const body = m ? raw.slice(m[0].length) : raw;
  const extra = (meta.scripts || '').split(',').map(s => s.trim()).filter(Boolean).map(s => `<script type="module" src="assets/${s}"></script>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${meta.title}</title><meta name="description" content="${meta.description}"><meta name="theme-color" content="#02040a">
<meta property="og:type" content="website"><meta property="og:title" content="${meta.title}"><meta property="og:description" content="${meta.description}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script type="importmap">{"imports":{"three":"./assets/vendor/three.module.min.js"}}</script>
</head>
<body class="${meta.body || ''}">
${scene}
<div class="page">
${header}
<main id="main" tabindex="-1">
${body.trim()}
</main>
${footer}
</div>
${gear}
<script src="assets/site.js" defer></script>
<script type="module" src="assets/main.js"></script>
${extra}
</body></html>
`;
  writeFileSync(f, html);
  console.log('built', f);
}
