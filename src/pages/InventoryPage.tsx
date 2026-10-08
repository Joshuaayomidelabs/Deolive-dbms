import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  Tag,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  MoreVertical,
  Minus,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Database,
  Code2,
  Check,
  Copy,
  Info,
  DollarSign,
  TrendingDown,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryCategory, InventoryUnit, Vendor, Project } from '../types/database';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { isRLSError } from '../lib/rlsHelper';
import { formatCurrency } from '../lib/currency';

interface DisplayInventory {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  vendorName: string;
  projectName: string;
  storage_location: string;
  quantity: number;
  unit: InventoryUnit;
  unit_cost: number;
  low_stock_threshold: number;
  isLowStock: boolean;
  isSample?: boolean;
}

export const INVENTORY_SETUP_SQL = `-- 1. Create 'inventory_items' table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Furniture', 'Materials', 'Samples', 'Fabric', 'Other')),
  sku TEXT,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs' CHECK (unit IN ('pcs', 'm', 'm2', 'kg')),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  low_stock_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5,
  storage_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for 'inventory_items'
CREATE INDEX IF NOT EXISTS idx_inventory_org_id ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor_id ON public.inventory_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_project_id ON public.inventory_items(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_items(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for 'inventory_items'
DROP POLICY IF EXISTS "Allow members to read inventory items" ON public.inventory_items;
CREATE POLICY "Allow members to read inventory items"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow members to create inventory items" ON public.inventory_items;
CREATE POLICY "Allow members to create inventory items"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow members to update inventory items" ON public.inventory_items;
CREATE POLICY "Allow members to update inventory items"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Only owners and admins may delete inventory items
DROP POLICY IF EXISTS "Allow members to delete inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow owners and admins to delete inventory items" ON public.inventory_items;
CREATE POLICY "Allow owners and admins to delete inventory items"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;

export const InventoryPage: React.FC = () => {
  const { currentOrg, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const { showToast } = useToast();

  const isOwnerOrAdmin = currentMemberRole === 'owner' || currentMemberRole === 'admin' || isDemoMode;
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(new Set());

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | InventoryCategory>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DisplayInventory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<InventoryCategory>('Materials');
  const [formSku, setFormSku] = useState('');
  const [formVendorId, setFormVendorId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formQuantity, setFormQuantity] = useState('10');
  const [formUnit, setFormUnit] = useState<InventoryUnit>('pcs');
  const [formUnitCost, setFormUnitCost] = useState('150.00');
  const [formThreshold, setFormThreshold] = useState('5');
  const [formLocation, setFormLocation] = useState('Warehouse 01 - Riyadh');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<DisplayInventory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SQL Script modal state
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchData = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      const saved = localStorage.getItem(`deolive_inventory_${currentOrg.id}`);
      setItems(saved ? JSON.parse(saved) : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch inventory items joined with vendor and project
      const { data: invData, error: invErr } = await supabase
        .from('inventory_items')
        .select('*, vendor:vendors(id, name), project:projects(id, name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (invErr) {
        const msg = (invErr.message || '').toLowerCase();
        if (msg.includes('relation') && msg.includes('does not exist')) {
          setTableExists(false);
        } else if (isRLSError(invErr)) {
          reportRLSError('inventory_items', 'SELECT', invErr);
        }
        setItems([]);
      } else {
        setTableExists(true);
        setItems(invData || []);
      }

      // 2. Fetch Vendors for dropdown
      const { data: vData } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (vData) setVendors(vData);

      // 3. Fetch Projects for dropdown
      const { data: pData } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (pData) setProjects(pData);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg, isDemoMode]);

  // Format inventory items for display
  const displayItems: DisplayInventory[] = items.map((item) => {
    const qty = Number(item.quantity || 0);
    const threshold = Number(item.low_stock_threshold || 5);
    return {
      id: item.id,
      name: item.name,
      sku: item.sku || `SKU-${item.id.slice(0, 5).toUpperCase()}`,
      category: item.category,
      vendorName: item.vendor?.name || 'Unassigned Vendor',
      projectName: item.project?.name || 'General Inventory',
      storage_location: item.storage_location || 'Warehouse - General',
      quantity: qty,
      unit: item.unit,
      unit_cost: Number(item.unit_cost || 0),
      low_stock_threshold: threshold,
      isLowStock: qty <= threshold,
      isSample: false,
    };
  });

  // Total stock value calculation
  const totalStockValue = useMemo(() => {
    return displayItems.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0);
  }, [displayItems]);

  const lowStockCount = useMemo(() => {
    return displayItems.filter((it) => it.isLowStock).length;
  }, [displayItems]);

  // Filtering
  const filteredItems = displayItems.filter((it) => {
    const matchesSearch =
      it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.storage_location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'All' || it.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Materials');
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormVendorId(vendors[0]?.id || '');
    setFormProjectId(projects[0]?.id || '');
    setFormQuantity('24');
    setFormUnit('pcs');
    setFormUnitCost('120.00');
    setFormThreshold('5');
    setFormLocation('Warehouse 01 - Riyadh');
    setModalError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: DisplayInventory) => {
    if (item.isSample) {
      showToast('Sample items cannot be edited in the database.', 'info');
      return;
    }
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormSku(item.sku);
    const raw = items.find((i) => i.id === item.id);
    setFormVendorId(raw?.vendor_id || '');
    setFormProjectId(raw?.project_id || '');
    setFormQuantity(String(item.quantity));
    setFormUnit(item.unit);
    setFormUnitCost(String(item.unit_cost));
    setFormThreshold(String(item.low_stock_threshold));
    setFormLocation(item.storage_location);
    setModalError(null);
    setActiveMenuId(null);
    setShowAddModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Material / item name is required.');
      return;
    }
    if (!currentOrg) return;

    setSubmitting(true);
    setModalError(null);

    const payload = {
      organization_id: currentOrg.id,
      vendor_id: formVendorId || null,
      project_id: formProjectId || null,
      name: formName.trim(),
      category: formCategory,
      sku: formSku.trim() || null,
      quantity: Number(formQuantity) || 0,
      unit: formUnit,
      unit_cost: Number(formUnitCost) || 0,
      low_stock_threshold: Number(formThreshold) || 5,
      storage_location: formLocation.trim() || null,
    };

    try {
      if (editingItem) {
        if (isDemoMode) {
          const updated = items.map((i) =>
            i.id === editingItem.id ? { ...i, ...payload } : i
          );
          setItems(updated);
          localStorage.setItem(`deolive_inventory_${currentOrg.id}`, JSON.stringify(updated));
          showToast(`Item "${formName}" updated.`, 'success');
          setShowAddModal(false);
          return;
        }

        const { data, error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editingItem.id)
          .select('*, vendor:vendors(id, name), project:projects(id, name)')
          .single();

        if (error) {
          if (isRLSError(error)) reportRLSError('inventory_items', 'UPDATE', error);
          setModalError(error.message);
        } else {
          setItems(items.map((i) => (i.id === editingItem.id ? data : i)));
          showToast(`Item "${data.name}" updated successfully.`, 'success');
          setShowAddModal(false);
        }
      } else {
        if (isDemoMode) {
          const newItem: InventoryItem = {
            id: `inv-item-${Date.now()}`,
            ...payload,
            created_at: new Date().toISOString(),
            vendor: vendors.find((v) => v.id === formVendorId),
            project: projects.find((p) => p.id === formProjectId),
          };
          const updated = [newItem, ...items];
          setItems(updated);
          localStorage.setItem(`deolive_inventory_${currentOrg.id}`, JSON.stringify(updated));
          showToast(`Item "${newItem.name}" added to inventory.`, 'success');
          setShowAddModal(false);
          return;
        }

        const { data, error } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select('*, vendor:vendors(id, name), project:projects(id, name)')
          .single();

        if (error) {
          if (isRLSError(error)) reportRLSError('inventory_items', 'INSERT', error);
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('relation') && msg.includes('does not exist')) {
            setTableExists(false);
            setModalError('The "inventory_items" table does not exist in Supabase yet. Please run the SQL schema script in your Supabase SQL editor.');
          } else {
            setModalError(error.message);
          }
        } else {
          setItems([data, ...items]);
          showToast(`Item "${data.name}" added to inventory.`, 'success');
          setShowAddModal(false);
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred while saving item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick quantity adjustment (+ / - buttons) with safe database increment & debounce
  const handleAdjustQuantity = async (item: DisplayInventory, delta: number) => {
    if (busyItemIds.has(item.id)) return;

    // Immediately flag item as busy to block fast clicks
    setBusyItemIds((prev) => new Set(prev).add(item.id));

    try {
      if (isDemoMode) {
        const newQty = Math.max(0, item.quantity + delta);
        const updated = items.map((i) =>
          i.id === item.id ? { ...i, quantity: newQty } : i
        );
        setItems(updated);
        localStorage.setItem(`deolive_inventory_${currentOrg?.id}`, JSON.stringify(updated));
        showToast(`Stock updated to ${newQty} ${item.unit}.`, 'info');
        return;
      }

      // Safe database increment via Postgres RPC function
      const { data: rpcNewQty, error: rpcErr } = await supabase.rpc('adjust_inventory_quantity', {
        p_item_id: item.id,
        p_delta: delta,
      });

      if (!rpcErr && typeof rpcNewQty === 'number') {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, quantity: rpcNewQty } : i))
        );
        showToast(`Stock updated to ${rpcNewQty} ${item.unit}.`, 'success');
      } else {
        // Fallback atomic read-and-update if RPC is not yet created in Supabase
        const { data: currentData } = await supabase
          .from('inventory_items')
          .select('quantity')
          .eq('id', item.id)
          .single();
        const baseQty = Number(currentData?.quantity ?? item.quantity);
        const nextQty = Math.max(0, baseQty + delta);

        const { data, error } = await supabase
          .from('inventory_items')
          .update({ quantity: nextQty })
          .eq('id', item.id)
          .select('*, vendor:vendors(id, name), project:projects(id, name)')
          .single();

        if (error) {
          if (isRLSError(error)) reportRLSError('inventory_items', 'UPDATE', error);
          showToast(`Failed to update quantity: ${error.message}`, 'error');
        } else if (data) {
          setItems(items.map((i) => (i.id === item.id ? data : i)));
        }
      }
    } catch {
      showToast('Error adjusting stock quantity.', 'error');
    } finally {
      // Brief delay so rapid double clicks are ignored smoothly
      setTimeout(() => {
        setBusyItemIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 250);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.isSample) {
      showToast('Sample inventory items cannot be deleted from the database.', 'info');
      setItemToDelete(null);
      return;
    }

    setIsDeleting(true);

    try {
      if (isDemoMode) {
        const updated = items.filter((i) => i.id !== itemToDelete.id);
        setItems(updated);
        localStorage.setItem(`deolive_inventory_${currentOrg?.id}`, JSON.stringify(updated));
        showToast(`Item "${itemToDelete.name}" deleted.`, 'info');
        setItemToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) {
        if (isRLSError(error)) reportRLSError('inventory_items', 'DELETE', error);
        showToast(`Failed to delete item: ${error.message}`, 'error');
      } else {
        setItems(items.filter((i) => i.id !== itemToDelete.id));
        showToast(`Item "${itemToDelete.name}" removed from inventory.`, 'info');
      }
    } catch {
      showToast('An unexpected error occurred while deleting.', 'error');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(INVENTORY_SETUP_SQL);
    setCopiedSql(true);
    showToast('Supabase SQL copied to clipboard.', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const getCategoryBadge = (cat: InventoryCategory) => {
    switch (cat) {
      case 'Furniture':
        return 'badge-execution';
      case 'Materials':
        return 'badge-design';
      case 'Samples':
        return 'badge-concept';
      case 'Fabric':
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
            Inventory Tracking
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Monitor material stock levels, reserve items for projects, and manage warehouse locations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="View Supabase Schema SQL"
          >
            <Code2 className="w-3.5 h-3.5 text-[#5FA20D]" />
            <span>Supabase SQL</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* SQL Setup Notice if table does not exist */}
      {!tableExists && !isDemoMode && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Supabase "inventory_items" Table Required</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Run the quick SQL script in your Supabase SQL Editor to provision the inventory table and Row Level Security.
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

      {/* Stat Cards: Total Stock Value and Low Stock Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Stock Value Card */}
        <div className="de-olive-dark-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Stock Value</span>
            <DollarSign className="w-4 h-4 text-[#77C614]" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {formatCurrency(totalStockValue, currentOrg?.currency)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              Valued across {displayItems.length} registered materials & fittings
            </p>
          </div>
        </div>

        {/* Low Stock Warning Card */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Stock Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-red-500' : 'text-stone-400'}`} />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <p className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${lowStockCount > 0 ? 'text-red-600' : 'text-stone-900'}`}>
                {lowStockCount}
              </p>
              {lowStockCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  Attention Required
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Items at or below safety replenishment threshold
            </p>
          </div>
        </div>

        {/* Storage Locations Card */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Storage Hubs</span>
            <Warehouse className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-mono tabular-nums">
              {new Set(displayItems.map((i) => i.storage_location)).size}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              Active warehouse bays and design studio racks
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters Card (Shown when items exist) */}
      {items.length > 0 && (
        <div className="de-olive-card p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search materials by name, SKU, vendor, or warehouse..."
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
                  {(['All', 'Furniture', 'Materials', 'Samples', 'Fabric', 'Other'] as const).map((c) => (
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

      {/* Content Area: Loading vs Empty State vs Inventory Table */}
      {loading ? (
        <div className="de-olive-card p-16 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#77C614]" />
          <span className="text-xs">Loading inventory ledger from Supabase...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="de-olive-card p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Inventory & Procurement</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              No inventory items yet. Add your first item to track stock, materials, and low-stock thresholds.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#77C614]" />
              <span>Add First Item</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="de-olive-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    MATERIAL / ITEM
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    CATEGORY
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    LOCATION
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    STOCK QUANTITY
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                    UNIT COST
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                    TOTAL VALUE
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEF2] text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* MATERIAL / ITEM */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-900 text-sm leading-tight">{item.name}</p>
                          {item.isSample && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              Sample
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1 font-mono">
                          <span>{item.sku}</span>
                          <span>•</span>
                          <span className="font-sans text-stone-400">{item.vendorName}</span>
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getCategoryBadge(item.category)}`}>
                        {item.category}
                      </span>
                    </td>

                    {/* LOCATION */}
                    <td className="px-6 py-4 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{item.storage_location}</span>
                      </div>
                    </td>

                    {/* STOCK QUANTITY WITH +/- BUTTONS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {/* Quick +/- buttons */}
                        <div className="inline-flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                          <button
                            onClick={() => handleAdjustQuantity(item, -1)}
                            className="p-1 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                            title="Decrease quantity by 1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-bold text-stone-900 text-xs min-w-[28px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleAdjustQuantity(item, 1)}
                            className="p-1 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                            title="Increase quantity by 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-[11px] font-mono text-stone-500">{item.unit}</span>

                        {/* Low stock badge */}
                        {item.isLowStock && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Low stock
                          </span>
                        )}
                      </div>
                    </td>

                    {/* UNIT COST */}
                    <td className="px-6 py-4 text-right font-mono text-stone-700">
                      ${item.unit_cost.toFixed(2)}
                    </td>

                    {/* TOTAL VALUE */}
                    <td className="px-6 py-4 text-right font-mono font-bold text-stone-900">
                      ${(item.quantity * item.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer text-left"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setItemToDelete(item);
                              }}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-500" />
                      <p className="text-xs font-medium text-stone-600">No inventory materials match your search.</p>
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

      {/* Add / Edit Inventory Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingItem ? 'Edit Inventory Item' : 'Add Material to Inventory'}
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

            <form onSubmit={handleSaveItem} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Material / Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Italian Carrara Honed Marble Slabs 20mm"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as InventoryCategory)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Materials">Materials</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Fabric">Fabric</option>
                    <option value="Samples">Samples</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. MAT-101"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Supplier / Vendor</label>
                  <select
                    value={formVendorId}
                    onChange={(e) => setFormVendorId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned Vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.category})
                      </option>
                    ))}
                    {vendors.length === 0 && (
                      <option value="sample-v-1">Al-Noor Marble & Quarries (Sample)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Assigned Project</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">General (No project assigned)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    {projects.length === 0 && (
                      <option value="sample-p-1">Villa Al-Khobar Renovation (Sample)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as InventoryUnit)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="m">m (Metres)</option>
                    <option value="m2">m² (Sq Metres)</option>
                    <option value="kg">kg (Kilograms)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Storage Location / Bay</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Warehouse 01 - Bay 4"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
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
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#77C614]" />}
                  <span>{editingItem ? 'Save Changes' : 'Save Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Delete Inventory Material"
        message={`Are you sure you want to remove "${itemToDelete?.name}" (${itemToDelete?.sku}) from your active stock?`}
        confirmLabel="Delete Item"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />

      {/* SQL Script View Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#5FA20D]" />
                <h3 className="text-sm font-bold text-stone-900">Supabase SQL: Inventory Items Table</h3>
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
              <span className="font-semibold text-stone-800">Supabase Dashboard &gt; SQL Editor</span>. It creates the <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">inventory_items</code> table and enables Row Level Security for all organization members.
            </p>

            <div className="mt-3 relative">
              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed border border-stone-800">
                {INVENTORY_SETUP_SQL}
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
