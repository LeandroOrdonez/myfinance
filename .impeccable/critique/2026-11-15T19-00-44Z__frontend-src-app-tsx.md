---
target: the analytics page
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/home/leandro/code/myfinance/frontend/src/App.tsx"
target_fingerprint: "sha256:0cf2a61662574889e9f312872a5db165c3391bf3da5529925602c38fae8678fa"
target_path: /home/leandro/code/myfinance/frontend/src/App.tsx
timestamp: 2026-11-15T19-00-44Z
slug: frontend-src-app-tsx
---
# Critique: `/analytics` (AnalyticsDashboard)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Inconsistent loading; CategoryTrends renders null on empty; per-card period invisible |
| 2 | Match System / Real World | 3 | "Cash Flow Trends" shows averages; unexplained %/€ toggles |
| 3 | User Control and Freedom | 2 | Period selections reset each visit; no reset-all |
| 4 | Consistency and Standards | 1 | Three period paradigms; PERIODS duplicated x5; shared PeriodSelector/DashboardCard unused; same concept different colors |
| 5 | Error Prevention | 3 | Read-only; fake "No Data" treemap node misleads |
| 6 | Recognition Rather Than Recall | 2 | Per-card period state must be recalled; icon-only buttons via title |
| 7 | Flexibility and Efficiency | 2 | Hidden legend toggles; no cross-card filter linking or export |
| 8 | Aesthetic and Minimalist Design | 1 | ~30 controls, 9 dense charts, 5 overlapping category surfaces |
| 9 | Error Recovery | 2 | Plain error text, no retry, error duplicated x4 |
| 10 | Help and Documentation | 1 | No definitions: savings rate, essential vs discretionary unexplained |
Total: 19/40 — Poor

## Design Specificity Verdict
Component-catalog dashboard UI, not an authored personal-finance experience. Flat space-y-6 stack of 9 self-contained chart cards; no page title, shared filter context, or narrative. CashFlows Sankey is the one finance-authored artifact — mislabeled "Cash Flow Trends" (shows monthly averages). Detector scan: 0 findings (source scan; all issues are structural/experiential).

## Priority Issues
- [P0] Period chaos — 5 duplicated PERIODS arrays, 3 incompatible vocabularies, uncoordinated per-card state. Fix: hoist period to AnalyticsDashboard, use shared PeriodSelector once in page header. -> /impeccable layout
- [P0] Category-surface redundancy — 5 surfaces answer "where did money go" (CategoryBreakdown, CategoryTrends, CategoryTimeseries, ExpenseTypeTimeseries, CategoryAverages). Fix: keep Breakdown + ExpenseTypeTimeseries; fold Averages into Breakdown summary; retire/merge CategoryTrends. -> /impeccable distill
- [P1] Charts invisible to AT/touch — no aria-label or table fallback; heatmap/Sankey/treemap rely on title/hover; ~24px targets. -> /impeccable adapt then /impeccable audit
- [P1] Silent/misleading states — CategoryTrends returns null on empty; error duplicated x4; fake No Data node; no retry. Fix: DashboardCard + shared ChartState. -> /impeccable harden
- [P2] Dark-mode bug + fragmentation — CashFlows.tsx:126 hard-coded fill invisible in dark; three card dialects; dark: vs CSS-var tokens. -> /impeccable polish

## Persona Red Flags
- Alex: 5 period selectors to align one window; drill path exists in data model but not UI; no export.
- Sam: bare recharts SVG, no semantics; heatmap cells are divs with title-only data; icon-only toggles via title.
- Casey: ~24-28px period targets; 12-across heatmap dead on touch; Sankey labels clip at 375px.

## Minor Observations
FinancialTrends decorative icon; CategoryBreakdown emerald header on expenses tab; heatmap legend conflates less/negative; calculateChange returns +0.0% when prior is 0; CategoryAverages repeats chart top 5; early-year averages noisy.

## Strengths
Privacy mode systemic via formatPrivateAmount; CashFlows Sankey authored and finance-native; solid primitives (DashboardCard, PeriodSelector, Radix) exist but are unused.
