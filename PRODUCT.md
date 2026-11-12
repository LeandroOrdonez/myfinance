# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals and households managing their own personal finances. Professional advisor/client workflows are not a confirmed product priority.

## Product Purpose

Help people understand where their money goes and identify meaningful spending patterns without maintaining a manual spreadsheet. Understanding spending is the primary outcome; budgeting, financial health indicators, and projections support that outcome rather than displacing it.

## Operating Context

MyFinance is a local-first, self-hosted browser application. It must remain usable on desktop and mobile web; a native application is not a confirmed requirement.

The existing core workflow is to import bank transactions, review and correct categories, then explore income, expenses, savings, and category trends. Users can filter transactions and adjust analysis periods to investigate their finances.

## Capabilities and Constraints

Existing implementation and documentation establish:

- ING and KBC CSV imports, automatic category suggestions, and manual category correction.
- Searchable, filterable, sortable, paginated transactions with editing and deletion/undo workflows.
- Dashboard and analytics views for income, expenses, savings, cash flows, and category trends.
- Monthly category budgets with suggested limits and actual-spend comparisons.
- Financial health metrics and recommendations, projection scenarios, and anomalous-transaction review.
- React/TypeScript frontend, FastAPI backend, and SQLAlchemy/SQLite persistence, with Docker Compose deployment.

Confirmed durable constraints:

- Preserve local-first, self-hosted operation and user control of financial data; do not make a cloud service mandatory.
- Preserve desktop and mobile browser usability.
- Preserve privacy mode for masking monetary amounts and support for light and dark themes.

CSV import is an existing capability, not a confirmed restriction against other import mechanisms. Additional bank integrations, multi-currency expansion, cloud sync, and native applications are not confirmed commitments.

The current PIN/authentication flow is incomplete according to the README, and frontend authentication state is persisted in localStorage. Do not present this as production-grade account security. Privacy masking is a display feature, not an access-control guarantee.

## Brand Commitments

The existing product name is MyFinance. No new voice, visual identity, or aesthetic direction was established during initialization.

## Evidence on Hand

- `README.md`: current feature descriptions, development/deployment instructions, and CSV import guardrails.
- `PRD.md`: existing product and workflow documentation. The user confirmed individuals and households as the primary audience; the broader advisor audience listed there is not a confirmed priority.
- `frontend/src/App.tsx`: implemented routes for Dashboard, Analytics, Transactions, Financial Health, Projections, Anomalies, and Budgets.
- `frontend/src/contexts/PrivacyContext.tsx`: persistent privacy-mode preference.
- `frontend/src/contexts/AuthContext.tsx`: current browser-side authentication state.
- `frontend/public/myfinance.gif`: demo asset referenced by the README; not verified here as a current visual baseline.

No testimonials, adoption figures, commercial plan entitlements, or validated financial-outcome claims were established. Existing UI labels such as “Pro Plan” are not evidence of a commercial offering. Do not invent proof or imply that computed recommendations guarantee financial outcomes.

## Product Principles

1. Make spending understandable before adding analytical complexity.
2. Keep transaction review and correction straightforward so insights remain grounded in the user's records.
3. Keep users in control of where financial data is stored and processed.
4. Preserve discretion through amount masking and useful access from desktop and mobile browsers.
5. Distinguish recorded financial history from estimates, projections, and recommendations.

## Open Decisions

- The exact usage cadence, household collaboration model, and account/role requirements are not established.
- Language/localization, supported currency policy, and product-specific accessibility requirements remain undecided.
- No exclusive CSV-first strategy or future bank-connection commitment was confirmed.
- No differentiated market-positioning claim or measurable success target was confirmed.
