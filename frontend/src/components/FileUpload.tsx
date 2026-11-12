import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import * as Toast from '@radix-ui/react-toast';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { transactionService } from '../services/transactionService';
import clsx from 'clsx';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

interface ImportResult {
  imported: number;
  skipped: number | null;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Frontend guardrails to mirror backend limits
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME = new Set([
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    '' // Some browsers leave this empty; we'll also check extension
  ]);

  const resetState = () => {
    setPendingFile(null);
    setTotalRows(null);
    setResult(null);
    setError(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetState();
  };

  // Count data rows (non-empty lines minus header) so the result summary
  // can report how many rows the backend skipped as duplicates.
  const countDataRows = async (file: File): Promise<number | null> => {
    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
      return Math.max(0, lines.length - 1);
    } catch {
      return null;
    }
  };

  // Shared validation for both file input and drag-and-drop paths.
  const stageFile = (file: File) => {
    setError(null);

    const hasCsvExtension = file.name.toLowerCase().endsWith('.csv');
    if (!hasCsvExtension) {
      setError('Invalid file type. Please select a .csv file.');
      return;
    }
    if (!ALLOWED_MIME.has(file.type)) {
      setError('Unsupported file type. Please upload a CSV file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File too large. The maximum allowed size is 5 MB.');
      return;
    }

    setResult(null);
    setPendingFile(file);
    void countDataRows(file).then(setTotalRows);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) stageFile(file);
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!loading) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (loading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) stageFile(file);
  };

  const handleImport = async () => {
    if (!pendingFile) return;

    setLoading(true);
    setError(null);

    try {
      const imported = await transactionService.uploadCSV(pendingFile);
      const importedCount = Array.isArray(imported) ? imported.length : 0;
      const skipped =
        totalRows != null ? Math.max(0, totalRows - importedCount) : null;
      setResult({ imported: importedCount, skipped });
      setPendingFile(null);
      onUploadSuccess();
      setShowToast(true);
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
    }
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
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
            'bg-[var(--color-surface)] rounded-2xl p-6 z-50',
            'w-[calc(100vw-2rem)] max-w-[420px]',
            'border border-[var(--color-border)] shadow-xl',
            'animate-slide-up'
          )}>
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                Import Transactions
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  aria-label="Close import dialog"
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-5">
              {/* File Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
                  isDragging
                    ? 'border-accent bg-accent/10'
                    : 'border-[var(--color-border)] hover:border-accent/50 hover:bg-accent/5',
                  loading && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  {isDragging ? 'Release to select your CSV' : 'Drop your CSV file here'}
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

              {/* Review step — shown once a valid file is staged */}
              {pendingFile && !loading && (
                <div className={clsx(
                  'flex items-center justify-between gap-3 p-3 rounded-xl',
                  'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]'
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {pendingFile.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {formatBytes(pendingFile.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPendingFile(null)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        'bg-accent text-white hover:bg-accent-dark transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                      )}
                    >
                      Import
                    </button>
                  </div>
                </div>
              )}

              {/* Durable post-import summary */}
              {result && (
                <div className={clsx(
                  'p-4 rounded-xl space-y-3',
                  'bg-success/10 border border-success/20'
                )}>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {result.imported} transaction{result.imported === 1 ? '' : 's'} imported
                      </p>
                      {result.skipped != null && result.skipped > 0 && (
                        <p className="text-[var(--color-text-secondary)] mt-0.5">
                          {result.skipped} row{result.skipped === 1 ? '' : 's'} skipped as duplicates
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog.Close asChild>
                      <Link
                        to="/transactions"
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-sm font-medium',
                          'bg-accent text-white hover:bg-accent-dark transition-colors',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                        )}
                      >
                        Review imported transactions
                      </Link>
                    </Dialog.Close>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors"
                      >
                        Done
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              )}

              {/* Info */}
              {!result && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Maximum file size: 5 MB. Supports ING and KBC CSV formats.
                    Uploads are rate-limited to prevent abuse.
                  </p>
                </div>
              )}

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
              {result != null
                ? `Imported ${result.imported} new transaction${result.imported === 1 ? '' : 's'} from your CSV.`
                : 'Your file has been processed successfully.'}
            </Toast.Description>
          </div>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 flex flex-col gap-2 sm:w-96 m-0 list-none z-50" />
      </Toast.Provider>
    </>
  );
};
