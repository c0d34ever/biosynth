import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  error = false,
  className = '',
  ...props
}) => {
  return (
    <div className="relative">
      <select
        {...props}
        className={`
          w-full px-4 py-2 bg-slate-900 border rounded-lg text-white
          focus:ring-1 focus:ring-bio-500 outline-none appearance-none
          pr-10 cursor-pointer
          ${error ? 'border-red-500' : 'border-slate-700'}
          ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={20}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
      />
    </div>
  );
};


