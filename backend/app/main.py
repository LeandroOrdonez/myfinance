from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from .database import get_db
from .database_manager import init_database, reset_database

# Import routers
from .routers import transactions, statistics, suggestions, financial_health, projections

# Initialize the database
init_database()

app = FastAPI(title="MyFinance API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(suggestions.router)
app.include_router(transactions.router)
app.include_router(statistics.router)
app.include_router(financial_health.router)
app.include_router(projections.router)

# Add a debug endpoint to reset the database
# pass statistics or transactions to reset only statistics or transactions  
@app.post("/debug/reset-database")
def debug_reset_database(reset_type: str = "all"):
    try:
        reset_database(reset_type)
        return {"message": "Database reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
