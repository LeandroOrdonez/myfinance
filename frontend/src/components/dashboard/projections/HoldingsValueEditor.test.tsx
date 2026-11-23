import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HoldingsValueEditor } from './HoldingsValueEditor';
import { PrivacyProvider } from '../../../contexts/PrivacyContext';
import { updateHoldingsMarketValue } from '../../../services/projectionService';

jest.mock('../../../services/projectionService');
const update = updateHoldingsMarketValue as jest.MockedFunction<typeof updateHoldingsMarketValue>;

beforeEach(() => { localStorage.clear(); jest.resetAllMocks(); });

test('masks holdings until explicitly revealed and hides them again on cancel', () => {
  localStorage.setItem('privacyMode', 'true');
  render(<PrivacyProvider><HoldingsValueEditor value={12345} disabled={false} onSaved={jest.fn()} /></PrivacyProvider>);
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reveal holdings to edit' }));
  expect(screen.getByRole('spinbutton')).toHaveValue(12345);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel and hide' }));
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue('12345')).not.toBeInTheDocument();
});

test('keeps the draft and exposes an error when applying holdings fails', async () => {
  update.mockRejectedValue(new Error('offline'));
  const onSaved = jest.fn();
  render(<PrivacyProvider><HoldingsValueEditor value={100} disabled={false} onSaved={onSaved} /></PrivacyProvider>);
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '123.45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply to all scenarios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not update holdings');
  expect(screen.getByRole('spinbutton')).toHaveValue(123.45);
  expect(onSaved).not.toHaveBeenCalled();
});

test('applies the exact entered holdings value once and confirms success', async () => {
  update.mockResolvedValue(undefined);
  const onSaved = jest.fn();
  render(<PrivacyProvider><HoldingsValueEditor value={100} disabled={false} onSaved={onSaved} /></PrivacyProvider>);
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '123.45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply to all scenarios' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(update).toHaveBeenCalledWith(123.45);
  expect(screen.getByRole('status')).toHaveTextContent('Holdings updated');
});
