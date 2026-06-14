import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { PrivacyProvider, usePrivacyMode } from './PrivacyContext';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PrivacyProvider>{children}</PrivacyProvider>
);

beforeEach(() => {
  localStorage.clear();
});

describe('usePrivacyMode', () => {
  it('throws when used outside PrivacyProvider', () => {
    // Suppress expected console.error from React
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => usePrivacyMode())).toThrow(
      'usePrivacyMode must be used within a PrivacyProvider'
    );
    spy.mockRestore();
  });

  it('defaults to false when localStorage is empty', () => {
    const { result } = renderHook(() => usePrivacyMode(), { wrapper });
    expect(result.current.privacyMode).toBe(false);
  });

  it('initialises to true when localStorage has "true"', () => {
    localStorage.setItem('privacyMode', 'true');
    const { result } = renderHook(() => usePrivacyMode(), { wrapper });
    expect(result.current.privacyMode).toBe(true);
  });

  it('toggles from false to true', () => {
    const { result } = renderHook(() => usePrivacyMode(), { wrapper });
    act(() => {
      result.current.togglePrivacyMode();
    });
    expect(result.current.privacyMode).toBe(true);
  });

  it('toggles from true back to false', () => {
    const { result } = renderHook(() => usePrivacyMode(), { wrapper });
    act(() => {
      result.current.togglePrivacyMode();
    });
    act(() => {
      result.current.togglePrivacyMode();
    });
    expect(result.current.privacyMode).toBe(false);
  });

  it('persists the toggled value to localStorage', () => {
    const { result } = renderHook(() => usePrivacyMode(), { wrapper });
    act(() => {
      result.current.togglePrivacyMode();
    });
    expect(localStorage.getItem('privacyMode')).toBe('true');
  });

  it('persists false to localStorage when toggled back', () => {
    localStorage.setItem('privacyMode', 'true');
    const { result } = renderHook(() => usePrivacyMode(), { wrapper });
    act(() => {
      result.current.togglePrivacyMode();
    });
    expect(localStorage.getItem('privacyMode')).toBe('false');
  });
});
