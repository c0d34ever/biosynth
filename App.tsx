import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authApi } from './services/api';
import { Auth } from './components/Auth';
import AppContent from './components/AppContent';
import Landing from './pages/Landing';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (userData: any) => {
    setUser(userData);
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
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" replace />} />
          <Route path="/login" element={!user ? <Auth onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} />
          
          {/* Protected routes */}
          {user ? (
            <Route path="/*" element={<AppContent />} />
          ) : (
            <Route path="/*" element={<Navigate to="/" replace />} />
          )}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App;