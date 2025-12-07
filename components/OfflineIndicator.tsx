import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[10001] p-4 text-center text-sm font-medium
        transition-transform duration-300
        ${showBanner ? 'translate-y-0' : '-translate-y-full'}
        ${isOnline
          ? 'bg-emerald-500 text-white'
          : 'bg-red-500 text-white'
        }
      `}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi size={18} />
            <span>Connection restored</span>
          </>
        ) : (
          <>
            <WifiOff size={18} />
            <span>You're offline. Some features may be unavailable.</span>
          </>
        )}
      </div>
    </div>
  );
};

