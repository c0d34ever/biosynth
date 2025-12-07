import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, X, FileCode, Database, Activity } from 'lucide-react';
import { algorithmApi, jobApi } from '../services/api';

interface RecentItem {
  id: string | number;
  type: 'algorithm' | 'job';
  name: string;
  timestamp: number;
  url: string;
}

const MAX_RECENT_ITEMS = 10;
const STORAGE_KEY = 'recent_items';

export const RecentItems: React.FC = () => {
  const navigate = useNavigate();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadRecentItems();
  }, []);

  const loadRecentItems = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as RecentItem[];
        // Sort by timestamp, most recent first
        const sorted = items.sort((a, b) => b.timestamp - a.timestamp);
        setRecentItems(sorted.slice(0, MAX_RECENT_ITEMS));
      }
    } catch (error) {
      console.error('Failed to load recent items:', error);
    }
  };

  const addRecentItem = (item: Omit<RecentItem, 'timestamp'>) => {
    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now()
    };

    setRecentItems(prev => {
      // Remove if already exists
      const filtered = prev.filter(i => !(i.id === newItem.id && i.type === newItem.type));
      // Add new item and sort
      const updated = [newItem, ...filtered].sort((a, b) => b.timestamp - a.timestamp);
      const limited = updated.slice(0, MAX_RECENT_ITEMS);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
      } catch (error) {
        console.error('Failed to save recent items:', error);
      }
      
      return limited;
    });
  };

  const removeRecentItem = (id: string | number, type: 'algorithm' | 'job') => {
    setRecentItems(prev => {
      const filtered = prev.filter(i => !(i.id === id && i.type === type));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch (error) {
        console.error('Failed to save recent items:', error);
      }
      return filtered;
    });
  };

  const clearRecentItems = () => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (recentItems.length === 0 && !isOpen) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
        title="Recent items"
      >
        <Clock size={20} />
        {recentItems.length > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-bio-400 rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-[500px] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-bio-400" />
                Recent Items
              </h3>
              <div className="flex gap-2">
                {recentItems.length > 0 && (
                  <button
                    onClick={clearRecentItems}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {recentItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No recent items</p>
                  <p className="text-xs mt-2">Recently viewed items will appear here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentItems.map((item) => {
                    const Icon = item.type === 'algorithm' ? FileCode : Activity;
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="group flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <div className="p-2 bg-slate-800 rounded-lg">
                          <Icon size={16} className="text-slate-400" />
                        </div>
                        <button
                          onClick={() => {
                            navigate(item.url);
                            setIsOpen(false);
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="text-sm font-medium text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentItem(item.id, item.type);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Hook to add recent items
export const useRecentItems = () => {
  const addRecentAlgorithm = (id: number, name: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const items = stored ? JSON.parse(stored) : [];
    const newItem = {
      id,
      type: 'algorithm',
      name,
      url: `/algorithm/${id}`,
      timestamp: Date.now()
    };
    const filtered = items.filter((i: RecentItem) => !(i.id === id && i.type === 'algorithm'));
    const updated = [newItem, ...filtered].sort((a: RecentItem, b: RecentItem) => b.timestamp - a.timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_RECENT_ITEMS)));
  };

  return { addRecentAlgorithm };
};

