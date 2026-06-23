#!/usr/bin/env python3
"""
Generate a branded hero/OG image per guide. Zero cost, local Pillow — no paid
image API, no stock keys. 1200x630 (Open Graph spec): doubles as the on-page
hero AND the social-share card. Category-themed color, wrapped title, badge,
brand mark, subtle pattern for per-guide visual variety.

Output: assets/heroes/<slug>.png   (resumable: skips existing unless --force)
Run:    python3 gen-heroes.py [--force]
"""
import json, os, sys, hashlib
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "guides-data.json")
OUT = os.path.join(HERE, "assets", "heroes")
FORCE = "--force" in sys.argv
W, H = 1200, 630
CREAM = (250, 246, 239)

# category -> (deep bg, accent)
THEME = {
    "IB Diploma":        ((42, 58, 107),  (124, 142, 200)),
    "A-Levels & AP":     ((36, 74, 56),   (120, 180, 145)),
    "UK & Oxbridge":     ((92, 36, 50),   (200, 130, 145)),
    "US Admissions":     ((28, 52, 88),   (110, 150, 205)),
    "Strategy & Skills": ((120, 80, 38),  (210, 170, 110)),
    "Hong Kong & Asia":  ((28, 84, 84),   (120, 190, 185)),
}
DEFAULT = ((52, 52, 70), (150, 150, 175))

AF = "/System/Library/Fonts/Supplemental/Arial.ttf"
ABF = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:4]

def category_of(g):
    return g.get("category") if g.get("category") in THEME else None

def make(g):
    cat = category_of(g)
    bg, accent = THEME.get(cat, DEFAULT)
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    # subtle deterministic pattern (per-slug) — faint diagonal ticks
    seed = int(hashlib.md5(g["slug"].encode()).hexdigest(), 16)
    for i in range(18):
        x = (seed >> (i * 3)) % W
        y = (seed >> (i * 2)) % H
        r = 60 + (x % 90)
        d.ellipse([x - r, y - r, x + r, y + r], outline=tuple(min(c + 14, 255) for c in bg), width=2)
    # left accent bar
    d.rectangle([0, 0, 14, H], fill=accent)
    pad = 72
    # category badge
    badge = (cat or "Guide").upper()
    bf = font(ABF, 26)
    bw = d.textlength(badge, font=bf)
    d.rounded_rectangle([pad, 70, pad + bw + 44, 124], radius=26, fill=accent)
    d.text((pad + 22, 84), badge, font=bf, fill=bg)
    # title (wrapped)
    tf = font(ABF, 72)
    lines = wrap(d, g["title"], tf, W - pad * 2)
    y = 180
    for ln in lines:
        d.text((pad, y), ln, font=tf, fill=CREAM)
        y += 88
    # brand strip bottom
    sf = font(ABF, 30)
    d.text((pad, H - 86), "thinkcollegelevel.com", font=sf, fill=accent)
    nf = font(AF, 26)
    by = "Howard Chan · IB 45 · incoming Cambridge"
    d.text((pad, H - 50), by, font=nf, fill=tuple(min(c + 90, 255) for c in bg))
    return img

def main():
    os.makedirs(OUT, exist_ok=True)
    guides = json.load(open(DATA))
    n = 0
    for g in guides:
        fp = os.path.join(OUT, f"{g['slug']}.png")
        if os.path.exists(fp) and not FORCE:
            continue
        make(g).save(fp, "PNG", optimize=True)
        n += 1
        if n % 50 == 0:
            print(f"  {n} heroes...", flush=True)
    print(f"DONE: {n} hero images -> assets/heroes/ ({len(guides)} guides total)")

if __name__ == "__main__":
    main()
