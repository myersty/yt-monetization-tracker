'use client';

import { useState, useCallback, useRef } from 'react';

type FileUploadProps = {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
};

export default function FileUpload({ onFilesSelected, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.csv') || f.type === 'text/csv'
    );
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-[var(--card-radius)] border-2 border-dashed
          p-10 text-center transition-all duration-200
          ${isDragging
            ? 'border-[var(--gold)] bg-[var(--gold)]/5'
            : 'border-[var(--gray-300)] hover:border-[var(--gold)] hover:bg-[var(--gray-50)]'
          }
          ${isLoading ? 'opacity-60 pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="mb-4">
          <svg className="mx-auto w-12 h-12 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        {isLoading ? (
          <div>
            <p className="text-[var(--foreground)] font-medium font-[family-name:var(--font-display)]">
              Analyzing your data...
            </p>
            <div className="flex justify-center gap-1 mt-3">
              <span className="w-2 h-2 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite 0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--gold)]" style={{ animation: 'pulse 1.4s infinite 0.4s' }} />
            </div>
          </div>
        ) : (
          <>
            <p className="text-[var(--foreground)] font-medium font-[family-name:var(--font-display)] text-lg">
              Drop your YouTube Studio CSV files here
            </p>
            <p className="text-[var(--gray-600)] text-sm mt-2">
              or click to browse
            </p>
          </>
        )}

        {selectedFiles.length > 0 && !isLoading && (
          <div className="mt-4 pt-4 border-t border-[var(--gray-200)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-600)] mb-2">
              Selected files
            </p>
            {selectedFiles.map((f, i) => (
              <p key={i} className="text-sm text-[var(--gray-700)]">{f.name}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
