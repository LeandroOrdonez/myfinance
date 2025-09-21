# MyFinance Changelog

## 2025-09-21

### Backend – Category Suggestions Learn from Manual Edits
- Manual category edits via `PATCH /transactions/{id}/category` now update the suggestion index
- Implementation: after commit and refresh in `update_transaction_category()`, call `category_suggestion_service.add_transaction(transaction)`
- Keeps the vector index consistent with the latest category and learns from corrections

## 2025-09-20

### Backend – Anomaly Detection Scope Restricted to Expenses
- Restricted anomaly detection to run only on expense transactions to avoid flagging income entries
- Updated `AnomalyDetectionService.detect_anomalies` to fetch only `TransactionType.EXPENSE`
- Adjusted all detectors to operate solely on expenses and expense categories:
  - `_detect_statistical_outliers`: compares against historical expense transactions in the same `expense_category`
  - `_detect_amount_anomalies`: percentile baselines now computed from expenses only
  - `_detect_frequency_anomalies`: merchant frequency checks filtered to expense transactions and `counterparty_account`
  - `_detect_behavioral_anomalies`: category usage checks use `expense_category` only and expense transactions
  - `_detect_merchant_anomalies`: “new merchant account” logic considers only expense transactions
- Ensures anomalies reflect unusual spending patterns rather than income inflows
 
### Upload Guardrails

- Implemented comprehensive safeguards for CSV uploads to prevent abuse and improve reliability:
- Backend:
  - Enforced CSV content types and `.csv` filename extension
  - Added 5 MB maximum upload size with streaming writes to temp file (prevents loading whole file in memory)
  - Basic per-IP rate limiting: max 3 uploads per minute
  - Row cap: max 5,000 rows parsed per upload
  - Creation cap: max 2,000 new transactions created per upload; remaining rows ignored
  - Clear error responses for size (413), type (415), rate limit (429), and invalid CSV (400)
  - Preserved duplicate skipping and post-import anomaly detection
- Frontend:
  - Added client-side validation for type (MIME and extension) and size (5 MB)
  - Improved error messages based on server status codes
  - Reset file input after each attempt; success toast shows number of imported transactions
- Documentation: Added "Upload Limits & Guardrails" section to README.

## 2025-09-18

### Projection Realism Guardrail
- Added a guardrail in `ProjectionService.calculate_projection` to cap projected monthly expenses to a share of income based on the historical expense-to-income ratio (with a hard 95% ceiling)
- Proportionally scales essential and discretionary expenses when the cap is hit to maintain composition
- Extended `analyze_historical_data` to return `avg_expense_to_income_ratio`
- Updated README to document this behavior

## 2025-09-14

### Anomalous Transaction Detection System
- **New Feature**: Comprehensive anomaly detection system for identifying exceptional transactions
- **Backend Models**: Added `TransactionAnomaly`, `AnomalyPattern`, and `AnomalyRule` models with support for multiple anomaly types
- **Detection Methods**: Implemented 6 detection algorithms:
  - Statistical outliers using Z-score analysis
  - Temporal anomalies (unusual timing patterns)
  - Amount anomalies (transactions in top percentiles)
  - Frequency anomalies (unusual merchant transaction frequency)
  - Behavioral anomalies (new category usage patterns)
  - Merchant anomalies (first-time large transactions)
- **Scoring System**: 0-100 anomaly scores with severity levels (Low, Medium, High, Critical)
- **API Endpoints**: Complete REST API for anomaly detection, review, and management
- **Frontend Components**: 
  - `AnomalyDashboard` for statistics and detection controls
  - `AnomalyList` for reviewing and managing detected anomalies
  - Integration with main navigation and routing
- **Automated Detection**: Anomaly detection runs automatically on new transaction imports and restorations
- **Review System**: Status tracking (Detected, Reviewed, Confirmed, False Positive) with review notes

## 2025-09-11

### Backend – Projection Robustness
- Applied winsorization (5th–95th percentiles) to income, expenses, and savings in `ProjectionService.analyze_historical_data` before averaging
- Added `_winsorize` helper; removed prior IQR-based outlier removal
- Kept YoY growth on raw data; winsorized per-month sums for essential/discretionary aggregation

## 2025-05-30

### UI Enhancement
- Enhanced the Loading component with multiple variants (skeleton, spinner, progress)
- Added customizable sizes (small, medium, large) to the Loading component
- Implemented subtle pulsating animations for improved visual feedback
- Added custom progress animation for a more engaging user experience
- Improved component flexibility with optional text display

## 2025-05-29

### API Enhancement
- Added optional `time_period` parameter to multiple endpoints:
  - `/statistics/timeseries` for overall financial trends
  - `/statistics/category/timeseries` for category-specific trends
  - `/statistics/expense-type/timeseries` for essential vs. discretionary analysis
  - `/statistics/category/averages` for category average calculations
- Created new `TimePeriod` enum in transaction schema to represent relative time periods (3M, 6M, YTD, 1Y, 2Y, ALL_TIME)
- Implemented dynamic date range calculation based on the latest transaction date
- Enhanced API flexibility by supporting both explicit date ranges and relative time periods
- Refined time period filtering to use the last day of the month for more accurate period boundaries

### Frontend Enhancement
- Updated all chart components to use the new time_period parameter:
  - `FinancialTrends` for overall financial statistics
  - `CategoryTimeseriesChart` for category-specific trends
  - `ExpenseTypeTimeseriesChart` for essential vs. discretionary spending
  - `CategoryAverages` for average spending by category
- Simplified frontend code by removing manual date range calculations
- Improved type safety by using the TimePeriod enum throughout the codebase
- Standardized period selector UI across all chart components

## 2025-05-28

### Projection Functionality Enhancement
- Enhanced growth rate calculations using year-over-year comparison method
- Added separate growth tracking for essential and discretionary expenses
- Improved base case scenario to use personalized historical growth rates
- Added `is_base_scenario` field to projection scenarios for better identification
- Implemented base scenario parameter recomputation with latest financial data
- Added one-click update button for base scenario in the frontend

## 2025-05-25

### Projection Functionality Enhancement
- Added optional holdings market value field for investments in projection scenarios
- Enhanced net worth calculations to include existing investment portfolio value
- Updated frontend components to allow users to input and edit holdings market value
- Improved projection accuracy by accounting for existing investments
- Modified expense calculations to exclude investment expenses for more accurate projections
- Implemented average investment rate calculation based on two years of historical data

### Transaction Management Improvements
- Enhanced CSV upload functionality to prevent duplicate transactions from being stored
- Added warning messages when duplicate transactions are detected during import
- Implemented transaction uniqueness check based on account number, date, amount, description, and source bank
- Added summary logging for skipped duplicate transactions

## 2025-05-24

### Theme System Improvements
- Enhanced theme system to automatically detect and respond to system color scheme preferences
- Added support for three theme modes: light, dark, and system (automatic)

### UI Enhancements
- Added new `CategoryAverages` component to visualize average spending/income by category
- Implemented period selection (3M, 6M, YTD, 1Y, 2Y, All) for flexible time range analysis
- Added transaction type toggle to switch between expense and income categories
- Created color-coded bar chart visualization with detailed tooltips
- Included summary section with key statistics for the selected period
- Simplified WeekdayDistribution component by removing redundant chart options

## 2025-05-23

### API Enhancements
- Added new `/statistics/category/averages` endpoint to calculate average income/expenses per category over a specified time period
- Implemented using existing `CategoryStatistics` model for consistency and efficiency
- Provides monthly averages, totals, percentages, and transaction counts for each category
- Made date parameters optional with sensible defaults to improve API usability

### Code Refactoring
- Completely refactored the API service architecture for better code organization
- Created dedicated `statisticService`, `financialHealthService` and `transactionService` modules
- Removed the centralized API service in favor of specialized service modules
- Improved code maintainability by separating concerns and reducing module coupling

## 2025-05-21

### Bug Fixes
- Fixed percentage value handling in the ParameterEditor component by implementing a local state approach for input values
- Added input debouncing with onBlur event to only update parameters when input is complete
- Corrected value conversion when switching between parameter types
- Improved user experience when editing percentage and numeric parameters
- Fixed type conversion issue in projection API endpoints where SQLAlchemy model instances were not properly converted to Pydantic schema instances
- Updated `get_scenario_detail` and `get_scenario_parameters` endpoints to explicitly convert between model types

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
