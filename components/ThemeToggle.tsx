import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'auto' as const, icon: Monitor, label: 'Auto' },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[1];
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="relative group">
      <button
        onClick={() => {
          const currentIndex = themes.findIndex(t => t.value === theme);
          const nextIndex = (currentIndex + 1) % themes.length;
          setTheme(themes[nextIndex].value);
        }}
        className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
        title={`Current theme: ${currentTheme.label}`}
      >
        <CurrentIcon size={20} />
      </button>
      
      {/* Dropdown menu */}
      <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-slate-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                ${theme === t.value
                  ? 'bg-bio-500/10 text-bio-400'
                  : 'text-slate-300 hover:bg-slate-800'
                }
              `}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {theme === t.value && (
                <span className="ml-auto text-bio-400">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

