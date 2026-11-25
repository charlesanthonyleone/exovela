// Builds the static pages: wraps each src/*.html body with the shared head, header, scene and footer.
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const NAV = [['index.html', 'Home'], ['how-it-works.html', 'How it works'], ['studio.html', 'Studio'], ['marketplace.html', 'Marketplace'], ['roadmap.html', 'Roadmap'], ['proof-of-concept.html', 'Technology']];
const mark = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3.5c-4.6 0-7.2 3.3-7.4 7.2L4.8 13 3.8 27.5h5.4l.9-8.6.3 9.6h11.2l.3-9.6.9 8.6h5.4L27.2 13l-3.8-2.3C23.2 6.8 20.6 3.5 16 3.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.6 11c.4-2.3 1.6-3.6 3.4-3.6s3 1.3 3.4 3.6c-.9 1.9-2 2.8-3.4 2.8s-2.5-.9-3.4-2.8Z" fill="#8fd8ff"/></svg>`;
const header = `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="header-inner">
<a class="brand" href="index.html" aria-label="Exovela home">${mark}<span class="brand-name">EXOVELA</span></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
<nav id="site-nav" class="site-nav" aria-label="Main">${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
</div></header>`;
const footer = `<footer class="site-footer"><div class="footer-inner">
<div><a class="brand" href="index.html">${mark}<span class="brand-name">EXOVELA</span></a>
<p style="margin-top:16px;max-width:420px">A two-piece garment: a washable inner suit, and a sealed display shell that is never washed. An invention by Charles Anthony Leone.</p>
<p class="fine">Concept stage. No product exists. Photographs on this site are concept renders, and the studio garment is drawn live in your browser. No patent application has been filed.</p></div>
<div class="footer-links"><span class="label">Pages</span>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
<div class="footer-links"><span class="label">Status</span><p class="fine">Concept 01 · design and engineering study. Specifications are targets and estimates, not measured results.</p><p class="fine">© <span id="year">2026</span> Charles Anthony Leone</p></div>
</div></footer>`;
const scene = ``;
const gear = ``;
for (const f of readdirSync('src').filter(f => f.endsWith('.html'))) {
  const raw = readFileSync(`src/${f}`, 'utf8');
  const m = raw.match(/^<!--\s*([\s\S]*?)-->\s*/);
  const meta = Object.fromEntries((m ? m[1] : '').split('\n').map(l => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map(x => [x[1], x[2].trim()]));
  const body = m ? raw.slice(m[0].length) : raw;
  const pre = meta.preload ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${meta.preload}" imagesizes="${meta.preloadsizes || '100vw'}" fetchpriority="high">` : '';
  const extra = (meta.scripts || '').split(',').map(s => s.trim()).filter(Boolean).map(s => `<script type="module" src="assets/${s}"></script>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${meta.title}</title><meta name="description" content="${meta.description}"><meta name="theme-color" content="#02040a">
<meta property="og:type" content="website"><meta property="og:title" content="${meta.title}"><meta property="og:description" content="${meta.description}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">${pre}
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
${extra}
</body></html>
`;
  writeFileSync(f, html);
  console.log('built', f);
}
