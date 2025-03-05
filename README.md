# MyFinance

A personal finance management application with a FastAPI backend and React frontend.

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