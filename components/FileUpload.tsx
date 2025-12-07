import React, { useRef, useState } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  maxSize?: number; // in MB
  maxFiles?: number;
  label?: string;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '.json,.csv',
  multiple = false,
  onUpload,
  maxSize = 10,
  maxFiles = 10,
  label = 'Upload Files',
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `File ${file.name} exceeds maximum size of ${maxSize}MB`;
    }
    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles = Array.from(fileList);
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length + files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      setFiles(validFiles.slice(0, maxFiles - files.length));
    } else {
      setFiles(prev => [...prev, ...validFiles]);
    }

    setErrors(newErrors);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setErrors([]);
    
    try {
      await onUpload(files);
      setFiles([]);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragActive
            ? 'border-bio-500 bg-bio-500/10'
            : 'border-slate-700 bg-slate-900/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-600'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload size={48} className={`mx-auto mb-4 ${dragActive ? 'text-bio-400' : 'text-slate-500'}`} />
        <p className="text-white font-medium mb-2">{label}</p>
        <p className="text-sm text-slate-400 mb-4">
          Drag and drop files here, or click to select
        </p>
        <p className="text-xs text-slate-500">
          Accepted: {accept} • Max size: {maxSize}MB • Max files: {maxFiles}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Selected Files</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg"
            >
              <File size={20} className="text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ))}
          <Button
            onClick={handleUpload}
            isLoading={uploading}
            disabled={uploading || files.length === 0}
            variant="primary"
            className="w-full"
          >
            Upload {files.length} file{files.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-400 mb-1">Upload Errors</h4>
              <ul className="text-xs text-red-300 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

