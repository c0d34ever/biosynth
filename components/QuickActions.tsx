import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FileCode, Network, Search, Sparkles, TrendingUp, Plus, X } from 'lucide-react';
import { Button } from './Button';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  shortcut?: string;
  color?: string;
}

interface QuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState<number>(0);

  const actions: QuickAction[] = [
    {
      id: 'generate',
      label: 'Generate Algorithm',
      icon: FileCode,
      action: () => {
        navigate('/generate');
        onClose();
      },
      shortcut: 'G',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'synthesize',
      label: 'Synthesize Algorithm',
      icon: Network,
      action: () => {
        navigate('/synthesize');
        onClose();
      },
      shortcut: 'S',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'search',
      label: 'Search Algorithms',
      icon: Search,
      action: () => {
        navigate('/search');
        onClose();
      },
      shortcut: '⌘K',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'recommendations',
      label: 'View Recommendations',
      icon: Sparkles,
      action: () => {
        navigate('/recommendations');
        onClose();
      },
      shortcut: 'R',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: TrendingUp,
      action: () => {
        navigate('/analytics');
        onClose();
      },
      shortcut: 'A',
      color: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    }
  ];

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAction(prev => Math.min(prev + 1, actions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAction(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && actions[selectedAction]) {
        e.preventDefault();
        actions[selectedAction].action();
      } else {
        // Match by first letter
        const key = e.key.toLowerCase();
        const index = actions.findIndex(a => 
          a.shortcut?.toLowerCase() === key || 
          a.label.toLowerCase().startsWith(key)
        );
        if (index >= 0) {
          setSelectedAction(index);
          if (e.key === 'Enter' || !e.shiftKey) {
            actions[index].action();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedAction, actions, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap size={20} className="text-bio-400" />
            Quick Actions
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-2">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const isSelected = index === selectedAction;
            
            return (
              <button
                key={action.id}
                onClick={action.action}
                onMouseEnter={() => setSelectedAction(index)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isSelected 
                    ? `${action.color || 'bg-bio-500/10 text-bio-400'} border-2` 
                    : 'text-slate-300 hover:bg-slate-800 border-2 border-transparent'
                  }
                `}
              >
                <Icon size={20} />
                <span className="flex-1 text-left font-medium">{action.label}</span>
                {action.shortcut && (
                  <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Use arrow keys to navigate, Enter to select, or type the first letter
        </div>
      </div>
    </div>
  );
};

