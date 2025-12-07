import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error = false,
  className = '',
  ...props
}) => {
  return (
    <label className={`
      flex items-center gap-3 cursor-pointer group
      ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `}>
      <div className="relative">
        <input
          type="checkbox"
          {...props}
          className="sr-only peer"
        />
        <div className={`
          w-5 h-5 border-2 rounded transition-all
          peer-checked:bg-bio-500 peer-checked:border-bio-500
          ${error ? 'border-red-500' : 'border-slate-600'}
          ${props.disabled ? '' : 'group-hover:border-slate-500'}
        `}>
          <Check
            size={14}
            className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              text-white opacity-0 peer-checked:opacity-100 transition-opacity
            `}
            strokeWidth={3}
          />
        </div>
      </div>
      {label && (
        <span className="text-sm text-slate-300 select-none">
          {label}
        </span>
      )}
    </label>
  );
};


