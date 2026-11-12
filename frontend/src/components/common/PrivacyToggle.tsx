import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { usePrivacyMode } from '../../contexts/PrivacyContext';

export const PrivacyToggle: React.FC = () => {
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <button
      onClick={togglePrivacyMode}
      aria-pressed={privacyMode}
      aria-label={privacyMode ? 'Show amounts' : 'Hide amounts'}
      title={privacyMode ? 'Show amounts' : 'Hide amounts'}
      className={clsx(
        'p-2 rounded-xl transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        privacyMode
          ? 'text-accent bg-accent/15 ring-1 ring-accent/30 hover:bg-accent/20'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
      )}
    >
      {privacyMode
        ? <EyeOff className="w-5 h-5" />
        : <Eye className="w-5 h-5" />
      }
    </button>
  );
};
