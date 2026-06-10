#!/usr/bin/env node
// Programmatic-SEO topic matrix for Think College Level — expands a combinatorial
// keyword space into ~500 high-intent posts, each tagged with one of 6 categories
// ("clearly order site"). Output: topics-500.json  [{slug,title,query,category}].
// Feeds gen-guides.mjs (Gemini writer) → static pages OR WordPress posts.
import { writeFileSync } from 'node:fs';

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const rows = [];
const add = (title, query, category) => rows.push({ slug: slugify(title), title, query, category });

// ---- category constants ----
const C = {
  IB: 'IB Diploma',
  AL: 'A-Levels & AP',
  UK: 'UK & Oxbridge',
  US: 'US Admissions',
  HK: 'Hong Kong & Asia',
  ST: 'Strategy & Skills',
};

// ---- IB Diploma ----
const IB_SUBJECTS = [
  'Mathematics AA', 'Mathematics AI', 'Physics', 'Chemistry', 'Biology', 'Economics',
  'Business Management', 'History', 'Geography', 'Psychology', 'English A Lang & Lit',
  'English A Literature', 'Computer Science', 'Environmental Systems & Societies',
  'Global Politics', 'Philosophy', 'Chinese B', 'Spanish B', 'French B', 'Visual Arts',
  'Music', 'Theatre', 'Film', 'Sports Exercise & Health Science', 'Design Technology',
];
for (const s of IB_SUBJECTS) {
  add(`How to Get a 7 in IB ${s}`, `how to get a 7 in IB ${s}`, C.IB);
  add(`IB ${s} Internal Assessment (IA) Guide`, `IB ${s} IA guide`, C.IB);
}
for (const s of IB_SUBJECTS) {
  add(`IB ${s} Extended Essay: Topics & Structure`, `IB ${s} extended essay`, C.IB);
}
for (const core of ['Extended Essay', 'Theory of Knowledge (TOK) Essay', 'TOK Exhibition', 'CAS Portfolio']) {
  add(`How to Write a Top-Mark IB ${core}`, `IB ${core} guide`, C.IB);
}
for (const t of ['Predicted Grades', 'Exam Revision Timetable', 'Paper 1 Technique', 'Paper 2 Technique',
  'Retaking Exams', 'Scoring 40+', 'Bilingual Diploma', 'Subject Selection']) {
  add(`IB ${t}: What Actually Works`, `IB ${t.toLowerCase()}`, C.IB);
}

// ---- A-Levels & AP ----
const AL_SUBJECTS = ['Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics',
  'History', 'Geography', 'English Literature', 'Psychology', 'Computer Science', 'Business',
  'Politics', 'Sociology', 'Art & Design', 'Law', 'Accounting', 'Spanish'];
for (const s of AL_SUBJECTS) add(`How to Get an A* in A-Level ${s}`, `A-Level ${s} A* guide`, C.AL);

const AP_SUBJECTS = ['Calculus AB', 'Calculus BC', 'Physics 1', 'Physics C', 'Chemistry', 'Biology',
  'Statistics', 'Microeconomics', 'Macroeconomics', 'US History', 'World History', 'English Language',
  'English Literature', 'Computer Science A', 'Psychology', 'Human Geography', 'Environmental Science',
  'European History', 'Comparative Government', 'Art History'];
for (const s of AP_SUBJECTS) add(`How to Get a 5 on AP ${s}`, `AP ${s} 5 guide`, C.AL);
for (const t of ['IGCSE to A-Level Transition', 'A-Level vs AP for US Universities', 'Self-Studying an AP',
  'AS vs A2 Strategy', 'Choosing A-Level Subjects for Medicine', 'Choosing A-Level Subjects for Engineering']) {
  add(t, t.toLowerCase(), C.AL);
}

// ---- UK & Oxbridge ----
const UK_UNIS = ['Oxford', 'Cambridge', 'Imperial College London', 'LSE', 'UCL', 'Warwick', 'Edinburgh',
  "King's College London", 'Bristol', 'Manchester', 'Durham', 'St Andrews', 'Bath', 'Nottingham'];
for (const u of UK_UNIS) add(`How to Get into ${u} as an International Student`, `how to get into ${u} international`, C.UK);

const COURSES = ['Medicine', 'Law', 'Economics', 'Engineering', 'Computer Science', 'PPE',
  'Natural Sciences', 'Mathematics', 'Psychology', 'English', 'History', 'HSPS', 'Architecture',
  'Management', 'Physics', 'Chemistry', 'Biology', 'Geography', 'Philosophy', 'Veterinary Medicine'];
for (const c of COURSES) add(`${c} Personal Statement: Guide & Examples`, `${c} personal statement`, C.UK);

const OXBRIDGE_INTERVIEWS = ['Medicine', 'Law', 'Engineering', 'Natural Sciences', 'Economics', 'HSPS',
  'Mathematics', 'Computer Science', 'PPE', 'English', 'History', 'Physics', 'Chemistry', 'Land Economy'];
for (const c of OXBRIDGE_INTERVIEWS) add(`How to Prepare for the Oxbridge ${c} Interview`, `Oxbridge ${c} interview`, C.UK);
for (const t of ['UCAS Timeline for International Students', 'Writing a UCAS Reference', 'Oxbridge Admissions Tests Overview',
  'TMUA Preparation', 'ESAT Preparation', 'LNAT Preparation', 'BMAT Replacement & UCAT', 'Choosing an Oxbridge College',
  'Supercurriculars for Oxbridge', 'UCAS Clearing for International Students', 'Deferred Entry & Gap Years',
  'Contextual Offers Explained']) {
  add(t, t.toLowerCase(), C.UK);
}

// ---- US Admissions ----
const US_UNIS = ['Harvard', 'Stanford', 'MIT', 'Yale', 'Princeton', 'Columbia', 'UPenn', 'Brown', 'Cornell',
  'Dartmouth', 'UChicago', 'Caltech', 'Duke', 'Northwestern', 'Johns Hopkins', 'UC Berkeley', 'UCLA', 'NYU'];
for (const u of US_UNIS) add(`How to Get into ${u} as an International Student`, `how to get into ${u} international`, C.US);
for (const t of ['Common App Essay That Stands Out', 'Supplemental Essays Strategy', 'Early Decision vs Early Action',
  'Building a US Activities List', 'US Financial Aid for International Students', 'Need-Blind Universities for Internationals',
  'Demonstrated Interest', 'US College Interview Tips', 'Liberal Arts Colleges Explained', 'Test-Optional Strategy']) {
  add(`How to Write a ${t}`.replace('How to Write a How', 'How').replace('How to Write a US', 'US'), t.toLowerCase(), C.US);
}
const SAT_ACT = ['Score 1550+ on the SAT', 'Get 800 on SAT Math', 'Get 750+ on SAT Reading & Writing',
  'Master the Digital SAT', 'Score 36 on the ACT', 'SAT vs ACT: Which to Take', 'SAT Subject Prep Plan',
  'Free Digital SAT Resources', 'SAT Superscoring Explained', 'When to Take the SAT'];
for (const s of SAT_ACT) add(`How to ${s}`.replace('How to SAT', 'SAT').replace('How to Master', 'How to Master'), s.toLowerCase(), C.US);

// ---- Hong Kong & Asia ----
const ASIA_UNIS = ['HKU', 'HKUST', 'CUHK', 'PolyU', 'CityU', 'HKBU', 'NUS', 'NTU', 'SMU', 'University of Tokyo', 'KAIST'];
for (const u of ASIA_UNIS) add(`How to Get into ${u}`, `how to get into ${u}`, C.HK);
for (const t of ['JUPAS Application Guide', 'Non-JUPAS Route for IB Students', 'HKDSE vs IB for HK Universities',
  'HKU Medicine Admissions', 'Studying in Hong Kong as a Mainland Student', 'Singapore vs Hong Kong Universities',
  'Applying to Japanese Universities in English', 'EJU & Japanese Admissions', 'Scholarships in Hong Kong & Asia',
  'HK University Interviews']) {
  add(t, t.toLowerCase(), C.HK);
}

// ---- Strategy & Skills ----
const STRATEGY = ['The Study Schedule That Earns Top Grades', 'Active Recall & Spaced Repetition for Exams',
  'How to Use Past Papers Properly', 'Beating Exam Stress and Burnout', 'Note-Taking Systems That Work',
  'Time Management for IB Students', 'How to Revise Two Years of Content', 'Building a Supercurricular Profile',
  'Getting Strong Recommendation Letters', 'How to Email a Professor for Research', 'Getting Published as a High-School Researcher',
  'Are Lumiere and Polygence Worth It', 'Free Resources Every Student Should Use', 'Choosing Between UK, US and HK',
  'How to Stand Out in Competitive Applications', 'Building a Personal Project That Impresses', 'Olympiads and Competitions That Matter',
  'How to Write a CV at 17', 'Summer Programs Worth Your Time', 'Dealing with Rejection from Top Universities',
  'How to Choose a Degree You Will Not Regret', 'Studying Abroad vs Staying Local', 'Managing Parents Expectations',
  'How to Self-Study a Subject', 'Productivity Tools for Students', 'How to Read Academic Papers as a Student',
  'Building Genuine Intellectual Curiosity', 'Gap Year vs Direct Entry', 'Scholarships and Funding Strategy',
  'How AI Tools Help (and Hurt) Your Studies'];
for (const t of STRATEGY) add(t, t.toLowerCase(), C.ST);

// ---- expansion to ~500 ----
for (const s of IB_SUBJECTS) {
  add(`How to Revise IB ${s} in Six Weeks`, `revise IB ${s} fast`, C.IB);
  add(`Common Mistakes in IB ${s} (and How to Avoid Them)`, `IB ${s} common mistakes`, C.IB);
  add(`IB ${s}: Best Resources & Past Papers`, `IB ${s} resources past papers`, C.IB);
}
const DUAL = ['Mathematics AA', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History',
  'English A Literature', 'Psychology', 'Computer Science', 'Geography'];
for (const s of DUAL) add(`IB ${s} HL vs SL: Which Should You Take`, `IB ${s} HL vs SL`, C.IB);

for (const s of AL_SUBJECTS) add(`A-Level ${s}: Common Mistakes to Avoid`, `A-Level ${s} common mistakes`, C.AL);
for (const s of AP_SUBJECTS) add(`A 30-Day Study Plan for AP ${s}`, `AP ${s} 30 day study plan`, C.AL);
for (const c of COURSES.slice(0, 12)) add(`IB vs A-Levels for ${c}`, `IB vs A-Level for ${c}`, C.AL);

const REGIONS = ['India', 'Mainland China', 'Hong Kong', 'Singapore', 'Malaysia', 'Nigeria',
  'the UAE', 'Indonesia', 'South Korea', 'Vietnam'];
for (const r of REGIONS) {
  add(`How to Apply to UK Universities from ${r}`, `apply to UK universities from ${r}`, C.UK);
  add(`How to Apply to US Universities from ${r}`, `apply to US universities from ${r}`, C.US);
}
for (const c of OXBRIDGE_INTERVIEWS.slice(0, 12)) add(`Oxford vs Cambridge for ${c}`, `Oxford vs Cambridge ${c}`, C.UK);

for (const c of COURSES) {
  add(`Best IB Subjects for ${c}`, `best IB subjects for ${c}`, C.IB);
  add(`What to Expect Studying ${c} at University`, `studying ${c} at university`, C.ST);
}
for (const d of ['the UK', 'the US', 'Hong Kong', 'Canada', 'Australia', 'Singapore']) {
  add(`Scholarships for International Students in ${d}`, `scholarships international students ${d}`, C.ST);
}
const ST2 = ['How to Build a Study Group That Works', 'Handling Mock Exam Results', 'How to Recover a Bad Semester',
  'Balancing Sport and Academics', 'How to Prepare for University Open Days', 'Writing a Standout Activity Description',
  'How to Get a Reference from a Teacher Who Barely Knows You', 'Choosing Extracurriculars with Intent',
  'How to Start a School Society', 'Digital Wellbeing During Exam Season', 'How to Learn Faster with the Feynman Technique',
  'Reading Lists That Impress Admissions Tutors', 'How to Network as a Student', 'Turning a Hobby into a Supercurricular',
  'How to Plan a Personal Research Project'];
for (const t of ST2) add(t, t.toLowerCase(), C.ST);

// ---- dedupe + emit ----
const seen = new Set();
const unique = rows.filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true)));
const byCat = unique.reduce((m, r) => ((m[r.category] = (m[r.category] || 0) + 1), m), {});
writeFileSync(new URL('./topics-500.json', import.meta.url), JSON.stringify(unique, null, 2));
console.log(`emitted ${unique.length} topics`);
for (const [k, v] of Object.entries(byCat)) console.log(`  ${k}: ${v}`);
