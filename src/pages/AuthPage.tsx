import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FolderKanban, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Settings2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SupabaseConfigModal } from '../components/modals/SupabaseConfigModal';

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
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error.message || 'Failed to sign in. Please check your credentials.');
        } else {
          navigate(returnTo || '/');
        }
      } else if (mode === 'signup') {
        if (!fullName.trim()) {
          setErrorMsg('Full name is required to initialize your profile.');
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, fullName.trim());
        if (res.error) {
          setErrorMsg(res.error.message || 'Failed to sign up.');
        } else {
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => {
            navigate(returnTo || '/');
          }, 1000);
        }
      } else if (mode === 'forgot') {
        const res = await resetPassword(email);
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
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-brand-primary/20 selection:text-stone-900">
      {/* Top Bar / Supabase Status */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          onClick={() => setShowConfigModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-2xs ${
            isConfigured
              ? 'bg-brand-accent-light text-brand-primary-dark border-brand-primary/30 hover:bg-brand-accent-light/80'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>{isConfigured ? 'Supabase Connected' : 'Connect Supabase'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <div className="flex justify-center mb-2">
          <img
            src="/logo.png"
            alt="De-Olive Concept DBMS"
            className="h-20 w-auto object-contain drop-shadow-2xs"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.svg';
            }}
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900 font-sans">
          De-Olive DBMS
        </h1>
        <p className="mt-1 text-xs text-stone-500 font-medium">
          Cloud Project Management & Database Execution Suite
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 sm:rounded-xl sm:px-10">
          {/* Tabs */}
          <div className="flex border-b border-stone-100 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`pb-3 text-xs font-semibold flex-1 border-b-2 text-center transition-colors ${
                mode === 'signin'
                  ? 'border-brand-primary text-stone-950 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`pb-3 text-xs font-semibold flex-1 border-b-2 text-center transition-colors ${
                mode === 'signup'
                  ? 'border-brand-primary text-stone-950 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`pb-3 text-xs font-semibold flex-1 border-b-2 text-center transition-colors ${
                mode === 'forgot'
                  ? 'border-brand-primary text-stone-950 font-bold'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              Reset
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="space-y-1">
                <span className="font-medium">{errorMsg}</span>
                {errorMsg.toLowerCase().includes('database') || errorMsg.toLowerCase().includes('url') ? (
                  <p className="text-[11px] text-red-700">
                    Need to link your Supabase project?{' '}
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="underline font-semibold hover:text-red-900"
                    >
                      Open Connection Setup
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-brand-accent-light border border-brand-primary/30 flex items-start gap-2 text-xs text-brand-primary-dark font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-brand-primary-dark" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Elena Rostova"
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-400">
                  Will be recorded in public.profiles table.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-stone-700">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-brand-primary-dark font-semibold hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-brand-black text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-brand-black" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In to Workspace'}
                    {mode === 'signup' && 'Create Account & Continue'}
                    {mode === 'forgot' && 'Send Password Reset Email'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Option */}
          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={handleLaunchDemo}
              className="w-full py-2 px-3 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-primary-dark" />
              <span>Explore Instant Demo Workspace</span>
            </button>
            <p className="mt-2 text-[11px] text-stone-400">
              Preview projects, kanban tasks, and team views with simulated Supabase data.
            </p>
          </div>
        </div>

        {/* Security and Schema Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
          <span>Connected to Supabase public schema with Row Level Security</span>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};
