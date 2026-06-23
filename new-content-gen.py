#!/usr/bin/env python3
"""
Generate FULL guide content for the high-demand topics Codex surfaced
(.research/seo-topics.json) using the LOCAL model (gemma4:31b, think:false).
Zero Max, zero paid API. Writes to .research/new-guides.json (separate file so
it never races the personalize batch writing guides-data.json).

Resumable: skips topics already in new-guides.json. Merge happens in finalize.sh.
"""
import json, os, re, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TOPICS = os.path.join(HERE, ".research", "seo-topics.json")
OUT = os.path.join(HERE, ".research", "new-guides.json")
MODEL = "gemma4:31b-mlx"
OLLAMA = "http://localhost:11434/api/generate"

PERSONA = ("written by Howard Chan, who scored 45/45 in the IB May 2023 at an international "
           "school in Tokyo and holds a Cambridge HSPS offer plus HKU and HKUST offers")

CATMAP = {  # research category -> site's 6-category taxonomy
    "IB": "IB Diploma", "AP": "A-Levels & AP", "Admissions": "UK & Oxbridge",
    "Essays": "US Admissions", "Strategy": "Strategy & Skills",
}

def gen(prompt):
    body = {"model": MODEL, "prompt": prompt, "think": False, "stream": False,
            "format": "json", "options": {"temperature": 0.8}}
    req = urllib.request.Request(OLLAMA, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read())["response"]

def prompt_for(t):
    return (
        f'Write a complete, genuinely useful guide for international high-school students.\n'
        f'TITLE: "{t["title"]}"\nPRIMARY QUERY: "{t["query"]}"\nTOPIC NOTE: {t.get("why","")}\n'
        f'AUTHOR: {PERSONA} (first person, authentic, concrete).\n'
        "STYLE: never use \"not X but Y\", \"isn't just X, it's Y\", or any negation-then-pivot — "
        "state claims positively. No rhetorical triplets. No em-dashes for drama. Avoid: delve, "
        "crucial, robust, leverage, unlock, seamless. Specific, accurate, no fluff. Real numbers/dates where known.\n"
        'Return ONLY JSON with EXACTLY these keys:\n'
        '{"metaTitle":"~58 chars incl brand","metaDescription":"150-158 chars, includes the query",'
        '"intro":["para ~55 words","para ~55 words"],'
        '"sections":[{"h2":"...","paragraphs":["~70 words","~70 words"]}, ... 5 sections total, each a distinct sub-topic answering the query],'
        '"faq":[{"q":"...","a":"~45 words"}, ... 5 FAQs of real questions students ask],'
        '"takeaway":"one punchy 2-sentence summary"}'
    )

def build(t):
    raw = gen(prompt_for(t)).strip()
    m = re.search(r"\{.*\}", raw, re.S)
    o = json.loads(m.group(0) if m else raw)
    sections = [s for s in o.get("sections", []) if s.get("h2") and s.get("paragraphs")][:6]
    faq = [f for f in o.get("faq", []) if f.get("q") and f.get("a")][:6]
    intro = [p for p in o.get("intro", []) if p][:2]
    if not (sections and intro and o.get("metaDescription")):
        raise ValueError("incomplete")
    return {
        "slug": t["slug"], "title": t["title"], "query": t["query"],
        "category": CATMAP.get(t.get("category"), "Strategy & Skills"),
        "metaTitle": o.get("metaTitle", t["title"])[:65],
        "metaDescription": o["metaDescription"][:158],
        "intro": intro, "sections": sections, "faq": faq,
        "takeaway": o.get("takeaway", ""), "personalized": True,
    }

def main():
    topics = json.load(open(TOPICS))
    out = json.load(open(OUT)) if os.path.exists(OUT) else []
    have = {g["slug"] for g in out}
    t0 = time.time()
    for t in topics:
        if t["slug"] in have:
            continue
        for attempt in range(3):
            try:
                out.append(build(t))
                json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=2)
                print(f"  + {t['slug']} ({len(out)}/{len(topics)})", flush=True)
                break
            except Exception as e:
                if attempt == 2:
                    print(f"  ! FAIL {t['slug']}: {e}", flush=True)
                time.sleep(1)
    print(f"DONE: {len(out)} new guides in {(time.time()-t0)/60:.1f}min", flush=True)

if __name__ == "__main__":
    main()
