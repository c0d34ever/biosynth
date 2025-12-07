import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = (setSidebarOpen?: (open: boolean) => void) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+K or Cmd+K: Open command palette (handled in AppContent)
      // Don't prevent default here, let AppContent handle it

      // Ctrl+B or Cmd+B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (setSidebarOpen) {
          setSidebarOpen((prev) => !prev);
        }
      }

      // Ctrl+, or Cmd+,: Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        navigate('/settings');
      }

      // ?: Open help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        navigate('/help');
      }

      // G: Navigate to generator
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/generate');
      }

      // L: Navigate to library
      if (e.key === 'l' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/library');
      }

      // Escape: Close modals/dropdowns
      if (e.key === 'Escape') {
        // This can be extended to close modals
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, setSidebarOpen]);
};

