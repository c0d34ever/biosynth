import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} className="text-emerald-400" />;
      case 'error':
        return <XCircle size={20} className="text-red-400" />;
      case 'warning':
        return <AlertCircle size={20} className="text-amber-400" />;
      default:
        return <Info size={20} className="text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div
      className={`
        ${getBgColor()} border rounded-lg p-4 shadow-lg backdrop-blur-sm
        animate-in slide-in-from-right fade-in duration-300
        min-w-[300px] max-w-[500px]
      `}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="font-semibold text-white mb-1">{toast.title}</h4>
          )}
          <p className="text-sm text-slate-300">{toast.message}</p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

// Toast manager hook
let toastIdCounter = 0;
const toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'success', message, title, duration }];
    notifyListeners();
  },
  error: (message: string, title?: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'error', message, title, duration }];
    notifyListeners();
  },
  info: (message: string, title?: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'info', message, title, duration }];
    notifyListeners();
  },
  warning: (message: string, title?: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    toasts = [...toasts, { id, type: 'warning', message, title, duration }];
    notifyListeners();
  },
  remove: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  },
  clear: () => {
    toasts = [];
    notifyListeners();
  }
};

export const useToast = () => {
  const [toastList, setToastList] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToastList(newToasts);
    };
    toastListeners.push(listener);
    setToastList([...toasts]);

    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toasts: toastList,
    remove: toast.remove,
    clear: toast.clear
  };
};

