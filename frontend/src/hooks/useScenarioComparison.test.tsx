import { act, renderHook, waitFor } from '@testing-library/react';
import { useScenarioComparison } from './useScenarioComparison';
import { calculateProjection, compareScenarios } from '../services/projectionService';
import { ScenarioComparison } from '../types/projections';

jest.mock('../services/projectionService');
const compare = compareScenarios as jest.MockedFunction<typeof compareScenarios>;
const calculate = calculateProjection as jest.MockedFunction<typeof calculateProjection>;
const data: ScenarioComparison = {
  scenario_names: ['Baseline'], dates: ['2027-01'], net_worth_series: { Baseline: [100] },
  savings_series: { Baseline: [10] }, investment_series: { Baseline: [20] },
  real_net_worth_series: { Baseline: [90] }, real_savings_series: { Baseline: [9] },
  real_investment_series: { Baseline: [18] }, inflation_rates: { Baseline: 0.02 },
  historical_dates: [], actual_net_worth: [], real_actual_net_worth: [],
};
const ids = [1, 2];
beforeEach(() => {
  jest.resetAllMocks();
  compare.mockResolvedValue(data);
  calculate.mockResolvedValue(undefined);
});

test('preserves the previous comparison when a batch calculation partially fails', async () => {
  const { result } = renderHook(() => useScenarioComparison(ids));
  await waitFor(() => expect(result.current.comparisonData).toEqual(data));
  calculate.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await result.current.calculateAll(); });
  expect(result.current.error).toMatch(/Some may have completed/);
  expect(result.current.comparisonData).toEqual(data);
  expect(result.current.calculatedAt).toBeNull();
});

test('does not let an old selection overwrite the current comparison', async () => {
  let resolveOld!: (value: ScenarioComparison) => void;
  compare.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  const { result, rerender } = renderHook(({ selection }) => useScenarioComparison(selection), { initialProps: { selection: ids } });
  rerender({ selection: [2] });
  await waitFor(() => expect(result.current.comparisonData).toEqual(data));
  await act(async () => { resolveOld({ ...data, scenario_names: ['Wrong selection'] }); });
  expect(result.current.comparisonData).toEqual(data);
});

test('records a success time only after all calculations and the reload succeed', async () => {
  const { result } = renderHook(() => useScenarioComparison(ids));
  await waitFor(() => expect(result.current.comparisonData).toEqual(data));
  await act(async () => { expect(await result.current.calculateAll()).toBe(true); });
  expect(calculate.mock.calls).toEqual([[1], [2]]);
  expect(result.current.calculatedAt).toBeInstanceOf(Date);
  expect(result.current.error).toBeNull();
});

test('clears the loading state when every scenario is deselected during a request', async () => {
  compare.mockImplementation(() => new Promise(() => {}));
  const { result, rerender } = renderHook(({ selection }) => useScenarioComparison(selection), { initialProps: { selection: ids } });
  await waitFor(() => expect(result.current.isLoading).toBe(true));
  rerender({ selection: [] });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.comparisonData).toBeNull();
});
