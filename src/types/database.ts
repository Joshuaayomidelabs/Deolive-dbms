/**
 * De-Olive DBMS - Database Schema Types
 * Matches public schema tables exactly:
 * - profiles
 * - organizations
 * - organization_members
 * - projects
 * - tasks
 */

export interface Profile {
  id: string; // uuid (= auth user id)
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type OrganizationIndustry = 
  | 'Technology & Software'
  | 'Design & Creative'
  | 'Architecture & Construction'
  | 'Consulting & Services'
  | 'Marketing & Media'
  | 'Healthcare'
  | 'Other';

export type OrganizationTeamSize = '1-5' | '6-20' | '21-50' | '51-200' | '200+';

export interface Organization {
  id: string; // uuid
  name: string;
  industry: string | null;
  team_size: string | null;
  created_by: string; // uuid
  created_at: string;
}

export type MemberRole = 'owner' | 'admin' | 'member';

export interface OrganizationMember {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  user_id: string; // uuid -> auth.users.id
  role: MemberRole;
  created_at: string;
  // joined fields:
  profile?: Profile;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface Project {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null; // date
  due_date: string | null; // date
  created_by: string; // uuid
  created_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  project_id: string; // uuid -> projects.id
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null; // uuid -> auth.users.id
  due_date: string | null; // date
  created_by: string; // uuid
  created_at: string;
  // joined fields:
  assignee_profile?: Profile;
  project?: Project;
}

export interface RLSErrorDetails {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  message: string;
  code?: string;
  suggestedSql: string;
}

export type InvitationRole = 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface Invitation {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  email: string;
  role: InvitationRole;
  token: string; // uuid
  status: InvitationStatus;
  invited_by: string; // uuid
  created_at: string;
  expires_at: string;
}

export interface InvitationLookupResult {
  organization_name: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expired: boolean;
}
