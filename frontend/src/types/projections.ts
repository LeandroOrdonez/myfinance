export type ParamType = 'percentage' | 'amount' | 'months' | 'integer' | 'boolean';

export interface ProjectionParameterBase {
  param_name: string;
  param_value: number;
  param_type: ParamType;
}

export interface ProjectionParameterCreate extends ProjectionParameterBase {}

export interface ProjectionParameter extends ProjectionParameterBase {
  id: number;
  scenario_id: number;
}

export interface ProjectionScenarioBase {
  name: string;
  description: string;
  is_default: boolean;
  is_base_scenario?: boolean;
}

export interface ProjectionScenarioCreate extends ProjectionScenarioBase {
  parameters: ProjectionParameterCreate[];
}

export interface ProjectionScenario extends ProjectionScenarioBase {
  id: number;
  created_at: string;
  user_id?: number;
  parameters?: ProjectionParameter[];
}

export interface ProjectionResultBase {
  month: number;
  year: number;
  projected_income: number;
  projected_expenses: number;
  projected_investments: number;
  projected_savings: number;
  projected_net_worth: number;
}

export interface ProjectionResult extends ProjectionResultBase {
  id: number;
  scenario_id: number;
  created_at: string;
}

export interface ProjectionTimeseries {
  dates: string[];
  projected_income: number[];
  projected_expenses: number[];
  projected_investments: number[];
  projected_savings: number[];
  projected_net_worth: number[];
  // Real (inflation-adjusted) values in today's purchasing power
  real_projected_income: number[];
  real_projected_expenses: number[];
  real_projected_investments: number[];
  real_projected_savings: number[];
  real_projected_net_worth: number[];
  inflation_rate: number;
  // Actual net worth for the months before the projection (null where no holdings value was recorded)
  historical_dates: string[];
  actual_net_worth: (number | null)[];
  real_actual_net_worth: (number | null)[];
}

export interface ScenarioComparison {
  scenario_names: string[];
  dates: string[];
  net_worth_series: Record<string, number[]>;
  savings_series: Record<string, number[]>;
  investment_series: Record<string, number[]>;
  // Real (inflation-adjusted) series
  real_net_worth_series: Record<string, number[]>;
  real_savings_series: Record<string, number[]>;
  real_investment_series: Record<string, number[]>;
  inflation_rates: Record<string, number>;
  // Actual net worth before the projection, shared by all scenarios (null where no holdings value was recorded)
  historical_dates: string[];
  actual_net_worth: (number | null)[];
  real_actual_net_worth: (number | null)[];
}
