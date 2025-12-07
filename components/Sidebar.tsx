import React from 'react';
import { LayoutDashboard, Atom, Network, Library, Menu, X, Shield, Target, BarChart3, Lightbulb, GitBranch, Clock, GitCompare, FileCode, PlayCircle, TrendingUp, Search, Sparkles, Settings, HelpCircle, User, Upload } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, setIsOpen, userRole }) => {
  const items = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'generate', label: 'Generator', icon: Atom },
    { id: 'synthesize', label: 'Synthesizer', icon: Network },
    { id: 'library', label: 'Algorithm Bank', icon: Library },
    { id: 'templates', label: 'Templates', icon: FileCode },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'playground', label: 'Playground', icon: PlayCircle },
    { id: 'benchmark', label: 'Benchmark', icon: TrendingUp },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
    { id: 'problems', label: 'Problems', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'jobs', label: 'Jobs', icon: Clock },
    { id: 'improvements', label: 'Improvements', icon: Lightbulb },
    { id: 'combinations', label: 'Combinations', icon: GitBranch },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
    ...(userRole === 'admin' ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-slate-800 text-white rounded-lg border border-slate-700 shadow-lg"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#020617] border-r border-slate-800 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="h-20 flex items-center px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bio-500 to-bio-900 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                 <Network className="text-white" size={18} />
               </div>
               <div>
                 <h1 className="text-lg font-bold text-white tracking-tight">BioSynth</h1>
                 <p className="text-[10px] text-slate-500 uppercase tracking-wider">Architect v1.0</p>
               </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-4 py-8 space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id as ViewState);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-bio-500/10 text-bio-400 border border-bio-500/20' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                    }
                  `}
                >
                  <Icon 
                    size={20} 
                    className={`transition-colors ${isActive ? 'text-bio-400' : 'text-slate-500 group-hover:text-slate-300'}`} 
                  />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-bio-400 shadow-[0_0_8px_#34d399]"></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <p className="text-xs text-slate-500 mb-2">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-emerald-400 font-medium">Neural Core Online</span>
              </div>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};