import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  UserPlus,
  Shield,
  Mail,
  MoreVertical,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InviteMemberModal } from '../components/modals/InviteMemberModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { useToast } from '../context/ToastContext';

interface MemberRecord {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export const StaffPage: React.FC = () => {
  const { currentOrg, currentMemberRole, isDemoMode, user, reportRLSError } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<MemberRecord | null>(null);

  const canManageStaff = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  const fetchStaff = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setMembers([
        {
          id: 'mem-1',
          user_id: user?.id || 'usr-1',
          role: 'owner',
          profile: {
            full_name: 'Lead Design Principal',
            email: user?.email || 'principal@de-olive.com',
          },
        },
        {
          id: 'mem-2',
          user_id: 'usr-2',
          role: 'admin',
          profile: {
            full_name: 'Studio Director',
            email: 'director@de-olive.com',
          },
        },
        {
          id: 'mem-3',
          user_id: 'usr-3',
          role: 'member',
          profile: {
            full_name: 'Project Architect',
            email: 'architect@de-olive.com',
          },
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: memberData, error: memErr } = await supabase
        .from('organization_members')
        .select('*, profile:profiles(*)')
        .eq('organization_id', currentOrg.id);

      if (memErr) {
        reportRLSError('organization_members', 'SELECT', memErr);
      } else {
        setMembers(memberData || []);
      }
    } catch (e: any) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentOrg, isDemoMode]);

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      if (isDemoMode) {
        setMembers(members.filter((m) => m.id !== memberToRemove.id));
        showToast('Staff member removed.', 'info');
        setMemberToRemove(null);
        return;
      }

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) {
        reportRLSError('organization_members', 'DELETE', error);
        showToast(error.message, 'error');
      } else {
        setMembers(members.filter((m) => m.id !== memberToRemove.id));
        showToast('Staff member removed from workspace.', 'info');
        setMemberToRemove(null);
      }
    } catch (err: any) {
      showToast('Failed to remove staff member.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header per spec:
          - Title: "Staff Management" with "+ Add Staff" button
      */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Staff Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage employees, roles, design leads, and project access.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff</span>
        </button>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#77C614]" />
          <span className="text-xs">Loading staff directory...</span>
        </div>
      ) : members.length === 0 ? (
        /* Empty-state Card per spec:
            - Grey user-cog icon
            - "Team Directory"
            - "Manage employees, roles, and permissions."
        */
        <div className="de-olive-card p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Team Directory</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              Manage employees, roles, and permissions.
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Invite First Member</span>
          </button>
        </div>
      ) : (
        /* Populated Table View */
        <div className="de-olive-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    STAFF MEMBER
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    ROLE / PERMISSION
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    STATUS
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEF2] text-xs">
                {members.map((mem) => {
                  const name = mem.profile?.full_name || 'Staff Member';
                  const email = mem.profile?.email || 'member@de-olive.com';
                  const initials = name
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'DO';

                  return (
                    <tr key={mem.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#111113] text-[#77C614] ring-1 ring-[#77C614]/40 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm leading-tight">{name}</p>
                            <span className="text-[11px] text-stone-400 mt-0.5 block">{email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            mem.role === 'owner'
                              ? 'badge-execution'
                              : mem.role === 'admin'
                              ? 'badge-design'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {mem.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#77C614]" />
                          <span>Active Member</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {canManageStaff && mem.role !== 'owner' ? (
                          <button
                            onClick={() => setMemberToRemove(mem)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-400 font-medium">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connected Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvitationCreated={() => {
          showToast('Staff invitation link generated.', 'success');
          fetchStaff();
        }}
      />

      {/* Confirm Remove Staff Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        title="Remove Staff Member"
        message={`Are you sure you want to revoke workspace access for ${memberToRemove?.profile?.full_name || 'this member'}?`}
        confirmLabel="Remove Staff"
        variant="danger"
        onConfirm={handleRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
};
