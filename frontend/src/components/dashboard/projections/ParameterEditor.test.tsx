import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ParameterEditor from './ParameterEditor';
import { ProjectionParameterCreate } from '../../../types/projections';

const initial: ProjectionParameterCreate[] = [
  { param_name: 'income_growth_rate', param_value: 0.03, param_type: 'percentage' },
  { param_name: 'inflation_rate', param_value: 0.02, param_type: 'percentage' },
];

function Editor({ onChange = jest.fn() }: { onChange?: jest.Mock }) {
  const [parameters, setParameters] = useState(initial);
  return <form><ParameterEditor parameters={parameters} onChange={next => { setParameters(next); onChange(next); }} /></form>;
}

test('preserves out-of-range input and shows an associated validation error', () => {
  const onChange = jest.fn();
  render(<Editor onChange={onChange} />);
  const input = screen.getByRole('spinbutton', { name: /annual income growth/i });
  fireEvent.change(input, { target: { value: '90' } });
  fireEvent.blur(input);
  expect(input).toHaveValue(90);
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText(/must be between -80 and 80/i)).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

test('does not turn an empty assumption into zero and preserves other drafts', () => {
  render(<Editor />);
  const income = screen.getByRole('spinbutton', { name: /annual income growth/i });
  fireEvent.change(income, { target: { value: '' } });
  fireEvent.blur(income);
  fireEvent.click(screen.getByText('Inflation & reserves', { selector: 'summary' }));
  const inflation = screen.getByRole('spinbutton', { name: /annual inflation/i });
  fireEvent.change(inflation, { target: { value: '4' } });
  fireEvent.blur(inflation);
  expect(income).toHaveValue(null);
  expect(income).toHaveAttribute('aria-invalid', 'true');
});

test('commits valid percentages without rounding while typing', () => {
  const onChange = jest.fn();
  render(<Editor onChange={onChange} />);
  const input = screen.getByRole('spinbutton', { name: /annual income growth/i });
  fireEvent.change(input, { target: { value: '3.75' } });
  fireEvent.blur(input);
  expect(input).toHaveValue(3.75);
  expect(onChange.mock.calls[0][0][0].param_value).toBe(0.0375);
});
