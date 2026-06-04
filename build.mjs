import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { site } from './site-data.mjs';

const root = process.cwd();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
const guides = JSON.parse(await readFile(new URL('./guides-data.json', import.meta.url), 'utf8'));
const ELEVATEOS_CTA = 'https://elevateos.org/partner-demo';
const HOWARD = 'https://howardchan.me';

async function main() {
  await cleanupGeneratedRoutes();
  for (const g of guides) await writeOutput(path.join('guides', g.slug, 'index.html'), renderGuideArticle(g));
  await writeOutput('guides/index.html', renderGuidesIndex('/guides/'));
  await writeOutput('index.html', renderHome());
  await writeOutput('404.html', renderNotFound());
  await writeOutput('_redirects', renderRedirects());
  await writeOutput('robots.txt', renderRobots());
  await writeOutput('sitemap.xml', renderSitemap());
  await writeOutput('CNAME', 'thinkcollegelevel.com\n');
}

/* ---------------- helpers ---------------- */
function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const attr = esc;
function urlFor(route) { return route === '/' ? `${site.url}/` : `${site.url}${route}`; }

const THEMES = [
  ['IB Diploma', /\bib\b|tok|extended-essay|internal-assessment|study-schedule|-ib-|ib-/],
  ['UK & Oxbridge', /cambridge|oxford|oxbridge|ucas|hsps|personal-statement|supercurricular/],
  ['US & Hong Kong', /\bsat\b|common-app|hku|hkust|uk-vs-us/],
];
function themeFor(slug) {
  for (const [name, re] of THEMES) if (re.test(slug)) return name;
  return 'Admissions & strategy';
}
const THEME_ORDER = ['IB Diploma', 'UK & Oxbridge', 'US & Hong Kong', 'Admissions & strategy'];

function readMins(g) {
  const words = [
    ...(g.intro || []),
    ...(g.sections || []).flatMap((s) => s.paragraphs || []),
    ...(g.faq || []).flatMap((f) => [f.q, f.a]),
    g.takeaway || '',
  ].join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.round(words / 200));
}

const ICONS = {
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'key-round': '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  award: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
};
function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------------- chrome ---------------- */
function renderHeader(current) {
  const nav = [['Guides', '/guides/'], ['About', `${HOWARD}/about/`], ['Contact', `${HOWARD}/contact/`]];
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="/">
      <img src="/assets/media/hc-logo-ink.png" alt="" width="34" height="31" decoding="async">
      <span class="wm"><strong>Think College Level</strong><small>IB &amp; university admissions, honestly</small></span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      ${nav.map(([l, h]) => `<a href="${attr(h)}"${(current === h ? ' class="active"' : '')}>${esc(l)}</a>`).join('')}
      <a class="nav-search" href="/guides/" aria-label="Browse guides">${icon('search')}</a>
    </nav>
  </div></header>`;
}

function renderFooter() {
  const cols = [
    ['Guides', [['All guides', '/guides/'], ['Get a 45 in the IB', '/guides/how-to-get-a-45-in-the-ib/'], ['Cambridge statement', '/guides/cambridge-personal-statement-guide/']]],
    ['Howard', [['Personal site', HOWARD], ['ElevateOS', 'https://elevateos.org'], ['Contact', `${HOWARD}/contact/`]]],
  ];
  return `<footer class="site-footer"><div class="footer-inner">
    <div class="footer-brand">
      <strong>Think College Level</strong>
      <p>Honest guides to the IB Diploma and UK/US/HK university admissions, by Howard Chan — predicted IB 45, incoming Cambridge HSPS.</p>
    </div>
    <div class="footer-cols">
      ${cols.map(([h, items]) => `<div class="footer-col"><h4>${esc(h)}</h4>${items.map(([l, hr]) => `<a href="${attr(hr)}">${esc(l)}</a>`).join('')}</div>`).join('')}
    </div>
    <div class="footer-legal">© 2026 Howard Chan · Tokyo · thinkcollegelevel.com</div>
  </div></footer>`;
}

function renderPage({ title, description, canonicalPath, content, jsonLd, ogType = 'website' }) {
  const ld = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${attr(description)}">
  <meta name="theme-color" content="#FAF6EF">
  <link rel="canonical" href="${attr(urlFor(canonicalPath))}">
  <link rel="preload" href="/fonts/newsreader-normal-500-cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/sourceserif4-normal-400-vEFI2_tTDB4M7-auWDN0ahZJW1gb8te1Xb7G.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.png" sizes="any">
  <meta property="og:type" content="${attr(ogType)}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(urlFor(canonicalPath))}">
  <title>${esc(title)}</title>
  <script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body class="tcl-app">
  <a class="skip-link" href="#main">Skip to content</a>
  ${renderHeader(canonicalPath)}
  ${content}
  ${renderFooter()}
  <script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

/* ---------------- guides index ---------------- */
function renderGuidesIndex(canonicalPath) {
  const enriched = guides.map((g) => ({ ...g, theme: themeFor(g.slug) }));
  const byTheme = THEME_ORDER.map((t) => [t, enriched.filter((g) => g.theme === t)]).filter(([, gs]) => gs.length);
  const chips = `<div class="filter-bar" role="tablist" aria-label="Filter by topic">
    <button class="chip on" data-theme="all">All</button>
    ${byTheme.map(([t]) => `<button class="chip" data-theme="${attr(t)}">${esc(t)}</button>`).join('')}
  </div>`;
  const blocks = byTheme.map(([t, gs]) => `
    <section class="theme-block" data-theme="${attr(t)}">
      <div class="theme-head"><h2>${esc(t)}</h2><span class="count">${gs.length} guide${gs.length > 1 ? 's' : ''}</span><span class="theme-rule"></span></div>
      <div class="guide-grid">
        ${gs.map((g) => `<a class="guide-card" href="/guides/${attr(g.slug)}/">
          <span class="gc-theme">${esc(t)}</span>
          <h3>${esc(g.title)}</h3>
          <p>${esc(g.metaDescription)}</p>
          <span class="gc-more">Read guide ${icon('arrow-right')}</span>
        </a>`).join('')}
      </div>
    </section>`).join('');
  const content = `<main class="page" id="main">
    <section class="index-hero">
      <div class="eyebrow">Think College Level</div>
      <h1>Honest guides to the IB and university admissions.</h1>
      <p class="lead">Subject-by-subject IB strategy, UK/US/HK applications, and the things admissions tutors actually look for — written by an incoming Cambridge student who did it from an international school in Tokyo.</p>
    </section>
    ${chips}
    ${blocks}
  </main>`;
  return renderPage({
    title: `Guides to the IB & University Admissions · Think College Level`,
    description: 'Honest guides to the IB Diploma and UK/US/HK university admissions for international students, by an incoming Cambridge HSPS student.',
    canonicalPath,
    content,
    jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Think College Level Guides', description: 'Guides to the IB and university admissions for international students.', url: site.url + '/guides/' },
  });
}

/* ---------------- guide article ---------------- */
function renderGuideArticle(g) {
  const theme = themeFor(g.slug);
  const sections = g.sections || [];
  const related = guides.filter((x) => x.slug !== g.slug).slice(0, 4);
  const toc = `<aside class="toc" aria-label="On this page">
    <div class="toc-label">On this page</div>
    <nav>${sections.map((s, i) => `<a href="#s${i}">${esc(s.h2)}</a>`).join('')}</nav>
  </aside>`;
  const author = `<div class="author-block">
    <img class="avatar" src="/assets/media/pfp.png" alt="Howard Chan" width="54" height="54" decoding="async">
    <div>
      <strong>Howard Chan</strong>
      <div class="role">Wrote this guide · international school, Tokyo</div>
      <div class="creds">
        <span class="cred">${icon('award')} IB 45 / 45 (predicted)</span>
        <span class="cred">${icon('graduation-cap')} Incoming Cambridge HSPS</span>
        <span class="cred">${icon('map-pin')} Tokyo · UK·US·HK</span>
      </div>
    </div>
  </div>`;
  const body = `<div class="prose">
    ${(g.intro || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${sections.map((s, i) => `<section id="s${i}" data-idx="${i}">
      <h2>${esc(s.h2)}</h2>
      ${(s.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${i === 2 ? `<div class="ad-slot" aria-hidden="true">Reserved slot · never shifts layout</div>` : ''}
    </section>`).join('')}
  </div>`;
  const faq = (g.faq && g.faq.length) ? `<section class="faq-section" aria-label="Frequently asked questions">
    <h2>Frequently asked questions</h2>
    ${g.faq.map((f, i) => `<div class="faq-item${i === 0 ? ' open' : ''}">
      <button class="faq-q" aria-expanded="${i === 0}"><h3>${esc(f.q)}</h3>${icon('chevron-down')}</button>
      <div class="faq-a"><div class="faq-a-inner">${esc(f.a)}</div></div>
    </div>`).join('')}
  </section>` : '';
  const takeaway = g.takeaway ? `<section class="takeaway"><div class="hd">${icon('key-round')} The takeaway</div><p>${esc(g.takeaway)}</p></section>` : '';
  const cta = `<aside class="elevate-cta">
    <p><span class="ctx">For agencies · sponsor</span>Run a tutoring or admissions agency? ElevateOS turns a tutor's 60-second note into a parent-ready report in seconds.</p>
    <a href="${attr(ELEVATEOS_CTA)}">See a demo ${icon('arrow-up-right')}</a>
  </aside>`;
  const relatedBlock = `<section class="related">
    <div class="eyebrow">Keep reading</div>
    <div class="related-grid">
      ${related.map((r) => `<a class="guide-card" href="/guides/${attr(r.slug)}/">
        <span class="gc-theme">${esc(themeFor(r.slug))}</span>
        <h3>${esc(r.title)}</h3>
        <span class="gc-more">Read guide ${icon('arrow-right')}</span>
      </a>`).join('')}
    </div>
  </section>`;
  const content = `<main class="page" id="main">
    <article class="article-wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a>${icon('chevron-right')}<a href="/guides/">Guides</a>${icon('chevron-right')}<span class="here">${esc(theme)}</span>
      </nav>
      <header class="article-head">
        <div class="eyebrow">${esc(theme)}</div>
        <h1>${esc(g.title)}</h1>
        <p class="lead">${esc(g.metaDescription)}</p>
        <div class="article-meta">${icon('user-round')} By Howard Chan <span class="dot">·</span> ${icon('clock')} ${readMins(g)} min read <span class="dot">·</span> Updated Jun 2026</div>
      </header>
      <div class="article-body">
        ${toc}
        <div class="article-main">
          ${author}
          ${body}
          ${faq}
          ${takeaway}
          ${cta}
          ${relatedBlock}
        </div>
      </div>
    </article>
  </main>`;
  return renderPage({
    title: `${g.title} · Think College Level`,
    description: g.metaDescription,
    canonicalPath: `/guides/${g.slug}/`,
    ogType: 'article',
    content,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, datePublished: g.dateIso || today, dateModified: today, author: { '@type': 'Person', name: site.fullName || site.author, url: HOWARD }, publisher: { '@type': 'Organization', name: 'Think College Level', url: site.url }, description: g.metaDescription, mainEntityOfPage: `${site.url}/guides/${g.slug}/` },
      ...(g.faq && g.faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
    ],
  });
}

function renderHome() {
  const featured = guides.find((g) => g.slug === 'how-to-get-a-45-in-the-ib') || guides[0];
  const popular = guides.filter((g) => g.slug !== featured.slug).slice(0, 6);
  const content = `<main class="page" id="main">
    <section class="home-hero">
      <div class="eyebrow">Think College Level</div>
      <h1 class="tcl-display">Get into university — without the guesswork.</h1>
      <p class="lead">Honest, specific guides to the IB Diploma and UK, US &amp; Hong Kong admissions — written by an incoming Cambridge HSPS student who did it from an international school in Tokyo.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="/guides/">Browse all ${guides.length} guides ${icon('arrow-right')}</a></div>
    </section>

    <section class="featured" aria-label="Featured guide">
      <a class="featured-card" href="/guides/${attr(featured.slug)}/">
        <div class="eyebrow">Start here · ${esc(themeFor(featured.slug))}</div>
        <h2>${esc(featured.title)}</h2>
        <p>${esc(featured.metaDescription)}</p>
        <span class="gc-more">Read guide ${icon('arrow-right')}</span>
      </a>
    </section>

    <section class="theme-block">
      <div class="theme-head"><h2>Popular guides</h2><span class="theme-rule"></span><a class="theme-all" href="/guides/">All guides ${icon('arrow-right')}</a></div>
      <div class="guide-grid">
        ${popular.map((g) => `<a class="guide-card" href="/guides/${attr(g.slug)}/"><span class="gc-theme">${esc(themeFor(g.slug))}</span><h3>${esc(g.title)}</h3><p>${esc(g.metaDescription)}</p><span class="gc-more">Read guide ${icon('arrow-right')}</span></a>`).join('')}
      </div>
    </section>
  </main>`;
  return renderPage({
    title: 'Think College Level — IB & University Admissions Guides',
    description: 'Honest guides to the IB Diploma and UK/US/HK university admissions for international students, by an incoming Cambridge HSPS student.',
    canonicalPath: '/',
    content,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Think College Level', url: site.url, description: 'Guides to the IB and university admissions for international students.' },
  });
}

function renderNotFound() {
  const content = `<main class="page" id="main"><section class="index-hero"><div class="eyebrow">404</div><h1>Page not found.</h1><p class="lead">Try the <a class="tcl-link" href="/guides/">guides</a>.</p></section></main>`;
  return renderPage({ title: 'Not found · Think College Level', description: 'Page not found.', canonicalPath: '/404/', content, jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Not found' } });
}

/* ---------------- static files ---------------- */
function renderRedirects() {
  return `/about/*                  ${HOWARD}/about/:splat                  301
/projects/*               ${HOWARD}/projects/:splat               301
/research/*               ${HOWARD}/research/:splat               301
/awards-certifications/*  ${HOWARD}/awards-certifications/:splat  301
/contact/*                ${HOWARD}/contact/:splat                301
`;
}
function renderRobots() { return `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`; }
function renderSitemap() {
  const routes = ['/', '/guides/', ...guides.map((g) => `/guides/${g.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${site.url}${r}</loc><lastmod>${today}</lastmod><changefreq>${r === '/' || r === '/guides/' ? 'weekly' : 'monthly'}</changefreq><priority>${r === '/' ? '1.0' : r === '/guides/' ? '0.9' : '0.7'}</priority></url>`).join('\n')}
</urlset>
`;
}

async function cleanupGeneratedRoutes() {
  for (const dir of ['about', 'projects', 'research', 'awards-certifications', 'contact', 'portfolio', 'blog', 'awards', 'guides']) {
    await rm(path.join(root, dir), { recursive: true, force: true });
  }
}
async function writeOutput(rel, content) {
  const target = path.join(root, rel);
  const normalized = String(content).replace(/[ \t]+$/gm, '');
  await mkdir(path.dirname(target), { recursive: true });
  try { if ((await readFile(target, 'utf8')) === normalized) return; } catch (e) { if (e?.code !== 'ENOENT') throw e; }
  await writeFile(target, normalized, 'utf8');
}

await main();
