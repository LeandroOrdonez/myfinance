# MyFinance Changelog

## 2025-05-19

### Accessibility Improvements
- Updated projection comparison charts to use a colorblind-friendly color palette
- Implemented consistent color scheme across all comparison charts (Savings, Net Worth, and Investment)
- Improved chart readability for users with color vision deficiencies

### Projection Calculation Enhancement
- Modified `calculate_projection` method to use the latest `total_net_savings` value from `FinancialStatistics` instead of assuming initial net worth to be 6 times current income
- Added fallback to previous calculation method if statistics data is unavailable

### Projection Components Refactoring
- Refactored projection components to remove shadcn-ui dependencies
- Created custom hooks for better state management (useProjectionScenarios, useProjectionResults, useScenarioComparison)
- Fixed infinite API call issues in projection components

## 2025-05-18

### Financial Projection Feature Implementation
- Added new Financial Projection feature for visualizing future financial scenarios
- Created backend models for projection scenarios, parameters, and results
- Implemented projection engine to analyze historical patterns and generate projections
- Added API endpoints for managing scenarios and calculating projections
- Developed frontend components for scenario management and visualization
- Implemented multiple default scenarios (Base Case, Optimistic, Conservative, etc.)
- Added scenario comparison functionality to compare different financial paths
- Integrated with existing financial health and statistics features

## 2025-05-17

### Analytics Dashboard Enhancement
- Added new `CategoryTimeseriesChart` component to visualize category spending trends over time
- Added new `ExpenseTypeTimeseriesChart` component to compare essential vs discretionary spending trends

### Statistics Timeseries API Enhancements
- Added new `/statistics/category/timeseries` endpoint for tracking category statistics over time
- Added new `/statistics/expense-type/timeseries` endpoint for analyzing essential vs discretionary spending trends
- Implemented filtering by date range, category name, transaction type, and expense type
- Enhanced API documentation with detailed parameter descriptions

### Essential vs Discretionary Expense Visualization
- Redesigned CategoryTrends component to focus on essential vs discretionary spending
- Implemented detailed category listings for both essential and discretionary expenses
- Optimized component layout and removed redundant Top Categories tab

## 2025-05-16

### Expense Type Statistics Endpoint
- Added new `/statistics/by-expense-type` endpoint to analyze spending by essential vs discretionary categories
- Implemented aggregation of expense data by expense type
- Added detailed category breakdown within each expense type
- Included period-specific, cumulative, and yearly metrics for each expense type

## 2025-05-15

### Expense Classification Enhancement
- Added classification of expense categories as essential or discretionary
- Updated ExpenseCategory model with expense_type property and helper methods
- Enhanced emergency fund calculation to focus on essential expenses only
- Added expense_type field to CategoryStatistics for better expense analysis
- Created database migration for expense type classification

## 2025-05-10

### User Experience Improvements
- Added welcoming splash screen for first-time users
- Implemented personalized greeting system based on user's name and time of day
- Added context-aware page descriptions for different sections of the app
- Set default time period to '1y' for trend charts instead of 'all'
- Enhanced recommendations with priority and year filters
- Added bulk completion feature for recommendations with confirmation dialog

### Financial Health Calculation Improvements
- Enhanced emergency fund calculation to exclude investment expenses
- Moved spending stability thresholds to centralized constants
- Fixed potential division by zero issues in financial calculations

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
