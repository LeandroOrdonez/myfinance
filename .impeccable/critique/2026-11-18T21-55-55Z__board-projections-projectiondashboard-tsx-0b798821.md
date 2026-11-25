---
target: projections page
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/leandro/code/myfinance/frontend/src/components/dashboard/projections/ProjectionDashboard.tsx"
target_fingerprint: "sha256:d644db57a30bb3221af29c774d36a5284af98d47288ea2d8f2d570cec998950c"
target_path: /home/leandro/code/myfinance/frontend/src/components/dashboard/projections/ProjectionDashboard.tsx
timestamp: 2026-11-18T21-55-55Z
slug: board-projections-projectiondashboard-tsx-0b798821
closed: true
---
Method: DEGRADED single-context (subagents not explicitly authorized); source-only, no rendered browser verification.

# Projections critique

## Design specificity verdict
The financial model has product-specific substance; the interface presents it as generic scenario management. Actual-versus-projected history, inflation adjustment, and household assumptions are useful, but the page leads with managing records instead of explaining where the household is heading. This is an Operate surface: precision and trustworthy feedback matter more than spectacle.

## Evidence
Target: frontend/src/components/dashboard/projections/ProjectionDashboard.tsx and its component directory, supporting hooks, and backend projection service. Detector returned [] (zero findings). This does not validate behavior, accessibility, or financial interpretation. No browser automation package, browser binary, or screenshot fixtures were available. Existing servers were not restarted or modified. Desktop/mobile rendering and light/dark visual quality remain unverified. Context7 discovery failed twice. No application code changed.

## Design health score
Provisional implementation-based scoring, each out of four.

| Heuristic | Score | Finding |
|---|---:|---|
| Visibility of system status | 2 | Loading exists; result freshness unclear |
| Match with real world | 2 | Feature labels obscure household question |
| User control | 2 | Cancel/confirmation exist; inputs silently clamp |
| Consistency | 2 | Chart and summary value modes can disagree |
| Error prevention | 2 | Bounds exist but corrections unexplained |
| Recognition over recall | 2 | Assumptions and results separated |
| Flexibility and efficiency | 3 | Custom scenarios, comparison, batch calculation |
| Aesthetic and minimalist design | 3 | Restrained structure, management-led priorities |
| Error recovery | 1 | Results/comparison errors not rendered |
| Help and documentation | 2 | Basic guidance, little assumption explanation |
| Total | 21/40 | Acceptable; significant improvements needed |

## Overall impression
Useful analytical depth, too much interpretation and navigation. Make the forecast the main view and keep its assumptions immediately available.

## Strengths
- NetWorthChart distinguishes actual history from projections through line style and a Today reference line, not color alone.
- One-, three-, and five-year summaries provide manageable landmarks.
- Delete confirmation, default-scenario protection, loading states, and explicit shared-holdings guidance provide basic safeguards.

## Priority issues

### P1: Value mode changes chart but not headline numbers
NetWorthChart.tsx:23-36 owns the real/nominal state. useProjectionResults.ts:72-91 always supplies nominal summary values. The chart and summaries can communicate different value bases without explaining it.
Fix: share value mode across chart/summaries; label Future euros versus Today's purchasing power, show inflation assumption and estimate caveat. Suggested command: /impeccable clarify.

### P1: Failures look like missing data or leave old results unexplained
ResultsVisualization.tsx:24-40 and ScenarioComparison.tsx:23-30 consume errors without rendering them. ProjectionDashboard omits scenario-loading errors. Calculation failure can leave old results visible without explaining failed refresh.
Fix: separate not-calculated, load-failed, and calculation-failed states; persistent contextual feedback and Retry; label retained previous results; expose calculation timestamp and changed-assumptions status. Suggested command: /impeccable harden.

### P1: Assumption editing silently substitutes values
ParameterEditor.tsx:70-108 coerces empty/unparseable values to zero, clamps out-of-range values on blur, then clears errors. Seven assumptions appear without meaningful grouping or explanatory help.
Fix: preserve invalid input, persistent inline validation, prevent submission until corrected. Explain annual growth versus income allocation. Group into Income, Spending, Investing and disclose secondary settings. Suggested command: /impeccable harden.

### P2: Entry prioritizes administration over understanding
ProjectionDashboard.tsx:7-48 defaults to Scenario Manager. ScenarioManager.tsx:309-343 emphasizes creation date/description rather than outcomes and has no direct View forecast action. Calculate leaves the user in management, separate from result selection.
Fix: open selected/default forecast when available; co-locate scenario, key assumptions, and edit action; make management secondary; direct calculation success to the corresponding forecast. Short labels: Forecast, Scenarios, Compare. Suggested command: /impeccable shape.

### P1: Accessible interaction incomplete
ScenarioManager edit/delete and Dialog close controls lack accessible names. ParameterEditor numeric fields lack programmatic labels. Dialog.tsx has no dialog semantics, focus management/trap, or Escape support. Tab-like navigation lacks tab semantics and associated keyboard behavior.
Fix: reuse existing accessible primitives, contextual button names, input associations, correct modal focus handling, programmatic selected state. Suggested command: /impeccable harden.

## Cognitive load and emotional journey
Three clear checklist failures: cross-tab working-memory demand, seven assumptions without meaningful chunks, no progressive disclosure of advanced complexity. Comparison exposes every scenario checkbox; more than four choices once the library grows. Emotional journey: setup effort, calculate confirmation, navigation, interpretation; payoff arrives late. Forecast-first gives an answer before model administration.

## Persona red flags
- First-time household user: Investment Rate does not explain income allocation; defaults lack origin/suitability context.
- Returning scenario tester: edit/results navigation with no visible timestamp or changed-assumptions status.
- Keyboard/screen-reader user: unnamed actions, unlabeled parameter fields, modal without expected focus behavior.

## Minor observations
- Holdings input renders amount directly without privacy-mode handling. Mask outside explicit editing.
- Manager errors auto-dismiss after three seconds, including actionable failures.
- Long tabs, nested chart padding, fixed-width chart axis need narrow-screen visual verification; risks, not confirmed failures.
- Purple Update action is ambiguous beside Calculate; use Refresh assumptions from transactions.

## Questions to consider
Should this be a scenario library or forecast workspace? The household audience favors forecast-first. Should changed assumptions recalculate automatically or explicitly mark results out of date?
