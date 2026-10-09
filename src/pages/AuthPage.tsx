import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, resetPassword, isConfigured, toggleDemoMode } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');
  const paramEmail = searchParams.get('email') || '';
  const paramMode = searchParams.get('mode') as 'signin' | 'signup' | 'forgot' | null;

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(paramMode || 'signin');
  const [email, setEmail] = useState(paramEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error.message || 'Failed to sign in. Please verify your credentials.');
        } else {
          navigate(returnTo || '/');
        }
      } else if (mode === 'signup') {
        const trimmedName = fullName.trim();
        if (!trimmedName) {
          setErrorMsg('Full name is required to initialize your profile.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setErrorMsg('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        const res = await signUp(email.trim(), password, trimmedName);
        if (res.error) {
          const msg = res.error.message || '';
          if (
            msg.toLowerCase().includes('already registered') ||
            msg.toLowerCase().includes('already in use') ||
            msg.toLowerCase().includes('user already exists')
          ) {
            setErrorMsg('This email address is already registered. Please sign in instead.');
          } else {
            setErrorMsg(res.error.message || 'Failed to create account. Please try again.');
          }
        } else {
          // Immediately send the user to the next step (dashboard or return destination)
          navigate(returnTo || '/', { replace: true });
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMsg('Please enter your email address to receive password reset instructions.');
          setLoading(false);
          return;
        }
        const res = await resetPassword(email.trim());
        if (res.error) {
          setErrorMsg(res.error.message || 'Failed to send password reset email.');
        } else {
          setSuccessMsg('Password reset instructions sent to your email.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDemo = () => {
    toggleDemoMode(true);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative selection:bg-[#77C614]/30 selection:text-black">
      {/* Top Bar Demo helper */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
        <button
          onClick={handleLaunchDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#18181C] hover:bg-[#222228] text-[#77C614] border border-[#2B2B32] transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Demo</span>
        </button>
      </div>

      {/* Centered Dark Card */}
      <div className="w-full max-w-md bg-[#121215] border border-[#222226] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo Lockup */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-full bg-black ring-2 ring-[#77C614] p-2 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(119,198,20,0.3)] mb-4">
            <img
              src="/logo.png"
              alt="DE-OLIVE"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </div>
          <h1 className="text-xl font-extrabold tracking-wider text-white uppercase font-sans">
            DE-OLIVE
          </h1>
          <span className="text-xs tracking-[0.28em] font-bold text-[#77C614] uppercase block mt-1">
            CONCEPT
          </span>
          <p className="text-xs text-stone-400 mt-2 font-medium">
            Interior Design Management System
          </p>
        </div>

        {/* Tab switchers: Sign In vs Sign Up */}
        <div className="flex bg-[#19191E] p-1 rounded-xl mb-6 border border-[#26262E]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#77C614] text-black font-bold shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#77C614] text-black font-bold shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-xl bg-[#77C614]/15 border border-[#77C614]/30 text-[#77C614] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#77C614] mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Full Name <span className="text-[#77C614]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-[#18181C] border border-[#2A2A30] text-stone-100 placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-[#77C614] focus:ring-1 focus:ring-[#77C614] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Email Address <span className="text-[#77C614]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#18181C] border border-[#2A2A30] text-stone-100 placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-[#77C614] focus:ring-1 focus:ring-[#77C614] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-stone-300">
                Password <span className="text-[#77C614]">*</span>
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-stone-400 hover:text-[#77C614] transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#18181C] border border-[#2A2A30] text-stone-100 placeholder-stone-500 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-[#77C614] focus:ring-1 focus:ring-[#77C614] transition-colors"
              />
            </div>
          </div>

          {/* Full-width Lime Button with Black Bold Text */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#77C614] hover:bg-[#68B012] text-black font-bold text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(119,198,20,0.3)] hover:shadow-[0_0_20px_rgba(119,198,20,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'signin'
                    ? 'Sign In'
                    : mode === 'signup'
                    ? 'Create Workspace Account'
                    : 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer: Enterprise security assurance */}
        <div className="mt-8 pt-5 border-t border-[#1F1F24] text-center text-xs text-stone-400">
          <span>Protected by </span>
          <span className="text-[#77C614] font-semibold">
            Enterprise Cloud Authentication & Data Encryption
          </span>
        </div>
      </div>
    </div>
  );
};
