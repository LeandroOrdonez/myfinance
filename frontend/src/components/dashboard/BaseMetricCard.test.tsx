import React from 'react';
import { render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import { BaseMetricCard } from './BaseMetricCard';
import { PrivacyProvider } from '../../contexts/PrivacyContext';
import { PRIVACY_MASK } from '../../utils/formatPrivateAmount';

beforeEach(() => {
  localStorage.clear();
});

const renderCard = (privacyModeInitial = false) => {
  if (privacyModeInitial) {
    localStorage.setItem('privacyMode', 'true');
  }
  return render(
    <PrivacyProvider>
      <BaseMetricCard
        title="Test Income"
        Icon={Wallet}
        amount={1000}
        change="+5.0%"
        previousAmount={950}
        colorType="income"
      />
    </PrivacyProvider>
  );
};

describe('BaseMetricCard', () => {
  it('displays the formatted amount when privacy mode is off', () => {
    renderCard(false);
    // Should show formatted currency, not the mask
    expect(screen.queryByText(PRIVACY_MASK)).not.toBeInTheDocument();
    // Amount should appear formatted somewhere
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
  });

  it('displays PRIVACY_MASK instead of amount when privacy mode is on', () => {
    renderCard(true);
    // Should show the mask (appears twice: main amount + previousAmount)
    const masks = screen.getAllByText(PRIVACY_MASK);
    expect(masks.length).toBeGreaterThanOrEqual(1);
  });

  it('never masks a percentage amount (isPercentage=true)', () => {
    localStorage.setItem('privacyMode', 'true');
    render(
      <PrivacyProvider>
        <BaseMetricCard
          title="Savings Rate"
          Icon={Wallet}
          amount={15.5}
          change="+2.0%"
          previousAmount={13.5}
          isPercentage={true}
          colorType="neutral"
        />
      </PrivacyProvider>
    );
    // Percentage should render as-is, not masked
    expect(screen.getByText('15.5%')).toBeInTheDocument();
    expect(screen.queryByText(PRIVACY_MASK)).not.toBeInTheDocument();
  });

  it('always shows the change percentage string regardless of privacy mode', () => {
    renderCard(true);
    expect(screen.getByText('+5.0%')).toBeInTheDocument();
  });
});
