# MyFinance

A personal finance manager for tracking, categorizing, and analyzing your financial transactions. Built as a monorepo with a FastAPI backend and a React + TypeScript frontend, MyFinance helps you import, view, and analyze your spending and income.

<p align="center">
  <img src="frontend/public/myfinance.gif" alt="MyFinance App Demo" width="800">
</p>

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Docker Setup](#docker-setup)
  - [Running Locally Without Docker](#running-locally-without-docker)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Features

### Transaction Management
- Import transactions via CSV (supports ING & KBC formats)
- List, filter, search, and sort transactions
- Edit transaction details and categories
- Delete transactions with undo functionality
- Pagination support for large data sets

### Automatic Categorization
- ML-powered category suggestions based on history
- Learns from manual corrections to improve accuracy

### Financial Analytics
- Dashboard showing savings, expenses, and income
- Interactive charts over time and by category
- Monthly and yearly summary views
- Detailed timeseries data for category-level and expense-type analysis
- Essential vs. discretionary expense tracking

### Financial Health
- Comprehensive financial health scoring system (0-100 scale)
- Multiple financial metrics tracked and scored:
  - Savings rate
  - Expense ratio
  - Budget adherence
  - Debt-to-income ratio
  - Emergency fund
  - Spending stability
  - Investment rate
- Personalized recommendations based on financial weaknesses
- Historical trends visualization
- Recommendation tracking system

### Financial Projections
- Future financial scenario modeling based on historical patterns
- Multiple projection scenarios with customizable parameters:
  - Base Case (current patterns)
  - Optimistic Case (improved financial situation)
  - Conservative Case (cautious outlook)
  - Expense Reduction (focus on reducing spending)
  - Investment Focus (prioritize investments)
- Adjustable parameters including income growth, expense growth, investment rate, current market value of investments, and more
- Support for entering current market value of investments to provide more accurate projections
- Visualization of projected outcomes:
  - Net Worth Projection
  - Income vs. Expenses
  - Savings Growth
  - Investment Growth
- Scenario comparison for side-by-side analysis

### Anomalous Transaction Detection
- Comprehensive anomaly detection system for identifying exceptional transactions
- Multiple detection algorithms:
  - Statistical outliers using Z-score analysis
  - Temporal anomalies (unusual timing patterns)
  - Amount anomalies (transactions in top percentiles)
  - Frequency anomalies (unusual merchant transaction frequency)
  - Behavioral anomalies (new category usage patterns)
  - Merchant anomalies (first-time large transactions)
- Intelligent scoring system (0-100 scale) with severity levels
- Automated detection on transaction imports
- Review and management system with status tracking
- False positive handling and learning capabilities

### User Experience
- PIN-based authentication system (not yet fully implemented, PIN hard-coded to 1234)
- Dark/light theme support

## Architecture

- **Monorepo** layout with separate `backend` and `frontend` directories
- **Backend**: FastAPI, SQLAlchemy (SQLite), Pandas for CSV parsing, simple ML service for categorization
- **Frontend**: React + TypeScript, Tailwind CSS, React Router, Lucide React icons

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Python, FastAPI, SQLAlchemy, Pandas |
| Frontend  | React, TypeScript, Tailwind CSS     |
| Database  | SQLite (persistent via Docker volume)|
| Dev Ops   | Docker, Docker Compose              |

## Getting Started

### Prerequisites

- Node.js (>=14.x) & npm or Yarn
- Python 3.8+
- Docker & Docker Compose (optional but recommended)

### Docker Setup

```bash
docker-compose up -d --build
```

- Frontend: http://localhost:8080
- Backend API & docs: http://localhost:8000/docs

### Running Locally Without Docker

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run start
```

## Usage

- Browse the API endpoints via Swagger UI at `/docs`
- Import transactions using the CSV uploader in the frontend
- Navigate between the Dashboard and Transactions list

### Upload Limits & Guardrails

To ensure reliable and safe CSV imports, the uploader enforces several guardrails:

- **File type**: Only CSV files are accepted. Browsers may report MIME as `text/csv`, `application/csv`, or `application/vnd.ms-excel`.
- **Max file size**: 5 MB per upload.
- **Rate limiting**: 3 uploads per minute per IP (basic in-memory limiter on the server).
- **Row cap**: Maximum 5,000 rows per CSV.
- **Creation cap**: Maximum 2,000 new transactions created per upload (additional rows will be ignored after the cap is reached).
- **Duplicate prevention**: Existing transactions are skipped using a uniqueness check on `account_number`, `transaction_date`, `amount`, `description`, and `source_bank`.

If an upload fails, typical error messages include:

- `413 File too large` – Reduce the file size below 5 MB.
- `415 Unsupported media type` – Ensure the file is a CSV.
- `429 Too many uploads` – Wait a minute before retrying.
- `400 Invalid CSV` – Ensure the file is a supported bank export (ING or KBC) and not modified.

Tip: If you have a very large history, consider splitting exports into multiple CSVs and uploading them over time.

## Project Structure

```
myfinance/
├── backend/         # FastAPI server, models, services
├── frontend/        # React app (TSX, hooks, components)
├── docker-compose.yaml
└── README.md        # Project overview and setup
```

## Contributing

Contributions are welcome! Please open issues or pull requests to improve features, fix bugs, or enhance documentation.