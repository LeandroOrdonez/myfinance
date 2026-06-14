# Plan: Privacy Mode — Hide Sensitive Amounts

**Objective:** Add a discrete "privacy mode" toggle that hides all absolute monetary amounts
(balances, totals, transaction values) while keeping charts structurally intact and preserving
all relative/percentage figures. One button click in the header turns the mask on or off; the
preference survives page refresh via localStorage.

**Mode:** Direct (no GitHub CLI; edit-in-place on `main`)

**Dependency graph:**

```
Step 1 (PrivacyContext + utility)
  └─> Step 2 (PrivacyToggle button)          ─┐
  └─> Step 3 (Home.tsx + BaseMetricCard)      │ all parallel
  └─> Step 4 (self-contained formatters)      │ after Step 1
  └─> Step 5 (transaction + anomaly)          │
  └─> Step 6 (projection charts + hook)      ─┘
        └─> Step 7 (tests)  [after all above]
```

Steps 2–6 are fully parallel once Step 1 is complete. Step 7 runs last.

---

## Step 1 — PrivacyContext + shared utility

**Depends on:** nothing
**Parallel with:** nothing (foundational)
**Model tier:** strongest (design decisions)

### Context brief

The app uses `React Context API + localStorage` for global preferences. The canonical pattern
to follow is `ThemeContext` at `frontend/src/contexts/ThemeContext.tsx`. There is currently
**no privacy mode** anywhere in the codebase.

### Task list

1. Create `frontend/src/contexts/PrivacyContext.tsx`:
   - Export `PrivacyProvider` and `usePrivacyMode` hook.
   - State: `privacyMode: boolean`, `togglePrivacyMode: () => void`.
   - Initialize from `localStorage.getItem('privacyMode') === 'true'` (default `false`).
   - On toggle, update state and `localStorage.setItem('privacyMode', String(newValue))`.
   - Mirror the structure of `ThemeContext.tsx` exactly (same provider pattern, same hook guard
     that throws if used outside provider).

2. Create `frontend/src/utils/formatPrivateAmount.ts`:
   ```ts
   export const PRIVACY_MASK = '•••••';

   export function formatPrivateAmount(
     amount: number,
     privacyMode: boolean,
     formatter: (n: number) => string
   ): string {
     return privacyMode ? PRIVACY_MASK : formatter(amount);
   }
   ```
   This is the **only** masking implementation in the entire codebase. No other file may
   inline `'•••••'` or replicate masking logic.

3. Register `PrivacyProvider` in `frontend/src/App.tsx`:
   - Read the current provider order first (ThemeProvider → AuthProvider → AuthWrapper →
     BrowserRouter).
   - Add `PrivacyProvider` inside `AuthProvider` but outside `BrowserRouter`, so all routed
     components have access.

### Verification

```bash
cd frontend && npm run build 2>&1 | tail -20
```

No TypeScript errors. No existing tests broken (`npm test -- --watchAll=false`).

### Exit criteria

- `PrivacyContext.tsx` exports `PrivacyProvider` and `usePrivacyMode`.
- `formatPrivateAmount.ts` exists and is the sole masking implementation.
- `App.tsx` wraps the tree in `PrivacyProvider`.
- Build and tests pass.

---

## Step 2 — PrivacyToggle button in the header

**Depends on:** Step 1
**Parallel with:** Steps 3–6
**Model tier:** default

### Context brief

The header is in `frontend/src/layouts/MainLayout.tsx`. The current right-side action order is:
Search → Bell → `<div w-px divider>` → `<ThemeToggle />` → conditional `<UndoButton />` →
`<FileUpload />` → `<LogoutButton />`.

The `ThemeToggle` (`frontend/src/components/common/ThemeToggle.tsx`) uses a dropdown. The
privacy toggle is simpler — a single icon button (no dropdown). `Eye` and `EyeOff` are already
available from `lucide-react`.

### Task list

1. Create `frontend/src/components/common/PrivacyToggle.tsx`:
   - Import `Eye`, `EyeOff` from `lucide-react` and `usePrivacyMode` from `PrivacyContext`.
   - Render a `<button>` using `clsx` with the base class matching the Search/Bell buttons in
     `MainLayout.tsx`:
     `p-2 rounded-xl transition-all duration-200`
   - When `privacyMode` is `false`: `text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]`, show `<Eye className="w-5 h-5" />`.
   - When `privacyMode` is `true`: `text-accent bg-accent/10 hover:bg-accent/20`, show
     `<EyeOff className="w-5 h-5" />`. This gives a **clearly distinct** active state (accent
     colour) so the user cannot mistake whether privacy mode is on.
   - `aria-label="Toggle privacy mode"`.
   - `onClick={togglePrivacyMode}`.

2. In `frontend/src/layouts/MainLayout.tsx`:
   - Import `PrivacyToggle`.
   - Insert `<PrivacyToggle />` immediately before `<ThemeToggle />` (after the `w-px` divider).
   - Do not reorder any other elements.

### Verification

```bash
cd frontend && npm run build 2>&1 | tail -20
```

### Exit criteria

- `PrivacyToggle.tsx` exists in `components/common/`.
- `MainLayout.tsx` renders `<PrivacyToggle />` between the divider and `<ThemeToggle />`.
- Active state uses accent colour, not the same style as hover.
- Build passes.

---

## Step 3 — Home.tsx and BaseMetricCard

**Depends on:** Step 1
**Parallel with:** Steps 2, 4, 5, 6
**Model tier:** default

### Context brief

**Home.tsx** (`frontend/src/components/dashboard/Home.tsx`):
- Defines `formatCurrency` at line 30–31 and passes it as a prop to `OverviewTab`, `SpendingTab`,
  and `HealthTab`. Those three components do NOT define their own formatters — they only use
  the prop. No changes are needed inside them.
- Renders Net Worth inline at line 98: `{formatCurrency(data.account_overview.net_worth)}` ✓ (already covered by updating `formatCurrency`)
- Renders Invested Assets at line 127: `{formatCurrency(data.savings_investment.investment_portfolio_value)}` ✓ (same)
- Renders Health Score as `{data.financial_health.overall_score.toFixed(0)}` — this is NOT currency and must **not** be masked.
- Renders Savings Rate, Emergency Fund months, DTI as `%` or `Mo` strings — **not** masked.
- `SummaryCard` at lines 107–141 receives `value` as a pre-formatted string. The Invested Assets
  card passes `formatCurrency(...)` — this will be masked automatically once `formatCurrency` is
  updated. The other three SummaryCards pass plain strings (`${x.toFixed(1)} Mo`, `${y}%`, etc.)
  — these are not currency and stay as-is.

**BaseMetricCard.tsx** (`frontend/src/components/dashboard/BaseMetricCard.tsx`):
- Has its own `formatValue` at line 47–56.
- The `change` prop is always a **percentage string** (e.g. `"+1.2%"`) produced by
  `calculateChange()` in `FinancialOverview.tsx` (line 50–51). It is never a currency amount.
  Therefore, the `change` display does **not** need masking.
- `previousAmount` is passed as a number and is displayed via `formatValue(previousAmount)` —
  this will be masked automatically once `formatValue` is updated.

### Task list

1. In `frontend/src/components/dashboard/Home.tsx`:
   - Add imports: `usePrivacyMode` from `../../contexts/PrivacyContext`, `formatPrivateAmount`
     from `../../utils/formatPrivateAmount`.
   - Call `const { privacyMode } = usePrivacyMode();` inside the component (after the
     existing hooks).
   - Replace `formatCurrency` definition with:
     ```ts
     const formatCurrency = (val: number) =>
       formatPrivateAmount(
         val,
         privacyMode,
         (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n)
       );
     ```

2. In `frontend/src/components/dashboard/BaseMetricCard.tsx`:
   - Add imports: `usePrivacyMode` and `formatPrivateAmount`.
   - Call `const { privacyMode } = usePrivacyMode();` at the top of the component body.
   - Replace `formatValue` with:
     ```ts
     const formatValue = (value: number) => {
       if (isPercentage) return `${value.toFixed(1)}%`;
       return formatPrivateAmount(
         value,
         privacyMode,
         (n) => new Intl.NumberFormat('en-US', {
           style: 'currency',
           currency: 'EUR',
           maximumFractionDigits: 2,
         }).format(n)
       );
     };
     ```
   - Do NOT mask the `change` prop — it is always a percentage string, not a currency value.

### Verification

```bash
cd frontend && npm run build 2>&1 | tail -20
```

### Exit criteria

- `Home.tsx` uses `usePrivacyMode()` and `formatPrivateAmount`.
- `BaseMetricCard.tsx` uses `usePrivacyMode()` and `formatPrivateAmount`.
- `change` prop display is untouched.
- No TypeScript errors.

---

## Step 4 — Self-contained dashboard component formatters

**Depends on:** Step 1
**Parallel with:** Steps 2, 3, 5, 6
**Model tier:** default

### Context brief

The following components each define their own local `formatCurrency` (not received via prop).
The update pattern is identical for every file: import the two utilities, call
`usePrivacyMode()` inside the component, wrap the existing formatter body.

**Complete file list** (verified by grep):

| File | Notes |
|------|-------|
| `components/dashboard/CategoryAverages.tsx` | Local `formatCurrency` at line 87 |
| `components/dashboard/CashFlows.tsx` | Module-level `formatCurrency` at line 17 — **must move inside component** |
| `components/dashboard/MonthlyHeatmap.tsx` | Local `formatCurrency` at line 122 |
| `components/dashboard/CategoryBreakdown.tsx` | Local `formatCurrency` at line 126 |
| `components/dashboard/CategoryTrends.tsx` | Local `formatCurrency` at line 71 |
| `components/dashboard/WeekdayDistribution.tsx` | Verify if it has a currency formatter (grep showed it appeared in earlier search — confirm before editing) |
| `components/dashboard/ExpenseTypeTimeseriesChart.tsx` | Verify location of formatter |
| `components/dashboard/CategoryTimeseriesChart.tsx` | Verify location of formatter |
| `components/dashboard/TimeseriesChart.tsx` | `formatValue` at line 107 has a currency branch (`metric !== 'savings_rate'`); savings_rate branch returns `%` and must **not** be masked — only the EUR branch should use `formatPrivateAmount` |
| `components/dashboard/MonthlyTrends.tsx` | Inline `Intl.NumberFormat` at lines 64 and 74 (YAxis tickFormatter and Tooltip formatter) — extract to a named function, then wrap |

**CashFlows.tsx special note:** The formatter is at module level and closes over nothing — move
it inside the functional component so it can close over `privacyMode`. No `useCallback` needed
for correctness (Recharts re-renders are tolerant of prop function identity changes at this
scale), but wrapping with `useCallback` is acceptable if desired for cleanliness.

**TimeseriesChart.tsx special note:** The `formatValue` function branches on `metric`:
- `metric === 'savings_rate'` → returns `%` string — leave this branch untouched.
- All other metrics → returns EUR currency — wrap this branch only.

### Task list

For each file in the table above:
1. Add imports: `usePrivacyMode` from `../../contexts/PrivacyContext` (adjust relative path),
   `formatPrivateAmount` from `../../utils/formatPrivateAmount`.
2. Call `const { privacyMode } = usePrivacyMode();` inside the React component function body.
3. Wrap the `Intl.NumberFormat` EUR call with `formatPrivateAmount(value, privacyMode, ...)`.
4. For `CashFlows.tsx`: move the formatter from module scope to inside the component.
5. For `TimeseriesChart.tsx`: only wrap the non-savings-rate branch.
6. For `MonthlyTrends.tsx`: extract the two inline `Intl.NumberFormat` calls into a named
   `formatCurrency` function inside the component, then wrap with `formatPrivateAmount`.
7. For `MonthlyHeatmap.tsx`: the tooltip string is assembled with template literals calling
   `formatCurrency(...)` — these will be automatically masked once `formatCurrency` is wrapped.
   Verify no bare `Intl.NumberFormat` calls remain in that file.

### Verification

```bash
cd frontend && npm run build 2>&1 | tail -20
```

```bash
# Confirm no bare Intl.NumberFormat currency calls remain in dashboard components
grep -rn "Intl.NumberFormat" frontend/src/components/dashboard/ --include="*.tsx" \
  | grep -v "savings_rate\|formatPrivateAmount\|PrivacyContext"
```
Any remaining hits must be reviewed to confirm they are not currency amounts.

### Exit criteria

- All listed files use `usePrivacyMode` + `formatPrivateAmount` for EUR currency display.
- No module-level currency formatter remains in `CashFlows.tsx`.
- `TimeseriesChart.tsx` savings-rate branch is unchanged.
- Build passes with zero TypeScript errors.

---

## Step 5 — Transaction list and anomaly components

**Depends on:** Step 1
**Parallel with:** Steps 2, 3, 4, 6
**Model tier:** default

### Context brief

**TransactionList.tsx** (`frontend/src/components/TransactionList.tsx`):
- Inline `Intl.NumberFormat` at lines 104–107 (no named function). Wrap inline.

**AnomalyList.tsx** (`frontend/src/components/dashboard/anomalies/AnomalyList.tsx`):
- Local `formatCurrency` at line 95, used at line 221. Standard update.

**AnomalyDashboard.tsx** (`frontend/src/components/dashboard/anomalies/AnomalyDashboard.tsx`):
- Confirmed by grep: only displays `processing_time_seconds.toFixed(2)` and
  `detection_accuracy.toFixed(1)%` — no currency amounts. No changes needed.

### Task list

1. **`TransactionList.tsx`**:
   - Import `usePrivacyMode` and `formatPrivateAmount`.
   - Call `const { privacyMode } = usePrivacyMode();` inside the component.
   - Replace the inline `new Intl.NumberFormat(...).format(Math.abs(transaction.amount))` with:
     ```tsx
     {formatPrivateAmount(
       Math.abs(transaction.amount),
       privacyMode,
       (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n)
     )}
     ```

2. **`AnomalyList.tsx`**:
   - Import `usePrivacyMode` and `formatPrivateAmount`.
   - Call `const { privacyMode } = usePrivacyMode();` inside the component.
   - Wrap the local `formatCurrency` body with `formatPrivateAmount`.

### Verification

```bash
cd frontend && npm run build 2>&1 | tail -20
```

### Exit criteria

- No bare `Intl.NumberFormat` for EUR currency in `TransactionList.tsx`.
- `AnomalyList.tsx` uses `formatPrivateAmount`.
- Build passes.

---

## Step 6 — Projection charts and hook

**Depends on:** Step 1
**Parallel with:** Steps 2, 3, 4, 5
**Model tier:** default

### Context brief

**`hooks/useProjectionResults.ts`** (line 52): Defines `formatCurrency` and returns it at
line 105. `ResultsVisualization.tsx` (line ~31) destructures this `formatCurrency` from the
hook. The seven projection chart components each define their own local `formatCurrency` using
`Intl.NumberFormat('de-DE', ...)` — they do **not** use the hook's formatter.

**Two independent update sites:**

A. **`hooks/useProjectionResults.ts`**: This is a custom hook, so it can call `usePrivacyMode()`
directly (React hooks may call other hooks). Add `usePrivacyMode()` at the top of the hook
function (unconditionally, before any conditional logic), then wrap `formatCurrency`. Because
the hook returns `formatCurrency` as a function reference, any component that uses this value
(i.e., `ResultsVisualization.tsx`) automatically gets the privacy-aware version — no changes
needed in `ResultsVisualization.tsx`.

B. **Seven chart files** (each has a local `formatCurrency`):
- `components/dashboard/projections/charts/NetWorthChart.tsx`
- `components/dashboard/projections/charts/SavingsGrowthChart.tsx`
- `components/dashboard/projections/charts/IncomeExpensesChart.tsx`
- `components/dashboard/projections/charts/InvestmentGrowthChart.tsx`
- `components/dashboard/projections/charts/ComparisonNetWorthChart.tsx`
- `components/dashboard/projections/charts/ComparisonSavingsChart.tsx`
- `components/dashboard/projections/charts/ComparisonInvestmentChart.tsx`

### Task list

1. **`hooks/useProjectionResults.ts`**:
   - Import `usePrivacyMode` from `../contexts/PrivacyContext`.
   - Import `formatPrivateAmount` from `../utils/formatPrivateAmount`.
   - Call `const { privacyMode } = usePrivacyMode();` at the **top** of the hook function,
     unconditionally (before any `useMemo`, `useCallback`, or `useState` calls — but after
     any other `use*` hooks already there). This is required by the Rules of Hooks.
   - Wrap the `formatCurrency` definition to use `formatPrivateAmount`.

2. For each of the seven chart files:
   - Import `usePrivacyMode` and `formatPrivateAmount`.
   - Call `const { privacyMode } = usePrivacyMode();` at the top of the component function.
   - Wrap the local `formatCurrency` definition with `formatPrivateAmount`.

### Verification

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Check for hooks-related warnings:
```bash
cd frontend && npm run build 2>&1 | grep -i "hook\|rule"
```

### Exit criteria

- `useProjectionResults.ts` calls `usePrivacyMode()` unconditionally at the top of the hook.
- All seven chart files use `usePrivacyMode` + `formatPrivateAmount`.
- `ResultsVisualization.tsx` requires no changes.
- Build passes with zero errors and zero hooks-related warnings.

---

## Step 7 — Tests

**Depends on:** Steps 1–6
**Parallel with:** nothing
**Model tier:** default

### Context brief

The project uses Jest + React Testing Library via `react-scripts`. Follow the patterns in
`frontend/src/App.test.tsx`. Use `renderHook` from `@testing-library/react` for hook tests.

### Task list

1. Create `frontend/src/utils/formatPrivateAmount.test.ts`:
   - `privacyMode = false`: assert formatter result is returned unchanged.
   - `privacyMode = true`: assert `PRIVACY_MASK` is returned for positive, negative, zero, and
     large values.
   - Verify `PRIVACY_MASK` is `'•••••'`.
   - Aim for 100% branch coverage of this file.

2. Create `frontend/src/contexts/PrivacyContext.test.tsx`:
   - `privacyMode` defaults to `false` when `localStorage` is empty.
   - `togglePrivacyMode` sets `privacyMode` to `true`.
   - Toggling again sets it back to `false`.
   - After toggle, `localStorage.getItem('privacyMode')` returns `'true'`.
   - When `localStorage` contains `'true'`, the context initialises with `privacyMode = true`.
   - Throws an error if `usePrivacyMode` is called outside `PrivacyProvider`.
   - Use `renderHook` with a wrapper providing `PrivacyProvider`.
   - Mock `localStorage` via `jest.spyOn`.

3. Create `frontend/src/components/common/PrivacyToggle.test.tsx`:
   - When `privacyMode = false`: renders a button with `aria-label="Toggle privacy mode"`.
   - When `privacyMode = false`: does NOT have the active (`EyeOff`) appearance.
   - Clicking the button calls `togglePrivacyMode`.
   - When `privacyMode = true`: button shows `EyeOff` icon (test via aria-label or class).
   - Wrap renders in `PrivacyProvider`.

4. Create `frontend/src/components/dashboard/BaseMetricCard.test.tsx`
   (or add to an existing test file if one exists):
   - With `privacyMode = false`: renders a numeric amount (e.g. `€1,000.00`).
   - With `privacyMode = true`: renders `•••••` instead of the amount.
   - Percentage values (`isPercentage = true`) are never replaced by `•••••`.
   - Wrap renders in `PrivacyProvider` with controlled `privacyMode`.

### Verification

```bash
cd frontend && npm test -- --watchAll=false 2>&1 | tail -40
```

### Exit criteria

- All new tests pass.
- No pre-existing tests broken.
- `formatPrivateAmount.ts` has 100% branch coverage.
- `PrivacyContext.tsx` has meaningful coverage of the toggle and localStorage paths.

---

## Invariants (checked after every step)

- `npm run build` passes with zero TypeScript errors.
- Percentage values (savings rate, health score, DTI, emergency fund months) are **never**
  replaced by `•••••`.
- `PRIVACY_MASK` (`'•••••'`) is defined in exactly one place: `utils/formatPrivateAmount.ts`.
- `localStorage` key `'privacyMode'` stores the string `'true'` or `'false'`.
- No new third-party dependencies are introduced.
- The `change` prop in `BaseMetricCard` is never masked (it is always a percentage string).

---

## Files modified per step (quick reference)

| Step | Files created | Files modified |
|------|--------------|---------------|
| 1 | `contexts/PrivacyContext.tsx`, `utils/formatPrivateAmount.ts` | `App.tsx` |
| 2 | `components/common/PrivacyToggle.tsx` | `layouts/MainLayout.tsx` |
| 3 | — | `components/dashboard/Home.tsx`, `components/dashboard/BaseMetricCard.tsx` |
| 4 | — | `CategoryAverages.tsx`, `CashFlows.tsx`, `MonthlyHeatmap.tsx`, `CategoryBreakdown.tsx`, `CategoryTrends.tsx`, `WeekdayDistribution.tsx`, `ExpenseTypeTimeseriesChart.tsx`, `CategoryTimeseriesChart.tsx`, `TimeseriesChart.tsx`, `MonthlyTrends.tsx` |
| 5 | — | `TransactionList.tsx`, `anomalies/AnomalyList.tsx` |
| 6 | — | `hooks/useProjectionResults.ts`, 7 projection chart files |
| 7 | 4 test files | — |

**Total: 2 new context/utility files, 1 new UI component, 4 new test files, ~22 modified files.**

---

## Rollback

Each step touches only the files listed above. To roll back, revert those files using
`git checkout HEAD -- <file>`. No database migrations, no backend changes, no schema changes.
This is a pure frontend display feature.

---

## Anti-patterns avoided

- **Not** a global CSS `filter: blur()` — that blurs relative values and chart shapes too.
- **Not** a HOC wrapper on every component — the Context + hook pattern is already established.
- **Not** a new state management library — Context API is sufficient and already in use.
- **Not** backend-driven — privacy is a display preference; no API changes.
- **Not** duplicated masking logic — `formatPrivateAmount` is the single source of truth.
- **Not** masking the `change` percentage string in `BaseMetricCard` — it's not currency.
