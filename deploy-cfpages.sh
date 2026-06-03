#!/usr/bin/env bash
# Deploy thinkcollegelevel.com to Cloudflare Pages.
# GitHub Pages path is dead (account flagged 2026-05-27). This is the canonical deploy.
set -euo pipefail

cd "$(dirname "$0")"

PROJECT=thinkcollegelevel
ACCOUNT=437d904c6bd5be706a4bf4cf94cb880b
DIST=$(mktemp -d)

# Build static site in-place (build.mjs writes HTML next to sources).
node build.mjs

# Assemble clean dist: site files only, no repo/dev cruft.
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.github' \
  --exclude='build.mjs' \
  --exclude='site-data.mjs' \
  --exclude='package.json' \
  --exclude='package-lock.json' \
  --exclude='deploy-cfpages.sh' \
  --exclude='*.md' \
  --exclude='.gitignore' \
  --exclude='.gitattributes' \
  --exclude='.gbrain-source' \
  --exclude='CNAME' \
  --exclude='LICENSE' \
  ./ "$DIST/"

export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s cloudflare-api-token -w)"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT"

wrangler pages deploy "$DIST" --project-name "$PROJECT" --branch main --commit-dirty=true

rm -rf "$DIST"
echo "Deployed. Live: https://thinkcollegelevel.com  (preview: https://$PROJECT.pages.dev)"
