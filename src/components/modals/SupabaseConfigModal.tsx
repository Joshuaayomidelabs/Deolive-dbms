import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseConfig } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { isDemoMode, toggleDemoMode } = useAuth();
  const config = getSupabaseConfig();
  
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const envSnippet = `VITE_SUPABASE_URL="${config.url || 'https://your-project-ref.supabase.co'}"\nVITE_SUPABASE_ANON_KEY="${config.anonKey || 'your-anon-public-key'}"`;

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-primary text-brand-black flex items-center justify-center font-bold shadow-xs">
              <Database className="w-4 h-4 text-brand-black" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Supabase Connection Info</h3>
              <p className="text-xs text-stone-500">Workspace backend configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-600">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            config.isConfigured 
              ? 'bg-brand-accent-light border-brand-primary/30 text-brand-primary-dark' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {config.isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-brand-primary-dark shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-xs">
                {config.isConfigured ? 'Connected to Supabase' : 'Environment Variables Not Configured'}
              </p>
              <p className="text-[11px] mt-0.5 opacity-90">
                {config.isConfigured
                  ? `Active project endpoint: ${config.url}`
                  : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables or .env file.'}
              </p>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <ShieldCheck className="w-4 h-4 text-brand-primary-dark" />
              <span>Production Deployment (Vercel):</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              In Vercel Project Settings &rarr; Environment Variables, add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>. Variables are read securely at build time without exposing secrets.
            </p>
            <div className="pt-1">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-brand-primary-dark font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Find credentials in Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Active Configuration Details */}
          <div className="space-y-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Active Supabase URL
              </label>
              <input
                type="text"
                readOnly
                value={config.url || '(Not set)'}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-100 text-stone-700 font-mono text-xs select-all"
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Active Anon Key
              </label>
              <input
                type="text"
                readOnly
                value={config.anonKey ? `${config.anonKey.substring(0, 16)}••••••••••••` : '(Not set)'}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-100 text-stone-700 font-mono text-xs"
              />
            </div>
          </div>

          {/* .env instructions */}
          <div className="border-t border-stone-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-stone-700">Local Development (.env template):</span>
              <button
                onClick={copyEnvSnippet}
                className="text-[11px] text-brand-primary-dark font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-brand-primary-dark" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? 'Copied to clipboard' : 'Copy snippet'}</span>
              </button>
            </div>
            <pre className="p-3 bg-stone-900 text-stone-200 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed border border-stone-800">
              {envSnippet}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                toggleDemoMode(!isDemoMode);
                onClose();
              }}
              className="px-3.5 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              {isDemoMode ? 'Exit Demo Mode' : 'Switch to Demo Preview'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
