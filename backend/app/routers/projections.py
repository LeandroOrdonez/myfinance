from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime
import logging

from ..database import get_db
from ..models.financial_projection import ProjectionScenario, ProjectionParameter, ProjectionResult
from ..schemas import financial_projection as schemas
from ..services.projection_service import ProjectionService

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/projections",
    tags=["projections"]
)


@router.get("/scenarios", response_model=List[schemas.ProjectionScenarioDetail])
def get_scenarios(db: Session = Depends(get_db)):
    """Get all projection scenarios"""
    try:
        scenarios = db.query(ProjectionScenario).all()
        if not scenarios:
            # Create default scenarios if none exist
            scenarios = ProjectionService.create_default_scenarios(db)
        return scenarios
    except Exception as e:
        logger.error(f"Error retrieving projection scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios", response_model=schemas.ProjectionScenarioDetail)
def create_scenario(
    scenario_data: schemas.ProjectionScenarioCreate,
    db: Session = Depends(get_db)
):
    """Create a new projection scenario with parameters"""
    try:
        # Create the scenario
        scenario = ProjectionScenario(
            name=scenario_data.name,
            description=scenario_data.description,
            is_default=scenario_data.is_default,
            created_at=date.today()
        )
        db.add(scenario)
        db.flush()  # Get the ID
        
        # Add parameters
        for param_data in scenario_data.parameters:
            param = ProjectionParameter(
                scenario_id=scenario.id,
                param_name=param_data.param_name,
                param_value=param_data.param_value,
                param_type=param_data.param_type
            )
            db.add(param)
        
        db.commit()
        
        # Return the scenario with parameters
        return get_scenario_detail(scenario.id, db)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating projection scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios/{scenario_id}", response_model=schemas.ProjectionScenarioDetail)
def get_scenario_detail(
    scenario_id: int = Path(..., description="ID of the scenario to retrieve"),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific scenario including parameters"""
    try:
        scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
            
        # Get parameters
        parameters = db.query(ProjectionParameter).filter(
            ProjectionParameter.scenario_id == scenario_id
        ).all()
        
        # Convert SQLAlchemy model instances to Pydantic schema instances
        pydantic_parameters = [
            schemas.ProjectionParameter(
                id=param.id,
                scenario_id=param.scenario_id,
                param_name=param.param_name,
                param_value=param.param_value,
                param_type=param.param_type
            ) for param in parameters
        ]
        
        # Combine into response
        result = schemas.ProjectionScenarioDetail(
            id=scenario.id,
            name=scenario.name,
            description=scenario.description,
            is_default=scenario.is_default,
            created_at=scenario.created_at,
            user_id=scenario.user_id,
            parameters=pydantic_parameters
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving scenario details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/scenarios/{scenario_id}", response_model=schemas.ProjectionScenarioDetail)
def update_scenario(
    scenario_id: int,
    scenario_data: schemas.ProjectionScenarioCreate,
    db: Session = Depends(get_db)
):
    """Update a projection scenario and its parameters"""
    try:
        # Check if scenario exists
        scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
            
        # Update scenario fields
        scenario.name = scenario_data.name
        scenario.description = scenario_data.description
        scenario.is_default = scenario_data.is_default
        
        # Delete existing parameters
        db.query(ProjectionParameter).filter(ProjectionParameter.scenario_id == scenario_id).delete()
        
        # Add new parameters
        for param_data in scenario_data.parameters:
            param = ProjectionParameter(
                scenario_id=scenario_id,
                param_name=param_data.param_name,
                param_value=param_data.param_value,
                param_type=param_data.param_type
            )
            db.add(param)
        
        db.commit()
        
        # Return updated scenario with parameters
        return get_scenario_detail(scenario_id, db)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating projection scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/scenarios/{scenario_id}", response_model=Dict[str, bool])
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """Delete a projection scenario and its parameters"""
    try:
        # Check if scenario exists
        scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
            
        # Don't allow deletion of default scenarios
        if scenario.is_default:
            raise HTTPException(status_code=400, detail="Cannot delete default scenarios")
            
        # Delete the scenario (parameters will be cascade deleted)
        db.delete(scenario)
        db.commit()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting projection scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios/{scenario_id}/parameters", response_model=List[schemas.ProjectionParameter])
def get_scenario_parameters(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """Get parameters for a specific scenario"""
    try:
        # Check if scenario exists
        scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
            
        # Get parameters
        parameters = db.query(ProjectionParameter).filter(
            ProjectionParameter.scenario_id == scenario_id
        ).all()
        
        # Convert SQLAlchemy model instances to Pydantic schema instances
        pydantic_parameters = [
            schemas.ProjectionParameter(
                id=param.id,
                scenario_id=param.scenario_id,
                param_name=param.param_name,
                param_value=param.param_value,
                param_type=param.param_type
            ) for param in parameters
        ]
        
        return pydantic_parameters
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving scenario parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios/{scenario_id}/calculate", response_model=Dict[str, bool])
def calculate_projection(
    scenario_id: int,
    time_horizon: int = Query(60, description="Number of months to project", ge=12, le=120),
    db: Session = Depends(get_db)
):
    """Calculate projection for a scenario"""
    try:
        # Check if scenario exists
        scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
            
        # Calculate projection
        ProjectionService.calculate_projection(db, scenario_id, time_horizon)
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error calculating projection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios/{scenario_id}/results", response_model=schemas.ProjectionTimeseries)
def get_projection_results(
    scenario_id: int,
    db: Session = Depends(get_db)
):
    """Get projection results for a scenario"""
    try:
        # Check if scenario exists
        scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
            
        # Get results
        results = ProjectionService.get_projection_results(db, scenario_id)
        
        return results
    except Exception as e:
        logger.error(f"Error retrieving projection results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios/compare", response_model=schemas.ScenarioComparison)
def compare_scenarios(
    scenario_ids: List[int],
    db: Session = Depends(get_db)
):
    """Compare multiple scenarios side by side"""
    try:
        if not scenario_ids:
            raise HTTPException(status_code=400, detail="No scenario IDs provided")
            
        # Check if all scenarios exist
        for scenario_id in scenario_ids:
            scenario = db.query(ProjectionScenario).filter(ProjectionScenario.id == scenario_id).first()
            if not scenario:
                raise HTTPException(status_code=404, detail=f"Scenario with ID {scenario_id} not found")
                
            # Check if projection has been calculated
            results = db.query(ProjectionResult).filter(ProjectionResult.scenario_id == scenario_id).first()
            if not results:
                # Calculate projection if not already done
                ProjectionService.calculate_projection(db, scenario_id)
        
        # Compare scenarios
        comparison = ProjectionService.compare_scenarios(db, scenario_ids)
        
        return comparison
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios/base/recompute", response_model=Dict[str, Any])
def recompute_base_scenario_parameters(db: Session = Depends(get_db)):
    """Recompute the parameters of the base scenario using the latest historical data
    
    This endpoint updates the base scenario to reflect the most recent financial patterns
    from the user's historical data. It's useful for keeping projections relevant
    as new financial data is added over time.
    """
    try:
        # Recompute base scenario parameters
        result = ProjectionService.recompute_base_case_parameters(db)
        
        # Calculate projection with new parameters
        ProjectionService.calculate_projection(db, result["scenario_id"])
        
        return result
    except Exception as e:
        logger.error(f"Error recomputing base scenario parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
