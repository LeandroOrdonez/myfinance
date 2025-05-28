import { API_BASE_URL } from '../config';
import { 
  ProjectionScenario, 
  ProjectionScenarioCreate, 
  ProjectionTimeseries,
  ScenarioComparison
} from '../types/projections';

interface RecomputeResult {
  scenario_id: number;
  scenario_name: string;
  changes: Record<string, {
    old: number;
    new: number;
    type: string;
  }>;
  message: string;
}

// Fetch all scenarios
export async function fetchScenarios(): Promise<ProjectionScenario[]> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
  }
  return response.json();
}

// Fetch a specific scenario with details
export async function fetchScenarioDetail(scenarioId: number): Promise<ProjectionScenario> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/${scenarioId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scenario: ${response.statusText}`);
  }
  return response.json();
}

// Create a new scenario
export async function createScenario(scenarioData: ProjectionScenarioCreate): Promise<ProjectionScenario> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scenarioData),
  });
  if (!response.ok) {
    throw new Error(`Failed to create scenario: ${response.statusText}`);
  }
  return response.json();
}

// Update an existing scenario
export async function updateScenario(scenarioId: number, scenarioData: ProjectionScenarioCreate): Promise<ProjectionScenario> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/${scenarioId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scenarioData),
  });
  if (!response.ok) {
    throw new Error(`Failed to update scenario: ${response.statusText}`);
  }
  return response.json();
}

// Delete a scenario
export async function deleteScenario(scenarioId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/${scenarioId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete scenario: ${response.statusText}`);
  }
}

// Calculate projection for a scenario
export async function calculateProjection(scenarioId: number, timeHorizon: number = 60): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/${scenarioId}/calculate?time_horizon=${timeHorizon}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to calculate projection: ${response.statusText}`);
  }
}

// Fetch projection results for a scenario
export async function fetchProjectionResults(scenarioId: number): Promise<ProjectionTimeseries> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/${scenarioId}/results`);
  if (!response.ok) {
    throw new Error(`Failed to fetch projection results: ${response.statusText}`);
  }
  return response.json();
}

// Compare multiple scenarios
export async function compareScenarios(scenarioIds: number[]): Promise<ScenarioComparison> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scenarioIds),
  });
  if (!response.ok) {
    throw new Error(`Failed to compare scenarios: ${response.statusText}`);
  }
  return response.json();
}

// Recompute base scenario parameters using latest historical data
export async function recomputeBaseScenario(): Promise<RecomputeResult> {
  const response = await fetch(`${API_BASE_URL}/projections/scenarios/base/recompute`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to recompute base scenario: ${response.statusText}`);
  }
  return response.json();
}
