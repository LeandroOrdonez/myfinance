# Plan: Budgets — Category Spending Limits & Tracking

**Objective:** Let users set a **monthly spending limit per expense category**, with a
**percentile-based suggested limit** derived from their historical spending, and track
each month's actual spend against the limit with **visual progress bars and status
thresholds** (on-track / warning / over-budget). Surfaced on a **dedicated `/budgets`
sidebar page**.

**Mode:** Direct (git present, but no GitHub CLI detected → edit-in-place on `main`, no
branches/PRs). Commit after each step with a descriptive message.

**Product decisions (locked):**
- **Period:** Monthly only. One active budget per expense category. Progress is computed
  for a target month (defaults to the latest transaction's month).
- **Suggestion:** Percentile-based. Default = 75th percentile of the category's *monthly*
  spend over a trailing window (default 6 months). Configurable via query params.
- **Tracking:** Visual progress + status thresholds. `on_track` < 80%, `warning` 80–100%,
  `over` > 100% of the limit (thresholds are named constants).
- **Scope guardrails:** Budgets apply to **expense categories only** (`ExpenseCategory`).
  Do **not** wire budgets into the financial-health score or anomaly engine in this plan —
  that is explicitly out of scope to keep each step one-PR-sized.

---

## Architecture orientation (read once, applies to every step)

MyFinance is a monorepo: FastAPI backend (`backend/app`) + React/TS frontend (`frontend/src`).

**Backend feature anatomy** (mirror the `financial_health` / `anomaly` features):
- Model: `backend/app/models/<feature>.py` (SQLAlchemy, `from ..database import Base`).
- Schema: `backend/app/schemas/<feature>.py`. **Pydantic style — match the feature we mirror
  (`financial_health.py`) exactly:** the project pins `pydantic==2.5.2` but the existing
  schemas predominantly use the v1-compat surface (`from pydantic import BaseModel, validator`
  with `@validator`, and `class Config: orm_mode = True` on response models — see
  `schemas/financial_health.py`, `transaction.py`, `anomaly.py`). Use that same style for
  consistency: `@validator` (NOT `field_validator`) and `class Config: orm_mode = True` (NOT
  `model_config`). Do not migrate other schemas.
- Service: `backend/app/services/<feature>_service.py` (static-method service class holding
  business logic; takes `db: Session`).
- Router: `backend/app/routers/<feature>.py` (`APIRouter(prefix=..., tags=...)`, endpoints
  wrap service calls in `try/except` → `HTTPException`, use `Depends(get_db)`).
- Registration touch-points (ALL must be updated for a new table to exist & be served):
  1. `backend/app/models/__init__.py` — import + `__all__`.
  2. `backend/app/schemas/__init__.py` — import + `__all__`.
  3. `backend/app/database_manager.py` — import the model, add table name to
     `tables_to_check`, and (optionally) add a `reset_database` branch.
  4. `backend/app/main.py` — `from .routers import ... <feature>` and
     `app.include_router(<feature>.router)`.
  5. Migration: `backend/app/migrations/migrate_<feature>.py` (raw-SQL `CREATE TABLE IF
     NOT EXISTS`-style guard via `inspect(engine)`), wired into
     `backend/app/migrations/run_migrations.py`.
- Tables are auto-created by `init_database()` (called in `main.py`) via
  `Base.metadata.create_all`. The explicit migration is for existing prod DBs that already
  have the other tables (so `create_all` of a new table still fires, but the migration is
  the documented/idempotent path consistent with `migrate_anomaly_config.py`).
- `pandas` is a direct dependency (`backend/requirements.txt`) → use it for percentile.
  Do NOT add new dependencies.

**Frontend feature anatomy** (mirror Projections / Anomalies pages):
- Types: `frontend/src/types/<feature>.ts` (enums for fixed sets, interfaces for responses,
  separate `*Create` interfaces for write payloads).
- Service: `frontend/src/services/<feature>Service.ts` (axios, base URL from
  `frontend/src/config.ts` → `API_BASE_URL`).
- Page component: `frontend/src/components/dashboard/<Feature>.tsx`.
- Route: `frontend/src/App.tsx` — add `<Route path="/budgets" element={<MainLayout ...>
  <Budgets /></MainLayout>} />` following the existing routes.
- Sidebar entry: `frontend/src/components/common/Sidebar.tsx` — the `menuItems` array (lines
  ~39–76) holds objects `{ id, label, icon, color }` where `icon` is a **`lucide-react`
  component reference (not a string)** and `color` is a Tailwind token (e.g. `text-accent`,
  `text-warning`). Import the icon at the top of the file and reference the component, e.g.
  `{ id: 'budgets', label: 'Budgets', icon: Wallet, color: 'text-warning' }`. Navigation maps
  `id` → `/{id}`; confirm that mapping covers `/budgets`.
- Styling: Tailwind + CSS variables (`var(--color-surface)`, `var(--color-border)`,
  `text-accent`, etc.). Reuse `DashboardCard` and `Loading` from `components/common` /
  `components/dashboard`.
- Charts: `recharts` v2.
- Privacy: every EUR amount (`limit_amount`, `spent`, `remaining`, and any chart axis/tooltip
  value) MUST route through `formatPrivateAmount` + `usePrivacyMode`
  (`frontend/src/contexts/PrivacyContext`, `frontend/src/utils/formatPrivateAmount`).
  `percentage` and `status` are plain text and are NOT masked.
- Dialogs: `@radix-ui/react-dialog` is installed (`package.json`). Find the canonical usage
  with `grep -rl "react-dialog" frontend/src` and copy that import/structure
  (`import * as Dialog from '@radix-ui/react-dialog'`) rather than inventing a new modal.
- Tests: Jest + React Testing Library (`react-app` preset). The frontend `test` script is
  bare `react-scripts test`, so run it non-interactively as `CI=true npm test --
  --watchAll=false` (without these it hangs in watch mode). Backend: pytest with the
  in-memory SQLite fixture in `backend/tests/conftest.py`.

**Invariants to verify after EVERY step:**
- Backend imports cleanly: `cd backend && python -c "import app.main"` (this runs
  `init_database()` against the local dev DB — acceptable; it only creates missing tables).
- Backend tests pass: `cd backend && python -m pytest -q`.
- Frontend builds: `cd frontend && npm run build`.
- Frontend tests pass: `cd frontend && CI=true npm test -- --watchAll=false`.
- No new runtime dependency added to `requirements.txt` or `package.json`.
- Budgets remain expense-only and monthly-only; health/anomaly code is untouched.

---

## Dependency graph

```
Step 1 (model + schema + migration + registration)        [strongest]
  └─> Step 2 (BudgetService: CRUD + percentile suggest + progress)   [strongest]
        └─> Step 3 (budgets router + main.py registration)  [default]
              ├─> Step 4 (backend tests)          [default] ─┐ parallel
              └─> Step 5 (FE types + budgetService) [default] │ (no shared files)
                        └─> Step 6 (Budgets page + route + sidebar) [default]
                              └─> Step 7 (BudgetCard + create/edit dialog + suggestion UI) [default]
                                    └─> Step 8 (chart + privacy + docs/CHANGELOG) [default]
```

Step 4 (backend tests) and Steps 5→8 (frontend) are parallelizable after Step 3 — they
share no files. Within the frontend, 5→6→7→8 are serial.

---

## Step 1 — Budget model, schema, migration & registration

**Depends on:** nothing · **Parallel with:** nothing (foundational) · **Model tier:** strongest

### Context brief
No budget concept exists anywhere yet (`grep -ri budget backend/app/models backend/app/routers`
returns only the unrelated `budget_adherence` score field in `financial_health.py` — leave
that alone). Follow `backend/app/models/financial_health.py` for model style and
`backend/app/migrations/migrate_anomaly_config.py` for the migration style (raw SQL, guarded
by `inspect(engine).get_table_names()`, idempotent). Expense categories are the
`ExpenseCategory` enum in `backend/app/models/transaction.py` (stored as the enum's
`.value` string on transactions, e.g. `"Groceries"`).

### Task list
1. Create `backend/app/models/budget.py`:
   - Class `Budget(Base)`, `__tablename__ = "budgets"`.
   - Columns: `id` (PK, index); `category` (`String(100)`, nullable=False) storing an
     `ExpenseCategory` value; `limit_amount` (`Float`, nullable=False); `period`
     (`String(20)`, nullable=False, default `"monthly"`) — reserved for future, always
     `"monthly"` now; `is_active` (`Boolean`, default `True`); `created_at`
     (`Column(DateTime, default=datetime.utcnow)`) and `updated_at`
     (`Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)`). Pass the
     **callable** `datetime.utcnow`, not `datetime.utcnow()`.
   - `__table_args__ = (UniqueConstraint('category', name='uq_budget_category'),)` — one
     budget per category.
2. Create `backend/app/schemas/budget.py` (match `schemas/financial_health.py` style:
   `from pydantic import BaseModel, validator`, `class Config: orm_mode = True`):
   - `BudgetBase`: `category: str`, `limit_amount: float`, `period: str = "monthly"`.
   - `BudgetCreate(BudgetBase)`.
   - `BudgetUpdate`: `limit_amount: Optional[float] = None`, `is_active: Optional[bool] = None`.
   - `Budget(BudgetBase)`: adds `id: int`, `is_active: bool`, `created_at`, `updated_at`;
     `class Config: orm_mode = True`.
   - `BudgetProgress`: `category: str`, `limit_amount: float`, `spent: float`,
     `remaining: float`, `percentage: float`, `status: str` (`"on_track" | "warning" |
     "over"`), `month: str` (`"YYYY-MM"`).
   - `BudgetSuggestion`: `category: str`, `suggested_limit: float`, `percentile: float`,
     `months_analyzed: int`, `monthly_history: List[float]`.
   - Add a `category` validator on `BudgetBase` using the **v1-compat `@validator('category')`**
     (matching `transaction.py`/`anomaly.py`) that rejects values not in
     `{c.value for c in ExpenseCategory}` → `raise ValueError(f"Invalid category: {v}")`.
     Also reject `limit_amount <= 0`.
3. Register the model:
   - `backend/app/models/__init__.py`: `from .budget import Budget` + add `'Budget'` to `__all__`.
   - `backend/app/schemas/__init__.py`: add `budget` to the imports and `__all__`.
   - `backend/app/database_manager.py`: `from .models.budget import Budget`; add
     `"budgets"` to `tables_to_check`; add a `reset_type == "budgets"` branch to
     `reset_database` mirroring the existing branches.
4. Migration `backend/app/migrations/migrate_budgets.py`:
   - Function `migrate_budgets()` modeled on `migrate_anomaly_config.py`: skip if `"budgets"`
     in `inspector.get_table_names()`, else `CREATE TABLE budgets (...)` with the same
     columns + `UNIQUE(category)`. No seed rows.
   - Wire into `backend/app/migrations/run_migrations.py`: add
     `from app.migrations.migrate_budgets import migrate_budgets` to the top import block, and
     add a `migrate_budgets()` call inside `run_migrations()` **uncommented**, right after the
     existing active `migrate_anomaly_config()` call (the older calls there are intentionally
     left commented out — follow the active-call style, do not uncomment them). Note this
     script is a standalone manual runner; `init_database()` in `main.py` also creates the
     table via `create_all`, so both paths must agree on the schema.

### Verification
```bash
cd backend && python -c "import app.main" && python -c "from app.models import Budget; from app.schemas import budget; print('ok')"
cd backend && python -m pytest -q
```

### Exit criteria
- `budgets` table is created on startup (`import app.main` logs it / no error) and the model,
  schema, and migration all exist and import cleanly.
- One-budget-per-category enforced by a unique constraint.
- Existing tests still pass; no behavior change to other features.

---

## Step 2 — BudgetService: CRUD, percentile suggestion & progress

**Depends on:** Step 1 · **Parallel with:** nothing · **Model tier:** strongest

### Context brief
Service-class style: see `backend/app/services/financial_health_service.py` and
`statistics_service.py` (static methods, `db: Session` first arg, module-level `logger`).
Historical monthly category spend = sum of `func.abs(Transaction.amount)` for
`Transaction.transaction_type == TransactionType.EXPENSE` and
`Transaction.expense_category == <enum>` grouped by month — see the aggregation pattern in
`statistics_service.calculate_category_statistics` (lines ~144–234). `pandas` is available
for percentile (`pandas.Series(values).quantile(p)`); do not add numpy directly.

### Task list
1. Create `backend/app/services/budget_service.py` with `class BudgetService` (static methods):
   - Module constants: `WARNING_THRESHOLD = 0.8`, `OVER_THRESHOLD = 1.0`,
     `DEFAULT_SUGGESTION_PERCENTILE = 75.0`, `DEFAULT_LOOKBACK_MONTHS = 6`.
   - `get_budgets(db) -> List[Budget]`: active budgets ordered by category.
   - `get_budget(db, budget_id)` / `get_budget_by_category(db, category)`.
   - `create_budget(db, data: BudgetCreate) -> Budget`: validate category is a valid
     `ExpenseCategory.value` (raise a "invalid category" `ValueError` → router 400); reject if
     an active budget for that category already exists (raise a distinct "already exists"
     `ValueError` → router 409). Use distinct messages (or exception subclasses) so the router
     can pick the right status code.
   - `update_budget(db, budget_id, data: BudgetUpdate)`: partial update of `limit_amount` /
     `is_active`; touch `updated_at`; return `None` if not found.
   - `delete_budget(db, budget_id) -> bool`.
   - `_resolve_target_month(db, target_date)` helper: if `target_date` is `None`, use the
     latest transaction's month (fallback `date.today()`), mirroring
     `financial_health` router's date-resolution logic.
   - `get_progress(db, target_date=None) -> List[BudgetProgress]`: for each active budget,
     sum `abs(amount)` of `TransactionType.EXPENSE` transactions in the target month for that
     category (exclude INCOME/TRANSFER). Then:
     - `remaining = limit_amount - spent`.
     - `percentage = round(spent / limit_amount * 100, 1)` when `limit_amount > 0`.
     - **Divide-by-zero / non-positive limit** (`limit_amount <= 0`, which the schema validator
       should already prevent, but guard defensively): set `percentage = 100.0 if spent > 0
       else 0.0`, `remaining = -spent` (≤ 0). Never emit `inf`/`nan`.
     - `status`: `"over"` if `percentage >= OVER_THRESHOLD*100` (i.e. ≥100%), else `"warning"`
       if `percentage >= WARNING_THRESHOLD*100` (≥80%), else `"on_track"`. (Boundaries: exactly
       80% → warning; exactly 100% → over.)
     - `month` = `target_month.strftime("%Y-%m")`.
   - `suggest_limit(db, category, percentile=DEFAULT_SUGGESTION_PERCENTILE,
     months=DEFAULT_LOOKBACK_MONTHS) -> BudgetSuggestion`: validate `category` is a valid
     `ExpenseCategory.value` (raise `ValueError` if not). Build the trailing `months` monthly
     totals ending at the resolved target month (months with no spend are **zero-filled to
     0.0**, so `monthly_history` always has exactly `months` entries when transactions exist).
     Compute `suggested_limit = round(pandas.Series(monthly_history).quantile(percentile/100.0),
     2)`. Set `months_analyzed = len(monthly_history)`, echo back the requested `percentile`.
     - **No-history case** (zero transactions for the category in the window): return
       `suggested_limit = 0.0`, `monthly_history = []`, `months_analyzed = 0`, and the
       requested `percentile` unchanged.
2. Return ORM objects / dicts compatible with the Step-1 schemas (the router does the
   `response_model` coercion).

### Verification
```bash
cd backend && python -c "from app.services.budget_service import BudgetService; print(BudgetService.WARNING_THRESHOLD, BudgetService.OVER_THRESHOLD)"
cd backend && python -m pytest -q
```

### Exit criteria
- Percentile suggestion uses pandas over a trailing N-month window, zero-filling empty months.
- Progress computes spent/remaining/percentage/status with thresholds 80% / 100% and is
  divide-by-zero safe.
- Duplicate-category creation is rejected at the service layer.

---

## Step 3 — Budgets router & app registration

**Depends on:** Step 2 · **Parallel with:** nothing · **Model tier:** default

### Context brief
Router style: `backend/app/routers/financial_health.py` (prefix/tags, `Depends(get_db)`,
`try/except` → `HTTPException`, module logger, `Query(...)` for params). Registration in
`backend/app/main.py` lines 18 (import) & 32–39 (`include_router`).

### Task list
1. Create `backend/app/routers/budgets.py`, `router = APIRouter(prefix="/budgets",
   tags=["budgets"])`. **Declare endpoints in this exact order** — FastAPI matches routes
   top-to-bottom, so the static `/progress` and `/suggestion` paths MUST be declared before the
   `/{budget_id}` path param, otherwise `GET /progress` is captured by `/{budget_id}` and fails:
   ```
   GET    /              -> List[Budget]   (active budgets)
   POST   /              -> Budget (201)   body BudgetCreate
   GET    /progress      -> List[BudgetProgress]   (declare before /{budget_id})
   GET    /suggestion    -> BudgetSuggestion        (declare before /{budget_id})
   PUT    /{budget_id}   -> Budget          body BudgetUpdate
   DELETE /{budget_id}   -> 200/204
   ```
   - `POST /`: on service `ValueError`, map **duplicate category → `HTTPException(409, detail=...)`**
     and **invalid category → `HTTPException(400, detail=...)`** (distinguish on the message, or
     have the service raise distinct exception types/messages). Include the offending category in
     the detail.
   - `GET /progress`: optional `target_date` query (`YYYY-MM-DD`, parsed like
     `financial_health.get_health_score`).
   - `GET /suggestion`: required `category` query; optional `percentile`
     (`Query(75.0, ge=0, le=100)`) and `months` (`Query(6, gt=0, le=36)`); 400 if category
     invalid.
   - `PUT /{budget_id}` → 404 if missing. `DELETE /{budget_id}` → 404 if missing.
2. Register in `backend/app/main.py`: add `budgets` to the `from .routers import ...` line
   and `app.include_router(budgets.router)`.

### Verification
```bash
cd backend && python -c "import app.main"
cd backend && python -m pytest -q
# Optional smoke: uvicorn app.main:app --port 8001 & then GET /docs shows the budgets tag
```

### Exit criteria
- All six endpoints registered under `/budgets` and visible in `/docs`.
- `/progress` and `/suggestion` resolve before `/{budget_id}`.
- Invalid category / duplicate budget return 4xx with a clear detail message.

---

## Step 4 — Backend tests

**Depends on:** Step 3 · **Parallel with:** Steps 5–8 · **Model tier:** default

### Context brief
Pytest + in-memory SQLite via `backend/tests/conftest.py` (autouse fixture creates/drops all
tables; `get_db` overridden globally; use `TestClient(app)` — see
`tests/test_financial_health_p0.py` and `tests/test_anomaly_detection.py` for seeding
`Transaction` rows directly through a session). Use the `_TestSessionLocal` / engine exposed
by conftest, or insert via the API where simpler.

### Task list
1. Create `backend/tests/test_budgets.py` covering:
   - **CRUD:** create budget → appears in `GET /`; duplicate category → 409/400; update
     limit; delete → gone; update/delete missing id → 404.
   - **Validation:** invalid category on create → 4xx.
   - **Progress:** seed EXPENSE transactions in a known month for a category with a budget;
     assert `spent`, `remaining`, `percentage`, and `status` transitions across the 80% and
     100% thresholds (under → warning → over). Include a zero-limit / divide-by-zero case.
   - **Suggestion:** seed several months of spend for a category; assert the returned
     `suggested_limit` matches a hand-computed pandas percentile and `months_analyzed` /
     `monthly_history` are correct; empty-history → `suggested_limit == 0.0`.
   - **Isolation:** TRANSFER/INCOME transactions are excluded from spent; other categories
     don't bleed into a category's progress.

### Verification
```bash
cd backend && python -m pytest tests/test_budgets.py -q
cd backend && python -m pytest -q   # full suite still green
```

### Exit criteria
- New tests pass and the full backend suite stays green.
- Threshold boundaries (exactly 80%, exactly 100%) are asserted explicitly.

---

## Step 5 — Frontend types & budget service

**Depends on:** Step 3 (API contract) · **Parallel with:** Step 4 · **Model tier:** default

### Context brief
Types live in `frontend/src/types/` (see `transaction.ts` for enum style). Services in
`frontend/src/services/` use `axios` + `API_BASE_URL` from `frontend/src/config.ts` (see
`transactionService.ts`). The expense-category list already exists on the frontend — reuse
the existing `ExpenseCategory` enum/type in `frontend/src/types/transaction.ts` rather than
re-declaring categories (confirm its exact name/shape first).

### Task list
1. Create `frontend/src/types/budget.ts`:
   - Import the existing category type: `import { ExpenseCategory } from './transaction'`
     (confirm its exact exported name/shape first) and reuse it — do NOT re-declare categories.
   - `interface Budget { id; category: ExpenseCategory | string; limit_amount; period; is_active; created_at; updated_at }`.
   - `interface BudgetCreate { category: ExpenseCategory | string; limit_amount; period? }`.
   - `interface BudgetUpdate { limit_amount?; is_active? }`.
   - `interface BudgetProgress { category; limit_amount; spent; remaining; percentage; status; month }`
     with `type BudgetStatus = 'on_track' | 'warning' | 'over'`.
   - `interface BudgetSuggestion { category; suggested_limit; percentile; months_analyzed; monthly_history }`.
   - Field names MUST match the backend snake_case JSON exactly.
2. Create `frontend/src/services/budgetService.ts` (`export const budgetService = { ... }`):
   - `getBudgets()`, `createBudget(b)`, `updateBudget(id, b)`, `deleteBudget(id)`,
     `getProgress(targetDate?)`, `getSuggestion(category, percentile?, months?)` — each an
     axios call to the matching `/budgets...` endpoint, typed with the new interfaces.

### Verification
```bash
cd frontend && npm run build
cd frontend && CI=true npm test -- --watchAll=false
```

### Exit criteria
- Types mirror backend JSON exactly; service compiles with strict TS.
- No category list duplication (reuses existing `ExpenseCategory`).

---

## Step 6 — Budgets page, route & sidebar entry

**Depends on:** Step 5 · **Parallel with:** nothing · **Model tier:** default

### Context brief
Page components live in `frontend/src/components/dashboard/` (see
`ProjectionDashboard`/`AnomalyDashboard` for a page that fetches on mount, shows
`Loading`/error, and renders cards). Route registration is in `frontend/src/App.tsx`
(existing routes wrap content in `<MainLayout>`; replicate the `onUploadSuccess` prop usage
if neighboring routes pass it). Sidebar items are in
`frontend/src/components/common/Sidebar.tsx` `menuItems` array (`id`, `label`, `icon`,
`color`); navigation maps `id` → `/{id}` route. Use a `lucide-react` icon not already in the
menu (e.g. `Wallet` or `Target`).

### Task list
1. Create `frontend/src/components/dashboard/Budgets.tsx`:
   - On mount, fetch `getBudgets()` and `getProgress()` in parallel; show `Loading` and an
     error state consistent with other dashboards.
   - Render a header (title + "Add budget" action) and a responsive grid of budget cards
     (the card itself is Step 7 — for now render a minimal inline placeholder list of
     category + limit + spent so the page is functional and testable).
   - Provide a `refresh()` that re-fetches after mutations (used by Step 7's dialog).
   - Empty state when no budgets exist (prompt to create one).
2. Add the route in `frontend/src/App.tsx`: `path="/budgets"` → `<MainLayout ...><Budgets /></MainLayout>`.
3. Add the sidebar entry in `Sidebar.tsx` `menuItems` (`id: 'budgets'`, label `'Budgets'`,
   chosen icon, a `color` token consistent with siblings). Confirm the id→route mapping
   already routes `/budgets` (otherwise extend it).

### Verification
```bash
cd frontend && npm run build
cd frontend && CI=true npm test -- --watchAll=false
```

### Exit criteria
- `/budgets` renders via the sidebar and shows budgets/progress (or an empty state).
- No regressions to existing routes/navigation; build + tests green.

---

## Step 7 — BudgetCard (progress + status) & create/edit dialog with suggestion

**Depends on:** Step 6 · **Parallel with:** nothing · **Model tier:** default

### Context brief
Reuse `DashboardCard` and existing dialog patterns (Projections uses dialogs for
scenario create/edit — `grep -rl "Dialog" frontend/src/components` to find the canonical
pattern, likely `@radix-ui/react-dialog`). All EUR amounts must go through
`formatPrivateAmount` + `usePrivacyMode`; percentages and the status label are NOT masked.
Status→color mapping should use existing semantic tokens (`text-success`/`emerald`,
`text-warning`/`amber`, `text-danger`/`rose`) consistent with the design system.

### Task list
1. Create `frontend/src/components/dashboard/BudgetCard.tsx`:
   - Props: a `BudgetProgress` (+ the owning `Budget` id for edit/delete).
   - Show category name, limit, spent, remaining (currency → privacy-aware), `percentage`
     (not masked), and a progress bar whose width = `min(percentage, 100)%` and color =
     status (`on_track` green / `warning` amber / `over` red). Show an over-budget badge when
     `status === 'over'`.
   - Edit and delete affordances calling back to the page's handlers.
2. Create `frontend/src/components/dashboard/BudgetFormDialog.tsx`:
   - Create + edit modes. Fields: category select (only categories without an existing
     budget when creating; locked when editing), `limit_amount` number input.
   - "Suggest limit" button → `budgetService.getSuggestion(category)`; prefill `limit_amount`
     with `suggested_limit` and show a small hint (`"75th percentile of last N months"`).
     Disable the button until a category is chosen.
   - On submit, call `createBudget`/`updateBudget`, then trigger the page `refresh()` and
     close.
3. Wire both into `Budgets.tsx`, replacing the Step-6 placeholder list with `BudgetCard`s and
   opening `BudgetFormDialog` from the "Add budget" / per-card edit actions; delete with a
   confirm.

### Verification
```bash
cd frontend && npm run build
cd frontend && CI=true npm test -- --watchAll=false
```
Add/extend a component test (RTL) for `BudgetCard` status→color/threshold rendering and that
amounts are masked under privacy mode.

### Exit criteria
- Cards show privacy-aware amounts, unmasked percentages, and correct status colors at the
  80%/100% boundaries.
- Suggestion prefills the limit; create/edit/delete round-trip and refresh the page.

---

## Step 8 — Budget-vs-actual chart, privacy audit & docs

**Depends on:** Step 7 · **Parallel with:** nothing · **Model tier:** default

### Context brief
Charts use `recharts` v2 (see `CategoryBreakdown.tsx` / `TimeseriesChart.tsx`). Chart axis
`tickFormatter`s that render EUR must be privacy-aware — this was the subject of a prior bug
(see CHANGELOG `2026-06-21 – Privacy Mode Bug Fixes`); follow the
compact privacy-aware formatter pattern. CHANGELOG is at repo root and is updated per feature
(newest entry on top). PRD lists "Budgeting" under §6.1 Future Enhancements — mark it shipped.

### Task list
1. Add a budget-vs-actual overview to `Budgets.tsx`: a `recharts` `BarChart` comparing
   `limit_amount` vs `spent` per category (sorted by `percentage` desc, top N). All EUR
   `tickFormatter`/`Tooltip` values route through `formatPrivateAmount`.
2. Privacy audit: `grep -rn "€\|toLocaleString\|NumberFormat\|tickFormatter" frontend/src/components/dashboard/Budget*`
   and confirm every EUR rendering is masked; percentages/status stay unmasked.
3. Docs:
   - Prepend a CHANGELOG entry (date `2026-06-27`, title "Budgets") summarizing the feature
     and listing key files (model/service/router, page/components, tests).
   - README "Features": add a **Budgets** subsection (monthly category limits, percentile
     suggestion, progress + status thresholds).
   - PRD §3 + §6.1: move/mark "Budgeting: Set and track spending limits by category" as
     implemented.
4. Final full verification (all four invariants below).

### Verification
```bash
cd backend && python -m pytest -q
cd frontend && npm run build && CI=true npm test -- --watchAll=false
cd backend && python -c "import app.main"
```

### Exit criteria
- Chart renders and is privacy-correct (no raw EUR leaks when privacy mode is on).
- CHANGELOG, README, and PRD updated.
- Full backend + frontend test suites and builds are green.

---

## Rollback notes
- Backend is additive (new table/model/service/router + registration lines). To roll back a
  step: remove the new file(s) and revert the small registration edits; the `budgets` table
  can be dropped via `POST /debug/reset-database?reset_type=budgets` (added in Step 1) or left
  in place (harmless).
- Frontend is additive (new route, sidebar entry, new components/types/service). Roll back by
  reverting `App.tsx`/`Sidebar.tsx` edits and deleting the new files.
- Each step is its own commit, so `git revert <step-commit>` cleanly undoes a single step.
