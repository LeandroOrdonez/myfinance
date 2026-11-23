import React, { useRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isBusy?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

const Dialog: React.FC<DialogProps> = ({
  isOpen, onClose, title, description, children, maxWidth = '2xl', isBusy = false,
}) => {
  const returnFocus = useRef<HTMLElement | null>(null);

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={open => { if (!open && !isBusy) onClose(); }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <RadixDialog.Content
          {...(!description ? { 'aria-describedby': undefined } : {})}
          onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            const previous = returnFocus.current;
            const target = previous?.isConnected && previous !== document.body && !previous.closest('[hidden]')
              ? previous
              : document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
            target?.focus();
          }}
          onPointerDownOutside={event => event.preventDefault()}
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg ${maxWidthClasses[maxWidth]} w-[calc(100%-2rem)] max-h-[90dvh] overflow-hidden flex flex-col p-4 sm:p-6`}
        >
          <div className="flex shrink-0 justify-between items-start gap-3 mb-4">
            <div className="min-w-0">
              <RadixDialog.Title className="text-lg font-medium">{title}</RadixDialog.Title>
              {description && <RadixDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close asChild>
              <button type="button" aria-label="Close dialog" disabled={isBusy} className="flex shrink-0 min-h-11 min-w-11 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export default Dialog;
