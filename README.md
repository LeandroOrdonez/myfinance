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