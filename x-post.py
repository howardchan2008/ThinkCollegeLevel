#!/usr/bin/env python3
"""Auto-post a Think College Level guide to X/Twitter (OAuth1, stdlib only).
Creds from macOS Keychain: x-api-key, x-api-secret, x-access-token, x-access-secret.
  python3 x-post.py --slug how-to-get-a-45-in-the-ib            # dry-run (default)
  python3 x-post.py --slug how-to-get-a-45-in-the-ib --post     # actually post
  python3 x-post.py --latest --post
"""
import json, os, sys, time, hmac, hashlib, base64, urllib.parse, urllib.request, subprocess, argparse, secrets

SITE = "https://thinkcollegelevel.com"
HERE = os.path.dirname(__file__)
STATE = os.path.join(HERE, ".x-posted")
def kc(s):
    return subprocess.run(["security", "find-generic-password", "-s", s, "-w"],
                          capture_output=True, text=True).stdout.strip()

def hooks(g):
    """A value-first hook per guide (<=200 chars, room for URL)."""
    t = g["title"]
    md = g.get("metaDescription", "")
    base = {
        "how-to-get-a-45-in-the-ib": "I got a predicted 45 in the IB from an international school in Tokyo. The subject-by-subject playbook — no secret formula, just the system:",
        "cambridge-personal-statement-guide": "How I wrote a Cambridge HSPS personal statement from Tokyo that earned an offer. The UK statement is 80% academic — here's the process:",
        "cambridge-hsps-interview-guide": "What the Cambridge HSPS interview actually tests, and how I prepped for it from an international school:",
    }
    return base.get(g["slug"], f"{t} — written from an international school in Tokyo by an incoming Cambridge student:")

def compose(g):
    url = f"{SITE}/guides/{g['slug']}/"
    hook = hooks(g)
    text = f"{hook}\n\n{url}"
    if len(text) > 280:  # X counts URL as 23
        budget = 280 - 23 - 2
        hook = hook[:budget].rstrip()
        text = f"{hook}\n\n{url}"
    return text

def oauth1_header(method, url, params, ck, cs, tok, ts):
    oauth = {
        "oauth_consumer_key": ck, "oauth_token": tok,
        "oauth_signature_method": "HMAC-SHA1", "oauth_version": "1.0",
        "oauth_timestamp": str(int(time.time())),
        "oauth_nonce": secrets.token_hex(16),
    }
    allp = {**params, **oauth}
    base = "&".join([method, urllib.parse.quote(url, ""),
                     urllib.parse.quote("&".join(f"{urllib.parse.quote(k,'')}={urllib.parse.quote(str(v),'')}"
                                                  for k, v in sorted(allp.items())), "")])
    key = f"{urllib.parse.quote(cs,'')}&{urllib.parse.quote(ts,'')}"
    sig = base64.b64encode(hmac.new(key.encode(), base.encode(), hashlib.sha1).digest()).decode()
    oauth["oauth_signature"] = sig
    return "OAuth " + ", ".join(f'{urllib.parse.quote(k,"")}="{urllib.parse.quote(v,"")}"' for k, v in oauth.items())

def upload_media_x(path, ck, cs, tok, ts):
    data = open(path, "rb").read()
    boundary = "----tcl" + secrets.token_hex(8)
    body = f'--{boundary}\r\nContent-Disposition: form-data; name="media"; filename="card.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
    body += data + f"\r\n--{boundary}--\r\n".encode()
    url = "https://upload.twitter.com/1.1/media/upload.json"
    hdr = oauth1_header("POST", url, {}, ck, cs, tok, ts)
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Authorization": hdr, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def post_tweet(text, slug):
    ck, cs = kc("x-api-key"), kc("x-api-secret")
    tok, ts = kc("x-access-token"), kc("x-access-secret")
    media_ids = []
    img = os.path.join(HERE, "cards", f"{slug}.png")
    if os.path.exists(img):
        mc, mr = upload_media_x(img, ck, cs, tok, ts)
        if mc == 200 and isinstance(mr, dict) and mr.get("media_id_string"):
            media_ids = [mr["media_id_string"]]
        else:
            print(f"(x media upload {mc}: {str(mr)[:140]}; posting text-only)")
    url = "https://api.twitter.com/2/tweets"
    payload = {"text": text}
    if media_ids:
        payload["media"] = {"media_ids": media_ids}
    hdr = oauth1_header("POST", url, {}, ck, cs, tok, ts)
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Authorization": hdr, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode()
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
        if not remaining:  # cycle: all posted, start over
            open(STATE, "w").close(); remaining = guides
        g = remaining[0]
    else:
        g = (next((x for x in guides if x["slug"] == a.slug), None) if a.slug
             else guides[-1] if a.latest else guides[0])
    if not g:
        print("guide not found"); sys.exit(1)
    text = compose(g)
    print(f"--- tweet ({len(text)} chars) · {g['slug']} ---\n{text}\n---")
    if a.post:
        code, resp = post_tweet(text, g["slug"])
        print(f"POST {code}: {resp[:300]}")
        if code == 201 and a.next:
            with open(STATE, "a") as f:
                f.write(g["slug"] + "\n")
            print(f"recorded {g['slug']} ({len(open(STATE).read().split())}/{len(guides)} posted)")
    else:
        print("(dry-run; pass --post to publish)")

if __name__ == "__main__":
    main()
