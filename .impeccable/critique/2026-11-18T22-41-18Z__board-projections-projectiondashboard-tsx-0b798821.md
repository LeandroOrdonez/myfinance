---
target: projections page
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/leandro/code/myfinance/frontend/src/components/dashboard/projections/ProjectionDashboard.tsx"
target_fingerprint: "sha256:d6663479bafdbf6e5cdcac88a185cbc2668d84acd36601696e2be602892a0401"
target_path: /home/leandro/code/myfinance/frontend/src/components/dashboard/projections/ProjectionDashboard.tsx
timestamp: 2026-11-18T22-41-18Z
slug: board-projections-projectiondashboard-tsx-0b798821
---
DEGRADED: single-context (subagents not explicitly authorized).

# Updated projections critique

## Design specificity and overall impression
The page now feels like a household forecasting workspace rather than a scenario database. Restrained styling fits Operate mode. The remaining weakness is a mismatch between promised scenario control and the calculation/data contract. A stronger foundation, but not yet a dependable what-if experience.

## Evidence
Live Chromium inspection at 1440x1000 and 390x844; light/dark desktop, mobile forecast and assumptions dialog. Privacy masking enabled. No financial records saved/deleted. Existing app servers left running. Source reviewed: ProjectionDashboard.tsx and ResultsVisualization.tsx plus existing implementation context. Browser reproduced value-mode reset after editing/cancel. History boundary 2026-10; forecast begins 2026-11. Mobile chart starts 1359px below page top, without horizontal overflow.

## Design health
Each heuristic out of four.
| Heuristic | Score | Finding |
|---|---:|---|
| System status | 3 | Operation feedback good, saved freshness uncertain |
| Real-world match | 2 | Inputs do not consistently control outcome |
| User control | 3 | Accessible exits, context reset on editing |
| Consistency | 3 | Coherent values, lost viewing preferences |
| Error prevention | 2 | Input safeguards improved, model interpretation unsafe |
| Recognition over recall | 3 | Nearby assumptions not tied to calculation |
| Efficiency | 3 | Discoverable selection/editing |
| Minimalist design | 2 | Repetitive mobile hierarchy |
| Error recovery | 3 | Persistent errors/retries |
| Help | 2 | Caveats explain limits without resolving task |
| Total | 26/40 | Acceptable, material improvements needed |

## Working well
Forecast-first task group; shared value basis for summaries/charts; mobile dialog fits and keeps save/cancel visible, with preserved invalid drafts.

## Priority issues
1. P1: Editable assumptions imply control the model does not provide. Historical allocation can override entered allocation; investment gains are excluded from projected net worth; base growth assumptions refresh on calculation. Warnings do not replace a reliable interaction contract. Separate effective inputs from stored/inactive settings. Make history-derived base assumptions read-only or offer Create an editable scenario. Calculation-engine fixes require separate tested scope. Command: /impeccable shape. ResultsVisualization.tsx:89-98.
2. P1: Saved forecasts lack verifiable provenance. Current assumptions and saved results coexist without persisted linkage; changed flags are component-local and every scenario is flagged on refresh. Persist calculation time and assumption/data versions; derive Current/Out of date/Unverified; distinguish assumptions used from pending edits. Requires API/data contract work. Command: /impeccable harden. ProjectionDashboard.tsx:9-32; ResultsVisualization.tsx:114-119.
3. P2: Mobile supporting content precedes analysis. Chart starts 1359px down at 390px wide after controls and three horizon summaries. Use a compact 1/3/5-year selector and one summary, chart next, monthly details progressively disclosed. Command: /impeccable adapt.
4. P2: Editing breaks the analysis loop. Edit changes to Scenarios, cancel leaves user there, returning to Forecast resets inflation-adjusted view to nominal. Open shared editor over the existing forecast; preserve scenario/metric/value basis and show out-of-date outcome after save. Command: /impeccable layout.

## Cognitive load and emotional journey
Two checklist failures: mobile reading hierarchy and retaining context through editing. Seven assumptions are now grouped, not an undifferentiated wall. Reassuring initial experience loses confidence when assumptions are overridden or inactive. Resolve before adding forecasting features.

## Persona flags
First-time household planner expects investment return to affect net-worth trajectory. Returning scenario tester loses inflation-adjusted basis after cancelling edit. Mobile user scrolls beyond first viewport before trajectory.

## Minor observations
Today annotation maps to October 2026, not November 18 review date: use Last recorded month/date. Derived rates have excessive decimal precision. Masked repeated summary rows use mobile space without much information.

## Mechanical evidence
Source detector: one border-accent-on-rounded warning at ProjectionTabs.tsx:18, a false positive on conventional active-tab underline. Browser mutable injection succeeded; detector console reported four whole-page signals, not localized sufficiently to count as four verified projection defects. Temporary browser closed and detector server stopped with --keep-inject; no persistent user-visible overlay.

## Questions to consider
Should this first become a verifiable forecast with effective inputs and provenance, or prioritize faster mobile exploration? Are calculation-engine/API changes in scope, or should this remain UI-only?
