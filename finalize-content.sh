#!/bin/bash
# Orchestrate the TCL content refresh once both local-model batches finish.
# Howard eyeballed/approved -> deploys PRODUCTION (CF Pages main) + pushes source
# to howardchan2008/ThinkCollegeLevel. Model-free except the batches it waits on.
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$PATH"
LOG=.research/finalize.log
say(){ echo "$(date '+%H:%M:%S') $*" >> "$LOG"; }
say "finalize(production) start"

# 1-2. wait for both local-model batches
until grep -q '^DONE:' .research/personalize.log 2>/dev/null; do sleep 60; done
say "personalize DONE"
until grep -q '^DONE:' .research/new-content.log 2>/dev/null; do sleep 30; done
say "new-content DONE"

# 3. merge new guides + 4. heroes for new slugs
python3 merge-new-guides.py >> "$LOG" 2>&1
python3 gen-heroes.py >> "$LOG" 2>&1

# 5. rebuild
node build.mjs >> "$LOG" 2>&1 && say "build OK" || { say "BUILD FAILED"; exit 1; }

# 6. deploy PRODUCTION (CF Pages main). rsync EXCLUDES .research + scripts + source.
DIST=$(mktemp -d)
rsync -a \
  --exclude='.git' --exclude='node_modules' --exclude='.github' \
  --exclude='.research' --exclude='*.mjs' --exclude='*.py' --exclude='*.sh' \
  --exclude='*.md' --exclude='package*.json' --exclude='.gitignore' \
  --exclude='.gitattributes' --exclude='.gbrain-source' --exclude='guides-data.json' \
  --exclude='topics-500.json' --exclude='.linkedin-posted.txt' --exclude='.*-posted' \
  ./ "$DIST/"
export CLOUDFLARE_API_TOKEN="$(security find-generic-password -s cloudflare-api-token -w)"
export CLOUDFLARE_ACCOUNT_ID="437d904c6bd5be706a4bf4cf94cb880b"
say "deploying PRODUCTION (branch main)..."
wrangler pages deploy "$DIST" --project-name thinkcollegelevel --branch main --commit-dirty=true >> "$LOG" 2>&1 \
  && say "PRODUCTION DEPLOYED -> https://thinkcollegelevel.com" || { say "DEPLOY FAILED"; rm -rf "$DIST"; exit 1; }
rm -rf "$DIST"

# 7. commit + push source to howardchan2008/ThinkCollegeLevel main (.research is gitignored)
git add guides-data.json assets/heroes build.mjs gen-heroes.py personalize-batch.py new-content-gen.py merge-new-guides.py finalize-content.sh .gitignore 2>>"$LOG"
git commit -q -m "content: de-homogenize 489 guides (local model) + 25 researched high-demand guides + branded hero/OG images

- per-guide unique intros + metas (gemma4:31b, zero Max), kills templated boilerplate
- 25 new high-intent guides (TMUA/ESAT/LNAT, score-conversion, TOK/CAS, Common App, ED-vs-EA)
- 1200x630 branded hero per guide wired as og:image + on-page hero" >>"$LOG" 2>&1
git push gh2008 main >> "$LOG" 2>&1 && say "pushed source to howardchan2008/ThinkCollegeLevel" || say "git push failed (non-fatal; site is live)"
say "finalize done"
