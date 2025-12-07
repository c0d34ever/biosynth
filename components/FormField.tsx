import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactElement;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  hint,
  children
}) => {
  const childId = children.props.id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const childWithId = React.cloneElement(children, {
    id: childId,
    'aria-invalid': error ? 'true' : 'false',
    'aria-describedby': error ? `${childId}-error` : hint ? `${childId}-hint` : undefined
  });

  return (
    <div className="space-y-2">
      <label
        htmlFor={childId}
        className="block text-sm font-medium text-slate-300"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      {hint && (
        <p id={`${childId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      
      {childWithId}
      
      {error && (
        <div
          id={`${childId}-error`}
          className="flex items-center gap-2 text-sm text-red-400"
          role="alert"
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};


