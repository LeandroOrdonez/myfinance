import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyToggle } from './PrivacyToggle';
import { PrivacyProvider } from '../../contexts/PrivacyContext';

beforeEach(() => {
  localStorage.clear();
});

const renderWithProvider = (privacyModeInitial = false) => {
  if (privacyModeInitial) {
    localStorage.setItem('privacyMode', 'true');
  }
  return render(
    <PrivacyProvider>
      <PrivacyToggle />
    </PrivacyProvider>
  );
};

describe('PrivacyToggle', () => {
  it('renders a button with the correct aria-label', () => {
    renderWithProvider();
    expect(screen.getByRole('button', { name: /toggle privacy mode/i })).toBeInTheDocument();
  });

  it('shows Eye icon (privacy off) when privacyMode is false', () => {
    renderWithProvider(false);
    const button = screen.getByRole('button', { name: /toggle privacy mode/i });
    // When off, button should NOT have accent styling
    expect(button.className).not.toMatch(/bg-accent/);
  });

  it('shows EyeOff styling (privacy on) when privacyMode is true', () => {
    renderWithProvider(true);
    const button = screen.getByRole('button', { name: /toggle privacy mode/i });
    // When on, button should have accent styling
    expect(button.className).toMatch(/bg-accent/);
  });

  it('calls togglePrivacyMode when clicked', () => {
    renderWithProvider(false);
    const button = screen.getByRole('button', { name: /toggle privacy mode/i });
    fireEvent.click(button);
    // After clicking, localStorage should be updated to 'true'
    expect(localStorage.getItem('privacyMode')).toBe('true');
  });

  it('toggles back to off on second click', () => {
    renderWithProvider(false);
    const button = screen.getByRole('button', { name: /toggle privacy mode/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(localStorage.getItem('privacyMode')).toBe('false');
  });
});
