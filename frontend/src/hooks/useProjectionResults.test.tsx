import { act, renderHook, waitFor } from '@testing-library/react';
import { useProjectionResults } from './useProjectionResults';
import { calculateProjection, fetchProjectionResults } from '../services/projectionService';
import { ProjectionTimeseries } from '../types/projections';

jest.mock('../services/projectionService');
jest.mock('../contexts/PrivacyContext', () => ({ usePrivacyMode: () => ({ privacyMode: false }) }));

const fetchResults = fetchProjectionResults as jest.MockedFunction<typeof fetchProjectionResults>;
const calculate = calculateProjection as jest.MockedFunction<typeof calculateProjection>;
const data: ProjectionTimeseries = {
  dates: Array.from({ length: 60 }, (_, i) => `2030-${i + 1}`),
  projected_income: Array(60).fill(100), projected_expenses: Array(60).fill(50),
  projected_savings: Array(60).fill(20), projected_investments: Array(60).fill(30),
  projected_net_worth: Array(60).fill(1000), real_projected_income: Array(60).fill(90),
  real_projected_expenses: Array(60).fill(45), real_projected_savings: Array(60).fill(18),
  real_projected_investments: Array(60).fill(27), real_projected_net_worth: Array(60).fill(900),
  inflation_rate: 0.02, historical_dates: [], actual_net_worth: [], real_actual_net_worth: [],
};

beforeEach(() => {
  jest.resetAllMocks();
  fetchResults.mockResolvedValue(data);
  calculate.mockResolvedValue(undefined);
});

test('uses the selected value basis for every summary metric', async () => {
  const { result, rerender } = renderHook(({ real }) => useProjectionResults(1, real), { initialProps: { real: false } });
  await waitFor(() => expect(result.current.projectionData).toEqual(data));
  expect(result.current.getSummaryData().oneYear).toEqual({ netWorth: 1000, savings: 20, investments: 30 });
  rerender({ real: true });
  expect(result.current.getSummaryData().oneYear).toEqual({ netWorth: 900, savings: 18, investments: 27 });
});

test('preserves previous results and exposes a failed calculation without a success timestamp', async () => {
  const { result } = renderHook(() => useProjectionResults(1));
  await waitFor(() => expect(result.current.projectionData).toEqual(data));
  calculate.mockRejectedValue(new Error('offline'));
  await act(async () => { await result.current.calculateResults(); });
  expect(result.current.projectionData).toEqual(data);
  expect(result.current.error).toMatch(/calculate/i);
  expect(result.current.calculatedAt).toBeNull();
});

test('ignores a late response for the previous scenario', async () => {
  let resolveFirst!: (value: ProjectionTimeseries) => void;
  fetchResults.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
  const { result, rerender } = renderHook(({ id }) => useProjectionResults(id), { initialProps: { id: 1 } });
  rerender({ id: 2 });
  await waitFor(() => expect(result.current.projectionData).toEqual(data));
  await act(async () => { resolveFirst({ ...data, projected_net_worth: [999999] }); });
  expect(result.current.projectionData).toEqual(data);
});

test('does not describe a short projection as a five-year result', async () => {
  fetchResults.mockResolvedValue({ ...data, dates: data.dates.slice(0, 12) });
  const { result } = renderHook(() => useProjectionResults(1));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.getSummaryData().fiveYears.netWorth).toBeUndefined();
});

test('clears loading when the selected scenario is removed during a request', async () => {
  fetchResults.mockImplementation(() => new Promise(() => {}));
  const { result, rerender } = renderHook(({ id }: { id: number | null }) => useProjectionResults(id), { initialProps: { id: 1 as number | null } });
  await waitFor(() => expect(result.current.isLoading).toBe(true));
  rerender({ id: null });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.projectionData).toBeNull();
});
