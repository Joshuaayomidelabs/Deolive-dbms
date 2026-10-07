import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, X, Terminal, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RLSErrorModal: React.FC = () => {
  const { rlsError, clearRlsError } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!rlsError) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(rlsError.suggestedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rls-error-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="rls-error-title" className="text-base font-semibold text-stone-900">
                Row Level Security (RLS) Policy Required
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                Action blocked on table: <span className="font-mono font-semibold">{rlsError.table}</span> ({rlsError.operation})
              </p>
            </div>
          </div>
          <button
            onClick={clearRlsError}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-stone-600">
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
            <span className="font-medium text-stone-500 uppercase tracking-wider text-[10px]">Database Error</span>
            <p className="font-mono text-stone-800 break-words">{rlsError.message}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider mb-2">
              How to fix this in your Supabase project:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-xs text-stone-600 mb-3">
              <li>Open your <strong>Supabase Dashboard</strong> in your browser</li>
              <li>Click on the <strong>SQL Editor</strong> tab in the left sidebar</li>
              <li>Paste the SQL statements below and click <strong>Run</strong></li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between bg-stone-900 text-stone-300 px-4 py-2 rounded-t-lg text-xs font-mono">
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Fix Policy for public.{rlsError.table}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-stone-950 text-emerald-300 font-mono text-xs rounded-b-lg overflow-x-auto leading-relaxed border border-stone-800 select-all">
              {rlsError.suggestedSql}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
          >
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={clearRlsError}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs"
          >
            Dismiss & Retry
          </button>
        </div>
      </div>
    </div>
  );
};
