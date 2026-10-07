import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Database,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OrganizationIndustry, OrganizationTeamSize } from '../types/database';

const INDUSTRIES: OrganizationIndustry[] = [
  'Technology & Software',
  'Design & Creative',
  'Architecture & Construction',
  'Consulting & Services',
  'Marketing & Media',
  'Healthcare',
  'Other',
];

const TEAM_SIZES: OrganizationTeamSize[] = [
  '1-5',
  '6-20',
  '21-50',
  '51-200',
  '200+',
];

export const SettingsPage: React.FC = () => {
  const {
    user,
    profile,
    currentOrg,
    currentMemberRole,
    isDemoMode,
    isConfigured,
    updateProfile,
    updateOrganization,
  } = useAuth();

  const toast = useToast();

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRlsSql, setProfileRlsSql] = useState<string | null>(null);

  // Organization Form State
  const [orgName, setOrgName] = useState(currentOrg?.name || '');
  const [orgIndustry, setOrgIndustry] = useState<OrganizationIndustry>(
    (currentOrg?.industry as OrganizationIndustry) || 'Technology & Software'
  );
  const [orgTeamSize, setOrgTeamSize] = useState<OrganizationTeamSize>(
    (currentOrg?.team_size as OrganizationTeamSize) || '6-20'
  );
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgRlsSql, setOrgRlsSql] = useState<string | null>(null);

  const [copiedSql, setCopiedSql] = useState<string | null>(null);

  const isOwner = currentMemberRole === 'owner';

  // Sync state if profile or currentOrg updates
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
      if (currentOrg.industry) setOrgIndustry(currentOrg.industry as OrganizationIndustry);
      if (currentOrg.team_size) setOrgTeamSize(currentOrg.team_size as OrganizationTeamSize);
    }
  }, [currentOrg]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileRlsSql(null);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setProfileError('Full name is required.');
      return;
    }
    if (trimmed.length < 2) {
      setProfileError('Full name must be at least 2 characters long.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await updateProfile(trimmed);
      if (res.error) {
        setProfileError(res.error.message || 'Failed to update profile.');
        // If RLS blocked, supply the exact policy
        const errMsg = res.error.message?.toLowerCase() || '';
        if (errMsg.includes('policy') || errMsg.includes('row-level security') || errMsg.includes('permission denied')) {
          setProfileRlsSql(`-- Fix: Allow users to update their own profile
CREATE POLICY "Allow users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);`);
        }
      } else {
        toast.success('Your profile name was updated successfully.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'An unexpected error occurred.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Organization Update (Owner only)
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    if (!isOwner) {
      setOrgError('Only the organization owner has permission to change workspace details.');
      return;
    }

    setOrgError(null);
    setOrgRlsSql(null);

    const trimmedName = orgName.trim();
    if (!trimmedName) {
      setOrgError('Organization name is required.');
      return;
    }

    setOrgSaving(true);
    try {
      const res = await updateOrganization(currentOrg.id, {
        name: trimmedName,
        industry: orgIndustry,
        team_size: orgTeamSize,
      });

      if (res.error) {
        setOrgError(res.error.message || 'Failed to update organization details.');
        const errMsg = res.error.message?.toLowerCase() || '';
        if (errMsg.includes('policy') || errMsg.includes('row-level security') || errMsg.includes('permission denied')) {
          setOrgRlsSql(`-- Fix: Allow owners to update their organization details
CREATE POLICY "Allow owners update org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );`);
        }
      } else {
        toast.success(`Organization "${trimmedName}" updated successfully.`);
      }
    } catch (err: any) {
      setOrgError(err.message || 'An unexpected error occurred.');
    } finally {
      setOrgSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(id);
    toast.info('SQL Policy copied to clipboard.');
    setTimeout(() => setCopiedSql(null), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900 font-sans">
          Workspace & Account Settings
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Manage your personal profile and organization workspace preferences.
        </p>
      </div>

      {/* SECTION 1: PERSONAL PROFILE SETTINGS */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent-light text-brand-primary-dark flex items-center justify-center">
              <User className="w-4 h-4 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Personal Profile</h2>
              <p className="text-[11px] text-stone-500">
                Update how your name appears on assigned tasks and activity logs.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded capitalize bg-stone-100 text-stone-700">
            {currentMemberRole || 'Member'}
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
          {profileError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Update Blocked</p>
                  <p className="text-[11px] text-red-700 mt-0.5">{profileError}</p>
                </div>
              </div>

              {profileRlsSql && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-medium text-red-900">
                      Required Supabase RLS Policy:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(profileRlsSql, 'profile')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:text-red-900"
                    >
                      {copiedSql === 'profile' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql === 'profile' ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-stone-900 text-stone-200 font-mono text-[10px] overflow-x-auto whitespace-pre">
                    {profileRlsSql}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'user@deolive.io'}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-500 cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Email is tied to your authentication login credentials.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-stone-100">
            <button
              type="submit"
              disabled={profileSaving || !fullName.trim() || fullName.trim() === profile?.full_name}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-brand-black transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: WORKSPACE & ORGANIZATION SETTINGS */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-accent-light text-brand-primary-dark flex items-center justify-center">
              <Building2 className="w-4 h-4 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Organization Settings</h2>
              <p className="text-[11px] text-stone-500">
                Workspace profile, industry categorization, and team size.
              </p>
            </div>
          </div>

          {!isOwner && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
              <Lock className="w-3 h-3 text-stone-400" />
              Owner Edit Only
            </span>
          )}
        </div>

        <form onSubmit={handleSaveOrganization} className="p-6 space-y-5">
          {!isOwner && (
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center gap-2">
              <Shield className="w-4 h-4 text-stone-400 shrink-0" />
              <span>
                You are currently viewing workspace settings as an <strong>{currentMemberRole || 'member'}</strong>. Only the organization owner can modify these values.
              </span>
            </div>
          )}

          {orgError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Organization Update Blocked</p>
                  <p className="text-[11px] text-red-700 mt-0.5">{orgError}</p>
                </div>
              </div>

              {orgRlsSql && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono font-medium text-red-900">
                      Required Supabase SQL Policy:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(orgRlsSql, 'org')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:text-red-900"
                    >
                      {copiedSql === 'org' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql === 'org' ? 'Copied' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-stone-900 text-stone-200 font-mono text-[10px] overflow-x-auto whitespace-pre">
                    {orgRlsSql}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Corp Labs"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:bg-stone-50 disabled:text-stone-500 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Industry Classification
                </label>
                <select
                  disabled={!isOwner}
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value as OrganizationIndustry)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:bg-stone-50 disabled:text-stone-500 disabled:cursor-not-allowed"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Team Size
                </label>
                <select
                  disabled={!isOwner}
                  value={orgTeamSize}
                  onChange={(e) => setOrgTeamSize(e.target.value as OrganizationTeamSize)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:bg-stone-50 disabled:text-stone-500 disabled:cursor-not-allowed"
                >
                  {TEAM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} members
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center justify-end pt-2 border-t border-stone-100">
              <button
                type="submit"
                disabled={
                  orgSaving ||
                  !orgName.trim() ||
                  (orgName.trim() === currentOrg?.name &&
                    orgIndustry === currentOrg?.industry &&
                    orgTeamSize === currentOrg?.team_size)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-brand-black transition-colors cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {orgSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{orgSaving ? 'Saving Changes...' : 'Save Organization'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* SECTION 3: SYSTEM ENVIRONMENT & DATA SAFETY */}
      <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-stone-900">
              Database Connection: {isConfigured ? 'Supabase Live' : 'Demo Workspace'}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
              {isConfigured
                ? 'Your application is connected directly via environment variables to Supabase.'
                : 'Running in self-contained demo sandbox mode. Configure VITE_SUPABASE_URL to connect.'}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-white border border-stone-200 text-stone-700">
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-brand-primary' : 'bg-amber-400'
              }`}
            />
            {isConfigured ? 'LIVE POSTGRES' : 'SANDBOX'}
          </span>
        </div>
      </div>
    </div>
  );
};
