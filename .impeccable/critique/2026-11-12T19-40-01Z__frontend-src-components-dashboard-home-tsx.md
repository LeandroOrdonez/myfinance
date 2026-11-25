---
target: dashboard
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/leandro/code/myfinance/frontend/src/components/dashboard/Home.tsx"
target_fingerprint: "sha256:f985bca458ac20d6dc8e11d8a1f33fbbc95a3e84392b67c715a534189ce6e3fe"
target_path: /home/leandro/code/myfinance/frontend/src/components/dashboard/Home.tsx
timestamp: 2026-11-12T19-40-01Z
slug: frontend-src-components-dashboard-home-tsx
---
# Critique: Dashboard re-run (`/dashboard` → `frontend/src/components/dashboard/Home.tsx`)

Method: dual-agent (A: c3b6d149 · B: 69e9ef5a; detector ran clean on source-regex rules — DOM-level rules unavailable, no Chromium in this environment for URL scanning)

Mode: Operate. Judged against the confirmed job — "help me understand where my money goes."

## Prior P1 verification

| # | Fix claimed | Verdict |
|---|---|---|
| 1 | Spending-first layout | Mostly resolved — regression: category links don't filter |
| 2 | Privacy masking on narrative | Mostly resolved — outlier.reason and recommendation titles still leak |
| 3 | Mobile fragility | Resolved |
| 4 | Empty/error/import dead-ends | Resolved |
| 5 | Overstated certainty | Resolved |

## Design Health Score — 26/40 (was 14/40)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Distinct states + Retry; no refresh affordance |
| 2 | Match System / Real World | 3 | "This Period" silently means trailing 12 months |
| 3 | User Control and Freedom | 2 | No period selector; links land on unfiltered /transactions |
| 4 | Consistency and Standards | 2 | Financial Health is both route and tab; "Import" vs "Upload" label mismatch |
| 5 | Error Prevention | 3 | Staged confirm, shared validation |
| 6 | Recognition Rather Than Recall | 3 | Ranked amounts always visible |
| 7 | Flexibility and Efficiency | 2 | No period control; tab state not in URL |
| 8 | Aesthetic and Minimalist | 3 | Header widget duplicates HealthTab; anomaly surfaced twice |
| 9 | Error Recovery | 3 | Failure vs first-run separated; durable post-import step |
| 10 | Help and Documentation | 2 | Assumptions panel gained; score methodology unexplained |
| **Total** | | **26/40** | **Acceptable** |

## Design Specificity Verdict

LLM assessment: Now authored for the product's job — lead cards answer "where did my money go?" in the first viewport; import is a complete loop. Residual interchangeability in HealthTab's score grid.

Deterministic scan: 0 findings, regex-only coverage; DOM rules did not run (no Chromium for URL scanning).

Visual overlays: unavailable.

## What's Working

1. Lead surface answers the 30-second question without scrolling.
2. Import is a complete loop: validate → confirm → progress → durable result → review destination.
3. Real accessibility groundwork: roving-tabindex tablist, aria-pressed privacy, Radix drawer.

## Priority Issues

1. [P1] Category links are dead-ends — OverviewTab.tsx:104,120 and FileUpload.tsx:305 link to bare /transactions; no useSearchParams anywhere; TransactionFilters uses local state. Fix: /transactions?category=<id> + param handling, or drop link affordance. → /impeccable harden
2. [P1] "This Period" mislabels a 12-month sum — Home.tsx:56–61 sums monthly_trends over backend 12-month window. Fix: label "Last 12 Months" or add a real period selector. → /impeccable clarify
3. [P2] Privacy mask leaks narrative — outlier.reason (merchant account names) SpendingTab.tsx:140; recommendation title may contain "€1,000" OverviewTab.tsx:150. Fix: wrap in maskString(). → /impeccable harden
4. [P2] Prioritized action goes nowhere — "Review: {title}" is static text despite /financial-health route; empty state says "Import" but button says "Upload". Fix: Link to /financial-health; align naming. → /impeccable clarify
5. [P2] Duplicated surfaces — anomaly card in Overview + panel in Spending + /anomalies route; header Health/Net-Worth widget duplicates HealthTab. Fix: one anomaly teaser; drop/slim header widget. → /impeccable distill

## Persona Red Flags

First-time CSV importer: empty state points to "Import" but button says "Upload"; no sample CSV for ING/KBC-only parser; "skipped as duplicates" is client-estimated.

Monthly budget checker: "This Period" is a year; no month selector; category clicks don't filter; Budgets route has no dashboard link/signal.

## Minor Observations

- Home.tsx:123 — `if (!data) return null` yields blank page on resolved-empty response.
- Two "top categories" sources (expense_analysis vs transaction_summary) may disagree.
- SpendingTab hard-codes rose-*/slate-*/#f1f5f9 instead of theme tokens.
- HealthTab formats every non-emergency metric as value*100% — wrong for absolute metrics.
- Footer toLocaleDateString lacks explicit locale (en-IE used elsewhere).

## Questions to Consider

- If "Spent This Period" means "last 12 months," does the lead card answer the user's question?
- Was the clickable category list a feature, or a promise the navigation doesn't keep?
- Privacy mode hides € but leaves account strings and "€1,000" titles visible — what does the eye-off icon promise?
