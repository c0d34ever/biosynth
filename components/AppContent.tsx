import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BioAlgorithm } from '../types';
import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { authApi, algorithmApi } from '../services/api';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import Generator from '../pages/Generator';
import Synthesizer from '../pages/Synthesizer';
import Library from '../pages/Library';
import AlgorithmDetail from '../pages/AlgorithmDetail';
import Admin from '../pages/Admin';
import Problems from '../pages/Problems';
import Analytics from '../pages/Analytics';
import Jobs from '../pages/Jobs';
import Improvements from '../pages/Improvements';
import Combinations from '../pages/Combinations';
import Compare from '../pages/Compare';
import Templates from '../pages/Templates';
import VersionDiff from '../pages/VersionDiff';
import Playground from '../pages/Playground';
import Benchmark from '../pages/Benchmark';
import Search from '../pages/Search';
import Recommendations from '../pages/Recommendations';
import Settings from '../pages/Settings';
import Help from '../pages/Help';
import Profile from '../pages/Profile';
import Import from '../pages/Import';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { LogOut, Search as SearchIcon, Zap } from 'lucide-react';
import { Button } from './Button';
import { Notifications } from './Notifications';
import { ToastContainer, useToast } from './Toast';
import { ErrorBoundary } from './ErrorBoundary';
import { CommandPalette } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { RecentItems } from './RecentItems';
import { QuickActions } from './QuickActions';
import { ScrollToTop } from './ScrollToTop';
import { OfflineIndicator } from './OfflineIndicator';
import { Accessibility } from './Accessibility';
import { PerformanceMonitor } from './PerformanceMonitor';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [algorithms, setAlgorithms] = useState<BioAlgorithm[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const { toasts, remove } = useToast();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts(setSidebarOpen);
  
  // Command palette shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          await loadAlgorithms();
        } catch (error) {
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const loadAlgorithms = async () => {
    try {
      const data = await algorithmApi.getAll();
      setAlgorithms(data);
    } catch (error) {
      console.error('Failed to load algorithms:', error);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    setAlgorithms([]);
    navigate('/');
  };

  const addAlgorithm = async (algo: Omit<BioAlgorithm, 'id' | 'createdAt'>) => {
    try {
      const saved = await algorithmApi.create(algo);
      setAlgorithms(prev => [saved, ...prev]);
      return saved;
    } catch (error) {
      console.error('Failed to save algorithm:', error);
      throw error;
    }
  };

  const updateAlgorithm = async (updatedAlgo: BioAlgorithm) => {
    try {
      const saved = await algorithmApi.update(parseInt(updatedAlgo.id), updatedAlgo);
      setAlgorithms(prev => prev.map(a => a.id === updatedAlgo.id ? saved : a));
      return saved;
    } catch (error) {
      console.error('Failed to update algorithm:', error);
      throw error;
    }
  };

  // Get current view from pathname
  const getCurrentView = (): string => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/algorithm/')) return 'algorithm-detail';
    return path.substring(1) || 'home';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-bio-500/30 selection:text-bio-200">
      <Sidebar 
        currentView={getCurrentView() as any} 
        onNavigate={(view) => {
          if (view === 'home') navigate('/');
          else if (view === 'library') navigate('/library');
          else if (view === 'generate') navigate('/generate');
          else if (view === 'synthesize') navigate('/synthesize');
          else if (view === 'problems') navigate('/problems');
          else if (view === 'analytics') navigate('/analytics');
          else if (view === 'jobs') navigate('/jobs');
          else if (view === 'improvements') navigate('/improvements');
          else if (view === 'combinations') navigate('/combinations');
          else if (view === 'compare') navigate('/compare');
          else if (view === 'templates') navigate('/templates');
          else if (view === 'playground') navigate('/playground');
          else if (view === 'benchmark') navigate('/benchmark');
          else if (view === 'search') navigate('/search');
          else if (view === 'recommendations') navigate('/recommendations');
          else if (view === 'profile') navigate('/profile');
          else if (view === 'import') navigate('/import');
          else if (view === 'settings') navigate('/settings');
          else if (view === 'help') navigate('/help');
          else if (view === 'admin') navigate('/admin');
        }} 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        userRole={user?.role}
      />
      
      <main className={`
        transition-all duration-300 min-h-screen
        md:ml-64
      `}>
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-slate-400">Welcome back, {user?.name || user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              >
                <SearchIcon size={16} />
                <span>Search...</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs">⌘K</kbd>
              </button>
              <button
                onClick={() => setQuickActionsOpen(true)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                title="Quick Actions"
              >
                <Zap size={20} />
              </button>
              <ThemeToggle />
              <RecentItems />
              {user?.id && <Notifications userId={user.id} />}
              <Button variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-white">
                <LogOut size={16} /> Logout
              </Button>
            </div>
          </div>
          
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/home" element={<Home algorithms={algorithms} onNavigate={(view) => {
              if (view === 'library') navigate('/library');
              else if (view === 'generate') navigate('/generate');
            }} />} />
            <Route path="/generate" element={<Generator onSave={addAlgorithm} onNavigate={(view) => {
              if (view === 'library') navigate('/library');
              else navigate('/');
            }} />} />
            <Route path="/synthesize" element={<Synthesizer algorithms={algorithms} onSave={addAlgorithm} onNavigate={(view) => {
              if (view === 'library') navigate('/library');
              else navigate('/');
            }} />} />
            <Route path="/library" element={<Library algorithms={algorithms} onUpdate={updateAlgorithm} />} />
            <Route path="/algorithm/:id" element={<AlgorithmDetail />} />
            <Route path="/algorithm/:id/diff" element={<VersionDiff />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/improvements" element={<Improvements />} />
            <Route path="/combinations" element={<Combinations />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="/search" element={<Search />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/import" element={<Import />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <ToastContainer toasts={toasts} onRemove={remove} />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <QuickActions isOpen={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
      <ScrollToTop />
      <OfflineIndicator />
      <Accessibility />
      {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
    </div>
    </ErrorBoundary>
  );
};

export default AppContent;

