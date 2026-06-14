import React, { useRef, useState } from 'react';
import axios from 'axios';
import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import * as Toast from '@radix-ui/react-toast';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { transactionService } from '../services/transactionService';
import clsx from 'clsx';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Frontend guardrails to mirror backend limits
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME = new Set([
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    '' // Some browsers leave this empty; we'll also check extension
  ]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Client-side validation: extension and MIME
      const hasCsvExtension = file.name.toLowerCase().endsWith('.csv');
      if (!hasCsvExtension) {
        throw new Error('Invalid file type. Please select a .csv file.');
      }
      if (!ALLOWED_MIME.has(file.type)) {
        throw new Error('Unsupported file type. Please upload a CSV file.');
      }

      // Client-side validation: size
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error('File too large. The maximum allowed size is 5 MB.');
      }

      const result = await transactionService.uploadCSV(file);
      setImportedCount(Array.isArray(result) ? result.length : null);
      onUploadSuccess();
      setShowToast(true);
      setIsOpen(false);
    } catch (err) {
      let message = 'Error uploading file. Please try again.';
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = (err.response?.data as any)?.detail;
        if (status === 413) message = 'File too large. Maximum allowed size is 5 MB.';
        else if (status === 415) message = 'Unsupported media type. Please upload a CSV file.';
        else if (status === 429) message = 'Too many uploads in a short time. Please wait and try again.';
        else if (status === 400) message = detail || 'Invalid CSV. Please check the file and try again.';
        else if (status && detail) message = detail;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger asChild>
          <button className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
            'bg-accent text-white shadow-sm',
            'hover:bg-accent-dark hover:shadow-md hover:-translate-y-0.5',
            'transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
          )}>
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />
          <Dialog.Content className={clsx(
            'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
            'bg-[var(--color-surface)] rounded-2xl p-6 w-[420px] z-50',
            'border border-[var(--color-border)] shadow-xl',
            'animate-slide-up'
          )}>
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                Import Transactions
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-5">
              {/* File Drop Zone */}
              <div className={clsx(
                'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
                'border-[var(--color-border)] hover:border-accent/50 hover:bg-accent/5',
                loading && 'opacity-50 pointer-events-none'
              )}>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Drop your CSV file here
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                  ref={fileInputRef}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={clsx(
                    'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer',
                    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
                    'hover:bg-[var(--color-border)] transition-colors'
                  )}
                >
                  Select File
                </label>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Maximum file size: 5 MB. Supports ING and KBC CSV formats.
                  Uploads are rate-limited to prevent abuse.
                </p>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">Uploading...</span>
                    <span className="text-accent font-medium">Processing</span>
                  </div>
                  <Progress.Root className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-full w-full h-2">
                    <Progress.Indicator
                      className="bg-accent w-full h-full animate-progress"
                      style={{ transform: 'translateX(-100%)' }}
                    />
                  </Progress.Root>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className={clsx(
                  'flex items-start gap-2 p-3 rounded-xl text-sm',
                  'bg-danger/10 text-danger'
                )}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast.Provider>
        <Toast.Root
          open={showToast}
          onOpenChange={setShowToast}
          duration={4000}
          className={clsx(
            'bg-success/10 border border-success/20 rounded-xl shadow-lg p-4',
            'flex items-start gap-3'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <Toast.Title className="font-semibold text-[var(--color-text-primary)]">
              Upload Successful
            </Toast.Title>
            <Toast.Description className="text-sm text-[var(--color-text-secondary)] mt-1">
              {importedCount != null
                ? `Imported ${importedCount} new transaction${importedCount === 1 ? '' : 's'} from your CSV.`
                : 'Your file has been processed successfully.'}
            </Toast.Description>
          </div>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-96 m-0 list-none z-50" />
      </Toast.Provider>
    </>
  );
}; 