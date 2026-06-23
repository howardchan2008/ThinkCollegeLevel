#!/usr/bin/env python3
"""Merge .research/new-guides.json into guides-data.json (dedup by slug,
stagger recent dates). Idempotent."""
import json, os, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(HERE, "guides-data.json")
N = os.path.join(HERE, ".research", "new-guides.json")

guides = json.load(open(G))
have = {g["slug"] for g in guides}
new = json.load(open(N)) if os.path.exists(N) else []
base = datetime.date(2026, 6, 23)
added = 0
for i, n in enumerate(new):
    if n["slug"] in have:
        continue
    n["dateIso"] = (base - datetime.timedelta(days=i // 2)).isoformat()
    guides.append(n)
    have.add(n["slug"])
    added += 1
json.dump(guides, open(G, "w"), ensure_ascii=False, indent=2)
print(f"merged {added} new guides; total {len(guides)}")
