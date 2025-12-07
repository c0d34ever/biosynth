import React from 'react';

interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface RadioProps {
  name: string;
  options: RadioOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  error?: boolean;
  className?: string;
}

export const Radio: React.FC<RadioProps> = ({
  name,
  options,
  value,
  onChange,
  error = false,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {options.map(option => (
        <label
          key={option.value}
          className={`
            flex items-center gap-3 cursor-pointer group
            ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => !option.disabled && onChange(option.value)}
              disabled={option.disabled}
              className="sr-only peer"
            />
            <div className={`
              w-5 h-5 border-2 rounded-full transition-all
              peer-checked:border-bio-500
              ${error ? 'border-red-500' : 'border-slate-600'}
              ${option.disabled ? '' : 'group-hover:border-slate-500'}
            `}>
              <div className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-2.5 h-2.5 rounded-full bg-bio-500
                opacity-0 peer-checked:opacity-100 transition-opacity
              `} />
            </div>
          </div>
          <span className="text-sm text-slate-300 select-none">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
};


