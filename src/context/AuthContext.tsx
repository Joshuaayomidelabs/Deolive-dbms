import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, Organization, OrganizationMember, RLSErrorDetails } from '../types/database';
import { isRLSError, generateRLSPolicySuggestion } from '../lib/rlsHelper';
import {
  DEMO_USER_ID,
  DEMO_PROFILE,
  DEMO_ORGANIZATION,
  DEMO_TEAM_MEMBERS,
} from '../lib/mockData';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  currentMemberRole: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  rlsError: RLSErrorDetails | null;
  clearRlsError: () => void;
  reportRLSError: (table: string, operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', error: any) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  createOrganization: (name: string, industry: string, teamSize: string) => Promise<{ error: Error | null; organization?: Organization }>;
  switchOrganization: (orgId: string) => void;
  toggleDemoMode: (enable?: boolean) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentMemberRole, setCurrentMemberRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    // If not configured, default to demo mode or prompt
    return !isSupabaseConfigured();
  });
  const [rlsError, setRlsError] = useState<RLSErrorDetails | null>(null);

  const configured = isSupabaseConfigured();

  const clearRlsError = useCallback(() => {
    setRlsError(null);
  }, []);

  const reportRLSError = useCallback((
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    error: any
  ) => {
    console.error(`[Supabase RLS Error] on ${table} (${operation}):`, error);
    if (isRLSError(error)) {
      const details = generateRLSPolicySuggestion(table, operation, error);
      setRlsError(details);
    }
  }, []);

  // Fetch or upsert profile
  const syncProfile = async (authUserId: string, fallbackName?: string) => {
    try {
      const { data: existingProfile, error: selectErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (selectErr && isRLSError(selectErr)) {
        reportRLSError('profiles', 'SELECT', selectErr);
      }

      if (existingProfile) {
        setProfile(existingProfile);
        return existingProfile;
      }

      // Profile missing - upsert as requested
      const newProfileData = {
        id: authUserId,
        full_name: fallbackName || 'Team Member',
        avatar_url: null,
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(newProfileData, { onConflict: 'id' })
        .select()
        .single();

      if (upsertErr) {
        if (isRLSError(upsertErr)) {
          reportRLSError('profiles', 'INSERT', upsertErr);
        }
        console.warn('Could not upsert profile:', upsertErr.message);
        // Fallback local representation
        const localProf: Profile = {
          ...newProfileData,
          created_at: new Date().toISOString(),
        };
        setProfile(localProf);
        return localProf;
      }

      setProfile(upserted);
      return upserted;
    } catch (err: any) {
      console.error('Error syncing profile:', err);
      return null;
    }
  };

  // Fetch user organizations
  const loadUserOrganizations = async (authUserId: string) => {
    try {
      const { data: memberRows, error: memberErr } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', authUserId);

      if (memberErr) {
        if (isRLSError(memberErr)) {
          reportRLSError('organization_members', 'SELECT', memberErr);
        }
        return [];
      }

      if (!memberRows || memberRows.length === 0) {
        setOrganizations([]);
        setCurrentOrg(null);
        setCurrentMemberRole(null);
        return [];
      }

      const orgIds = memberRows.map((m) => m.organization_id);
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgErr) {
        if (isRLSError(orgErr)) {
          reportRLSError('organizations', 'SELECT', orgErr);
        }
        return [];
      }

      const orgList = orgData || [];
      setOrganizations(orgList);

      // Restore active organization or select first
      const savedOrgId = localStorage.getItem('deolive_active_org_id');
      const found = orgList.find((o) => o.id === savedOrgId) || orgList[0] || null;
      setCurrentOrg(found);

      if (found) {
        const membership = memberRows.find((m) => m.organization_id === found.id);
        setCurrentMemberRole(membership?.role || 'member');
      }

      return orgList;
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
      return [];
    }
  };

  const refreshUserData = async () => {
    if (isDemoMode) {
      setProfile(DEMO_PROFILE);
      setOrganizations([DEMO_ORGANIZATION]);
      setCurrentOrg(DEMO_ORGANIZATION);
      setCurrentMemberRole('owner');
      return;
    }

    if (!configured) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await syncProfile(session.user.id, session.user.user_metadata?.full_name);
        await loadUserOrganizations(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setOrganizations([]);
        setCurrentOrg(null);
        setCurrentMemberRole(null);
      }
    } catch (err: any) {
      console.error('Error refreshing session:', err);
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      // Setup demo environment
      const fakeUser: any = {
        id: DEMO_USER_ID,
        email: 'elena@deolive.io',
        user_metadata: { full_name: 'Elena Rostova' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      setUser(fakeUser);
      setProfile(DEMO_PROFILE);
      setOrganizations([DEMO_ORGANIZATION]);
      setCurrentOrg(DEMO_ORGANIZATION);
      setCurrentMemberRole('owner');
      setIsLoading(false);
      return;
    }

    if (!configured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        syncProfile(session.user.id, session.user.user_metadata?.full_name);
        loadUserOrganizations(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await syncProfile(session.user.id, session.user.user_metadata?.full_name);
          await loadUserOrganizations(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setOrganizations([]);
          setCurrentOrg(null);
          setCurrentMemberRole(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [configured, isDemoMode]);

  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (isDemoMode) {
      return { error: null, user };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;

      // Ensure profile row exists right away
      if (data.user) {
        await syncProfile(data.user.id, fullName);
      }

      return { error: null, user: data.user };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setProfile(null);
      setOrganizations([]);
      setCurrentOrg(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrganizations([]);
    setCurrentOrg(null);
  };

  const resetPassword = async (email: string) => {
    if (isDemoMode) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const createOrganization = async (name: string, industry: string, teamSize: string) => {
    if (isDemoMode) {
      const newOrg: Organization = {
        id: `org-${Date.now()}`,
        name,
        industry,
        team_size: teamSize,
        created_by: user?.id || DEMO_USER_ID,
        created_at: new Date().toISOString(),
      };
      setOrganizations((prev) => [...prev, newOrg]);
      setCurrentOrg(newOrg);
      setCurrentMemberRole('owner');
      return { error: null, organization: newOrg };
    }

    if (!user) {
      return { error: new Error('User must be signed in to create an organization.') };
    }

    try {
      // Call Supabase RPC function instead of direct table inserts
      const { data: orgIdResult, error: rpcErr } = await supabase.rpc(
        'create_organization_for_user',
        {
          org_name: name.trim(),
          org_industry: industry.trim(),
          org_team_size: teamSize.trim(),
        }
      );

      if (rpcErr) {
        if (isRLSError(rpcErr)) {
          reportRLSError('organizations', 'INSERT', rpcErr);
        }
        throw rpcErr;
      }

      if (!orgIdResult) {
        throw new Error('No organization ID returned from server.');
      }

      const newOrgId =
        typeof orgIdResult === 'string'
          ? orgIdResult
          : typeof orgIdResult === 'object' && orgIdResult !== null
          ? (orgIdResult as any).id || String(orgIdResult)
          : String(orgIdResult);

      // Fetch the newly created organization
      const { data: fetchedOrg, error: fetchErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', newOrgId)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Could not immediately fetch organization details:', fetchErr);
      }

      const createdOrg: Organization = fetchedOrg || {
        id: newOrgId,
        name: name.trim(),
        industry: industry.trim(),
        team_size: teamSize.trim(),
        created_by: user.id,
        created_at: new Date().toISOString(),
      };

      // Update state and persistence
      setOrganizations((prev) => {
        const filtered = prev.filter((o) => o.id !== createdOrg.id);
        return [createdOrg, ...filtered];
      });
      setCurrentOrg(createdOrg);
      setCurrentMemberRole('owner');
      localStorage.setItem('deolive_active_org_id', createdOrg.id);

      // Reload user organizations to ensure memberships are in sync
      await loadUserOrganizations(user.id);

      return { error: null, organization: createdOrg };
    } catch (error: any) {
      console.error('Error creating organization via RPC:', error);
      return { error };
    }
  };

  const switchOrganization = (orgId: string) => {
    const selected = organizations.find((o) => o.id === orgId);
    if (selected) {
      setCurrentOrg(selected);
      localStorage.setItem('deolive_active_org_id', selected.id);
      // Update role if known
      if (selected.id === DEMO_ORGANIZATION.id) {
        setCurrentMemberRole('owner');
      }
    }
  };

  const toggleDemoMode = (enable?: boolean) => {
    const nextState = enable !== undefined ? enable : !isDemoMode;
    setIsDemoMode(nextState);
    if (!nextState && !configured) {
      setUser(null);
      setProfile(null);
      setOrganizations([]);
      setCurrentOrg(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organizations,
        currentOrg,
        currentMemberRole,
        isLoading,
        isConfigured: configured,
        isDemoMode,
        rlsError,
        clearRlsError,
        reportRLSError,
        signIn,
        signUp,
        signOut,
        resetPassword,
        createOrganization,
        switchOrganization,
        toggleDemoMode,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
