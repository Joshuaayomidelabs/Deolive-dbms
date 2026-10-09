import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Copy,
  Check,
  Ban,
  Trash2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { OrganizationMember, Profile, MemberRole, Invitation } from '../types/database';
import { InviteMemberModal } from '../components/modals/InviteMemberModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';

export const TeamPage: React.FC = () => {
  const { currentOrg, user, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const toast = useToast();

  const [members, setMembers] = useState<(OrganizationMember & { profile?: Profile })[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Safety Confirmation states
  const [memberToRemove, setMemberToRemove] = useState<(OrganizationMember & { profile?: Profile }) | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [inviteToRevoke, setInviteToRevoke] = useState<Invitation | null>(null);
  const [isRevokingInvite, setIsRevokingInvite] = useState(false);

  const canManageTeam = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  const fetchMembers = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setMembers(DEMO_TEAM_MEMBERS);
      setLoadingMembers(false);
      return;
    }

    setLoadingMembers(true);
    try {
      // 1. Fetch organization members
      const { data: memberRows, error: memErr } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: true });

      if (memErr) {
        reportRLSError('organization_members', 'SELECT', memErr);
        setErrorMsg(memErr.message);
        setLoadingMembers(false);
        return;
      }

      if (!memberRows || memberRows.length === 0) {
        setMembers([]);
        setLoadingMembers(false);
        return;
      }

      // 2. Fetch profiles
      const userIds = memberRows.map((m) => m.user_id);
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profErr) {
        reportRLSError('profiles', 'SELECT', profErr);
      }

      const pMap: Record<string, Profile> = {};
      (profileRows || []).forEach((p) => {
        pMap[p.id] = p;
      });

      const enriched = memberRows.map((m) => ({
        ...m,
        profile: pMap[m.user_id] || {
          id: m.user_id,
          full_name: 'Team Member',
          avatar_url: null,
          created_at: m.created_at,
        },
      }));

      setMembers(enriched);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load team members.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInvitations = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setInvitations(DEMO_INVITATIONS as unknown as Invitation[]);
      setLoadingInvitations(false);
      return;
    }

    setLoadingInvitations(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        setInvitations([]);
      } else {
        setInvitations((data as Invitation[]) || []);
      }
    } catch (err: any) {
      setInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchInvitations();
  }, [currentOrg, isDemoMode]);

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    setUpdatingId(memberId);
    setErrorMsg(null);

    if (isDemoMode) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success('Member role updated successfully (Demo).');
      setUpdatingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) {
        reportRLSError('organization_members', 'UPDATE', error);
        toast.error(error.message || 'Failed to update member role.');
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        toast.success('Member role updated successfully.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    const displayName = memberToRemove.profile?.full_name || 'Team member';
    setIsRemovingMember(true);

    if (isDemoMode) {
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      toast.success(`${displayName} removed from organization.`);
      setIsRemovingMember(false);
      setMemberToRemove(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) {
        reportRLSError('organization_members', 'DELETE', error);
        toast.error(error.message || 'Failed to remove member.');
      } else {
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        toast.success(`${displayName} removed from organization.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member.');
    } finally {
      setIsRemovingMember(false);
      setMemberToRemove(null);
    }
  };

  const handleConfirmRevokeInvitation = async () => {
    if (!inviteToRevoke) return;
    setIsRevokingInvite(true);

    if (isDemoMode) {
      setInvitations((prev) => prev.filter((inv) => inv.id !== inviteToRevoke.id));
      toast.success(`Invitation to ${inviteToRevoke.email} revoked.`);
      setIsRevokingInvite(false);
      setInviteToRevoke(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', inviteToRevoke.id);

      if (error) {
        reportRLSError('invitations', 'UPDATE', error);
        toast.error(error.message || 'Failed to revoke invitation.');
      } else {
        setInvitations((prev) => prev.filter((inv) => inv.id !== inviteToRevoke.id));
        toast.success(`Invitation to ${inviteToRevoke.email} revoked.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke invitation.');
    } finally {
      setIsRevokingInvite(false);
      setInviteToRevoke(null);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.info('Invitation link copied to clipboard.');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-sans">
            Team Members & Access Control
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage workspace members and invitations for <span className="font-semibold text-stone-700">{currentOrg?.name}</span>.
          </p>
        </div>

        {/* Enabled "Invite member" button for owners and admins only */}
        {canManageTeam && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#111113] hover:bg-[#222226] text-white transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#77C614]" />
              <span>Invite Member</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Info notice about privileges */}
      <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-medium text-stone-800">
            Role Privileges in De-Olive DBMS
          </p>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            <strong>Owner:</strong> Full workspace governance, project creation, organization settings, and member controls. ·{' '}
            <strong>Admin:</strong> Manage projects, invite members, and configure tasks. ·{' '}
            <strong>Member:</strong> View projects and execute assigned tasks.
          </p>
        </div>
      </div>

      {/* ACTIVE MEMBERS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-900">Active Members</h2>
            <span className="text-xs font-mono font-medium text-stone-400 tabular-nums">
              ({members.length})
            </span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
          {loadingMembers ? (
            <div className="h-44 flex flex-col items-center justify-center text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              <span className="text-xs">Loading team roster...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-medium">
                    <th className="py-3 px-5">Team Member</th>
                    <th className="py-3 px-5">Role Permission</th>
                    <th className="py-3 px-5">Joined Date</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {members.map((member) => {
                    const isCurrent = user?.id === member.user_id;
                    const displayName = member.profile?.full_name || 'Team Member';
                    const initials = displayName
                      .split(' ')
                      .filter(Boolean)
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    const canChangeThisMember =
                      canManageTeam && (!isCurrent || currentMemberRole === 'owner');

                    return (
                      <tr key={member.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {member.profile?.avatar_url ? (
                              <img
                                src={member.profile.avatar_url}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover border border-stone-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-brand-primary-dark font-bold text-xs flex items-center justify-center">
                                {initials}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-stone-900">
                                  {displayName}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-stone-400 font-mono">
                                ID: {member.user_id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role Changer Select or Read-only Label */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            {canChangeThisMember ? (
                              <select
                                value={member.role}
                                disabled={updatingId === member.id}
                                onChange={(e) =>
                                  handleRoleChange(member.id, e.target.value as MemberRole)
                                }
                                className={`px-2.5 py-1 text-xs rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors cursor-pointer ${
                                  member.role === 'owner'
                                    ? 'bg-brand-accent-light border-brand-primary/30 text-brand-primary-dark font-bold'
                                    : member.role === 'admin'
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : 'bg-stone-50 border-stone-200 text-stone-700'
                                }`}
                              >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                                  member.role === 'owner'
                                    ? 'bg-brand-accent-light text-brand-primary-dark'
                                    : member.role === 'admin'
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {member.role}
                              </span>
                            )}
                            {updatingId === member.id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                            )}
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-5 font-mono tabular-nums text-stone-500">
                          {new Date(member.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Actions: Remove member */}
                        <td className="py-3.5 px-5 text-right">
                          {canManageTeam && !isCurrent && member.role !== 'owner' ? (
                            <button
                              onClick={() => setMemberToRemove(member)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              title={`Remove ${displayName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-primary-dark font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-stone-400">
                        No members registered in this organization.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PENDING INVITATIONS SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-900">Pending Invitations</h2>
            <span className="text-xs font-mono font-medium text-stone-400 tabular-nums">
              ({invitations.length})
            </span>
          </div>

          {canManageTeam && invitations.length > 0 && (
            <span className="text-[11px] text-stone-400">
              Links valid for 7 days from creation
            </span>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
          {loadingInvitations ? (
            <div className="h-32 flex flex-col items-center justify-center text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              <span className="text-xs">Loading pending invitations...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center text-stone-500 space-y-1.5">
              <Mail className="w-7 h-7 text-stone-300 mx-auto mb-1" />
              <p className="text-xs font-medium text-stone-700">No pending invitations</p>
              <p className="text-[11px] text-stone-400">
                {canManageTeam
                  ? 'Click "Invite Member" above to generate an invitation link for a teammate.'
                  : 'There are currently no outstanding invitations for this workspace.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-medium">
                    <th className="py-3 px-5">Invited Email</th>
                    <th className="py-3 px-5">Assigned Role</th>
                    <th className="py-3 px-5">Sent Date</th>
                    <th className="py-3 px-5">Expires</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {invitations.map((invite) => {
                    const isCopied = copiedToken === invite.token;

                    const sentDate = invite.created_at
                      ? new Date(invite.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—';

                    const expiryDate = invite.expires_at
                      ? new Date(invite.expires_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '7 days';

                    return (
                      <tr key={invite.id} className="hover:bg-stone-50/60 transition-colors">
                        {/* Email */}
                        <td className="py-3.5 px-5 font-medium text-stone-900">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{invite.email}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`font-semibold uppercase text-[10px] tracking-wide ${
                              invite.role === 'admin' ? 'text-amber-700' : 'text-stone-600'
                            }`}
                          >
                            {invite.role}
                          </span>
                        </td>

                        {/* Sent Date */}
                        <td className="py-3.5 px-5 font-mono tabular-nums text-stone-500">
                          {sentDate}
                        </td>

                        {/* Expiry */}
                        <td className="py-3.5 px-5 font-mono tabular-nums text-stone-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{expiryDate}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(invite.token)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                              title="Copy invite acceptance link"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-brand-primary-dark" />
                                  <span className="text-brand-primary-dark font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-stone-500" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            {/* Revoke Button */}
                            {canManageTeam && (
                              <button
                                type="button"
                                onClick={() => setInviteToRevoke(invite)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded border border-red-200 hover:bg-red-50 text-red-700 font-medium transition-colors cursor-pointer"
                                title="Revoke this invitation"
                              >
                                <Ban className="w-3 h-3 text-red-600" />
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvitationCreated={() => {
          fetchInvitations();
        }}
      />

      {/* Safety Confirm Modal for Removing Member */}
      <ConfirmModal
        isOpen={!!memberToRemove}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${
          memberToRemove?.profile?.full_name || 'this member'
        } from ${currentOrg?.name}? They will lose access to all projects and tasks.`}
        confirmLabel="Remove Member"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isRemovingMember}
        onConfirm={handleConfirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      {/* Safety Confirm Modal for Revoking Invitation */}
      <ConfirmModal
        isOpen={!!inviteToRevoke}
        title="Revoke Invitation"
        message={`Are you sure you want to revoke the invitation sent to ${inviteToRevoke?.email}? The invite link will no longer function.`}
        confirmLabel="Revoke Invitation"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isRevokingInvite}
        onConfirm={handleConfirmRevokeInvitation}
        onCancel={() => setInviteToRevoke(null)}
      />
    </div>
  );
};
