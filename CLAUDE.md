# MyFinance Dev Reference

## Commands

### Frontend
- Start dev server: `npm start` (in frontend directory)
- Build: `npm run build`
- Run all tests: `npm test`
- Run single test: `npm test -- -t "test name pattern"`
- Lint: Uses ESLint config from react-app

### Backend
- Start server: `uvicorn app.main:app --reload` (in backend directory)
- Install dependencies: `pip install -r requirements.txt`

## Code Style

### Frontend (React/TypeScript)
- Use functional components with hooks
- Strict TypeScript mode enabled - add proper type annotations
- Use Tailwind CSS for styling with clsx for conditionals
- Prefer async/await over raw promises
- Use named exports over default exports
- Component files should match their component name (PascalCase)

### Backend (Python/FastAPI)
- Type annotations required for all function parameters and returns
- Structured in models/, schemas/, services/ directories
- Use SQLAlchemy for database interactions
- Handle exceptions with try/except and proper HTTPExceptions
- Document API endpoints with docstrings and OpenAPI descriptions