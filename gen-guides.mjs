#!/usr/bin/env node
// Programmatic-SEO content generator for thinkcollegelevel.com /guides/.
// Gemini-writes E-E-A-T college-admissions articles → guides-data.json.
// Run: GEMINI_API_KEY=... node gen-guides.mjs   (resumable; --force to regen all)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('no GEMINI_API_KEY'); process.exit(1); }
const MODEL = 'gemini-2.5-flash';
const OUT = new URL('./guides-data.json', import.meta.url).pathname;
const force = process.argv.includes('--force');

// target query → article. High-intent, Howard-authoritative (IB45/Cambridge/intl-school), ElevateOS funnel.
const TOPICS = [
  ['how-to-get-a-45-in-the-ib', 'How to Get a 45 in the IB Diploma', 'how to get a 45 in IB'],
  ['ib-vs-a-levels-for-university', 'IB vs A-Levels: Which Is Better for University Admissions?', 'IB vs A-Levels'],
  ['apply-to-uk-universities-from-asia', 'How to Apply to UK Universities from Asia', 'apply to UK universities from Asia'],
  ['cambridge-personal-statement-guide', 'How to Write a Cambridge Personal Statement', 'Cambridge personal statement'],
  ['get-into-oxbridge-from-international-school', 'How to Get into Oxbridge from an International School', 'how to get into Oxbridge international student'],
  ['choosing-ib-subjects-for-your-degree', 'How to Choose IB Subjects for Your Intended Degree', 'how to choose IB subjects'],
  ['sat-1550-study-plan', 'How to Score 1550+ on the SAT: A Realistic Study Plan', 'how to score 1550 SAT'],
  ['supercurriculars-for-oxbridge', 'Supercurriculars: What Oxbridge Actually Wants to See', 'supercurriculars for Oxbridge'],
  ['cambridge-hsps-interview-guide', 'How to Prepare for the Cambridge HSPS Interview', 'Cambridge HSPS interview'],
  ['get-into-hku-and-hkust', 'How to Get into HKU and HKUST', 'how to get into HKU HKUST'],
  ['ib-extended-essay-guide', 'How to Write a Top-Mark IB Extended Essay', 'IB extended essay guide'],
  ['ib-tok-essay-guide', 'How to Write the IB Theory of Knowledge (TOK) Essay', 'IB TOK essay guide'],
  ['ucas-timeline-international-students', 'The UCAS Application Timeline for International Students', 'UCAS timeline international students'],
  ['get-published-as-a-high-school-researcher', 'How to Get Published as a High-School Researcher', 'high school research publication'],
  ['lumiere-polygence-worth-it', 'Are Lumiere and Polygence Worth It? An Honest Guide', 'is Lumiere worth it'],
  ['ace-your-ib-internal-assessments', 'How to Ace Your IB Internal Assessments (IAs)', 'IB internal assessment tips'],
  ['uk-vs-us-vs-hong-kong-universities', 'UK vs US vs Hong Kong: How to Choose Where to Apply', 'UK vs US vs Hong Kong university'],
  ['cambridge-vs-oxford-which-to-apply', 'Cambridge vs Oxford: Which Should You Apply To?', 'Cambridge vs Oxford'],
  ['stand-out-in-university-applications', 'How to Stand Out in Competitive University Applications', 'how to stand out university application'],
  ['how-ib-scores-convert-to-offers', 'How IB Scores Convert to University Offers', 'IB score university requirements'],
  ['study-schedule-for-ib-students', 'The Study Schedule That Earns Top IB Grades', 'IB study schedule'],
  ['common-app-essay-guide', 'How to Write a Common App Essay That Stands Out', 'how to write common app essay'],
  ['best-free-resources-for-ib-students', 'The Best Free Resources for IB Students', 'best free IB resources'],
  ['get-strong-recommendation-letters', 'How to Get Strong Recommendation Letters', 'how to get good recommendation letters'],
  ['gap-year-vs-direct-entry', 'Gap Year vs Direct University Entry: What Is Right for You?', 'gap year vs university'],
];

const SCHEMA_HINT = `{"metaTitle":"<=60 chars","metaDescription":"<=155 chars, compelling","intro":["para","para"],"sections":[{"h2":"...","paragraphs":["...","..."]}],"faq":[{"q":"...","a":"..."}],"takeaway":"one-paragraph summary"}`;

async function gen(title, query) {
  const prompt = `Write a genuinely useful, accurate, specific SEO article for a college-admissions blog (thinkcollegelevel.com), authored by Howard Chan — predicted IB 45, incoming Cambridge HSPS (Peterhouse), from an international school in Tokyo, admitted to HKU and HKUST. First-person where natural; honest, concrete, non-generic; reference real exams, timelines, and processes; NEVER fabricate statistics or quotes. Audience: international students applying to UK / US / Hong Kong.

Topic / H1: ${title}
Target search query: ${query}

Output ONLY JSON: ${SCHEMA_HINT}
6-9 sections, each 2-4 paragraphs. 4-6 FAQ. Write for a smart 16-18 year old. No fluff, no AI clichés ("in today's competitive landscape", "delve", "navigate"), no filler.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 8192, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }) });
      if (r.status === 429) { await new Promise((s) => setTimeout(s, 15000)); continue; }
      if (!r.ok) { console.error(`HTTP ${r.status} for ${query}`); return null; }
      const j = await r.json();
      const t = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return JSON.parse(t);
    } catch (e) { await new Promise((s) => setTimeout(s, 3000)); }
  }
  return null;
}

const existing = !force && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const have = new Set(existing.map((g) => g.slug));
const todo = TOPICS.filter(([slug]) => !have.has(slug));
console.error(`[guides] generating ${todo.length}/${TOPICS.length} (model ${MODEL})`);

const results = [...existing];
const CONC = 6;
let i = 0;
async function worker() {
  while (i < todo.length) {
    const [slug, title, query] = todo[i++];
    const data = await gen(title, query);
    if (!data) { console.error(`  ✗ ${slug}`); continue; }
    results.push({ slug, title, query, ...data, dateIso: '2026-06-03' });
    writeFileSync(OUT, JSON.stringify(results, null, 2));
    console.error(`  ✓ ${slug} (${data.sections?.length || 0} sections, ${data.faq?.length || 0} FAQ)`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
// keep TOPICS order
const order = new Map(TOPICS.map(([s], idx) => [s, idx]));
results.sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.error(`[guides] DONE — ${results.length} guides → guides-data.json`);
