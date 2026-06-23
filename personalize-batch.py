#!/usr/bin/env python3
"""
De-homogenize guides-data.json intros + meta descriptions using a LOCAL model
(gemma4:31b-mlx via Ollama, think:false). Zero Max, zero paid API.

Each guide currently shares one templated intro ("Getting a 7 in X isn't just
about being smart..."). This rewrites intro + metaDescription per guide so each
reads uniquely + kills the banned "not X but Y" construction.

Resumable: skips guides with "personalized": true. Writes back every WRITE_EVERY.
Run:  caffeinate -i python3 personalize-batch.py   (run alone; ~1.6h for 489)
"""
import json, os, re, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "guides-data.json")
MODEL = "gemma4:31b-mlx"
OLLAMA = "http://localhost:11434/api/generate"
WRITE_EVERY = 5

PERSONA = ("scored 45/45 in the IB May 2023 session at an international school in Tokyo, "
           "now holds a Cambridge HSPS offer plus offers from HKU and HKUST")

BANNED = [
    re.compile(r"\bnot\s+[^.,;]{1,40}?,?\s+but\b", re.I),
    re.compile(r"is(?:n'?t| not)\s+just\b", re.I),
    re.compile(r"\bis one thing\b", re.I),
    re.compile(r"\bit'?s not (?:about|just)\b", re.I),
]
BANNED_WORDS = re.compile(r"\b(delve|crucial|robust|leverage|unlock|seamless|nuanced|multifaceted)\b", re.I)

def violates(text):
    if BANNED_WORDS.search(text):
        return True
    return any(p.search(text) for p in BANNED)

def gen(prompt, fmt_json=True, temp=0.85):
    body = {"model": MODEL, "prompt": prompt, "think": False, "stream": False,
            "options": {"temperature": temp}}
    if fmt_json:
        body["format"] = "json"
    req = urllib.request.Request(OLLAMA, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())["response"]

def build_prompt(g):
    return (
        f'You are the author of a study/admissions guide. Title: "{g["title"]}". '
        f'Primary search query: "{g.get("query","")}". Category: {g.get("category","")}.\n'
        f'Author voice (first person, weave in naturally, do not list mechanically): {PERSONA}.\n'
        "Write a fresh, UNIQUE intro and meta description for THIS specific topic.\n"
        "HARD STYLE RULES:\n"
        '- Never use "not X but Y", "isn\'t just X, it\'s Y", "X is one thing", or any '
        "negation-then-pivot. State every claim positively and directly.\n"
        "- No rhetorical triplets. No em-dashes for dramatic pauses. Vary sentence length.\n"
        "- Banned words: delve, crucial, robust, leverage, unlock, seamless, nuanced.\n"
        "- Include ONE concrete, topic-specific detail a real student hits (a named pain point).\n"
        "- Sound like a specific person wrote it, slightly uneven, not a brochure.\n"
        'Return ONLY JSON: {"p1":"first intro paragraph ~60 words","p2":"second intro paragraph ~60 words",'
        '"meta":"meta description, 150-158 chars, compelling, includes the query naturally"}'
    )

def personalize(g, attempts=3):
    for i in range(attempts):
        try:
            raw = gen(build_prompt(g), temp=0.8 + i * 0.05).strip()
            m = re.search(r"\{.*\}", raw, re.S)   # strip ```json fences / stray prose
            if m:
                raw = m.group(0)
            o = json.loads(raw)
            p1, p2, meta = o.get("p1", "").strip(), o.get("p2", "").strip(), o.get("meta", "").strip()
            if not (p1 and p2 and meta):
                continue
            blob = p1 + " " + p2 + " " + meta
            if violates(blob):
                continue
            # tidy em-dashes just in case
            p1, p2, meta = (re.sub(r"\s*—\s*", ", ", x) for x in (p1, p2, meta))
            return [p1, p2], meta[:158]
        except Exception as e:
            time.sleep(1)
    return None, None

def main():
    guides = json.load(open(DATA))
    todo = [g for g in guides if not g.get("personalized")]
    print(f"{len(todo)}/{len(guides)} to personalize", flush=True)
    done = 0
    t0 = time.time()
    for idx, g in enumerate(guides):
        if g.get("personalized"):
            continue
        intro, meta = personalize(g)
        if intro:
            g["intro"] = intro
            g["metaDescription"] = meta
            g["personalized"] = True
            done += 1
        else:
            print(f"  SKIP (rule-fail x3): {g['slug']}", flush=True)
        if done and done % WRITE_EVERY == 0:
            json.dump(guides, open(DATA, "w"), ensure_ascii=False, indent=2)
            rate = (time.time() - t0) / done
            print(f"  {done} done · {rate:.0f}s/ea · ~{rate*(len(todo)-done)/60:.0f}min left", flush=True)
    json.dump(guides, open(DATA, "w"), ensure_ascii=False, indent=2)
    print(f"DONE: {done} personalized in {(time.time()-t0)/60:.1f}min", flush=True)

if __name__ == "__main__":
    main()
