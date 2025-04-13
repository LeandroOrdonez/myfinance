# MyFinance

A personal finance management application designed to help users track, categorize, and analyze their financial transactions. MyFinance provides a comprehensive dashboard for visualizing spending patterns, income sources, and savings trends, enabling users to make informed financial decisions.

## Features

### Transaction Management
- Import bank transaction data from CSV files (supports ING and KBC formats)
- View, filter, and search transactions
- Update transaction categories and details
- Delete transactions with undo capability

### Automatic Categorization
- Smart category suggestions based on transaction descriptions and amounts
- System learns and improves suggestions over time
- Predefined categories for both expenses and income

### Financial Analytics
- Dashboard showing key financial metrics (savings, income, expenses)
- Visual breakdown of spending by category
- Charts showing financial trends over time
- Analysis of spending patterns by category

### Data Management
- Local storage of financial data
- Data persistence through Docker volumes
- All data stored locally for privacy

## Docker Setup

This project is fully dockerized for easy deployment.

### Prerequisites

- Docker and Docker Compose installed on your system

### Running the Application

1. Clone this repository
2. From the project root directory, run:

```bash
docker-compose up -d
```

3. The application will be available at:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000

### Data Persistence

The database file is stored in a Docker volume that maps to `./backend/app/data` on your host system. This ensures that your data persists even if you remove and recreate the containers.

### Rebuilding the Application

If you make changes to the code, you can rebuild the containers with:

```bash
docker-compose up -d --build
```

### Stopping the Application

```bash
docker-compose down
```

## Development without Docker

Refer to CLAUDE.md for development commands when working outside of Docker.

## Technical Stack

### Frontend
- React with TypeScript
- Functional components with hooks
- Tailwind CSS for responsive design
- React Router for navigation

### Backend
- FastAPI (Python)
- SQLAlchemy ORM with SQLite database
- RESTful API endpoints
- Pandas for CSV parsing and data manipulation
- Simple ML model for category suggestions