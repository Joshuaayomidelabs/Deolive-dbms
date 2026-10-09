import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Users,
  MapPin,
  Building,
  MoreVertical,
  X,
  Mail,
  Phone,
  CheckCircle2,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Database,
  Info,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Client, ClientType } from '../types/database';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { isRLSError } from '../lib/rlsHelper';

interface DisplayClient {
  id: string;
  name: string;
  code: string;
  type: ClientType;
  location: string;
  email: string;
  phone: string;
  isSample?: boolean;
}

export const CLIENTS_TABLE_SQL = `-- 1. Create the 'clients' table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Residential', 'Commercial', 'Hospitality')),
  location TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 4. RLS: Allow members to view clients in their organization
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

-- 5. RLS: Allow members to create clients in their organization
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

-- 6. RLS: Allow members to update clients in their organization
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

-- 7. RLS: Only owners and admins may delete clients
DROP POLICY IF EXISTS "Allow members delete clients" ON public.clients;
DROP POLICY IF EXISTS "Allow owners and admins delete clients" ON public.clients;
CREATE POLICY "Allow owners and admins delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;

export const ClientsPage: React.FC = () => {
  const { currentOrg, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const { showToast } = useToast();

  const [realClients, setRealClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | ClientType>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<DisplayClient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ClientType>('Residential');
  const [formLocation, setFormLocation] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // Delete modal state
  const [clientToDelete, setClientToDelete] = useState<DisplayClient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SQL Helper Modal state
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const canManageClients = currentMemberRole === 'owner' || currentMemberRole === 'admin' || currentMemberRole === 'member';
  const canDeleteClients = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  const fetchClients = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      const saved = localStorage.getItem(`deolive_clients_${currentOrg.id}`);
      if (saved) {
        try {
          setRealClients(JSON.parse(saved));
        } catch {
          setRealClients([]);
        }
      } else {
        setRealClients([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table does not exist (relation does not exist code 42P01 or message)
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('relation') && msg.includes('does not exist')) {
          setTableExists(false);
        } else if (isRLSError(error)) {
          reportRLSError('clients', 'SELECT', error);
        }
        setRealClients([]);
      } else {
        setTableExists(true);
        setRealClients(data || []);
      }
    } catch {
      setRealClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentOrg, isDemoMode]);

  // Format clients for display
  const displayClients: DisplayClient[] = realClients.map((c, idx) => ({
    id: c.id,
    name: c.name,
    code: `#${String(realClients.length - idx).padStart(4, '0')}`,
    type: c.type,
    location: c.location || 'Not specified',
    email: c.email || '—',
    phone: c.phone || '—',
    isSample: false,
  }));

  // Filtering
  const filteredClients = displayClients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormType('Residential');
    setFormLocation('');
    setFormEmail('');
    setFormPhone('');
    setModalError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (client: DisplayClient) => {
    if (client.isSample) {
      showToast('This is sample data. Add a new client to save directly to Supabase.', 'info');
      return;
    }
    setEditingClient(client);
    setFormName(client.name);
    setFormType(client.type);
    setFormLocation(client.location === 'Not specified' ? '' : client.location);
    setFormEmail(client.email === '—' ? '' : client.email);
    setFormPhone(client.phone === '—' ? '' : client.phone);
    setModalError(null);
    setActiveMenuId(null);
    setShowAddModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Client name is required.');
      return;
    }

    if (!currentOrg) return;

    setSubmitting(true);
    setModalError(null);

    const clientPayload = {
      organization_id: currentOrg.id,
      name: formName.trim(),
      type: formType,
      location: formLocation.trim() || null,
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
    };

    try {
      if (editingClient) {
        // Edit existing client
        if (isDemoMode) {
          const updated = realClients.map((c) =>
            c.id === editingClient.id ? { ...c, ...clientPayload } : c
          );
          setRealClients(updated);
          localStorage.setItem(`deolive_clients_${currentOrg.id}`, JSON.stringify(updated));
          showToast(`Client "${formName.trim()}" updated successfully.`, 'success');
          setShowAddModal(false);
          return;
        }

        const { data, error } = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', editingClient.id)
          .select()
          .single();

        if (error) {
          if (isRLSError(error)) {
            reportRLSError('clients', 'UPDATE', error);
          }
          setModalError(error.message);
        } else {
          setRealClients(realClients.map((c) => (c.id === editingClient.id ? data : c)));
          showToast(`Client "${data.name}" updated successfully.`, 'success');
          setShowAddModal(false);
        }
      } else {
        // Add new client
        if (isDemoMode) {
          const newClient: Client = {
            id: `client-${Date.now()}`,
            ...clientPayload,
            created_at: new Date().toISOString(),
          };
          const updated = [newClient, ...realClients];
          setRealClients(updated);
          localStorage.setItem(`deolive_clients_${currentOrg.id}`, JSON.stringify(updated));
          showToast(`Client "${newClient.name}" created and saved.`, 'success');
          setShowAddModal(false);
          return;
        }

        const { data, error } = await supabase
          .from('clients')
          .insert(clientPayload)
          .select()
          .single();

        if (error) {
          if (isRLSError(error)) {
            reportRLSError('clients', 'INSERT', error);
          }
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('relation') && msg.includes('does not exist')) {
            setTableExists(false);
            setModalError('The "clients" table does not exist in Supabase yet. Please run the SQL schema script in your Supabase SQL editor.');
          } else {
            setModalError(error.message);
          }
        } else {
          setTableExists(true);
          setRealClients([data, ...realClients]);
          showToast(`Client "${data.name}" created successfully.`, 'success');
          setShowAddModal(false);
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while saving client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;

    if (clientToDelete.isSample) {
      showToast('Sample clients cannot be deleted from the database.', 'info');
      setClientToDelete(null);
      return;
    }

    setIsDeleting(true);

    try {
      if (isDemoMode) {
        const updated = realClients.filter((c) => c.id !== clientToDelete.id);
        setRealClients(updated);
        localStorage.setItem(`deolive_clients_${currentOrg?.id}`, JSON.stringify(updated));
        showToast(`Client "${clientToDelete.name}" deleted.`, 'info');
        setClientToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id);

      if (error) {
        if (isRLSError(error)) {
          reportRLSError('clients', 'DELETE', error);
        }
        showToast(`Failed to delete client: ${error.message}`, 'error');
      } else {
        setRealClients(realClients.filter((c) => c.id !== clientToDelete.id));
        showToast(`Client "${clientToDelete.name}" deleted.`, 'info');
      }
    } catch {
      showToast('An unexpected error occurred while deleting.', 'error');
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(CLIENTS_TABLE_SQL);
    setCopiedSql(true);
    showToast('Supabase SQL copied to clipboard.', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const getTypeBadgeClass = (type: ClientType) => {
    switch (type) {
      case 'Residential':
        return 'badge-execution'; // light blue / dark blue
      case 'Commercial':
        return 'badge-design'; // light purple / dark purple
      case 'Hospitality':
        return 'badge-concept'; // light yellow / dark yellow
      default:
        return 'bg-stone-100 text-stone-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Client Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage your client directory, contact accounts, and project assignments.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {canDeleteClients && (
            <button
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="View Database Schema SQL"
            >
              <Code2 className="w-3.5 h-3.5 text-[#5FA20D]" />
              <span>Database SQL</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Database Setup Notice if table does not exist (owner/admin only) */}
      {!tableExists && !isDemoMode && canDeleteClients && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Clients Database Table Required</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Run the quick SQL script in your database to enable persistence and access controls.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSqlModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shrink-0 cursor-pointer transition-colors"
          >
            View SQL Script
          </button>
        </div>
      )}

      {/* Search & Filters Card (Shown when clients exist) */}
      {realClients.length > 0 && (
        <div className="de-olive-card p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients by name, location, email, or code..."
                className="w-full bg-[#F8F8FA] border border-[#EEEEF2] rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#77C614] focus:bg-white transition-colors"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span>Type {typeFilter !== 'All' ? `(${typeFilter})` : ''}</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-stone-400">
                    Filter by Type
                  </div>
                  {(['All', 'Residential', 'Commercial', 'Hospitality'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTypeFilter(t);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                        typeFilter === t ? 'text-[#3F6F05] font-bold bg-[#77C614]/10' : 'text-stone-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Area: Loading vs Empty State vs Clients Table */}
      {loading ? (
        <div className="de-olive-card p-16 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#77C614]" />
          <span className="text-xs">Loading clients from Supabase...</span>
        </div>
      ) : realClients.length === 0 ? (
        <div className="de-olive-card p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Client Directory</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              No clients yet. Add your first client to start linking projects and issuing invoices.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#77C614]" />
              <span>Add First Client</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="de-olive-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    CLIENT NAME
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    TYPE
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    LOCATION
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    CONTACT
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEF2] text-xs">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* CLIENT NAME */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-900 text-sm leading-tight">
                            {client.name}
                          </p>
                          {client.isSample && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              Sample data
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-stone-400 mt-0.5 block">
                          ID: {client.code}
                        </span>
                      </div>
                    </td>

                    {/* TYPE */}
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getTypeBadgeClass(client.type)}`}>
                        {client.type}
                      </span>
                    </td>

                    {/* LOCATION */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{client.location}</span>
                      </div>
                    </td>

                    {/* CONTACT */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-stone-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Row Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === client.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-stone-200 rounded-xl shadow-xl z-30 py-1 text-xs">
                            <button
                              onClick={() => handleOpenEditModal(client)}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer text-left"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                              <span>Edit Client</span>
                            </button>

                            {canDeleteClients && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setClientToDelete(client);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete Client</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-500" />
                      <p className="text-xs font-medium text-stone-600">No clients match your filter.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setTypeFilter('All');
                        }}
                        className="mt-2 text-xs text-[#5FA20D] hover:underline font-semibold cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClient} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Client / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Al-Hamra Luxury Residence"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Sector / Type <span className="text-red-500">*</span></label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ClientType)}
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Hospitality">Hospitality</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Riyadh, KSA"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contact@client.com"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+966 50 ..."
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClient ? 'Save Changes' : 'Save to Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        title="Delete Client"
        message={`Are you sure you want to delete "${clientToDelete?.name}"? This action removes the client from your database.`}
        confirmLabel="Delete Client"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setClientToDelete(null)}
      />

      {/* SQL Script View Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#5FA20D]" />
                <h3 className="text-sm font-bold text-stone-900">Supabase SQL Schema for "clients"</h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-3">
              Paste and run this in your{' '}
              <span className="font-semibold text-stone-800">Supabase Dashboard &gt; SQL Editor</span>. It creates the table with Row Level Security (RLS) matching your organization setup.
            </p>

            <div className="mt-3 relative">
              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed border border-stone-800">
                {CLIENTS_TABLE_SQL}
              </pre>
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#77C614]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
