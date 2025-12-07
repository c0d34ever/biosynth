import React from 'react';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
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
          w-11 h-6 rounded-full transition-all duration-200
          peer-checked:bg-bio-500
          ${error ? 'bg-red-500/30' : 'bg-slate-700'}
          ${props.disabled ? '' : 'group-hover:bg-slate-600 peer-checked:hover:bg-bio-600'}
        `}>
          <div className={`
            absolute top-1 left-1 w-4 h-4 rounded-full bg-white
            transition-transform duration-200
            peer-checked:translate-x-5
          `} />
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
