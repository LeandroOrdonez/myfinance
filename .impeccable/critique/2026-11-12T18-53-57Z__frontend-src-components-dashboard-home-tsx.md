---
target: dashboard
total_score: 14
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
target_identity: "file:/home/leandro/code/myfinance/frontend/src/components/dashboard/Home.tsx"
target_fingerprint: "sha256:9970b614020cacba6e332661b372ce3b1cb550ad23c6abce76df8875e1d3668d"
target_path: /home/leandro/code/myfinance/frontend/src/components/dashboard/Home.tsx
timestamp: 2026-11-12T18-53-57Z
slug: frontend-src-components-dashboard-home-tsx
---
# Critique: Dashboard (`/dashboard` → `frontend/src/components/dashboard/Home.tsx`)

Method: dual-agent (A: d0c6c75c · B: 9e5f9ecf, with detector rerun in parent — B's exec was permission-denied; browser overlay unavailable, no browser automation tool in this harness)

Mode: Operate. Judged against the confirmed job — "help me understand where my money goes."

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading replaces the whole dashboard; permanent red notification dot |
| 2 | Match System / Real World | 2 | Scores, ratios, "Mo"/"YoY" demand interpretation before spending is visible |
| 3 | User Control and Freedom | 1 | No reporting-period control; no route from insight to action |
| 4 | Consistency and Standards | 1 | Buttons imitate tabs without semantics; Financial Health is both route and tab |
| 5 | Error Prevention | 2 | File selection starts import immediately — no review step |
| 6 | Recognition Rather Than Recall | 1 | Category amounts only on hover; no persistent spending summary |
| 7 | Flexibility and Efficiency | 1 | No period selection, no drill-downs, tab state not retained |
| 8 | Aesthetic and Minimalist Design | 2 | Six competing measurements + dominant insights block + redundant chrome |
| 9 | Error Recovery | 1 | "Something went wrong" conflates first-run empty with failure; no retry |
| 10 | Help and Documentation | 1 | No explanation of score methodology or categories |
| **Total** | | **14/40** | **Poor** |

## Design Specificity Verdict

LLM assessment: Finance-specific content inside a largely interchangeable SaaS-dashboard composition. The default view leads with Emergency Fund, Savings Rate, Invested Assets, Debt-to-Income; the core question ("where did my money go?") is behind a tab. Hard-coded "Pro Plan" label contradicts the confirmed local-first self-hosted product.

Deterministic scan: 2 warnings — ai-color-palette on HealthTab.tsx:53 (indigo heading text, light/dark). Partially soft flag (flat color, not gradient) but reinforces template feel.

Visual overlays: unavailable — no browser automation capable of injection in this harness.

## Overall Impression

Organized inventory of analyses, not a deliberately sequenced operating surface. Infrastructure is solid (tokens, themes, privacy context, CSV guardrails); sequencing and honesty of the surface are the problem.

## What's Working

1. Real household-finance concepts — runway in months, essential/discretionary split, cash flow.
2. Privacy/theme infrastructure exists — persistent privacy context, centralized formatting, semantic tokens.
3. Interaction foundations — CSV guardrails, specific upload errors, reduced-motion support.

## Priority Issues

1. [P1] Main job hidden behind secondary framing — lead cards promote wealth metrics over period spending; no ranked clickable category breakdown; no insight→transaction path. Home.tsx:119–155,197–203; SpendingTab.tsx:118–131. Fix: lead with period spending/income/cash flow; ranked clickable categories; one prioritized action. → /impeccable layout
2. [P1] Privacy mode doesn't govern narrative surface — narrative summaries and recommendation descriptions render raw; charts reveal patterns. Home.tsx:33–45; OverviewTab.tsx:98–109. Fix: define privacy contract; sanitize amount-bearing strings when masked; aria-pressed. → /impeccable harden
3. [P1] Mobile composition fragile — permanent 64px sidebar offset at all widths, 48px padding, 6 header actions in one row, 420px modal/384px toast. MainLayout.tsx:39–44,110–142; FileUpload.tsx:100–104,218. Fix: overlay nav on narrow screens, menu for secondary actions, viewport-constrained modal. → /impeccable adapt
4. [P1] Empty/error/import journeys end nowhere — error||!data collapses first-run empty into failure; advertised drop unimplemented; no post-import next step. Home.tsx:47–69; FileUpload.tsx:119–151. Fix: separate states, Retry via refreshSummary, first-import guidance, durable review destination. → /impeccable onboard
5. [P1] Reassurance overstates certainty — Debt-to-Income always green "Manageable"; projection divides by net worth without zero/negative guard; income-stability bar under net-worth label. Home.tsx:148–154; HealthTab.tsx:55–56; OverviewTab.tsx:113–128. Fix: derive wording/color from metric status; guard zero/negative; label estimates. → /impeccable clarify

## Persona Red Flags

First-time user: empty conflated with error; drop advertised but unimplemented; 420px modal exceeds phone viewport; no post-import review. Abandonment risk at first friction.

Monthly budget-checking regular: no period selector on dashboard (PeriodSelector only in Financial Health); category spending buried; budget status on a separate route with no signal here.

## Minor Observations

- [P2] Fake affordances — Search/Notifications have no handlers; unconditional red dot. MainLayout.tsx:120–129.
- [P2] A11y states — dashboard tabs lack tablist/tab/aria-selected; Privacy lacks aria-pressed. Home.tsx:159–181.
- [P2] Low-contrast small text — 10px ticks, 9px labels; #94A3B8 muted likely under contrast on white.
- [P2] Locale split — EUR/en-IE amounts vs en-US header date.
- [P3] Heading hierarchy — two h1s; card titles jump to h4.
- [P3] External font request — IBM Plex Sans via Google Fonts conflicts with local-first; self-host.

## Questions to Consider

- If the user has 30 seconds to answer "where did my money go?", why open with emergency fund and investments?
- Feel good about an unreliable score, or investigate one concrete fact?
- What exactly does the eye-off icon promise, and can every string honor it?
