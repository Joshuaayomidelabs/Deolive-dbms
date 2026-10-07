import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
            >
              {variant === 'danger' ? (
                <Trash2 className="w-5 h-5 text-red-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-stone-900 leading-snug">
                {title}
              </h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-brand-primary hover:bg-brand-primary-hover text-brand-black'
              }`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
