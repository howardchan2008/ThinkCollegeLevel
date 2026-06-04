#!/usr/bin/env python3
"""Auto-post a Think College Level guide to Pinterest (v5 API, stdlib only).
Creds from macOS Keychain: pinterest-access-token.
Pins the guide's branded card image with a link back to the guide.
  python3 pinterest-post.py --slug how-to-get-a-45-in-the-ib    # dry-run (default)
  python3 pinterest-post.py --next --post                       # pin next, cycle all
"""
import json, os, sys, subprocess, argparse, urllib.request, urllib.error

SITE = "https://thinkcollegelevel.com"
API = "https://api.pinterest.com/v5"
HERE = os.path.dirname(__file__)
STATE = os.path.join(HERE, ".pin-posted")
BOARD_FILE = os.path.join(HERE, ".pinterest-board")
BOARD_NAME = "IB & University Admissions Guides"
BOARD_DESC = "Honest, specific guides to the IB Diploma and UK, US & Hong Kong university admissions — by an incoming Cambridge student."

def kc(s):
    return subprocess.run(["security", "find-generic-password", "-s", s, "-w"],
                          capture_output=True, text=True).stdout.strip()

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method,
                                 headers={"Authorization": f"Bearer {kc('pinterest-access-token')}",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"error": "unparseable"}

def ensure_board():
    if os.path.exists(BOARD_FILE):
        bid = open(BOARD_FILE).read().strip()
        if bid:
            return bid
    code, data = api("GET", "/boards?page_size=25")
    if code == 200:
        for b in data.get("items", []):
            if b.get("name") == BOARD_NAME:
                open(BOARD_FILE, "w").write(b["id"])
                return b["id"]
    code, data = api("POST", "/boards", {"name": BOARD_NAME, "description": BOARD_DESC, "privacy": "PUBLIC"})
    if code in (200, 201) and data.get("id"):
        open(BOARD_FILE, "w").write(data["id"])
        print(f"created board {data['id']}")
        return data["id"]
    print(f"board create failed {code}: {data}")
    return None

def hooks(g):
    base = {
        "how-to-get-a-45-in-the-ib": "I got a predicted 45 in the IB from an international school in Tokyo. The subject-by-subject playbook — no secret formula, just the system.",
        "cambridge-personal-statement-guide": "How I wrote a Cambridge HSPS personal statement from Tokyo that earned an offer. The UK statement is 80% academic.",
        "cambridge-hsps-interview-guide": "What the Cambridge HSPS interview actually tests, and how I prepped for it from an international school.",
    }
    return base.get(g["slug"], g.get("metaDescription") or g["title"])

def compose(g):
    url = f"{SITE}/guides/{g['slug']}/"
    img = f"{SITE}/cards/{g['slug']}.png"
    title = g["title"][:100]
    desc = f"{hooks(g)}\n\nRead the full guide → {url}\n\n#IBDP #UniversityAdmissions #StudyTips"[:800]
    return title, desc, url, img

def post_pin(g, board_id):
    title, desc, link, img = compose(g)
    body = {"board_id": board_id, "title": title, "description": desc, "link": link,
            "media_source": {"source_type": "image_url", "url": img}}
    return api("POST", "/pins", body)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug"); ap.add_argument("--latest", action="store_true")
    ap.add_argument("--next", action="store_true", help="pin next un-posted guide; cycles when all done")
    ap.add_argument("--post", action="store_true")
    a = ap.parse_args()
    guides = json.load(open(os.path.join(HERE, "guides-data.json")))
    if a.next:
        posted = set(open(STATE).read().split()) if os.path.exists(STATE) else set()
        remaining = [x for x in guides if x["slug"] not in posted]
        if not remaining:
            open(STATE, "w").close(); remaining = guides
        g = remaining[0]
    else:
        g = (next((x for x in guides if x["slug"] == a.slug), None) if a.slug
             else guides[-1] if a.latest else guides[0])
    if not g:
        print("guide not found"); sys.exit(1)
    title, desc, link, img = compose(g)
    print(f"--- pin · {g['slug']} ---\ntitle: {title}\nimage: {img}\nlink:  {link}\ndesc:  {desc[:120]}...\n---")
    if a.post:
        board_id = ensure_board()
        if not board_id:
            sys.exit(1)
        code, resp = post_pin(g, board_id)
        print(f"PIN {code}: {str(resp)[:300]}")
        if code in (200, 201) and a.next:
            with open(STATE, "a") as f:
                f.write(g["slug"] + "\n")
            print(f"recorded {g['slug']} ({len(open(STATE).read().split())}/{len(guides)} pinned)")
    else:
        print("(dry-run; pass --post to publish)")

if __name__ == "__main__":
    main()
