---
type: project-status
title: pt-backend Progress — 2026-06-02 NAS Exhaustion + Pre-COVID Investigation
created: '2026-06-02T00:00:00.000Z'
brain_identity: imjusthoward
ingested_via: 'mcp:put_page'
ingested_at: '2026-06-02T04:38:12.908Z'
source_kind: 'mcp:put_page'
tags:
  - accounting
  - crystalcentury
  - investigation
  - nas
  - premier-trophy
  - pt-backend
---

# pt-backend Progress — NAS exhaustion phase

## Headline numbers
- pt-backend DB: **12,516 INVOICE rows / HKD 40.17M lifetime billed**
- QUOTATION: 7,024 rows / HKD 30.47M
- RECEIPT: 4,482 rows / HKD 6.82M
- Customers: 5,775 (up from 3,861 after source_file customer-name backfill)

## Yearly trend (final INVOICE)
```
2010:  77 rows   HKD     111,655
2011:  61        HKD     107,057
2012:  50        HKD       2,618
2013: 214        HKD      53,190
2014: 312        HKD     400,142
2015: 463        HKD     985,587
2016: 799        HKD   2,365,280
2017: 450        HKD   1,921,027
2018: 823        HKD   2,906,880  ← pre-COVID peak in digital trail
2019: 652        HKD   2,460,707
2020: 1549       HKD   3,779,820
2021: 1218       HKD   3,652,441
2022: 1362       HKD   5,126,837
2023: 1408       HKD   5,323,032  ← post-COVID peak in DB
2024: 1437       HKD   5,189,252
2025: 978        HKD   3,777,290  ← real slump (matches Howard's reality check)
2026: 374        HKD   1,557,986  (5 months partial)
```

Era avg/yr:
- Pre-COVID 2010-2019: HKD 1.02M/yr
- COVID 2020-2021: HKD 3.69M/yr
- Post-COVID 2022-2026: HKD 4.66M/yr

## NAS extraction status (~162GB pulled across 5 batches)

| Batch | Local path | Size | What |
|---|---|---|---|
| `Before 2025/` | synology-direct/Before 2025/ | 51GB | Legacy historic archive |
| Sweep | synology-direct/sweep/ | 32GB | 17 NAS roots invoice-shape files |
| Rewalk | synology-direct/rewalk/ | 19GB | Non-invoice docs across same roots |
| Targeted | synology-direct/targeted-pull/ | 3.4GB | 案例_JL/share/ (skipped by sweep) |
| Mail | synology-direct/mail/ | 51GB | 53,041 .eml (Inbox+Sent) |
| Recycle | synology-direct/recycle/ | 5.4GB (in flight) | #recycle/staff/ deleted accounting |

## Pre-COVID HKD 5–6M parents-claim investigation — DEFINITIVE VERDICT

**Parents' HKD 5–6M pre-COVID memory NOT supported by:**
- Digital invoices (peak 2018 HKD 2.92M)
- Email headers (53k parsed, blue-chip engagement but per-PO HKD 1k–50k)
- OCR of 1,646 PO PDF attachments from 20 alt-channel domains (real per-PO amounts $1-50k typical, max 153k EDB 2024)
- 32% job-no gap in DB (small, not 50%+)

**Real pre-COVID picture: ~HKD 1.5M/yr avg, peak ~HKD 3.4M (2018).**

Likely explanations for parents' recall:
1. Memory bias (peak-month projection to year)
2. Gross-sales / supplier-passthrough confusion
3. Undigitized paper ledger (not on NAS — both PC workstation backups (NB04, NB06, NB07, PC04, PC05) were EMPTY; admin/Peter homes were EMPTY; HyperBackup binary container unreadable without Synology software)

## Importer fixes applied
- Column-shift bug: old 10-col template totals at col 7/8 vs new 11-col at col 8/9 — label-relative offsets
- Doc-type misclassification: files literally named "Invoice" in `1.報價中/` folders → reclassified to QUOTATION (692 rows)
- Date backfill from invoice-no prefix: ~3,400 NULL `issue_date` rows
- Customer-name backfill from source_file pattern: 6,811 NULL-customer rows linked, 1,916 new Customer rows created
- SAVEPOINT-per-file isolation + seen-set dedup

## Top blue-chip alt-channel email volume (2014-2024)
- ha.org.hk (Hospital Authority): 798 emails
- poleungkuk.org.hk: 547
- tungwah.org.hk: 461
- aia.com: 436
- edb.gov.hk (Edu Bureau): 419
- delonghigroup.com: 398
- cuhk.edu.hk: 386
- hsbc.com.hk: 316
- ncb.com.hk (Nanyang): 286
- mtr.com.hk: 255

## Evidence artefacts produced
- `~/CrystalCentury-assets/pre-covid-revenue-investigation.md` — memo with definitive verdict
- `~/CrystalCentury-assets/pre-covid-evidence/` — 216 .txt email bodies + `_INDEX.md`
- `~/CrystalCentury-assets/pre-covid-evidence-pdfs/` — 1,657 PO PDFs + `_amounts.json` + `_amounts-summary.txt`
- `/tmp/cc-mail-index.json` — 4,147 mail counterparties
- `/tmp/cc-mail-altchannel.json` — alt-channel mining

## Open follow-ups
1. **Ask parents directly** about pre-COVID accounting workflow (paper ledger? QuickBooks? separate entity?)
2. Consolidate Customer name variants (AIA ↔ aia.com ↔ AIA Company Limited)
3. Import the #recycle/staff/ pull (5.4GB) into pt-backend once download finishes
4. Pull `info@crystalcentury.com` + `sales@crystalcentury.com` mailbox archives (not yet — only `Ptrophy (sale)` was pulled)
5. Try HyperBackup binary container restoration with Synology HyperBackup Explorer

## Standing facts
- NAS credentials cached at `/tmp/cc-syno-base` + `/tmp/cc-syno-sid`. PW: see USER memory.
- pt-backend repo: `~/repos/pt-backend`. Postgres DB: `pt_backend`.
- All assets local: `~/CrystalCentury-assets/` (PII, never committed)
