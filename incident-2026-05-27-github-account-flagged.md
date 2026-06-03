---
type: concept
title: GitHub account imjusthoward flagged/suspended (2026-05-27)
date: '2026-05-27T00:00:00.000Z'
status: appeal-pending
ingested_via: 'mcp:put_page'
ingested_at: '2026-06-01T22:29:55.611Z'
source_kind: 'mcp:put_page'
tags:
  - blocker
  - github
  - incident
  - oauth
  - salvage
  - security
  - suspension
---

# GitHub account flagged — imjusthoward

- **Account:** `imjusthoward` (chakhanghowardchan2008@gmail.com), created 2026-02-08.
- **Flagged:** 2026-05-27. Appeal sent, awaiting GitHub response (as of 2026-06-02 still pending).
- **Impact:** account suspended → **any "Sign in with GitHub" OAuth login is dead** while suspended (e.g. DigitalOcean login fails — this is the cause, NOT an OAuth-revoke). Pushing to github.com blocked.

## Repos at flag time (13)
Public (8): quant-pipeline, imjusthoward (profile), claude-flywheel, ThinkCollegeLevel, HireVue-Preparation, Card-Reselling-Optimization, tcg-arb-scanner, prediction-market-edge.
Private (5): howard-os, gstack-artifacts-imjusthoward, lead-engine, crystalcentury-site, elevateos-reputation.
Local-only (7, mirror-backed, never pushed to GH): CrystalCentury, ElevateOS, Katalyst, Pulse-Manila-26, elevateos-backend, kiwanis-coordination, pt-backend.

## Salvage (done 2026-05-27)
`~/github-salvage/` — `mirrors/` (20 bare `git clone --mirror`), `bundles/` (portable git bundles), `metadata/` (repo JSON via gh api), tarball `imjusthoward-github-salvage-20260527-2103.tar.gz`. LaunchAgent `com.imjusthoward.salvage-mirror` keeps mirrors fresh. GitLab/mirror push scripts present (push-gitlab.sh, push-mirrors.sh, sync-mirrors.sh). APPEAL.md drafted.

## Recurring-context note
This incident was NOT in gbrain on 2026-06-02 (search returned empty) → transcript/SOT sync was not surfacing it, causing repeated re-explanation by Howard. Sync gap to fix.
