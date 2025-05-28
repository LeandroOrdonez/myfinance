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
}

export interface ScenarioComparison {
  scenario_names: string[];
  dates: string[];
  net_worth_series: Record<string, number[]>;
  savings_series: Record<string, number[]>;
  investment_series: Record<string, number[]>;
}
