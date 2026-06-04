// Generate a branded 1000x1500 (Pinterest 2:3) title card PNG per guide.
// Renders with headless Chromium so the real Newsreader/Source Serif woff2
// fonts are used at full fidelity. Fonts embedded as base64 (no path issues).
//   NODE_PATH=$(npm root -g) node gen-cards.mjs
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
// Resolve the globally-installed playwright (ESM ignores NODE_PATH).
const require = createRequire(path.join(process.env.GLOBAL_ROOT || '/opt/homebrew/lib/node_modules', 'anchor.js'));
const { chromium } = require('playwright');

const root = process.cwd();
const guides = JSON.parse(await readFile('./guides-data.json', 'utf8'));
const FONTDIR = path.join(root, 'fonts');
const b64 = async (f) => (await readFile(path.join(FONTDIR, f))).toString('base64');
const NEWS = await b64('newsreader-normal-600-cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2');
const SERIF = await b64('sourceserif4-normal-400-vEFI2_tTDB4M7-auWDN0ahZJW1gb8te1Xb7G.woff2');

const THEMES = [
  ['IB Diploma', /\bib\b|tok|extended-essay|internal-assessment|study-schedule|-ib-|ib-/],
  ['UK & Oxbridge', /cambridge|oxford|oxbridge|ucas|hsps|personal-statement|supercurricular/],
  ['US & Hong Kong', /\bsat\b|common-app|hku|hkust|uk-vs-us/],
];
const themeFor = (slug) => (THEMES.find(([, re]) => re.test(slug)) || ['Admissions & strategy'])[0];
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const titleSize = (t) => { const n = t.length; return n <= 34 ? 104 : n <= 58 ? 86 : n <= 88 ? 70 : 58; };
const deck = (g) => { const d = (g.metaDescription || '').trim(); return d.length <= 150 ? d : `${d.slice(0, 150).replace(/\s+\S*$/, '')}…`; };

function card(g) {
  const theme = themeFor(g.slug);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Newsreader';font-weight:600;font-style:normal;src:url(data:font/woff2;base64,${NEWS}) format('woff2');}
  @font-face{font-family:'Source Serif 4';font-weight:400;font-style:normal;src:url(data:font/woff2;base64,${SERIF}) format('woff2');}
  *{margin:0;box-sizing:border-box;}
  html,body{width:1000px;height:1500px;}
  body{background:#FAF6EF;color:#211E1A;font-family:'Source Serif 4',Georgia,serif;-webkit-font-smoothing:antialiased;}
  .card{width:1000px;height:1500px;padding:96px 84px 84px;display:flex;flex-direction:column;}
  .top{display:flex;align-items:center;gap:18px;}
  .mark{width:32px;height:32px;background:#1F5A4C;border-radius:8px;}
  .brand{font-weight:600;font-size:31px;letter-spacing:.005em;}
  .hr{height:2px;background:rgba(33,30,26,.14);margin-top:30px;}
  .eyebrow{margin-top:104px;font-size:29px;text-transform:uppercase;letter-spacing:.2em;color:#1F5A4C;font-weight:600;}
  .title{font-family:'Newsreader',Georgia,serif;font-weight:600;line-height:1.05;margin-top:30px;letter-spacing:-.012em;font-size:${titleSize(g.title)}px;}
  .deck{font-size:35px;line-height:1.42;margin-top:40px;color:rgba(33,30,26,.66);max-width:780px;}
  .spacer{flex:1;}
  .foot{border-top:2px solid rgba(33,30,26,.16);padding-top:30px;display:flex;justify-content:space-between;align-items:baseline;}
  .url{font-size:29px;color:#1F5A4C;font-weight:600;}
  .tag{font-size:25px;text-transform:uppercase;letter-spacing:.16em;color:rgba(33,30,26,.5);}
  </style></head><body><div class="card">
    <div class="top"><div class="mark"></div><div class="brand">Think College Level</div></div>
    <div class="hr"></div>
    <div class="eyebrow">${esc(theme)}</div>
    <div class="title">${esc(g.title)}</div>
    <div class="deck">${esc(deck(g))}</div>
    <div class="spacer"></div>
    <div class="foot"><span class="url">thinkcollegelevel.com</span><span class="tag">Free guide</span></div>
  </div></body></html>`;
}

await mkdir(path.join(root, 'cards'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1500 }, deviceScaleFactor: 2 });
for (const g of guides) {
  await page.setContent(card(g), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'cards', `${g.slug}.png`) });
  console.log('card', g.slug);
}
await browser.close();
console.log('done:', guides.length, 'cards');
