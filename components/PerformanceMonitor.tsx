import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  apiCallTime: number;
  memoryUsage?: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Monitor render performance
    const measureRender = () => {
      const start = performance.now();
      requestAnimationFrame(() => {
        const end = performance.now();
        setMetrics(prev => ({
          ...prev,
          renderTime: end - start
        } as PerformanceMetrics));
      });
    };

    // Monitor memory (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1048576 // Convert to MB
      }));
    }

    measureRender();
    const interval = setInterval(measureRender, 5000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !metrics) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        title="Performance Monitor"
      >
        <Activity size={20} />
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-3">Performance</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Render Time:</span>
              <span className="text-white">{metrics.renderTime.toFixed(2)}ms</span>
            </div>
            {metrics.memoryUsage && (
              <div className="flex justify-between">
                <span className="text-slate-400">Memory:</span>
                <span className="text-white">{metrics.memoryUsage.toFixed(2)} MB</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

