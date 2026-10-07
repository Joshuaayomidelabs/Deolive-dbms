import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Copy, Check, Terminal, Cloud, ShieldAlert } from 'lucide-react';

interface Props {
  onContinueDemo?: () => void;
}

export const MissingEnvErrorScreen: React.FC<Props> = ({ onContinueDemo }) => {
  const [activeTab, setActiveTab] = useState<'vercel' | 'local'>('vercel');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const hasUrl = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.trim() !== '');
  const hasKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.trim() !== '');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(label);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const vercelSnippet = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-2xl bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header with De-Olive DBMS Brand */}
        <div className="p-6 border-b border-stone-800/80 bg-stone-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-xs">
              <img src="/logo.svg" alt="De-Olive DBMS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>De-Olive DBMS</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Setup Required
                </span>
              </h1>
              <p className="text-xs text-stone-400">Cloud-based SaaS Database & Project Management</p>
            </div>
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium transition-colors"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Error Notification Banner */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-amber-200">Missing Environment Variables</h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                De-Olive DBMS requires connection credentials for your Supabase project. The application cannot initialize database tables and user authentication without them.
              </p>
            </div>
          </div>

          {/* Status Check Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Required Variables</h3>
            <div className="grid gap-2">
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${hasUrl ? 'bg-[#56B900]' : 'bg-red-400 animate-pulse'}`} />
                  <code className="text-xs font-mono text-stone-200">VITE_SUPABASE_URL</code>
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${hasUrl ? 'bg-[#56B900]/20 text-[#56B900]' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                  {hasUrl ? 'CONFIGURED' : 'MISSING'}
                </span>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-[#56B900]' : 'bg-red-400 animate-pulse'}`} />
                  <code className="text-xs font-mono text-stone-200">VITE_SUPABASE_ANON_KEY</code>
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${hasKey ? 'bg-[#56B900]/20 text-[#56B900]' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                  {hasKey ? 'CONFIGURED' : 'MISSING'}
                </span>
              </div>
            </div>
          </div>

          {/* Setup Guide Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-800">
              <button
                onClick={() => setActiveTab('vercel')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'vercel'
                    ? 'border-[#56B900] text-white'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-[#56B900]" />
                <span>Deploying to Vercel</span>
              </button>
              <button
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'local'
                    ? 'border-[#56B900] text-white'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-stone-400" />
                <span>Local Development (.env)</span>
              </button>
            </div>

            {activeTab === 'vercel' ? (
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-3 text-xs text-stone-300">
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>
                    Open your project dashboard on{' '}
                    <a
                      href="https://vercel.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#56B900] underline hover:text-[#76d61f]"
                    >
                      vercel.com
                    </a>
                  </li>
                  <li>Go to <strong>Settings</strong> &rarr; <strong>Environment Variables</strong></li>
                  <li>
                    Add both variables for <strong>Production</strong>, <strong>Preview</strong>, and <strong>Development</strong>:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1 font-mono text-[11px] text-stone-400">
                      <li><code>VITE_SUPABASE_URL</code>: your Supabase Project URL</li>
                      <li><code>VITE_SUPABASE_ANON_KEY</code>: your anon public key</li>
                    </ul>
                  </li>
                  <li>
                    Trigger a <strong>Redeploy</strong> in Vercel to rebuild with the variables injected.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-3 text-xs text-stone-300">
                <p className="font-medium">
                  In your local project folder, copy <code className="text-[#56B900]">.env.example</code> to <code className="text-[#56B900]">.env</code>:
                </p>
                <div className="relative">
                  <pre className="p-3 bg-stone-950 border border-stone-800 rounded-lg font-mono text-[11px] text-stone-300 overflow-x-auto">
                    {vercelSnippet}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(vercelSnippet, 'snippet')}
                    className="absolute top-2 right-2 px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedVar === 'snippet' ? <Check className="w-3 h-3 text-[#56B900]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedVar === 'snippet' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-400">
                  After saving <code className="font-mono">.env</code>, restart your Vite dev server (<code className="font-mono">npm run dev</code>).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-stone-800/80 bg-stone-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#56B900] hover:bg-[#4ea800] text-[#0D0D0D] font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#0D0D0D]" />
              <span>Check Connection & Reload</span>
            </button>

            {onContinueDemo && (
              <button
                onClick={onContinueDemo}
                className="px-3.5 py-2 border border-stone-700 hover:border-stone-600 bg-stone-800/60 hover:bg-stone-800 text-stone-300 hover:text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
              >
                Preview with Demo Data
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <ShieldAlert className="w-3.5 h-3.5 text-stone-500" />
            <span>Never expose service_role or secret keys</span>
          </div>
        </div>
      </div>
    </div>
  );
};
