#!/usr/bin/env python3
"""One-time Pinterest OAuth — obtain a long-lived refresh token for automation.
Pinterest's manually-generated prod access tokens expire in 24h; a refresh token
(valid ~1 year) lets the poster mint a fresh access token before every run.

Keychain IN:  pinterest-app-id, pinterest-app-secret, pinterest-redirect-uri
Keychain OUT: pinterest-refresh-token

  python3 pinterest-oauth.py                 # print the authorize URL to open
  python3 pinterest-oauth.py --exchange CODE # exchange the redirected ?code= for tokens
"""
import os, sys, json, base64, subprocess, argparse, urllib.request, urllib.error, urllib.parse

SCOPES = "boards:read,boards:write,pins:read,pins:write"
TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"

def kc(s):
    return subprocess.run(["security", "find-generic-password", "-s", s, "-w"],
                          capture_output=True, text=True).stdout.strip()

def kc_set(s, v):
    subprocess.run(["security", "add-generic-password", "-U", "-a", os.environ["USER"], "-s", s, "-w", v],
                   check=True)

def authorize_url():
    cid, redir = kc("pinterest-app-id"), kc("pinterest-redirect-uri")
    if not cid or not redir:
        sys.exit("missing pinterest-app-id or pinterest-redirect-uri in keychain")
    q = urllib.parse.urlencode({"client_id": cid, "redirect_uri": redir,
                                "response_type": "code", "scope": SCOPES})
    return f"https://www.pinterest.com/oauth/?{q}"

def exchange(code):
    cid, sec, redir = kc("pinterest-app-id"), kc("pinterest-app-secret"), kc("pinterest-redirect-uri")
    basic = base64.b64encode(f"{cid}:{sec}".encode()).decode()
    body = urllib.parse.urlencode({"grant_type": "authorization_code", "code": code,
                                   "redirect_uri": redir}).encode()
    req = urllib.request.Request(TOKEN_URL, data=body, method="POST",
                                 headers={"Authorization": f"Basic {basic}",
                                          "Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"exchange failed {e.code}: {e.read().decode()[:300]}")
    rt = data.get("refresh_token")
    if not rt:
        sys.exit(f"no refresh_token in response: {data}")
    kc_set("pinterest-refresh-token", rt)
    print(f"stored pinterest-refresh-token ✓  (refresh expires in {data.get('refresh_token_expires_in','?')}s; "
          f"access token good for {data.get('expires_in','?')}s)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--exchange")
    a = ap.parse_args()
    if a.exchange:
        exchange(a.exchange.strip())
    else:
        print("1) Open this URL in your browser and approve:\n")
        print("   " + authorize_url())
        print("\n2) You'll be redirected to your redirect URI with ?code=XXXX in the address bar.")
        print("3) Copy XXXX and run:\n")
        print("   cd ~/repos/ThinkCollegeLevel && python3 pinterest-oauth.py --exchange XXXX")

if __name__ == "__main__":
    main()
