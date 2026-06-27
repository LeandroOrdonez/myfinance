import React from 'react';
import { render, screen } from '@testing-library/react';
import { BudgetCard } from './BudgetCard';
import { PrivacyProvider } from '../../contexts/PrivacyContext';
import { PRIVACY_MASK } from '../../utils/formatPrivateAmount';
import { Budget, BudgetProgress } from '../../types/budget';

beforeEach(() => {
  localStorage.clear();
});

const budget: Budget = {
  id: 1,
  category: 'Groceries',
  limit_amount: 500,
  period: 'monthly',
  is_active: true,
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const makeProgress = (percentage: number, status: BudgetProgress['status']): BudgetProgress => ({
  category: 'Groceries',
  limit_amount: 500,
  spent: (percentage / 100) * 500,
  remaining: 500 - (percentage / 100) * 500,
  percentage,
  status,
  month: '2025-03',
});

const renderCard = (progress: BudgetProgress, privacy = false) => {
  if (privacy) localStorage.setItem('privacyMode', 'true');
  return render(
    <PrivacyProvider>
      <BudgetCard budget={budget} progress={progress} onEdit={() => {}} onDelete={() => {}} />
    </PrivacyProvider>
  );
};

describe('BudgetCard', () => {
  it('renders the unmasked percentage', () => {
    renderCard(makeProgress(50, 'on_track'));
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
  });

  it('shows warning status at the 80% boundary', () => {
    renderCard(makeProgress(80, 'warning'));
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows over-budget status and badge at/above 100%', () => {
    renderCard(makeProgress(120, 'over'));
    expect(screen.getByText('120%')).toBeInTheDocument();
    // Both the status label and the badge read "Over budget"
    expect(screen.getAllByText('Over budget').length).toBeGreaterThanOrEqual(1);
  });

  it('masks EUR amounts under privacy mode but keeps the percentage visible', () => {
    renderCard(makeProgress(50, 'on_track'), true);
    expect(screen.getAllByText(PRIVACY_MASK).length).toBeGreaterThanOrEqual(1);
    // Percentage stays unmasked
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
