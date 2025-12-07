import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileCode, Database, Settings, User, HelpCircle, Shield, TrendingUp, Target, Lightbulb } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  category: string;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    { id: 'home', label: 'Go to Dashboard', icon: TrendingUp, action: () => navigate('/'), category: 'Navigation', keywords: ['home', 'dashboard', 'main'] },
    { id: 'generate', label: 'Generate Algorithm', icon: FileCode, action: () => navigate('/generate'), category: 'Actions', keywords: ['generate', 'create', 'new', 'algorithm'] },
    { id: 'synthesize', label: 'Synthesize Algorithm', icon: Database, action: () => navigate('/synthesize'), category: 'Actions', keywords: ['synthesize', 'combine', 'merge'] },
    { id: 'library', label: 'Algorithm Library', icon: Database, action: () => navigate('/library'), category: 'Navigation', keywords: ['library', 'algorithms', 'list', 'bank'] },
    { id: 'templates', label: 'Templates', icon: FileCode, action: () => navigate('/templates'), category: 'Navigation', keywords: ['templates', 'examples'] },
    { id: 'compare', label: 'Compare Algorithms', icon: TrendingUp, action: () => navigate('/compare'), category: 'Tools', keywords: ['compare', 'diff'] },
    { id: 'playground', label: 'Playground', icon: FileCode, action: () => navigate('/playground'), category: 'Tools', keywords: ['playground', 'test', 'code'] },
    { id: 'benchmark', label: 'Benchmark', icon: TrendingUp, action: () => navigate('/benchmark'), category: 'Tools', keywords: ['benchmark', 'performance'] },
    { id: 'search', label: 'Search', icon: Search, action: () => navigate('/search'), category: 'Navigation', keywords: ['search', 'find'] },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, action: () => navigate('/recommendations'), category: 'Navigation', keywords: ['recommendations', 'suggestions'] },
    { id: 'problems', label: 'Problems', icon: Target, action: () => navigate('/problems'), category: 'Navigation', keywords: ['problems', 'challenges'] },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, action: () => navigate('/analytics'), category: 'Navigation', keywords: ['analytics', 'stats', 'metrics'] },
    { id: 'jobs', label: 'Jobs', icon: Database, action: () => navigate('/jobs'), category: 'Navigation', keywords: ['jobs', 'tasks'] },
    { id: 'improvements', label: 'Improvements', icon: Lightbulb, action: () => navigate('/improvements'), category: 'Navigation', keywords: ['improvements', 'suggestions'] },
    { id: 'combinations', label: 'Combinations', icon: Database, action: () => navigate('/combinations'), category: 'Navigation', keywords: ['combinations', 'merged'] },
    { id: 'profile', label: 'Profile', icon: User, action: () => navigate('/profile'), category: 'Account', keywords: ['profile', 'user', 'account'] },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => navigate('/settings'), category: 'Account', keywords: ['settings', 'preferences', 'config'] },
    { id: 'help', label: 'Help & Documentation', icon: HelpCircle, action: () => navigate('/help'), category: 'Account', keywords: ['help', 'docs', 'documentation'] },
    { id: 'admin', label: 'Admin Panel', icon: Shield, action: () => navigate('/admin'), category: 'Account', keywords: ['admin', 'management'] },
  ];

  const filteredCommands = commands.filter(cmd => {
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.category.toLowerCase().includes(searchLower) ||
      cmd.keywords.some(k => k.toLowerCase().includes(searchLower))
    );
  });

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[20vh] px-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-lg"
            />
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-400">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>No commands found</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const Icon = cmd.icon;
                  const isSelected = currentIndex === selectedIndex;
                  const index = currentIndex++;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                        ${isSelected 
                          ? 'bg-bio-500/10 text-bio-400' 
                          : 'text-slate-300 hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon size={18} className={isSelected ? 'text-bio-400' : 'text-slate-500'} />
                      <span className="flex-1 text-left">{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded">ESC</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

