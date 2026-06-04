# Distribution reconciliation — ThinkCollegeLevel ↔ PriorMoves

_Written 2026-06-04. Reconciles the two owned distribution stacks so they share one
toolkit and cross-amplify instead of duplicating code and colliding on credentials._

## The two stacks today

| | **ThinkCollegeLevel** (`~/repos/ThinkCollegeLevel`) | **PriorMoves** (`~/repos/super-investor-mirror`) |
|---|---|---|
| Product | IB / admissions guides (25) | 13F super-investor mirror, daily digest |
| Channels | X, Bluesky, Mastodon, Pinterest | X (threads), Reddit, Substack, RSS |
| Posters | stdlib OAuth1/stdlib, cycle-state `.posted`, daily crontab | `build_social.py` + `substack_publish.py` + `reddit_post.py`, semi-manual publish |
| Images | **Playwright** cards (real Newsreader/Source Serif, 1000×1500) | **PIL** OG image (`build_social.build_og`, logo + fonts) |
| Email list | ❌ none | ✅ Substack (`priormoves.substack.com`) |
| Feed | sitemap only | ✅ `digest.xml` RSS |
| Creds | keychain `x-api-*`, `bluesky-*`, `mastodon-*`, `pinterest-*` | keychain `x-api-*` (**same slots**), `substack-*` |

## Key finding — X credential collision
Both repos' X posters read the identical keychain slots `x-api-key/secret`,
`x-access-token/secret` → **both post to @imjusthoward**. Decision required:

- **A) Shared personal hub** — keep one account; both brands flow through @imjusthoward.
  Simple, but mixes finance + admissions audiences on one feed.
- **B) Namespaced brand accounts** (recommended) — separate @ accounts; namespace the
  slots `tcl-x-*` and `pm-x-*` (extend to all channels: `<brand>-<channel>-*`).
  Clean separation, each audience coherent.

## Reconciliation (merge the toolkits)
1. **Shared `socialkit`** both repos import (a `~/repos/socialkit` package or `~/bin`):
   posters for X · Bluesky · Mastodon · Pinterest · Reddit · Substack, plus one
   Playwright card engine. Deletes the duplicate `x_post.py`.
2. **Namespace credentials**: `get_secret(brand, channel, field)` → keychain
   `<brand>-<channel>-<field>`. Resolves the collision above.
3. **One image engine**: standardize on TCL's Playwright `gen-cards.mjs` (real fonts,
   higher fidelity than PIL), themed per brand (TCL paper/evergreen; PriorMoves
   dark/finance + `logo-256.png`).
4. **Unify scheduling**: per-brand `cron_daily` calls socialkit `post --next` per
   channel, staggered (TCL already does this; PriorMoves social is currently
   semi-manual — adopt the cycle-state pattern).

## Amplification (cross-pollinate channels)
- **TCL gains from PriorMoves**: Reddit poster (r/IBO, r/6thForm, r/ApplyingToCollege),
  **Substack** (TCL has no email list — biggest gap), **RSS `/feed.xml`** (Google
  Discover + Flipboard pull).
- **PriorMoves gains from TCL**: **Bluesky + Mastodon** (free reach it lacks today),
  plus the auto-cycling poster pattern (its social is build-then-manual-publish).
- **Both**: cross-promote via the `howardchan.me` hub; the "Network" footer already
  links elevateos / tatemori / priormoves / nobill / crystalcentury (added 2026-06-04).

## Quick-win order
1. Decide X account topology (A vs B) — blocks credential namespacing.
2. Port `substack_publish.py` → give TCL a Substack (email + a real RSS).
3. Port TCL Bluesky/Mastodon posters → PriorMoves (free reach).
4. Extract `socialkit`; delete duplicate `x_post.py`.
5. One Playwright card engine, two themes.
