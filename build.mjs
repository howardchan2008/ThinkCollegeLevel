import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { site } from "./site-data.mjs";

const root = process.cwd();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
}).format(new Date());
const guides = JSON.parse(
  await readFile(new URL("./guides-data.json", import.meta.url), "utf8"),
);
const ELEVATEOS_CTA = "https://elevateos.org/partner-demo";
const HOWARD = "https://howardchan.me";
const AUTHOR = {
  "@type": "Person",
  name: "Chak Hang (Howard) Chan",
  alternateName: "Howard Chan",
  url: HOWARD,
  sameAs: ["https://www.linkedin.com/in/howardchan2008/", HOWARD],
  description:
    "Incoming Cambridge HSPS student (Peterhouse); predicted IB 45; wrote these guides from an international school in Tokyo.",
  knowsAbout: [
    "IB Diploma",
    "University admissions",
    "UCAS",
    "Oxbridge admissions",
    "Cambridge HSPS",
  ],
};

async function main() {
  await cleanupGeneratedRoutes();
  for (const g of guides)
    await writeOutput(
      path.join("guides", g.slug, "index.html"),
      renderGuideArticle(g),
    );
  await writeOutput("guides/index.html", renderGuidesIndex("/guides/"));
  for (const [name, slug] of CATEGORIES) {
    const gs = guides.filter((g) => categoryOf(g) === name);
    if (!gs.length) continue;
    const totalPages = Math.max(1, Math.ceil(gs.length / PER_PAGE));
    for (let p = 1; p <= totalPages; p++) {
      const rel =
        p === 1
          ? `category/${slug}/index.html`
          : `category/${slug}/page/${p}/index.html`;
      await writeOutput(
        rel,
        renderCategoryArchive(name, slug, gs, p, totalPages),
      );
    }
  }
  await writeOutput("index.html", renderHome());
  await writeOutput("404.html", renderNotFound());
  await writeOutput("_redirects", renderRedirects());
  await writeOutput("robots.txt", renderRobots());
  await writeOutput("llms.txt", renderLlms());
  await writeOutput("sitemap.xml", renderSitemap());
  await writeOutput("feed.xml", renderFeed());
  await writeOutput("privacy/index.html", renderPrivacy());
  await writeOutput("terms/index.html", renderTerms());
  await writeOutput("CNAME", "thinkcollegelevel.com\n");
}

/* ---------------- helpers ---------------- */
function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const attr = esc;
function urlFor(route) {
  return route === "/" ? `${site.url}/` : `${site.url}${route}`;
}

const THEMES = [
  [
    "IB Diploma",
    /\bib\b|tok|extended-essay|internal-assessment|study-schedule|-ib-|ib-/,
  ],
  [
    "UK & Oxbridge",
    /cambridge|oxford|oxbridge|ucas|hsps|personal-statement|supercurricular/,
  ],
  ["US & Hong Kong", /\bsat\b|common-app|hku|hkust|uk-vs-us/],
];
function themeFor(slug) {
  for (const [name, re] of THEMES) if (re.test(slug)) return name;
  return "Admissions & strategy";
}
const THEME_ORDER = [
  "IB Diploma",
  "UK & Oxbridge",
  "US & Hong Kong",
  "Admissions & strategy",
];

/* ---- 6-category taxonomy (clearly ordered site) ---- */
const CATEGORIES = [
  ["IB Diploma", "ib-diploma"],
  ["A-Levels & AP", "a-levels-and-ap"],
  ["UK & Oxbridge", "uk-and-oxbridge"],
  ["US Admissions", "us-admissions"],
  ["Hong Kong & Asia", "hong-kong-and-asia"],
  ["Strategy & Skills", "strategy-and-skills"],
];
const CAT_NAMES = CATEGORIES.map(([n]) => n);
const catSlug = (name) =>
  (CATEGORIES.find(([n]) => n === name) || [null, "strategy-and-skills"])[1];
function inferCategory(slug) {
  if (/a-level|\bap-|igcse/.test(slug)) return "A-Levels & AP";
  if (/hku|hkust|cuhk|polyu|hong-kong|jupas|asia|singapore|japan/.test(slug))
    return "Hong Kong & Asia";
  if (
    /cambridge|oxford|oxbridge|ucas|hsps|personal-statement|supercurricular|apply-to-uk/.test(
      slug,
    )
  )
    return "UK & Oxbridge";
  if (/\bsat\b|common-app|ivy|act-|apply-to-us/.test(slug))
    return "US Admissions";
  if (
    /\bib\b|tok|extended-essay|internal-assessment|-ib-|ib-|study-schedule/.test(
      slug,
    )
  )
    return "IB Diploma";
  return "Strategy & Skills";
}
const categoryOf = (g) =>
  CAT_NAMES.includes(g.category) ? g.category : inferCategory(g.slug);
const PER_PAGE = 24;
function cardHtml(g) {
  return `<a class="guide-card" href="/guides/${attr(g.slug)}/"><span class="gc-theme">${esc(categoryOf(g))}</span><h3>${esc(g.title)}</h3><p>${esc(g.metaDescription || "")}</p><span class="gc-more">Read guide ${icon("arrow-right")}</span></a>`;
}

function readMins(g) {
  const words = [
    ...(g.intro || []),
    ...(g.sections || []).flatMap((s) => s.paragraphs || []),
    ...(g.faq || []).flatMap((f) => [f.q, f.a]),
    g.takeaway || "",
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(4, Math.round(words / 200));
}

const ICONS = {
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  "arrow-up-right": '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  "user-round":
    '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  clock:
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  "key-round":
    '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  award:
    '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  "graduation-cap":
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  "map-pin":
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
};
function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

/* ---------------- chrome ---------------- */
function renderHeader(current) {
  const nav = [
    ["Guides", "/guides/"],
    ["About", `${HOWARD}/about/`],
    ["Contact", `${HOWARD}/contact/`],
  ];
  return `<header class="site-header"><div class="header-inner">
    <a class="brand" href="/">
      <img src="/assets/media/hc-logo-ink.png" alt="" width="34" height="31" decoding="async">
      <span class="wm"><strong>Think College Level</strong><small>IB &amp; university admissions, honestly</small></span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      ${nav.map(([l, h]) => `<a href="${attr(h)}"${current === h ? ' class="active"' : ""}>${esc(l)}</a>`).join("")}
      <a class="nav-search" href="/guides/" aria-label="Browse guides">${icon("search")}</a>
    </nav>
  </div></header>`;
}

function renderFooter() {
  const cols = [
    [
      "Guides",
      [
        ["All guides", "/guides/"],
        ["Get a 45 in the IB", "/guides/how-to-get-a-45-in-the-ib/"],
        ["Cambridge statement", "/guides/cambridge-personal-statement-guide/"],
      ],
    ],
    ["Topics", CATEGORIES.map(([n, s]) => [n, `/category/${s}/`])],
    [
      "Howard",
      [
        ["Personal site", HOWARD],
        ["Contact", `${HOWARD}/contact/`],
      ],
    ],
    [
      "Network",
      [
        ["ElevateOS", "https://elevateos.org"],
        ["Tatemori 盾守", "https://tatemori.com"],
        ["Prior Moves", "https://priormoves.com"],
        ["nobill", "https://nobill.app"],
        ["Premier Trophy", "https://crystalcentury.com"],
      ],
    ],
  ];
  return `<footer class="site-footer"><div class="footer-inner">
    <div class="footer-brand">
      <strong>Think College Level</strong>
      <p>Honest guides to the IB Diploma and UK/US/HK university admissions, by Howard Chan — predicted IB 45, incoming Cambridge HSPS.</p>
    </div>
    <div class="footer-cols">
      ${cols.map(([h, items]) => `<div class="footer-col"><h4>${esc(h)}</h4>${items.map(([l, hr]) => `<a href="${attr(hr)}">${esc(l)}</a>`).join("")}</div>`).join("")}
    </div>
    <div class="footer-legal">© 2026 Howard Chan · Tokyo · thinkcollegelevel.com</div>
  </div></footer>`;
}

function renderPage({
  title,
  description,
  canonicalPath,
  content,
  jsonLd,
  ogType = "website",
  image = null,
}) {
  const ld = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  const ogImg = urlFor(image || "/assets/heroes/_default.png");
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
  <link rel="alternate" type="application/rss+xml" title="Think College Level" href="/feed.xml">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.png" sizes="any">
  <meta property="og:type" content="${attr(ogType)}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(urlFor(canonicalPath))}">
  <meta property="og:image" content="${attr(ogImg)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${attr(ogImg)}">
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
  const byCat = CATEGORIES.map(([name, slug]) => [
    name,
    slug,
    guides.filter((g) => categoryOf(g) === name),
  ]).filter(([, , gs]) => gs.length);
  const blocks = byCat
    .map(
      ([name, slug, gs]) => `
    <section class="theme-block">
      <div class="theme-head"><h2><a class="cat-link" href="/category/${slug}/">${esc(name)}</a></h2><span class="count">${gs.length} guide${gs.length > 1 ? "s" : ""}</span><span class="theme-rule"></span><a class="theme-all" href="/category/${slug}/">All ${gs.length} ${icon("arrow-right")}</a></div>
      <div class="guide-grid">
        ${gs.slice(0, 6).map(cardHtml).join("")}
      </div>
    </section>`,
    )
    .join("");
  const content = `<main class="page" id="main">
    <section class="index-hero">
      <div class="eyebrow">Think College Level</div>
      <h1>Honest guides to the IB and university admissions.</h1>
      <p class="lead">${guides.length} free guides — subject-by-subject IB strategy, UK/US/HK applications, and what admissions tutors actually look for. Written by an incoming Cambridge student who did it from an international school in Tokyo.</p>
    </section>
    ${blocks}
  </main>`;
  return renderPage({
    title: `Guides to the IB & University Admissions · Think College Level`,
    description:
      "Honest guides to the IB Diploma and UK/US/HK university admissions for international students, by an incoming Cambridge HSPS student.",
    canonicalPath,
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Think College Level Guides",
      description:
        "Guides to the IB and university admissions for international students.",
      url: site.url + "/guides/",
    },
  });
}

/* ---------------- category archive (paginated) ---------------- */
function renderCategoryArchive(name, slug, gs, pageNum, totalPages) {
  const base = `/category/${slug}/`;
  const start = (pageNum - 1) * PER_PAGE;
  const items = gs.slice(start, start + PER_PAGE);
  const canonicalPath = pageNum === 1 ? base : `${base}page/${pageNum}/`;
  const pager =
    totalPages > 1
      ? `<nav class="pager" aria-label="Pagination">
      ${pageNum > 1 ? `<a class="pg" rel="prev" href="${pageNum === 2 ? base : `${base}page/${pageNum - 1}/`}">Previous</a>` : "<span></span>"}
      <span class="pg-info">Page ${pageNum} of ${totalPages}</span>
      ${pageNum < totalPages ? `<a class="pg" rel="next" href="${base}page/${pageNum + 1}/">Next ${icon("arrow-right")}</a>` : "<span></span>"}
    </nav>`
      : "";
  const content = `<main class="page" id="main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>${icon("chevron-right")}<a href="/guides/">Guides</a>${icon("chevron-right")}<span class="here">${esc(name)}</span></nav>
    <section class="index-hero"><div class="eyebrow">Category${totalPages > 1 ? ` · page ${pageNum}` : ""}</div><h1>${esc(name)}</h1><p class="lead">${gs.length} guide${gs.length > 1 ? "s" : ""} on ${esc(name)}.</p></section>
    <div class="guide-grid">${items.map(cardHtml).join("")}</div>
    ${pager}
  </main>`;
  return renderPage({
    title: `${name} — ${gs.length} Guides · Think College Level`,
    description: `Every Think College Level guide on ${name} — honest, specific help for international students.`,
    canonicalPath,
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${name} Guides`,
      url: `${site.url}${base}`,
      description: `Guides on ${name}.`,
    },
  });
}

/* ---------------- guide article ---------------- */
function renderGuideArticle(g) {
  const cat = categoryOf(g);
  const cslug = catSlug(cat);
  const sections = g.sections || [];
  const sameCat = guides.filter(
    (x) => x.slug !== g.slug && categoryOf(x) === cat,
  );
  const related = (
    sameCat.length >= 4
      ? sameCat
      : [
          ...sameCat,
          ...guides.filter((x) => x.slug !== g.slug && categoryOf(x) !== cat),
        ]
  ).slice(0, 4);
  const toc = `<aside class="toc" aria-label="On this page">
    <div class="toc-label">On this page</div>
    <nav>${sections.map((s, i) => `<a href="#s${i}">${esc(s.h2)}</a>`).join("")}</nav>
  </aside>`;
  const author = `<div class="author-block">
    <img class="avatar" src="/assets/media/pfp.png" alt="Howard Chan" width="54" height="54" decoding="async">
    <div>
      <strong>Howard Chan</strong>
      <div class="role">Wrote this guide · international school, Tokyo</div>
      <div class="creds">
        <span class="cred">${icon("award")} IB 45 / 45 (predicted)</span>
        <span class="cred">${icon("graduation-cap")} Incoming Cambridge HSPS</span>
        <span class="cred">${icon("map-pin")} Tokyo · UK·US·HK</span>
      </div>
    </div>
  </div>`;
  const body = `<div class="prose">
    ${(g.intro || []).map((p) => `<p>${esc(p)}</p>`).join("")}
    ${sections
      .map(
        (s, i) => `<section id="s${i}" data-idx="${i}">
      <h2>${esc(s.h2)}</h2>
      ${(s.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}
      ${i === 2 ? `<div class="ad-slot" aria-hidden="true">Reserved slot · never shifts layout</div>` : ""}
    </section>`,
      )
      .join("")}
  </div>`;
  const faq =
    g.faq && g.faq.length
      ? `<section class="faq-section" aria-label="Frequently asked questions">
    <h2>Frequently asked questions</h2>
    ${g.faq
      .map(
        (f, i) => `<div class="faq-item${i === 0 ? " open" : ""}">
      <button class="faq-q" aria-expanded="${i === 0}"><h3>${esc(f.q)}</h3>${icon("chevron-down")}</button>
      <div class="faq-a"><div class="faq-a-inner">${esc(f.a)}</div></div>
    </div>`,
      )
      .join("")}
  </section>`
      : "";
  const takeaway = g.takeaway
    ? `<section class="takeaway"><div class="hd">${icon("key-round")} The takeaway</div><p>${esc(g.takeaway)}</p></section>`
    : "";
  const cta = `<aside class="elevate-cta">
    <p><span class="ctx">For agencies · sponsor</span>Run a tutoring or admissions agency? ElevateOS turns a tutor's 60-second note into a parent-ready report in seconds.</p>
    <a href="${attr(ELEVATEOS_CTA)}">See a demo ${icon("arrow-up-right")}</a>
  </aside>`;
  const relatedBlock = `<section class="related">
    <div class="eyebrow">Keep reading</div>
    <div class="related-grid">
      ${related.map(cardHtml).join("")}
    </div>
  </section>`;
  const content = `<main class="page" id="main">
    <article class="article-wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a>${icon("chevron-right")}<a href="/guides/">Guides</a>${icon("chevron-right")}<a href="/category/${attr(cslug)}/">${esc(cat)}</a>
      </nav>
      <header class="article-head">
        <div class="eyebrow">${esc(cat)}</div>
        <h1>${esc(g.title)}</h1>
        <p class="lead">${esc(g.metaDescription)}</p>
        <div class="article-meta">${icon("user-round")} By Howard Chan <span class="dot">·</span> ${icon("clock")} ${readMins(g)} min read <span class="dot">·</span> Updated Jun 2026</div>
      </header>
      <img class="article-hero" src="/assets/heroes/${attr(g.slug)}.png" alt="${attr(g.title)}" width="1200" height="630" loading="eager" decoding="async" style="width:100%;height:auto;border-radius:14px;margin:6px 0 24px;display:block">
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
    ogType: "article",
    content,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: g.title,
        datePublished: g.dateIso || today,
        dateModified: today,
        author: AUTHOR,
        publisher: {
          "@type": "Organization",
          name: "Think College Level",
          url: site.url,
        },
        description: g.metaDescription,
        mainEntityOfPage: `${site.url}/guides/${g.slug}/`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${site.url}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Guides",
            item: `${site.url}/guides/`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: cat,
            item: `${site.url}/category/${cslug}/`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: g.title,
            item: `${site.url}/guides/${g.slug}/`,
          },
        ],
      },
      ...(g.faq && g.faq.length
        ? [
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: g.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  });
}

function renderHome() {
  const featured =
    guides.find((g) => g.slug === "how-to-get-a-45-in-the-ib") || guides[0];
  const popular = guides.filter((g) => g.slug !== featured.slug).slice(0, 6);
  const content = `<main class="page" id="main">
    <section class="home-hero">
      <div class="eyebrow">Think College Level</div>
      <h1 class="tcl-display">Get into university — without the guesswork.</h1>
      <p class="lead">Honest, specific guides to the IB Diploma and UK, US &amp; Hong Kong admissions — written by an incoming Cambridge HSPS student who did it from an international school in Tokyo.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="/guides/">Browse all ${guides.length} guides ${icon("arrow-right")}</a></div>
    </section>

    <section class="featured" aria-label="Featured guide">
      <a class="featured-card" href="/guides/${attr(featured.slug)}/">
        <div class="eyebrow">Start here · ${esc(themeFor(featured.slug))}</div>
        <h2>${esc(featured.title)}</h2>
        <p>${esc(featured.metaDescription)}</p>
        <span class="gc-more">Read guide ${icon("arrow-right")}</span>
      </a>
    </section>

    <section class="theme-block">
      <div class="theme-head"><h2>Popular guides</h2><span class="theme-rule"></span><a class="theme-all" href="/guides/">All guides ${icon("arrow-right")}</a></div>
      <div class="guide-grid">
        ${popular.map((g) => `<a class="guide-card" href="/guides/${attr(g.slug)}/"><span class="gc-theme">${esc(themeFor(g.slug))}</span><h3>${esc(g.title)}</h3><p>${esc(g.metaDescription)}</p><span class="gc-more">Read guide ${icon("arrow-right")}</span></a>`).join("")}
      </div>
    </section>
  </main>`;
  return renderPage({
    title: "Think College Level — IB & University Admissions Guides",
    description:
      "Honest guides to the IB Diploma and UK/US/HK university admissions for international students, by an incoming Cambridge HSPS student.",
    canonicalPath: "/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Think College Level",
      url: site.url,
      description:
        "Guides to the IB and university admissions for international students.",
    },
  });
}

function renderLegal({ title, slug, description, lead, blocks }) {
  const content = `<main class="page" id="main">
    <article class="article-wrap">
      <header class="article-head">
        <div class="eyebrow">Legal</div>
        <h1>${esc(title)}</h1>
        <p class="lead">${esc(lead)}</p>
        <div class="article-meta">Last updated ${today}</div>
      </header>
      <div class="article-main">
        ${blocks.map((b) => `<h2>${esc(b.h2)}</h2>${b.ps.map((p) => `<p>${p}</p>`).join("")}`).join("\n")}
      </div>
    </article>
  </main>`;
  return renderPage({
    title: `${title} · Think College Level`,
    description,
    canonicalPath: `/${slug}/`,
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url: `${site.url}/${slug}/`,
      description,
    },
  });
}

function renderPrivacy() {
  const contact = `<a class="tcl-link" href="${HOWARD}/contact/">howardchan.me/contact</a>`;
  return renderLegal({
    title: "Privacy Policy",
    slug: "privacy",
    description:
      "How Think College Level handles data. We run a static educational blog, collect no personal data directly, and never sell information.",
    lead: "Think College Level is a static educational blog. We collect no personal data directly, run no user accounts, and never sell your information.",
    blocks: [
      {
        h2: "Who we are",
        ps: [
          `Think College Level (thinkcollegelevel.com) is an independent educational blog written by Chak Hang (Howard) Chan. Questions about this policy: ${contact}.`,
        ],
      },
      {
        h2: "Information we collect",
        ps: [
          "We do not operate accounts, logins, comment forms, or newsletters, so we collect no personal data from you directly.",
          "Our host (Cloudflare Pages) automatically processes standard server request data — IP address, browser user-agent, and timestamp — to deliver pages and protect against abuse. We do not combine this with any identifying information.",
          "If aggregate, privacy-respecting analytics are enabled, they record only anonymous page-view counts and never build a profile of you.",
        ],
      },
      {
        h2: "Cookies",
        ps: [
          "We set no advertising or cross-site tracking cookies. Any cookies present are strictly functional (set by the host to serve and secure the site).",
        ],
      },
      {
        h2: "Third-party services",
        ps: [
          "The site is hosted on Cloudflare Pages, which processes request data under its own privacy terms.",
          "We publish our own articles to social platforms (Pinterest, Bluesky, Mastodon, and X) using our own accounts and those platforms’ official APIs. This is outbound publishing of our content — it does not transmit any data about you.",
        ],
      },
      {
        h2: "Children’s privacy",
        ps: [
          "Our content is written for students aged 16 and older and their families. We do not knowingly collect personal data from children under 13.",
        ],
      },
      {
        h2: "Your rights",
        ps: [
          `Because we hold no personal data about you, there is nothing to access, correct, or delete. For any privacy question, contact us at ${contact}.`,
        ],
      },
      {
        h2: "Changes to this policy",
        ps: [
          "We may update this policy from time to time. The effective date above always reflects the current version.",
        ],
      },
    ],
  });
}

function renderTerms() {
  const contact = `<a class="tcl-link" href="${HOWARD}/contact/">howardchan.me/contact</a>`;
  return renderLegal({
    title: "Terms of Use",
    slug: "terms",
    description:
      "Terms governing use of Think College Level. Content is educational and provided as-is, with no guarantee of any admissions outcome.",
    lead: "By using Think College Level, you agree to these terms. Our content is educational and provided as-is.",
    blocks: [
      {
        h2: "Educational content only",
        ps: [
          "All guides are general educational information based on personal experience. They are not professional admissions, legal, or financial advice, and we make no guarantee of any examination result or admissions outcome.",
        ],
      },
      {
        h2: "Intellectual property",
        ps: [
          "Articles and original materials are owned by the author. You may read and share links freely; republishing full content without permission is not allowed.",
        ],
      },
      {
        h2: "External links",
        ps: [
          "We link to third-party sites for convenience and are not responsible for their content or practices.",
        ],
      },
      {
        h2: "Changes",
        ps: [
          "We may revise these terms at any time; the effective date above reflects the current version.",
        ],
      },
      { h2: "Contact", ps: [`Questions about these terms: ${contact}.`] },
    ],
  });
}

function renderNotFound() {
  const content = `<main class="page" id="main"><section class="index-hero"><div class="eyebrow">404</div><h1>Page not found.</h1><p class="lead">Try the <a class="tcl-link" href="/guides/">guides</a>.</p></section></main>`;
  return renderPage({
    title: "Not found · Think College Level",
    description: "Page not found.",
    canonicalPath: "/404/",
    content,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Not found",
    },
  });
}

/* ---------------- static files ---------------- */
function renderRedirects() {
  return `/about/*                  ${HOWARD}/about/:splat                  301
/projects/*               ${HOWARD}/projects/:splat               301
/research/*               ${HOWARD}/research/:splat               301
/awards-certifications/*  ${HOWARD}/awards-certifications/:splat  301
/contact/*                ${HOWARD}/contact/:splat                301
/blog/*                   ${HOWARD}/blog/:splat                   301
/portfolio/*              ${HOWARD}/portfolio/:splat              301
/awards/*                 ${HOWARD}/awards/:splat                 301
`;
}
function renderRobots() {
  return `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`;
}
function renderLlms() {
  const head = `# Think College Level\n\n> IB and university admissions guides, written from lived experience.\n\n## Guides\n`;
  const items = guides
    .map((g) => `- [${esc(g.title)}](${site.url}/guides/${g.slug}/)`)
    .join("\n");
  return `${head}${items}\n`;
}
function renderSitemap() {
  const catRoutes = [];
  for (const [name, slug] of CATEGORIES) {
    const gs = guides.filter((g) => categoryOf(g) === name);
    if (!gs.length) continue;
    catRoutes.push(`/category/${slug}/`);
    const tp = Math.ceil(gs.length / PER_PAGE);
    for (let p = 2; p <= tp; p++)
      catRoutes.push(`/category/${slug}/page/${p}/`);
  }
  const routes = [
    "/",
    "/guides/",
    ...catRoutes,
    ...guides.map((g) => `/guides/${g.slug}/`),
    "/privacy/",
    "/terms/",
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url><loc>${site.url}${r}</loc><lastmod>${today}</lastmod><changefreq>${r === "/" || r === "/guides/" ? "weekly" : "monthly"}</changefreq><priority>${r === "/" ? "1.0" : r === "/guides/" ? "0.9" : "0.7"}</priority></url>`).join("\n")}
</urlset>
`;
}

function renderFeed() {
  const recent = [...guides]
    .sort((a, b) =>
      String(b.dateIso || "").localeCompare(String(a.dateIso || "")),
    )
    .slice(0, 40);
  const items = recent
    .map((g) => {
      const u = `${site.url}/guides/${g.slug}/`;
      const pub = new Date(g.dateIso || today).toUTCString();
      return `  <item>
    <title>${esc(g.title)}</title>
    <link>${u}</link>
    <guid isPermaLink="true">${u}</guid>
    <pubDate>${pub}</pubDate>
    <description>${esc(g.metaDescription)}</description>
  </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Think College Level</title>
  <link>${site.url}/</link>
  <description>Honest guides to the IB Diploma and UK, US &amp; Hong Kong university admissions, by an incoming Cambridge HSPS student.</description>
  <language>en</language>
  <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;
}

async function cleanupGeneratedRoutes() {
  for (const dir of [
    "about",
    "projects",
    "research",
    "awards-certifications",
    "contact",
    "portfolio",
    "blog",
    "awards",
    "guides",
    "category",
    "privacy",
    "terms",
  ]) {
    await rm(path.join(root, dir), { recursive: true, force: true });
  }
}
async function writeOutput(rel, content) {
  const target = path.join(root, rel);
  const normalized = String(content).replace(/[ \t]+$/gm, "");
  await mkdir(path.dirname(target), { recursive: true });
  try {
    if ((await readFile(target, "utf8")) === normalized) return;
  } catch (e) {
    if (e?.code !== "ENOENT") throw e;
  }
  await writeFile(target, normalized, "utf8");
}

await main();
