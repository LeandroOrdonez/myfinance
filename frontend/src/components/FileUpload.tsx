import React, { useRef, useState } from 'react';
import axios from 'axios';
import * as Dialog from '@radix-ui/react-dialog';
import * as Progress from '@radix-ui/react-progress';
import * as Toast from '@radix-ui/react-toast';
import { transactionService } from '../services/transactionService';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
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
    <div className="p-4">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Upload CSV
          </button>
        </Dialog.Trigger>
        
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-[400px]">
            <Dialog.Title className="text-lg font-medium mb-4">
              Upload Transaction File
            </Dialog.Title>
            
            <div className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
                ref={fileInputRef}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />

              <p className="text-xs text-slate-500">
                Max size: 5 MB. Accepted type: CSV. Uploads are rate-limited.
              </p>
              
              {loading && (
                <Progress.Root className="relative overflow-hidden bg-blue-100 rounded-full w-full h-2">
                  <Progress.Indicator
                    className="bg-blue-600 w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
                    style={{ transform: 'translateX(-100%)' }}
                  />
                </Progress.Root>
              )}
              
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md">
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast.Provider>
        <Toast.Root
          open={showToast}
          onOpenChange={setShowToast}
          className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4"
        >
          <Toast.Title className="text-green-900 font-medium">
            Success
          </Toast.Title>
          <Toast.Description className="text-green-800 mt-1">
            {importedCount != null
              ? `File uploaded successfully. Imported ${importedCount} new transaction${importedCount === 1 ? '' : 's'}.`
              : 'File uploaded successfully.'}
          </Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-6 gap-2 w-96 m-0 list-none z-50" />
      </Toast.Provider>
    </div>
  );
}; 