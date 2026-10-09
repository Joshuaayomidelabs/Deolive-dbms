import React from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

interface Props {
  onContinueDemo?: () => void;
}

export const MissingEnvErrorScreen: React.FC<Props> = ({ onContinueDemo }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-[#111114] border border-[#23232A] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#23232A] bg-[#16161B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black ring-2 ring-[#77C614] p-1 flex items-center justify-center shadow-[0_0_12px_rgba(119,198,20,0.25)]">
              <img
                src="/logo.png"
                alt="DE-OLIVE"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider text-white uppercase leading-none font-sans">
                DE-OLIVE
              </h1>
              <span className="text-[10px] tracking-[0.25em] font-bold text-[#77C614] uppercase block mt-1 leading-none">
                CONCEPT
              </span>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Setup Required
          </span>
        </div>

        {/* Notice Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-amber-200">Database Connection Required</h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                The application requires database credentials to initialize your workspace, authenticate users, and manage project assets.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#18181D] border border-[#26262F] rounded-xl text-xs text-stone-300 space-y-2">
            <div className="flex items-center gap-2 text-stone-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#77C614]" />
              <span>Next Steps</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Please contact your system administrator or verify that your workspace environment parameters are set up in your hosting environment.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#23232A] bg-[#16161B] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-[#77C614] hover:bg-[#68b010] text-[#0D0D0D] font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0D0D0D]" />
            <span>Check Connection & Reload</span>
          </button>

          {onContinueDemo && (
            <button
              onClick={onContinueDemo}
              className="px-4 py-2.5 border border-stone-700 hover:border-stone-600 bg-stone-800/80 hover:bg-stone-800 text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Preview with Demo Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
