import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { site } from './site-data.mjs';

const root = process.cwd();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
const guides = JSON.parse(await readFile(new URL('./guides-data.json', import.meta.url), 'utf8'));
const ELEVATEOS_CTA = 'https://elevateos.org/partner-demo';

// Shared Author/Person reference for E-E-A-T (Howard Chan, incoming Cambridge HSPS).
const authorPerson = {
  '@type': 'Person',
  name: site.fullName || site.author,
  url: site.url,
  description: site.tagline,
  alumniOf: ['University of Cambridge', 'K. International School Tokyo'],
  sameAs: site.contactLinks.map((link) => link.href),
};

// BreadcrumbList JSON-LD from an ordered list of { name, route } crumbs.
function breadcrumbLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: urlFor(crumb.route),
    })),
  };
}

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'About', href: '/about/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Research', href: '/research/' },
  { label: 'Awards & Certifications', href: '/awards-certifications/' },
  { label: 'Contact', href: '/contact/' },
];

const canonicalPages = [
  {
    path: '/',
    file: 'index.html',
    title: site.name,
    description: site.description,
    bodyClass: 'page-home',
    render: renderHome,
  },
  {
    path: '/about/',
    file: path.join('about', 'index.html'),
    title: `About · ${site.name}`,
    description: 'About Howard Chan.',
    bodyClass: 'page-about',
    render: renderAbout,
  },
  {
    path: '/projects/',
    file: path.join('projects', 'index.html'),
    title: `Projects · ${site.name}`,
    description: 'Products, civic initiatives, and infrastructure.',
    bodyClass: 'page-projects',
    render: renderProjects,
  },
  {
    path: '/research/',
    file: path.join('research', 'index.html'),
    title: `Research · ${site.name}`,
    description: 'Research on communication, cognition, and institutional systems.',
    bodyClass: 'page-research',
    render: renderResearchIndex,
  },
  {
    path: '/awards-certifications/',
    file: path.join('awards-certifications', 'index.html'),
    title: `Awards & Certifications · ${site.name}`,
    description: 'Academic profile, recognition, and certifications.',
    bodyClass: 'page-awards',
    render: renderAwards,
  },
  {
    path: '/contact/',
    file: path.join('contact', 'index.html'),
    title: `Contact · ${site.name}`,
    description: 'GitHub, Wantedly, LinkedIn, email, project links, and social links.',
    bodyClass: 'page-contact',
    render: renderContact,
  },
  {
    path: '/404/',
    file: '404.html',
    title: `Not found · ${site.name}`,
    description: 'The page you were looking for is not here.',
    bodyClass: 'page-404',
    render: renderNotFound,
  },
];

const researchPages = site.research.map((item) => ({
  path: `/research/${item.slug}/`,
  file: path.join('research', item.slug, 'index.html'),
  title: `${item.title} · ${site.name}`,
  description: item.summary,
  bodyClass: 'page-post',
  render: () => renderResearchArticle(item),
}));

const guideIndexPage = {
  path: '/guides/',
  file: path.join('guides', 'index.html'),
  title: `Guides · ${site.name}`,
  description: 'Honest guides to the IB and UK/US/HK university admissions for international students.',
  bodyClass: 'page-guides',
  render: renderGuidesIndex,
};

const guidePages = guides.map((g) => ({
  path: `/guides/${g.slug}/`,
  file: path.join('guides', g.slug, 'index.html'),
  title: `${g.title} · ${site.name}`,
  description: g.metaDescription,
  bodyClass: 'page-post',
  render: () => renderGuideArticle(g),
}));

const legacyRedirectPages = [
  {
    path: '/portfolio/',
    file: path.join('portfolio', 'index.html'),
    title: `Projects · ${site.name}`,
    target: '/projects/',
  },
  {
    path: '/blog/',
    file: path.join('blog', 'index.html'),
    title: `Research · ${site.name}`,
    target: '/research/',
  },
  {
    path: '/awards/',
    file: path.join('awards', 'index.html'),
    title: `Awards & Certifications · ${site.name}`,
    target: '/awards-certifications/',
  },
];

const legacyResearchRedirects = site.research.map((item) => ({
  path: `/blog/${item.slug}/`,
  file: path.join('blog', item.slug, 'index.html'),
  title: `${item.title} · ${site.name}`,
  target: `/research/${item.slug}/`,
}));

await main();

async function main() {
  await cleanupGeneratedRoutes();
  await cleanupMediaAssets();

  for (const page of [...canonicalPages, ...researchPages, guideIndexPage, ...guidePages]) {
    await writeOutput(page.file, page.render(page));
  }

  for (const page of [...legacyRedirectPages, ...legacyResearchRedirects]) {
    await writeOutput(page.file, renderRedirect(page.title, page.target));
  }

  await writeOutput('robots.txt', renderRobots());
  await writeOutput('llms.txt', renderLlms());
  await writeOutput('sitemap.xml', renderSitemap());
  await writeOutput('CNAME', 'thinkcollegelevel.com\n');
}

function esc(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attr(input = '') {
  return esc(input);
}

function urlFor(route) {
  return route === '/' ? `${site.url}/` : `${site.url}${route}`;
}

function renderLink(href, label, currentPath) {
  const active = currentPath === href ? ' aria-current="page"' : '';
  return `<a href="${attr(href)}"${active}>${esc(label)}</a>`;
}

function renderNav(currentPath) {
  return navItems.map((item) => renderLink(item.href, item.label, currentPath)).join('');
}

function renderLogo() {
  return `
    <img
      class="brand-mark"
      src="${attr(site.logo.src)}"
      alt="${attr(site.logo.alt)}"
      width="1024"
      height="921"
      loading="eager"
      decoding="async"
    >
  `;
}

function renderHeader(currentPath) {
  return `
    <header class="site-header">
      <div class="site-header-inner">
        <a class="brand" href="/">
          ${renderLogo()}
          <span class="brand-copy">
            <strong>${esc(site.name)}</strong>
            <small>${esc(site.tagline)}</small>
          </span>
        </a>
        <nav class="site-nav" aria-label="Primary">
          ${renderNav(currentPath)}
        </nav>
      </div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="site-footer-inner">
        <p>${esc(site.author)}, ${esc(site.location)}</p>
        <p class="footer-links">
          ${site.footerLinks.map((link) => `<a href="${attr(link.href)}">${esc(link.label)}</a>`).join('')}
        </p>
        <p>© 2026 ${esc(site.author)}</p>
      </div>
    </footer>
  `;
}

function renderPage({
  title,
  description,
  canonicalPath,
  bodyClass,
  content,
  jsonLd,
  ogType = 'website',
  metaRobots,
  ogImage = site.ogImage,
}) {
  const imageUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${site.url}${ogImage}`) : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${attr(description)}">
  <meta name="theme-color" content="#ffffff">
  <meta name="author" content="${attr(site.fullName || site.author)}">
  <link rel="canonical" href="${attr(urlFor(canonicalPath))}">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/favicon.png">
  ${metaRobots ? `<meta name="robots" content="${attr(metaRobots)}">` : ''}
  <meta property="og:type" content="${attr(ogType)}">
  <meta property="og:site_name" content="${attr(site.name)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(urlFor(canonicalPath))}">
  ${imageUrl ? `<meta property="og:image" content="${attr(imageUrl)}">` : ''}
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(description)}">
  ${imageUrl ? `<meta name="twitter:image" content="${attr(imageUrl)}">` : ''}
  <title>${esc(title)}</title>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="${attr(bodyClass)}">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="page-shell">
    ${renderHeader(canonicalPath)}
    <main id="main-content" class="page-main">
      ${content}
    </main>
    ${renderFooter()}
  </div>
</body>
</html>
`;
}

function renderRedirect(title, targetPath) {
  const targetUrl = urlFor(targetPath);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${attr(targetUrl)}">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${attr(targetUrl)}">
  <title>${esc(title)}</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      color: #000;
    }
    main {
      max-width: 42rem;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }
    a {
      color: inherit;
    }
  </style>
</head>
<body>
  <main>
    <p>Redirecting to <a href="${attr(targetUrl)}">${esc(title)}</a>.</p>
    <script>location.replace(${JSON.stringify(targetUrl)});</script>
  </main>
</body>
</html>
`;
}

function renderIntro(title, subtitle) {
  return `
    <header class="page-intro">
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="intro-subtitle">${esc(subtitle)}</p>` : ''}
    </header>
  `;
}

function renderSection(title, body, id) {
  return `
    <section class="page-section"${id ? ` id="${attr(id)}"` : ''}>
      <div class="section-head">
        <h2>${esc(title)}</h2>
      </div>
      ${body}
    </section>
  `;
}

function renderProse(paragraphs) {
  return `<div class="prose">${paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</div>`;
}

function renderPillars(items) {
  return `
    <div class="pillar-grid">
      ${items
        .map(
          (item) => `
            <article class="pillar">
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.summary)}</p>
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderEntries(items) {
  return `
    <div class="entry-list">
      ${items
        .map(
          (item) => `
            <article class="entry"${item.id ? ` id="${attr(item.id)}"` : ''}>
              <div class="entry-head">
                <h3>${item.href ? `<a href="${attr(item.href)}">${esc(item.title)}</a>` : esc(item.title)}</h3>
                ${item.meta ? `<span class="entry-meta">${esc(item.meta)}</span>` : ''}
              </div>
              ${item.org ? `<p class="entry-org">${esc(item.org)}</p>` : ''}
              ${item.summary ? `<p class="entry-summary">${esc(item.summary)}</p>` : ''}
              ${
                Array.isArray(item.details) && item.details.length
                  ? `<ul class="entry-points">${item.details.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>`
                  : ''
              }
            </article>
          `
        )
        .join('')}
    </div>
  `;
}

function renderLinkRow(items) {
  return `
    <p class="link-row">
      ${items.map((item) => `<a href="${attr(item.href)}">${esc(item.label)}</a>`).join('<span aria-hidden="true">·</span>')}
    </p>
  `;
}

function renderLinkGroups(groups) {
  return `
    <div class="link-groups">
      ${groups
        .map(
          (group) => `
            <section class="link-group">
              <h3>${esc(group.group)}</h3>
              ${renderLinkRow(group.items)}
            </section>
          `
        )
        .join('')}
    </div>
  `;
}

function renderHome() {
  const intro = renderIntro(site.heroHeadline, site.homeSummary);

  return renderPage({
    title: site.name,
    description: site.description,
    canonicalPath: '/',
    bodyClass: 'page-home',
    content: `<article class="page-article">${intro}${renderProse(site.homeParagraphs)}${renderPillars(site.homePillars)}${renderLinkRow(site.homeLinks)}</article>`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: site.fullName || site.author,
      url: site.url,
      sameAs: site.contactLinks.map((link) => link.href),
      alumniOf: ['University of Cambridge', 'K. International School Tokyo'],
      description: site.tagline,
    },
  });
}

function renderAbout() {
  const intro = renderIntro('About Me');

  return renderPage({
    title: `About · ${site.name}`,
    description: 'About Howard Chan.',
    canonicalPath: '/about/',
    bodyClass: 'page-about',
    content: `<article class="page-article">${intro}${renderProse(site.aboutParagraphs)}${renderSection(
      'Professional Experience',
      renderEntries(site.experience),
      'experience'
    )}${renderSection('Education', renderEntries(site.education), 'education')}${renderLinkRow(site.homeLinks)}</article>`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: site.fullName || site.author,
        sameAs: site.contactLinks.map((link) => link.href),
        description: site.tagline,
      },
    },
  });
}

function renderProjects() {
  const intro = renderIntro('Projects', 'Products, civic initiatives, and infrastructure built to work in real conditions.');

  const sections = site.projects.map((group) =>
    renderSection(group.group, renderEntries(group.items), group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  );

  return renderPage({
    title: `Projects · ${site.name}`,
    description: 'Products, civic initiatives, and infrastructure.',
    canonicalPath: '/projects/',
    bodyClass: 'page-projects',
    content: `<article class="page-article">${intro}${sections.join('')}</article>`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${site.name} Projects`,
      description: 'Products, civic initiatives, and infrastructure.',
    },
  });
}

function renderResearchIndex() {
  const intro = renderIntro('Research', 'Research on communication, cognition, and institutional systems.');

  return renderPage({
    title: `Research · ${site.name}`,
    description: 'Research on communication, cognition, and institutional systems.',
    canonicalPath: '/research/',
    bodyClass: 'page-research',
    content: `<article class="page-article">${intro}${renderEntries(site.research)}</article>`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${site.name} Research`,
      description: 'Research on communication, cognition, and institutional systems.',
    },
  });
}

function renderResearchArticle(post) {
  const intro = renderIntro(post.title, post.summary);

  return renderPage({
    title: `${post.title} · ${site.name}`,
    description: post.summary,
    canonicalPath: `/research/${post.slug}/`,
    bodyClass: 'page-post',
    content: `<article class="page-article">${intro}${renderSection('Notes', renderProse(post.body), 'notes')}</article>`,
    ogType: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ScholarlyArticle',
        headline: post.title,
        datePublished: post.dateIso || today,
        author: authorPerson,
        description: post.summary,
        inLanguage: 'en',
        mainEntityOfPage: `${site.url}/research/${post.slug}/`,
      },
      breadcrumbLd([
        { name: 'Home', route: '/' },
        { name: 'Research', route: '/research/' },
        { name: post.title, route: `/research/${post.slug}/` },
      ]),
    ],
  });
}

function renderGuidesIndex() {
  const intro = renderIntro('Guides', 'Honest, specific guides to the IB and to UK, US, and Hong Kong university admissions — written by an incoming Cambridge HSPS student who did it from an international school in Tokyo.');
  return renderPage({
    title: `Guides · ${site.name}`,
    description: 'Honest guides to the IB and university admissions for international students — by an incoming Cambridge HSPS student.',
    canonicalPath: '/guides/',
    bodyClass: 'page-guides',
    content: `<article class="page-article">${intro}${renderEntries(
      guides.map((g) => ({ title: g.title, href: `/guides/${g.slug}/`, summary: g.metaDescription }))
    )}</article>`,
    ogType: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${site.name} Guides`,
        description: 'Guides to the IB and university admissions for international students.',
        author: authorPerson,
        hasPart: guides.map((g) => ({
          '@type': 'Article',
          headline: g.title,
          url: `${site.url}/guides/${g.slug}/`,
        })),
      },
      breadcrumbLd([
        { name: 'Home', route: '/' },
        { name: 'Guides', route: '/guides/' },
      ]),
    ],
  });
}

function renderGuideArticle(g) {
  const related = guides.filter((x) => x.slug !== g.slug).slice(0, 4);
  const faqBlock =
    Array.isArray(g.faq) && g.faq.length
      ? renderSection(
          'Frequently asked questions',
          `<div class="prose">${g.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</div>`,
          'faq'
        )
      : '';
  const body = `
    ${renderIntro(g.title, g.metaDescription)}
    ${renderProse(g.intro || [])}
    ${(g.sections || []).map((s) => renderSection(s.h2, renderProse(s.paragraphs || []))).join('')}
    ${faqBlock}
    ${g.takeaway ? renderSection('The takeaway', renderProse([g.takeaway])) : ''}
    <aside class="guide-cta">
      <p>Run a tutoring or admissions agency? <a href="${attr(ELEVATEOS_CTA)}">ElevateOS</a> turns a tutor's 60-second note into a parent-ready report in seconds.</p>
    </aside>
    ${renderSection(
      'Keep reading',
      renderEntries(related.map((r) => ({ title: r.title, href: `/guides/${r.slug}/`, summary: r.metaDescription })))
    )}
  `;
  return renderPage({
    title: `${g.title} · ${site.name}`,
    description: g.metaDescription,
    canonicalPath: `/guides/${g.slug}/`,
    bodyClass: 'page-post',
    content: `<article class="page-article">${body}</article>`,
    ogType: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: g.title,
        datePublished: g.dateIso || today,
        dateModified: g.dateModified || today,
        author: authorPerson,
        publisher: { '@type': 'Organization', name: site.name, url: site.url },
        description: g.metaDescription,
        inLanguage: 'en',
        image: `${site.url}${site.ogImage}`,
        mainEntityOfPage: `${site.url}/guides/${g.slug}/`,
      },
      breadcrumbLd([
        { name: 'Home', route: '/' },
        { name: 'Guides', route: '/guides/' },
        { name: g.title, route: `/guides/${g.slug}/` },
      ]),
      ...(Array.isArray(g.faq) && g.faq.length
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: g.faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ]
        : []),
    ],
  });
}

function renderAwards() {
  const intro = renderIntro('Awards & Certifications', 'Academic profile, recognition, and certifications.');

  const sections = site.awardsCertifications.map((group, index) =>
    renderSection(group.group, renderEntries(group.items), index === 0 ? 'academic-profile' : group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  );

  return renderPage({
    title: `Awards & Certifications · ${site.name}`,
    description: 'Academic profile, recognition, and certifications.',
    canonicalPath: '/awards-certifications/',
    bodyClass: 'page-awards',
    content: `<article class="page-article">${intro}${sections.join('')}</article>`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${site.name} Awards and Certifications`,
      description: 'Academic profile, recognition, and certifications.',
    },
  });
}

function renderContact() {
  const intro = renderIntro('Contact', site.contactIntro);

  return renderPage({
    title: `Contact · ${site.name}`,
    description: 'GitHub, Wantedly, LinkedIn, email, project links, and social links.',
    canonicalPath: '/contact/',
    bodyClass: 'page-contact',
    content: `<article class="page-article">${intro}${renderLinkGroups(site.linkGroups)}</article>`,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      mainEntity: {
        '@type': 'Person',
        name: site.fullName || site.author,
        sameAs: site.contactLinks.map((link) => link.href),
      },
    },
  });
}

function renderNotFound() {
  const intro = renderIntro('Page not found', 'Use Home, About, Projects, Research, Awards & Certifications, or Contact.');

  return renderPage({
    title: `Not found · ${site.name}`,
    description: 'The page you were looking for is not here.',
    canonicalPath: '/404/',
    bodyClass: 'page-404',
    content: `<article class="page-article">${intro}${renderSection(
      'Pages',
      renderLinkGroups([
        {
          group: 'Navigation',
          items: navItems,
        },
      ])
    )}</article>`,
    ogType: 'website',
    metaRobots: 'noindex,follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Not found - ${site.name}`,
    },
  });
}

function renderRobots() {
  return `User-agent: *
Allow: /
Sitemap: ${site.url}/sitemap.xml
`;
}

function renderLlms() {
  return `# ${site.name}

${site.tagline}

Howard Chan's public profile, projects, research, awards & certifications, and contact links.

## Pages
- Home: ${site.url}/
- About: ${site.url}/about/
- Projects: ${site.url}/projects/
- Research: ${site.url}/research/
- Awards & Certifications: ${site.url}/awards-certifications/
- Contact: ${site.url}/contact/

## About
- ${site.aboutParagraphs.join(' ')}

## Professional Experience
${site.experience.map((item) => `- ${item.title}: ${item.summary}`).join('\n')}

## Education
${site.education.map((item) => `- ${item.title}: ${item.summary}`).join('\n')}

## Projects
${site.projects
  .map(
    (group) =>
      `### ${group.group}\n${group.items
        .map((item) => `- ${item.title}: ${item.summary}`)
        .join('\n')}`
  )
  .join('\n\n')}

## Research
${site.research.map((item) => `- ${item.title} (${item.meta}): ${item.summary}`).join('\n')}

## Awards & Certifications
${site.awardsCertifications
  .map(
    (group) =>
      `### ${group.group}\n${group.items.map((item) => `- ${item.title}: ${item.summary}`).join('\n')}`
  )
  .join('\n\n')}

## Links
${site.contactLinks.map((link) => `- ${link.label}: ${link.href}`).join('\n')}
`;
}

function renderSitemap() {
  const entries = [
    '/',
    '/guides/',
    '/about/',
    '/projects/',
    '/research/',
    '/awards-certifications/',
    '/contact/',
    ...guides.map((g) => `/guides/${g.slug}/`),
    ...site.research.map((post) => `/research/${post.slug}/`),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (route) =>
      `  <url><loc>${site.url}${route === '/' ? '/' : route}</loc><lastmod>${today}</lastmod><changefreq>${
        route.startsWith('/research/') && route !== '/research/' ? 'monthly' : 'weekly'
      }</changefreq><priority>${
        route === '/'
          ? '1.0'
          : route === '/research/'
            ? '0.9'
            : route === '/projects/'
              ? '0.85'
              : route === '/awards-certifications/'
                ? '0.75'
                : route === '/about/'
                  ? '0.65'
                  : route === '/contact/'
                    ? '0.55'
                    : '0.7'
      }</priority></url>`
  )
  .join('\n')}
</urlset>
`;
}

async function cleanupMediaAssets() {
  const mediaDir = path.join(root, 'assets', 'media');
  let entries;

  try {
    entries = await readdir(mediaDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name !== 'pfp.png' && entry.name !== 'hc-logo.png')
      .map((entry) => rm(path.join(mediaDir, entry.name), { force: true }))
  );
}

async function cleanupGeneratedRoutes() {
  const routeDirs = ['about', 'projects', 'research', 'awards-certifications', 'contact', 'portfolio', 'blog', 'awards', 'guides'];

  await Promise.all(routeDirs.map((dir) => rm(path.join(root, dir), { recursive: true, force: true })));
}

async function writeOutput(relativePath, content) {
  const target = path.join(root, relativePath);
  const normalized = String(content).replace(/[ \t]+$/gm, '');
  await mkdir(path.dirname(target), { recursive: true });
  try {
    const existing = await readFile(target, 'utf8');
    if (existing === normalized) {
      return;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  await writeFile(target, normalized, 'utf8');
}
