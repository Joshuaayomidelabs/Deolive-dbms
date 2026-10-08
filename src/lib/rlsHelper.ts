/**
 * Helper to identify and generate exact Row-Level Security (RLS) SQL policies
 * when Supabase returns 42501 or policy violation errors.
 */
import { RLSErrorDetails } from '../types/database';

export function isRLSError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.details || '').toLowerCase();
  const code = error.code || '';
  return (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('rls') ||
    msg.includes('violates row-level security policy') ||
    msg.includes('permission denied')
  );
}

export function generateRLSPolicySuggestion(
  table: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  rawError: any
): RLSErrorDetails {
  const message = rawError?.message || rawError?.details || 'Row Level Security policy blocked operation.';
  const code = rawError?.code || '42501';

  let suggestedSql = '';

  switch (table) {
    case 'profiles':
      suggestedSql = `-- RLS Policies for 'profiles' table
-- 1. Enable RLS (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow all authenticated users to read member profiles (for names & avatars)
CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow users to insert/update their own profile
CREATE POLICY "Allow users update own profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);`;
      break;

    case 'organizations':
      suggestedSql = `-- RLS Policies for 'organizations' table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to create a new organization
CREATE POLICY "Allow authenticated create org"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 2. Allow members to view their organizations
CREATE POLICY "Allow members read org"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow organization owners/admins to update organization details
CREATE POLICY "Allow admins update org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;
      break;

    case 'organization_members':
      suggestedSql = `-- RLS Policies for 'organization_members' table
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated user to add themselves as 'owner' during org setup
CREATE POLICY "Allow self-member insert on org creation"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Allow members to view teammates in their organization
CREATE POLICY "Allow members view org members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow owners and admins to update member roles
CREATE POLICY "Allow admins update member roles"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;
      break;

    case 'projects':
      suggestedSql = `-- RLS Policies for 'projects' table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1. Allow organization members to read projects
CREATE POLICY "Allow members read projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. Allow members to insert projects in their organization
CREATE POLICY "Allow members create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow members to update projects in their organization
CREATE POLICY "Allow members update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 4. Allow owners/admins to delete projects
CREATE POLICY "Allow members delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;
      break;

    case 'tasks':
      suggestedSql = `-- RLS Policies for 'tasks' table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. Allow members to read tasks in their organization
CREATE POLICY "Allow members read tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. Allow members to create tasks in their organization
CREATE POLICY "Allow members create tasks"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow members to update tasks in their organization
CREATE POLICY "Allow members update tasks"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 4. Allow members to delete tasks in their organization
CREATE POLICY "Allow members delete tasks"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );`;
      break;

    case 'clients':
      suggestedSql = `-- RLS Policies for 'clients' table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 1. Allow members to read clients in their organization
CREATE POLICY "Allow members read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. Allow members to create clients in their organization
CREATE POLICY "Allow members create clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow members to update clients in their organization
CREATE POLICY "Allow members update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 4. Allow members to delete clients in their organization
CREATE POLICY "Allow members delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );`;
      break;

    case 'designs':
      suggestedSql = `-- RLS Policies for 'designs' table & storage
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- 1. Allow members to read designs in their organization
CREATE POLICY "Allow members read designs"
  ON public.designs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 2. Allow members to create designs in their organization
CREATE POLICY "Allow members create designs"
  ON public.designs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow members to update designs in their organization
CREATE POLICY "Allow members update designs"
  ON public.designs
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- 4. Allow members to delete designs in their organization
CREATE POLICY "Allow members delete designs"
  ON public.designs
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );`;
      break;

    case 'invoices':
      suggestedSql = `-- RLS Policies for 'invoices' table (Owners and Admins only)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow owners/admins to read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners/admins to create invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners/admins to update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners/admins to delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;
      break;

    case 'transactions':
      suggestedSql = `-- RLS Policies for 'transactions' table (Owners and Admins only)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow owners/admins to read transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners/admins to create transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners/admins to update transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners/admins to delete transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;
      break;

    case 'vendors':
      suggestedSql = `-- RLS Policies for 'vendors' table (All organization members)
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to read vendors"
  ON public.vendors FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow members to create vendors"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow members to update vendors"
  ON public.vendors FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow members to delete vendors"
  ON public.vendors FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );`;
      break;

    case 'inventory_items':
      suggestedSql = `-- RLS Policies for 'inventory_items' table (All organization members)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to read inventory items"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow members to create inventory items"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow members to update inventory items"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow members to delete inventory items"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );`;
      break;

    default:
      suggestedSql = `-- RLS Policy for table '${table}'
ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to ${table}"
  ON public.${table}
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);`;
  }

  return {
    table,
    operation,
    message,
    code,
    suggestedSql,
  };
}
