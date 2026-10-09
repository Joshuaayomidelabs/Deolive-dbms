import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
  UserCheck,
  Building2,
  Mail,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InvitationLookupResult } from '../types/database';

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { user, signOut, refreshUserData, isDemoMode } = useAuth();

  const [invitation, setInvitation] = useState<InvitationLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token was provided in the URL.');
      setLoading(false);
      return;
    }

    const loadInvitation = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (isDemoMode) {
        // Demo lookup simulation
        setInvitation({
          organization_name: 'De-Olive Design & DBMS Labs',
          email: user?.email || 'new.member@deolive.io',
          role: 'member',
          status: 'pending',
          expired: false,
        });
        setLoading(false);
        return;
      }

      try {
        // Call existing Supabase RPC function (works without login as specified)
        const { data, error } = await supabase.rpc('get_invitation_by_token', {
          p_token: token,
        });

        if (error) {
          throw error;
        }

        const invite = Array.isArray(data) ? data[0] : data;

        if (!invite) {
          setErrorMsg('Invitation not found. Please verify the link or request a new invite.');
          return;
        }

        if (invite.status !== 'pending' || invite.expired) {
          if (invite.expired) {
            setErrorMsg('This invitation has expired. Please ask your workspace owner for a new invite link.');
          } else if (invite.status === 'revoked') {
            setErrorMsg('This invitation has been revoked by the workspace administrator.');
          } else if (invite.status === 'accepted') {
            setErrorMsg('This invitation has already been accepted.');
          } else {
            setErrorMsg(`This invitation is no longer active (status: ${invite.status}).`);
          }
          return;
        }

        setInvitation(invite as InvitationLookupResult);
      } catch (err: any) {
        setErrorMsg(err.message || 'Unable to retrieve invitation details.');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, isDemoMode]);

  const isEmailMismatch = Boolean(
    user &&
    invitation &&
    user.email &&
    invitation.email &&
    user.email.toLowerCase() !== invitation.email.toLowerCase()
  );

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('deolive_pending_invite_token', token);
    }
  }, [token]);

  // When user is authenticated and email matches the invitation, automatically join without requiring confirmation
  useEffect(() => {
    if (invitation && user && user.email && !isEmailMismatch && !accepting && !acceptError) {
      handleAcceptInvite();
    }
  }, [invitation, user, isEmailMismatch, accepting, acceptError]);

  const handleAcceptInvite = async () => {
    if (!token || !invitation) return;

    setAccepting(true);
    setAcceptError(null);

    if (isDemoMode) {
      setTimeout(async () => {
        await refreshUserData();
        navigate('/');
      }, 700);
      return;
    }

    try {
      // Call Supabase RPC to accept invitation
      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token,
      });

      if (error) {
        throw error;
      }

      // Success: refresh organizations & profile state
      await refreshUserData();

      // Direct to dashboard (skips create-organization onboarding)
      navigate('/');
    } catch (err: any) {
      setAcceptError(
        err.message || 'Failed to accept invitation. Please ensure your email matches the invited address.'
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleSignOutAndSwitch = async () => {
    await signOut();
    // Stay on this accept-invite page with the token
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-brand-primary/20 selection:text-stone-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
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
          Workspace Invitation Acceptance
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 sm:rounded-xl sm:px-10 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              <span className="text-xs font-medium">Validating invitation token...</span>
            </div>
          ) : errorMsg ? (
            /* Error / Expired / Invalid State */
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-900">
                  Invitation Unavailable
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                  {errorMsg}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : invitation ? (
            /* Valid Invitation State */
            <div className="space-y-5">
              <div className="text-center space-y-1 pb-2 border-b border-stone-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary-dark bg-brand-accent-light px-2.5 py-0.5 rounded">
                  Team Invitation
                </span>
                <h2 className="text-lg font-bold text-stone-900 mt-2">
                  Join {invitation.organization_name}
                </h2>
                <p className="text-xs text-stone-500">
                  You have been invited to collaborate with the role of{' '}
                  <span className="font-semibold uppercase text-stone-800">
                    {invitation.role}
                  </span>
                  .
                </p>
              </div>

              {/* Details card */}
              <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-lg space-y-2.5 text-xs text-stone-600">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Organization:</span>
                  <span className="font-semibold text-stone-900">
                    {invitation.organization_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Invited Email:</span>
                  <span className="font-mono text-stone-900">{invitation.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Granted Role:</span>
                  <span className="font-semibold uppercase text-stone-900">
                    {invitation.role}
                  </span>
                </div>
              </div>

              {/* Accept Error Feedback */}
              {acceptError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{acceptError}</span>
                </div>
              )}

              {/* Auth Status Decision */}
              {!user ? (
                /* Unauthenticated: Prompt Login / Sign Up with returnTo preserved */
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-stone-600 text-center">
                    Please authenticate with <strong>{invitation.email}</strong> to accept this invitation.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/login?returnTo=${encodeURIComponent(
                            `/accept-invite?token=${token}`
                          )}&email=${encodeURIComponent(invitation.email)}&mode=signin`
                        )
                      }
                      className="w-full py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-colors text-center shadow-2xs cursor-pointer"
                    >
                      Log in to Accept
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/login?returnTo=${encodeURIComponent(
                            `/accept-invite?token=${token}`
                          )}&email=${encodeURIComponent(invitation.email)}&mode=signup`
                        )
                      }
                      className="w-full py-2.5 px-3 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg text-xs font-bold transition-colors text-center shadow-2xs cursor-pointer"
                    >
                      Sign up to Accept
                    </button>
                  </div>
                </div>
              ) : isEmailMismatch ? (
                /* Authenticated but Email Mismatch */
                <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Email address mismatch</p>
                      <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                        You are signed in as <strong>{user.email}</strong>, but this invite was issued for <strong>{invitation.email}</strong>.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOutAndSwitch}
                    className="w-full mt-2 py-2 px-3 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out and switch to {invitation.email}</span>
                  </button>
                </div>
              ) : (
                /* Authenticated & Email Matches -> Ready to Accept */
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    disabled={accepting}
                    onClick={handleAcceptInvite}
                    className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-black text-xs font-bold rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-brand-black" />
                        <span>Accepting & Joining Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Accept Invitation & Join</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-stone-400 text-center">
                    Signed in as {user.email}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
