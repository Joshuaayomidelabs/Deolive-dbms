import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastItem = { ...item, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => {
    addToast({ type: 'success', title: title || 'Success', message });
  }, [addToast]);

  const error = useCallback((message: string, title?: string) => {
    addToast({ type: 'error', title: title || 'Error', message });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    addToast({ type: 'info', title: title || 'Information', message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg text-xs transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-white border-brand-primary/40 text-stone-900 ring-1 ring-brand-primary/20'
                : t.type === 'error'
                ? 'bg-white border-red-300 text-stone-900 ring-1 ring-red-200'
                : 'bg-white border-stone-200 text-stone-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-brand-accent-light text-brand-primary-dark flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary" />
                </div>
              )}
              {t.type === 'error' && (
                <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                </div>
              )}
              {t.type === 'info' && (
                <div className="w-5 h-5 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                  <Info className="w-3.5 h-3.5 text-stone-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="font-semibold text-stone-900 leading-none mb-1">
                  {t.title}
                </p>
              )}
              <p className="text-stone-600 leading-snug break-words">
                {t.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-stone-600 p-0.5 rounded transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
