import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  X,
  Edit2,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Filter,
  Loader2,
  AlertCircle,
  Database,
  Code2,
  Check,
  Copy,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Vendor, VendorCategory, VendorStatus } from '../types/database';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { isRLSError } from '../lib/rlsHelper';

interface DisplayVendor {
  id: string;
  name: string;
  category: VendorCategory;
  location: string;
  contact_person: string;
  phone: string;
  email: string;
  status: VendorStatus;
  notes?: string | null;
  isSample?: boolean;
}

export const VendorsPage: React.FC = () => {
  const { currentOrg, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const { showToast } = useToast();

  const isOwnerOrAdmin = currentMemberRole === 'owner' || currentMemberRole === 'admin' || isDemoMode;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | VendorCategory>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<DisplayVendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<VendorCategory>('Materials');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState<VendorStatus>('Active');
  const [formNotes, setFormNotes] = useState('');

  // Delete modal state
  const [vendorToDelete, setVendorToDelete] = useState<DisplayVendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVendors = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      const saved = localStorage.getItem(`deolive_vendors_${currentOrg.id}`);
      setVendors(saved ? JSON.parse(saved) : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('relation') && msg.includes('does not exist')) {
          setTableExists(false);
        } else if (isRLSError(error)) {
          reportRLSError('vendors', 'SELECT', error);
        }
        setVendors([]);
      } else {
        setTableExists(true);
        setVendors(data || []);
      }
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [currentOrg, isDemoMode]);

  const hasNoRealVendors = vendors.length === 0;

  // Format vendors for display
  const displayVendors: DisplayVendor[] = hasNoRealVendors
    ? [] // Empty state will be shown if 0 real vendors and user hasn't loaded samples
    : vendors.map((v) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        location: v.location || '—',
        contact_person: v.contact_person || '—',
        phone: v.phone || '—',
        email: v.email || '—',
        status: v.status,
        notes: v.notes,
        isSample: false,
      }));

  // Filtering
  const filteredVendors = displayVendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'All' || v.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormName('');
    setFormCategory('Materials');
    setFormContactPerson('');
    setFormEmail('');
    setFormPhone('');
    setFormLocation('');
    setFormStatus('Active');
    setFormNotes('');
    setModalError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (vendor: DisplayVendor) => {
    if (vendor.isSample) {
      showToast('Sample vendors cannot be edited in the database.', 'info');
      return;
    }
    setEditingVendor(vendor);
    setFormName(vendor.name);
    setFormCategory(vendor.category);
    setFormContactPerson(vendor.contact_person === '—' ? '' : vendor.contact_person);
    setFormEmail(vendor.email === '—' ? '' : vendor.email);
    setFormPhone(vendor.phone === '—' ? '' : vendor.phone);
    setFormLocation(vendor.location === '—' ? '' : vendor.location);
    setFormStatus(vendor.status);
    setFormNotes(vendor.notes || '');
    setModalError(null);
    setActiveMenuId(null);
    setShowAddModal(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Vendor name is required.');
      return;
    }
    if (!currentOrg) return;

    setSubmitting(true);
    setModalError(null);

    const payload = {
      organization_id: currentOrg.id,
      name: formName.trim(),
      category: formCategory,
      contact_person: formContactPerson.trim() || null,
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
      location: formLocation.trim() || null,
      status: formStatus,
      notes: formNotes.trim() || null,
    };

    try {
      if (editingVendor) {
        if (isDemoMode) {
          const updated = vendors.map((v) =>
            v.id === editingVendor.id ? { ...v, ...payload } : v
          );
          setVendors(updated);
          localStorage.setItem(`deolive_vendors_${currentOrg.id}`, JSON.stringify(updated));
          showToast(`Vendor "${formName}" updated.`, 'success');
          setShowAddModal(false);
          return;
        }

        const { data, error } = await supabase
          .from('vendors')
          .update(payload)
          .eq('id', editingVendor.id)
          .select()
          .single();

        if (error) {
          if (isRLSError(error)) reportRLSError('vendors', 'UPDATE', error);
          setModalError('Something went wrong, please try again.');
        } else {
          setVendors(vendors.map((v) => (v.id === editingVendor.id ? data : v)));
          showToast(`Vendor "${data.name}" updated successfully.`, 'success');
          setShowAddModal(false);
        }
      } else {
        if (isDemoMode) {
          const newV: Vendor = {
            id: `v-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
          };
          const updated = [newV, ...vendors];
          setVendors(updated);
          localStorage.setItem(`deolive_vendors_${currentOrg.id}`, JSON.stringify(updated));
          showToast(`Vendor "${newV.name}" created.`, 'success');
          setShowAddModal(false);
          return;
        }

        const { data, error } = await supabase
          .from('vendors')
          .insert(payload)
          .select()
          .single();

        if (error) {
          setModalError('Something went wrong, please try again.');
        } else {
          setVendors([data, ...vendors]);
          showToast(`Vendor "${data.name}" added to registry.`, 'success');
          setShowAddModal(false);
        }
      }
    } catch {
      setModalError('Something went wrong, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;

    if (vendorToDelete.isSample) {
      showToast('Sample vendors cannot be deleted from the database.', 'info');
      setVendorToDelete(null);
      return;
    }

    setIsDeleting(true);

    try {
      if (isDemoMode) {
        const updated = vendors.filter((v) => v.id !== vendorToDelete.id);
        setVendors(updated);
        localStorage.setItem(`deolive_vendors_${currentOrg?.id}`, JSON.stringify(updated));
        showToast(`Vendor "${vendorToDelete.name}" deleted.`, 'info');
        setVendorToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorToDelete.id);

      if (error) {
        showToast('Something went wrong, please try again.', 'error');
      } else {
        setVendors(vendors.filter((v) => v.id !== vendorToDelete.id));
        showToast(`Vendor "${vendorToDelete.name}" removed from registry.`, 'info');
      }
    } catch {
      showToast('Something went wrong, please try again.', 'error');
    } finally {
      setIsDeleting(false);
      setVendorToDelete(null);
    }
  };

  const getCategoryBadge = (cat: VendorCategory) => {
    switch (cat) {
      case 'Furniture':
        return 'badge-execution';
      case 'Materials':
        return 'badge-design';
      case 'Lighting':
        return 'badge-concept';
      case 'Contractor':
        return 'badge-completed';
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
            Vendor Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage material suppliers, artisans, joinery workshops, and contractors.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* When vendors exist: Search & Filters Card */}
      {!hasNoRealVendors && (
        <div className="de-olive-card p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendors by name, contact person, location, or trade..."
                className="w-full bg-[#F8F8FA] border border-[#EEEEF2] rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#77C614] focus:bg-white transition-colors"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span>Category: {categoryFilter}</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-stone-400">
                    Filter by Category
                  </div>
                  {(['All', 'Furniture', 'Materials', 'Lighting', 'Contractor', 'Other'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCategoryFilter(c);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                        categoryFilter === c ? 'text-[#3F6F05] font-bold bg-[#77C614]/10' : 'text-stone-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Area: Empty State vs Populated Table View */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#77C614]" />
          <span className="text-xs">Loading vendor directory...</span>
        </div>
      ) : hasNoRealVendors ? (
        /* Empty-state Card when there are none */
        <div className="de-olive-card p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Vendor List</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              Manage suppliers, contractors, and partners here.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#77C614]" />
              <span>Add First Vendor</span>
            </button>
          </div>
        </div>
      ) : (
        /* Populated Vendors Table */
        <div className="de-olive-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    VENDOR NAME
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    CATEGORY
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    LOCATION
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    CONTACT PERSON
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
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* VENDOR NAME */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-stone-900 text-sm leading-tight">{v.name}</p>
                        <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                          {v.phone !== '—' && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-stone-400" />
                              {v.phone}
                            </span>
                          )}
                          {v.email !== '—' && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-stone-400" />
                              {v.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getCategoryBadge(v.category)}`}>
                        {v.category}
                      </span>
                    </td>

                    {/* LOCATION */}
                    <td className="px-6 py-4 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{v.location}</span>
                      </div>
                    </td>

                    {/* CONTACT PERSON */}
                    <td className="px-6 py-4 text-stone-700 font-medium">
                      {v.contact_person}
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'Active' ? 'badge-completed' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === v.id ? null : v.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === v.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                            <button
                              onClick={() => handleOpenEditModal(v)}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer text-left"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                              <span>Edit</span>
                            </button>
                            {isOwnerOrAdmin && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setVendorToDelete(v);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-500" />
                      <p className="text-xs font-medium text-stone-600">No vendors match your search.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setCategoryFilter('All');
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

      {/* Add / Edit Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}
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

            <form onSubmit={handleSaveVendor} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Vendor / Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Al-Noor Marble & Granite Quarries"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Trade Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as VendorCategory)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Materials">Materials</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Operational Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as VendorStatus)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="e.g. Tariq Mansoor"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Location / HQ</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Riyadh, KSA"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+966 ..."
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="rep@supplier.com"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Lead times, wholesale discounts, delivery freight terms..."
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none"
                />
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
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#77C614]" />}
                  <span>{editingVendor ? 'Save Changes' : 'Save Vendor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(vendorToDelete)}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${vendorToDelete?.name}"? Associated materials and purchase records will remain intact.`}
        confirmLabel="Delete Vendor"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setVendorToDelete(null)}
      />
    </div>
  );
};
