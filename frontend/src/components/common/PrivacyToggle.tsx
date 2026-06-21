import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { usePrivacyMode } from '../../contexts/PrivacyContext';

export const PrivacyToggle: React.FC = () => {
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <button
      onClick={togglePrivacyMode}
      aria-label="Toggle privacy mode"
      className={clsx(
        'p-2 rounded-xl transition-all duration-200',
        privacyMode
          ? 'text-accent bg-accent/10 hover:bg-accent/20'
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
