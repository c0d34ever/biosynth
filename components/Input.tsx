import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      <input 
        className={`bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-bio-500 focus:border-transparent transition-all outline-none placeholder:text-slate-600 ${className}`}
        {...props}
      />
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      <textarea 
        className={`bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-bio-500 focus:border-transparent transition-all outline-none placeholder:text-slate-600 min-h-[100px] ${className}`}
        {...props}
      />
    </div>
  );
};