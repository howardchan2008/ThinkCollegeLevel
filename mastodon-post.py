#!/usr/bin/env python3
"""Auto-post a Think College Level guide to Mastodon (stdlib only).
Creds from macOS Keychain: mastodon-instance, mastodon-access-token.
  python3 mastodon-post.py --slug how-to-get-a-45-in-the-ib      # dry-run (default)
  python3 mastodon-post.py --next --post                         # post next, cycle all
"""
import json, os, sys, subprocess, argparse, secrets, urllib.request, urllib.error

SITE = "https://thinkcollegelevel.com"
HERE = os.path.dirname(__file__)
STATE = os.path.join(HERE, ".masto-posted")
TAGS = "\n\n#IBDP #UniversityAdmissions #StudyTips"

def kc(s):
    return subprocess.run(["security", "find-generic-password", "-s", s, "-w"],
                          capture_output=True, text=True).stdout.strip()

def hooks(g):
    base = {
        "how-to-get-a-45-in-the-ib": "I got a predicted 45 in the IB from an international school in Tokyo. The subject-by-subject playbook — no secret formula, just the system:",
        "cambridge-personal-statement-guide": "How I wrote a Cambridge HSPS personal statement from Tokyo that earned an offer. The UK statement is 80% academic — here's the process:",
        "cambridge-hsps-interview-guide": "What the Cambridge HSPS interview actually tests, and how I prepped for it from an international school:",
    }
    return base.get(g["slug"], f'{g["title"]} — written from an international school in Tokyo by an incoming Cambridge student:')

def compose(g):
    url = f"{SITE}/guides/{g['slug']}/"
    hook = hooks(g)
    limit, sep = 500, "\n\n"  # Mastodon default 500 chars; URL counts as 23
    if len(hook) + len(sep) + 23 + len(TAGS) > limit:
        hook = hook[:limit - len(sep) - 23 - len(TAGS)].rstrip()
    return f"{hook}{sep}{url}{TAGS}"

def upload_media_masto(inst, tok, img_path, alt):
    data = open(img_path, "rb").read()
    boundary = "----tcl" + secrets.token_hex(8)
    body = bytearray()
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\n{alt}\r\n'.encode()
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="card.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
    body += data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"https://{inst}/api/v2/media", data=bytes(body), method="POST",
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def post_masto(text, slug, alt):
    inst, tok = kc("mastodon-instance"), kc("mastodon-access-token")
    if not inst or not tok:
        return 0, "missing keychain creds (mastodon-instance / mastodon-access-token)"
    inst = inst.replace("https://", "").replace("http://", "").strip("/")
    media_ids = []
    img = os.path.join(HERE, "cards", f"{slug}.png")
    if os.path.exists(img):
        mc, mr = upload_media_masto(inst, tok, img, alt)
        if mc in (200, 202) and isinstance(mr, dict) and mr.get("id"):
            media_ids = [mr["id"]]
        else:
            print(f"(media upload {mc}: {str(mr)[:140]}; posting text-only)")
    payload = {"status": text, "visibility": "public"}
    if media_ids:
        payload["media_ids"] = media_ids
    req = urllib.request.Request(
        f"https://{inst}/api/v1/statuses", data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug"); ap.add_argument("--latest", action="store_true")
    ap.add_argument("--next", action="store_true", help="post next un-posted guide; cycles when all done")
    ap.add_argument("--post", action="store_true")
    a = ap.parse_args()
    guides = json.load(open(os.path.join(os.path.dirname(__file__), "guides-data.json")))
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
    text = compose(g)
    alt = f"{g['title']} — a Think College Level guide"
    print(f"--- mastodon post ({len(text)} chars) · {g['slug']} ---\n{text}\n---")
    if a.post:
        code, resp = post_masto(text, g["slug"], alt)
        print(f"POST {code}: {str(resp)[:300]}")
        if code == 200 and a.next:
            with open(STATE, "a") as f:
                f.write(g["slug"] + "\n")
            print(f"recorded {g['slug']} ({len(open(STATE).read().split())}/{len(guides)} posted)")
    else:
        print("(dry-run; pass --post to publish)")

if __name__ == "__main__":
    main()
