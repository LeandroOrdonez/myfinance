import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectionDashboard from './ProjectionDashboard';
import { PrivacyProvider } from '../../../contexts/PrivacyContext';
import * as service from '../../../services/projectionService';
import { ProjectionScenario, ProjectionTimeseries } from '../../../types/projections';

jest.mock('../../../services/projectionService');
jest.mock('./charts/NetWorthChart', () => ({ __esModule: true, default: ({ showReal }: { showReal: boolean }) => <div data-testid="net-worth-chart">{showReal ? 'Real chart' : 'Nominal chart'}</div> }));

const scenarios: ProjectionScenario[] = [
  { id: 1, name: 'Alternative', description: 'A custom outlook', is_default: false, created_at: '2026-01-01', parameters: [] },
  { id: 2, name: 'Baseline', description: 'Our starting point', is_default: true, created_at: '2026-01-01', parameters: [
    { id: 1, scenario_id: 2, param_name: 'income_growth_rate', param_value: 0.03, param_type: 'percentage' },
  ] },
];
const data: ProjectionTimeseries = {
  dates: Array(60).fill('2027-01'), projected_net_worth: Array(60).fill(1000),
  projected_income: Array(60).fill(100), projected_expenses: Array(60).fill(50),
  projected_savings: Array(60).fill(20), projected_investments: Array(60).fill(30),
  real_projected_net_worth: Array(60).fill(900), real_projected_income: Array(60).fill(90),
  real_projected_expenses: Array(60).fill(45), real_projected_savings: Array(60).fill(18),
  real_projected_investments: Array(60).fill(27), inflation_rate: 0,
  historical_dates: [], actual_net_worth: [], real_actual_net_worth: [],
  provenance: { status: 'current', calculated_at: '2026-11-18T10:00:00+00:00', assumptions: { income_growth_rate: 0.03, inflation_rate: 0 }, reasons: [], cash_balance_known: true },
};
const fetchScenarios = service.fetchScenarios as jest.MockedFunction<typeof service.fetchScenarios>;
const fetchResults = service.fetchProjectionResults as jest.MockedFunction<typeof service.fetchProjectionResults>;
const calculate = service.calculateProjection as jest.MockedFunction<typeof service.calculateProjection>;
const update = service.updateScenario as jest.MockedFunction<typeof service.updateScenario>;

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  fetchScenarios.mockResolvedValue(scenarios);
  fetchResults.mockResolvedValue(data);
  calculate.mockResolvedValue(undefined);
  update.mockResolvedValue(scenarios[1]);
});

const renderDashboard = () => render(<PrivacyProvider><ProjectionDashboard /></PrivacyProvider>);
const click = async (element: HTMLElement) => { await act(async () => { userEvent.click(element); }); };

test('opens the default forecast and changes summaries with the chart value basis', async () => {
  renderDashboard();
  await screen.findByText('Nominal chart');
  expect(screen.getByRole('tab', { name: 'Forecast', selected: true })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Scenario' })).toHaveValue('2');
  await click(screen.getByRole('button', { name: 'Inflation-adjusted euros' }));
  expect(screen.getByText('Real chart')).toBeInTheDocument();
  expect(screen.getByText(/900/)).toBeInTheDocument();
  expect(screen.getByText(/Inflation assumption: 0.0%/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
  await waitFor(() => expect(fetchResults).toHaveBeenLastCalledWith(1));
  expect(fetchScenarios).toHaveBeenCalledTimes(1);
});

test('renders a failed calculation with old results and allows a successful retry', async () => {
  renderDashboard();
  await screen.findByText('Nominal chart');
  calculate.mockRejectedValueOnce(new Error('offline'));
  await click(screen.getByRole('button', { name: 'Calculate forecast' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not calculate');
  expect(screen.getByRole('alert')).toHaveTextContent('Showing previous results');
  expect(screen.getByText('Nominal chart')).toBeInTheDocument();
  fetchResults.mockResolvedValue({ ...data, provenance: { ...data.provenance!, calculated_at: '2026-11-18T12:00:00+00:00' } });
  await click(screen.getByRole('button', { name: 'Calculate forecast' }));
  await waitFor(() => expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-11-18T12:00:00+00:00'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('shows scenario loading failures without presenting them as an empty library', async () => {
  fetchScenarios.mockRejectedValueOnce(new Error('offline'));
  renderDashboard();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load projection scenarios');
  await click(screen.getByRole('button', { name: 'Retry loading scenarios' }));
  await screen.findByText('Nominal chart');
});

test('opens assumptions from the forecast, blocks invalid saves, and flags saved changes', async () => {
  renderDashboard();
  await screen.findByText('Nominal chart');
  await click(screen.getByRole('button', { name: 'Edit assumptions' }));
  const dialog = await screen.findByRole('dialog', { name: 'Edit assumptions' });
  const input = within(dialog).getByRole('spinbutton', { name: 'Annual income growth' });
  fireEvent.change(input, { target: { value: '90' } });
  expect(within(dialog).getByRole('button', { name: 'Save assumptions' })).toBeDisabled();
  fireEvent.change(input, { target: { value: '4' } });
  fetchResults.mockResolvedValue({ ...data, provenance: { ...data.provenance!, status: 'out_of_date', reasons: ['Scenario assumptions have changed.'] } });
  await click(within(dialog).getByRole('button', { name: 'Save assumptions' }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(2, expect.objectContaining({ parameters: [expect.objectContaining({ param_value: 0.04 })] })));
  await screen.findByText('Out of date');
  expect(screen.getByRole('tab', { name: 'Forecast', selected: true })).toBeInTheDocument();
});

test('editing preserves the forecast, value basis, horizon and keyboard focus', async () => {
  renderDashboard();
  await screen.findByText('Nominal chart');
  await click(screen.getByRole('button', { name: 'Inflation-adjusted euros' }));
  await click(screen.getByRole('button', { name: '3 years' }));
  await click(screen.getByRole('button', { name: 'Edit assumptions' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Edit assumptions' })).toHaveFocus());
  expect(screen.getByRole('tab', { name: 'Forecast', selected: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Inflation-adjusted euros' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '3 years' })).toHaveAttribute('aria-pressed', 'true');
});

test('keeps failed form saves in the dialog with all drafts intact', async () => {
  update.mockRejectedValue(new Error('offline'));
  renderDashboard();
  await screen.findByText('Nominal chart');
  await click(screen.getByRole('button', { name: 'Edit assumptions' }));
  const dialog = await screen.findByRole('dialog');
  const name = within(dialog).getByRole('textbox', { name: 'Name' });
  fireEvent.change(name, { target: { value: 'My edited scenario' } });
  await click(within(dialog).getByRole('button', { name: 'Save assumptions' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not save');
  expect(name).toHaveValue('My edited scenario');
});

test('shows comparison errors with an actionable retry', async () => {
  (service.compareScenarios as jest.Mock).mockRejectedValue(new Error('offline'));
  renderDashboard();
  await screen.findByText('Nominal chart');
  await click(screen.getByRole('tab', { name: 'Compare' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the comparison');
  expect(screen.getByRole('button', { name: 'Retry loading comparison' })).toBeEnabled();
});

test('restores persisted outdated status after the entire page is remounted', async () => {
  fetchResults.mockResolvedValue({ ...data, provenance: { ...data.provenance!, status: 'out_of_date', reasons: ['Financial source data has changed.'] } });
  const view = renderDashboard();
  await screen.findByText('Out of date');
  view.unmount();
  renderDashboard();
  await screen.findByText('Out of date');
  expect(screen.getByText(/Financial source data has changed/)).toBeInTheDocument();
});

test('legacy forecasts do not claim a calculation time or enable invented inflation values', async () => {
  fetchResults.mockResolvedValue({ ...data, provenance: undefined, inflation_rate: null, real_projected_net_worth: [] });
  renderDashboard();
  await screen.findByText('Unverified');
  expect(screen.getByRole('button', { name: 'Inflation-adjusted euros' })).toBeDisabled();
  expect(document.querySelector('time')).not.toBeInTheDocument();
});

test('source-data update events recheck forecast provenance', async () => {
  renderDashboard();
  await screen.findByText('Current', { selector: 'strong' });
  fetchResults.mockResolvedValue({ ...data, provenance: { ...data.provenance!, status: 'out_of_date', reasons: ['Financial source data has changed.'] } });
  fireEvent(window, new CustomEvent('finance-data-updated'));
  await screen.findByText('Out of date');
});

test('the assumption table distinguishes the saved calculation from current edits', async () => {
  fetchResults.mockResolvedValue({ ...data, provenance: { ...data.provenance!, status: 'out_of_date', assumptions: { income_growth_rate: 0.01 }, reasons: ['Scenario assumptions have changed.'] } });
  renderDashboard();
  await screen.findByText('Out of date');
  await click(screen.getByText('Assumptions for Baseline'));
  const table = screen.getByRole('table');
  expect(within(table).getByRole('columnheader', { name: 'Calculated' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: '1%' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: /3% Changed/ })).toBeInTheDocument();
});
