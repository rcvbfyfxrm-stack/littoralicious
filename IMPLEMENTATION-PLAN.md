# Littoralicious — Implementation Plan

Created 2026-04-23. Companion plan for EducatedTraveler lives in `../educatedtraveler/IMPLEMENTATION-PLAN.md`.

## Why this plan exists

Audit on 2026-04-23 found:
- 29 articles published, **73 drafts stuck in `content/review/`** with no approval gate.
- Metadata is triplicated (template frontmatter → `data/articles.json` → HTML `<meta>`).
- Sitemap/feed drift is already a tracked issue; `make sitemap` must be run manually.
- Port Call drafts freeze at `[VERIFY from WhatsApp]` because supplier data is buried in prose.
- No banned-word / voice / word-count lint. `dispatches[]` in `articles.json` is empty (0 weekly briefs shipped).
- 100% blind publishing (no analytics, no engagement loop).

Most of this is fixable with a small handful of tools that convert the project from "artisanal HTML authoring" to "markdown-in → HTML-out with lint".

## Priority tiers

### Tier 1 — Biggest toil reduction (build first)

| ID | Name | Status | Files |
|----|------|--------|-------|
| L1 | `/publish-article` skill | scaffolded 2026-04-23 | `.claude/skills/publish-article.md`, `scripts/md-to-html.py` |
| L2 | DNA lint agent + pre-publish hook | scaffolded 2026-04-23 | `.claude/agents/dna-lint.md`, `scripts/dna-lint.py` |
| L3 | Structured supplier DB | scaffolded 2026-04-23 | `data/suppliers.json` |
| L4 | Review dashboard | scaffolded 2026-04-23 | `scripts/build-review-dashboard.py`, `logs/review-status.html` |

### Tier 2 — Strong ROI

| ID | Name | Status | Files |
|----|------|--------|-------|
| L5 | Weekly Brief cron | **scaffolded 2026-04-23** — install plist to enable | `NEXUS/scripts/automations/littoralicious-weekly.sh`, `com.arnaud.littoralicious-weekly.plist` |
| L6 | WhatsApp export → intel pipeline | **scaffolded 2026-04-23** — ready for next export | `scripts/ingest-whatsapp.py` |
| L7 | Category page generator | **live** — shore-larder pilot works, 4 pages need markers added (multi-section layout decision) | `scripts/regen-category-pages.py`, `make pages` |
| L8 | Link checker | **live** | `scripts/check-links.py`, `make links` |
| L13 | articles.json validator | **live** — caught 1 orphan on first run (now fixed) | `scripts/validate-articles-json.py`, `make validate` |

## Enabling the weekly brief cron

```bash
cp NEXUS/scripts/automations/com.arnaud.littoralicious-weekly.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.arnaud.littoralicious-weekly.plist
```

First run fires next Monday at 06:00 local. Output lands in `content/review/weekly-brief-YYYY-WW.md` for Tuesday review.

### Tier 3 — Polish

| ID | Name | Notes |
|----|------|-------|
| L9 | Reader analytics | GoatCounter or Plausible. Privacy-first. First real engagement signal. |
| L10 | Article → PDF bundler | Extend `scripts/render-recipe-card.sh` from recipes to full articles. Real galley use-case (offline reading mid-charter). |
| L11 | Banned-image lint | Enforce "no stock photography" rule via perceptual hash against a known-stock-photo db. Low priority. |
| L12 | Buttondown workflow polish | `newsletter.sh` exists and posts drafts. Add: tag targeting, schedule-on-publish, read-rate pull-back into `data/articles.json`. |

## File layout after Tier 1

```
littoralicious/
├── .claude/
│   ├── agents/
│   │   ├── article.md              (existing)
│   │   ├── dna-lint.md             NEW — L2
│   │   └── weekly-brief.md         (existing)
│   └── skills/
│       └── publish-article.md      NEW — L1
├── data/
│   ├── articles.json               (existing)
│   └── suppliers.json              NEW — L3
├── logs/
│   └── review-status.html          NEW — L4 (generated)
├── scripts/
│   ├── build-review-dashboard.py   NEW — L4
│   ├── dna-lint.py                 NEW — L2
│   ├── md-to-html.py               NEW — L1
│   ├── newsletter.sh               (existing)
│   ├── regen-sitemap-feed.py       (existing)
│   └── render-recipe-card.sh       (existing)
└── Makefile                        EDITED — new targets: publish, lint, status
```

## Hooks & invocation

- `make lint FILE=content/review/foo.md` — run DNA lint on one file.
- `make publish FILE=content/review/foo.md` — lint → if pass, `md-to-html.py` → append to `articles.json` → `make sitemap` → move md to `content/published/`.
- `make status` — regen `logs/review-status.html` and open it.
- Optional SessionEnd hook: regen review dashboard so it's always fresh the next session.

## Non-goals (explicit)

- No static-site generator. Hand-authored HTML stays. The publish tool generates an HTML file once; further editing is manual, per existing ethos.
- No database. `data/articles.json` + flat files remain the source of truth.
- No build step. The site must keep deploying via `git push main` with zero pipeline.

## Success metric

Publishing an article currently takes ~90 min (write, translate to HTML, update JSON, update sitemap, update category page). Target after Tier 1: **≤15 min** (write markdown, run `make publish`, review generated HTML, commit).
