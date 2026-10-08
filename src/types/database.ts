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
  currency?: string; // e.g. 'USD' | 'NGN' | 'GBP' | 'EUR'
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

export type ClientType = 'Residential' | 'Commercial' | 'Hospitality';

export interface Client {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  name: string;
  type: ClientType;
  location: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

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
  client_id?: string | null; // uuid -> clients.id
  client?: Client;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type DesignType = 'Mood Board' | '3D Render' | 'Floor Plan' | 'Other';
export type DesignStatus = 'Pending' | 'Approved';

export interface Design {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  project_id: string | null; // uuid -> projects.id
  name: string;
  type: DesignType;
  status: DesignStatus;
  file_path: string;
  file_url: string | null;
  uploaded_by: string | null; // uuid -> auth.users.id
  created_at: string;
  // joined fields:
  project?: Project;
  uploader_profile?: Profile;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  project_id: string | null; // uuid -> projects.id
  client_id: string | null; // uuid -> clients.id
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  // joined fields:
  project?: Project;
  client?: Client;
}

export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  project_id: string | null; // uuid -> projects.id
  invoice_id: string | null; // uuid -> invoices.id
  description: string;
  type: TransactionType;
  category: string;
  amount: number;
  transaction_date: string;
  created_at: string;
  // joined fields:
  project?: Project;
  invoice?: Invoice;
}

export type VendorCategory = 'Furniture' | 'Materials' | 'Lighting' | 'Contractor' | 'Other';
export type VendorStatus = 'Active' | 'Inactive';

export interface Vendor {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  name: string;
  category: VendorCategory;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  status: VendorStatus;
  notes: string | null;
  created_at: string;
}

export type InventoryCategory = 'Furniture' | 'Materials' | 'Samples' | 'Fabric' | 'Other';
export type InventoryUnit = 'pcs' | 'm' | 'm2' | 'kg';

export interface InventoryItem {
  id: string; // uuid
  organization_id: string; // uuid -> organizations.id
  vendor_id: string | null; // uuid -> vendors.id
  project_id: string | null; // uuid -> projects.id
  name: string;
  category: InventoryCategory;
  sku: string | null;
  quantity: number;
  unit: InventoryUnit;
  unit_cost: number;
  low_stock_threshold: number;
  storage_location: string | null;
  created_at: string;
  // joined fields:
  vendor?: Vendor;
  project?: Project;
}

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
