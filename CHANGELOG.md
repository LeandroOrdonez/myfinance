# MyFinance Changelog

## 2025-05-04

### Backend Refactoring
- Refactored backend API to use FastAPI routers for better organization
- Created separate router modules for transactions, statistics, and suggestions
- Added new weekday distribution endpoint for transaction analysis by day of week
- Fixed transaction_type query parameter to use TransactionType enum
- Improved database reset functionality to allow selective table resets

### Frontend Enhancements
- Added WeekdayDistribution component for visualizing transaction patterns by weekday
- Implemented interactive legend for charts to toggle data series visibility
- Added period selectors (3m, 6m, YTD, 1y, 2y, All) for consistent time filtering
- Fixed currency display to use EUR symbol consistently

### Security Features
- Added PIN lock screen with framer-motion animations
- Implemented authentication system with persistent state
- Added security features like lockout after failed attempts
- Created logout button for easy app locking

## 2025-05-05

### Financial Health Feature
- Added `FinancialHealthScore`, `Recommendation`, and `HealthGoal` models.
- Implemented `FinancialHealthService.compute_health_score` with metrics: budget adherence, debt-to-income ratio, emergency fund ratio, spending stability.
- Added router endpoints: `/health/score`, `/health/history`, `/health/recommendations`, `/health/goals`.
- Registered `financial_health` router in `main.py`.

### Frontend Financial Health
- New `FinancialHealthDashboard` component under `src/components/dashboard`.
- Extended API service with `getHealthScore` and `getHealthHistory`.
- Updated sidebar to include “Health” menu item.
- Registered `/health` route in `App.tsx`.
