import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 bg-slate-800 rounded-full mb-6">
        <Icon size={48} className="text-slate-500" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-md mb-6">{description}</p>
      {action && (
        <div className="flex gap-3">
          <Button onClick={action.onClick} variant="primary">
            {action.label}
          </Button>
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="secondary">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

