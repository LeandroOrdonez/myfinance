# MyFinance Changelog

## 2025-05-09

### Investment Rate Metric Implementation
- Added new investment rate metric to the Financial Health feature
- Updated FinancialHealth model to include investment_rate_score and investment_rate fields
- Implemented investment rate calculation based on income and investment transactions
- Added investment rate thresholds for score calculation
- Updated the overall health score calculation to include the investment rate metric
- Added investment-specific recommendations based on investment rate score
- Updated frontend components to display investment rate metric and trends
- Enhanced financial health history to include investment rate scores

## 2025-05-07

### Financial Health Feature Enhancements
- Added dark theme support to all Financial Health components
- Fixed duplicate title in Financial Health dashboard
- Updated PeriodSelector component with improved styling for both light and dark themes
- Improved recommendation storage with proper dual-storage implementation
- Enhanced health history calculation to use the latest transaction date as reference

## 2025-05-05

### Financial Health Feature
- Implemented comprehensive Financial Health scoring system (0-100 scale)
- Created new models and schemas for financial health metrics and recommendations
- Added backend service for calculating health scores based on multiple financial metrics
- Developed personalized recommendation system based on financial weaknesses
- Created new API endpoints for retrieving health scores, history, and recommendations
- Built interactive Financial Health dashboard with score visualization and trends
- Added component score breakdown with visual indicators
- Implemented recommendation tracking system with completion status

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
