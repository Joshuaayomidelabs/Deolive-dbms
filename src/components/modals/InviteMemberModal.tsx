import React, { useState } from 'react';
import { 
  UserPlus, 
  X, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Mail, 
  ShieldCheck, 
  CheckCircle2,
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { InvitationRole } from '../../types/database';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInvitationCreated: () => void;
}

export const InviteMemberModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onInvitationCreated,
}) => {
  const { currentOrg, isDemoMode } = useAuth();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitationRole>('member');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state with generated invite token
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteLink = generatedToken
    ? `${window.location.origin}/accept-invite?token=${generatedToken}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter an email address.');
      return;
    }
    if (!currentOrg) {
      setErrorMsg('No active organization selected.');
      return;
    }

    const targetEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@company.com).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    if (isDemoMode) {
      // Simulate RPC response in demo mode
      setTimeout(() => {
        const mockToken = `demo-token-${Date.now()}`;
        setGeneratedToken(mockToken);
        setLoading(false);
        onInvitationCreated();
      }, 500);
      return;
    }

    try {
      // Do NOT insert into invitations directly. Call RPC function as required:
      const { data, error } = await supabase.rpc('create_invitation', {
        p_org: currentOrg.id,
        p_email: targetEmail,
        p_role: role,
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No invitation token was returned by the server.');
      }

      const tokenString = typeof data === 'string' ? data : (data as any).token || String(data);
      setGeneratedToken(tokenString);
      onInvitationCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create invitation. Please check database permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetAndInviteAnother = () => {
    setEmail('');
    setRole('member');
    setGeneratedToken(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-primary text-brand-black flex items-center justify-center shadow-xs font-bold">
              <UserPlus className="w-5 h-5 text-brand-black" />
            </div>
            <div>
              <h2 id="invite-modal-title" className="text-base font-bold text-stone-900">
                Invite Team Member
              </h2>
              <p className="text-xs text-stone-500">
                Grant access to workspace <span className="font-semibold text-stone-700">{currentOrg?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs text-stone-600">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {generatedToken ? (
            /* Success State with Copyable Link */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-brand-accent-light border border-brand-primary/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-brand-primary-dark font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary-dark" />
                  <span>Invitation Created Successfully</span>
                </div>
                <p className="text-xs text-brand-primary-dark leading-relaxed">
                  An invitation token was issued for <span className="font-bold">{email}</span> with the role of <span className="font-bold uppercase">{role}</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Shareable Invitation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg font-bold transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-brand-black" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center gap-2 text-[11px] text-stone-500">
                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Note: This invitation link expires in <strong>7 days</strong>.</span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleResetAndInviteAnother}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg font-medium transition-colors"
                >
                  Invite Another Member
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Invite Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium text-stone-700 mb-1.5">
                  Member Email Address <span className="text-red-500">*</span>
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
                    placeholder="teammate@company.com"
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary text-xs transition-colors"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-400">
                  The recipient must sign in or register with this email to accept.
                </p>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1.5">
                  Workspace Role Permission
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-3 border rounded-lg cursor-pointer flex flex-col gap-1 transition-all ${
                      role === 'member'
                        ? 'border-brand-primary bg-brand-accent-light ring-1 ring-brand-primary/30'
                        : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900">Member</span>
                      <input
                        type="radio"
                        name="invite_role"
                        value="member"
                        checked={role === 'member'}
                        onChange={() => setRole('member')}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                    </div>
                    <span className="text-[11px] text-stone-500">
                      Can view projects and complete assigned tasks.
                    </span>
                  </label>

                  <label
                    className={`p-3 border rounded-lg cursor-pointer flex flex-col gap-1 transition-all ${
                      role === 'admin'
                        ? 'border-brand-primary bg-brand-accent-light ring-1 ring-brand-primary/30'
                        : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900">Admin</span>
                      <input
                        type="radio"
                        name="invite_role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                    </div>
                    <span className="text-[11px] text-stone-500">
                      Can create projects, invite teammates, and manage tasks.
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg font-bold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-black" />}
                  <span>Generate Invitation Link</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
