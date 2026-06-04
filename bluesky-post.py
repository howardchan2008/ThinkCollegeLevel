#!/usr/bin/env python3
"""Auto-post a Think College Level guide to Bluesky (AT Protocol, stdlib only).
Creds from macOS Keychain: bluesky-handle, bluesky-app-password.
  python3 bluesky-post.py --slug how-to-get-a-45-in-the-ib       # dry-run (default)
  python3 bluesky-post.py --next --post                          # post next, cycle all
"""
import json, os, sys, subprocess, argparse, urllib.request, urllib.error, datetime

SITE = "https://thinkcollegelevel.com"
PDS = "https://bsky.social"
HERE = os.path.dirname(__file__)
STATE = os.path.join(HERE, ".bsky-posted")

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
    limit, sep = 300, "\n\n"  # Bluesky: 300 graphemes, URL counts full length
    if len(hook) + len(sep) + len(url) > limit:
        hook = hook[:limit - len(sep) - len(url)].rstrip()
    return f"{hook}{sep}{url}", url

def jpost(url, data, headers):
    req = urllib.request.Request(url, data=json.dumps(data).encode(),
                                 headers={**headers, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def upload_blob_bsky(jwt, path):
    data = open(path, "rb").read()
    req = urllib.request.Request(f"{PDS}/xrpc/com.atproto.repo.uploadBlob", data=data, method="POST",
                                 headers={"Authorization": f"Bearer {jwt}", "Content-Type": "image/png"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def post_bsky(text, url, slug, alt):
    handle, pw = kc("bluesky-handle"), kc("bluesky-app-password")
    if not handle or not pw:
        return 0, "missing keychain creds (bluesky-handle / bluesky-app-password)"
    code, sess = jpost(f"{PDS}/xrpc/com.atproto.server.createSession",
                       {"identifier": handle, "password": pw}, {})
    if code != 200:
        return code, f"createSession failed: {sess}"
    jwt, did = sess["accessJwt"], sess["did"]
    # facet so the URL renders as a clickable link (byte offsets, UTF-8)
    b, ub = text.encode("utf-8"), url.encode("utf-8")
    start = b.find(ub)
    rec = {"$type": "app.bsky.feed.post", "text": text,
           "createdAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")}
    if start >= 0:
        rec["facets"] = [{"index": {"byteStart": start, "byteEnd": start + len(ub)},
                          "features": [{"$type": "app.bsky.richtext.facet#link", "uri": url}]}]
    img = os.path.join(HERE, "cards", f"{slug}.png")
    if os.path.exists(img):
        bc, blob = upload_blob_bsky(jwt, img)
        if bc == 200 and isinstance(blob, dict) and blob.get("blob"):
            rec["embed"] = {"$type": "app.bsky.embed.images",
                            "images": [{"alt": alt, "image": blob["blob"]}]}
        else:
            print(f"(bsky blob upload {bc}: {str(blob)[:140]}; posting without image)")
    return jpost(f"{PDS}/xrpc/com.atproto.repo.createRecord",
                 {"repo": did, "collection": "app.bsky.feed.post", "record": rec},
                 {"Authorization": f"Bearer {jwt}"})

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
    text, url = compose(g)
    alt = f"{g['title']} — a Think College Level guide"
    print(f"--- bsky post ({len(text)} chars) · {g['slug']} ---\n{text}\n---")
    if a.post:
        code, resp = post_bsky(text, url, g["slug"], alt)
        print(f"POST {code}: {str(resp)[:300]}")
        if code == 200 and a.next:
            with open(STATE, "a") as f:
                f.write(g["slug"] + "\n")
            print(f"recorded {g['slug']} ({len(open(STATE).read().split())}/{len(guides)} posted)")
    else:
        print("(dry-run; pass --post to publish)")

if __name__ == "__main__":
    main()
