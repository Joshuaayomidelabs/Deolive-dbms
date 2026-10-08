import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Search,
  Filter,
  Users,
  FolderKanban,
  DollarSign,
  Palette,
  Package,
  Kanban,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Tag,
  Check,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import {
  Project,
  Client,
  Task,
  Design,
  Invoice,
  Transaction,
  Vendor,
  InventoryItem,
} from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS } from '../lib/mockData';

// --- Date Filter Range Types ---
export type DateRangeType = 'this_month' | 'last_3_months' | 'this_year' | 'custom';

// --- Sample Data Fallbacks when Organization has 0 records ---
const SAMPLE_CLIENTS: Client[] = [
  {
    id: 'sample-c-1',
    organization_id: 'sample-org',
    name: 'Al-Khobar Royal Estate',
    type: 'Residential',
    location: 'Eastern Province, KSA',
    email: 'estates@alkhobar-royal.com',
    phone: '+966 13 898 4400',
    created_at: '2026-08-15T10:00:00Z',
  },
  {
    id: 'sample-c-2',
    organization_id: 'sample-org',
    name: 'Red Sea Luxury Resort & Spa',
    type: 'Hospitality',
    location: 'Red Sea Coast, KSA',
    email: 'procurement@redsearesorts.sa',
    phone: '+966 12 654 3322',
    created_at: '2026-07-20T14:30:00Z',
  },
  {
    id: 'sample-c-3',
    organization_id: 'sample-org',
    name: 'Riyadh Financial Tower HQ',
    type: 'Commercial',
    location: 'KAFD, Riyadh',
    email: 'facilities@riyadhft.com',
    phone: '+966 11 411 9900',
    created_at: '2026-09-01T09:15:00Z',
  },
  {
    id: 'sample-c-4',
    organization_id: 'sample-org',
    name: 'Diriyah Heritage Boutique Hotel',
    type: 'Hospitality',
    location: 'Diriyah Historic District',
    email: 'gm@diriyahhotel.sa',
    phone: '+966 11 229 8811',
    created_at: '2026-08-05T11:45:00Z',
  },
];

const SAMPLE_DESIGNS: Design[] = [
  {
    id: 'sample-d-1',
    organization_id: 'sample-org',
    project_id: 'proj-01',
    name: 'Grand Lobby Mood Board & Material Palette',
    type: 'Mood Board',
    status: 'Approved',
    file_path: 'designs/sample-lobby-board.pdf',
    file_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    uploaded_by: null,
    created_at: '2026-09-12T11:00:00Z',
  },
  {
    id: 'sample-d-2',
    organization_id: 'sample-org',
    project_id: 'proj-01',
    name: 'Penthouse Suite 3D Photorealistic Render',
    type: '3D Render',
    status: 'Approved',
    file_path: 'designs/sample-suite-render.jpg',
    file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    uploaded_by: null,
    created_at: '2026-09-20T15:20:00Z',
  },
  {
    id: 'sample-d-3',
    organization_id: 'sample-org',
    project_id: 'proj-02',
    name: 'Executive Boardroom Architectural Floor Plan v3',
    type: 'Floor Plan',
    status: 'Pending',
    file_path: 'designs/sample-boardroom-plan.pdf',
    file_url: null,
    uploaded_by: null,
    created_at: '2026-10-02T16:45:00Z',
  },
  {
    id: 'sample-d-4',
    organization_id: 'sample-org',
    project_id: 'proj-03',
    name: 'Wellness Spa Custom Millwork & Joinery Details',
    type: 'Other',
    status: 'Pending',
    file_path: 'designs/sample-millwork.pdf',
    file_url: null,
    uploaded_by: null,
    created_at: '2026-10-05T09:30:00Z',
  },
];

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: 'sample-inv-1',
    organization_id: 'sample-org',
    project_id: 'proj-01',
    client_id: 'sample-c-1',
    invoice_number: 'INV-0001',
    amount: 145000,
    status: 'Paid',
    issue_date: '2026-08-01',
    due_date: '2026-08-30',
    notes: 'Initial schematic retainer 30%',
    created_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'sample-inv-2',
    organization_id: 'sample-org',
    project_id: 'proj-02',
    client_id: 'sample-c-3',
    invoice_number: 'INV-0002',
    amount: 88500,
    status: 'Sent',
    issue_date: '2026-09-15',
    due_date: '2026-10-15',
    notes: 'Phase 2 detailed design milestone',
    created_at: '2026-09-15T14:00:00Z',
  },
  {
    id: 'sample-inv-3',
    organization_id: 'sample-org',
    project_id: 'proj-03',
    client_id: 'sample-c-2',
    invoice_number: 'INV-0003',
    amount: 62000,
    status: 'Overdue',
    issue_date: '2026-08-10',
    due_date: '2026-09-10',
    notes: 'FF&E procurement initial deposit',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'sample-inv-4',
    organization_id: 'sample-org',
    project_id: 'proj-04',
    client_id: 'sample-c-4',
    invoice_number: 'INV-0004',
    amount: 115000,
    status: 'Paid',
    issue_date: '2026-07-05',
    due_date: '2026-08-05',
    notes: 'Boutique architectural milestone',
    created_at: '2026-07-05T11:00:00Z',
  },
];

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'sample-tx-1',
    organization_id: 'sample-org',
    project_id: 'proj-01',
    invoice_id: 'sample-inv-1',
    description: 'Client Retainer Payment - Al-Khobar Royal Estate',
    type: 'Income',
    category: 'Client Invoices',
    amount: 145000,
    transaction_date: '2026-08-28',
    created_at: '2026-08-28T12:00:00Z',
  },
  {
    id: 'sample-tx-2',
    organization_id: 'sample-org',
    project_id: 'proj-04',
    invoice_id: 'sample-inv-4',
    description: 'Milestone Sign-off Payment - Diriyah Hotel',
    type: 'Income',
    category: 'Client Invoices',
    amount: 115000,
    transaction_date: '2026-07-30',
    created_at: '2026-07-30T10:00:00Z',
  },
  {
    id: 'sample-tx-3',
    organization_id: 'sample-org',
    project_id: 'proj-01',
    invoice_id: null,
    description: 'Al-Noor Quarries Calacatta Marble Consignment',
    type: 'Expense',
    category: 'Procurement & Materials',
    amount: 42000,
    transaction_date: '2026-09-05',
    created_at: '2026-09-05T14:00:00Z',
  },
  {
    id: 'sample-tx-4',
    organization_id: 'sample-org',
    project_id: 'proj-02',
    invoice_id: null,
    description: 'Milanese Textiles Custom Acoustic Wall Panels',
    type: 'Expense',
    category: 'FF&E',
    amount: 28500,
    transaction_date: '2026-09-22',
    created_at: '2026-09-22T16:00:00Z',
  },
  {
    id: 'sample-tx-5',
    organization_id: 'sample-org',
    project_id: null,
    invoice_id: null,
    description: 'Studio Autodesk AEC & 3ds Max Enterprise Licenses',
    type: 'Expense',
    category: 'Software & Technology',
    amount: 12400,
    transaction_date: '2026-10-01',
    created_at: '2026-10-01T08:30:00Z',
  },
];

const SAMPLE_VENDORS: Vendor[] = [
  {
    id: 'sample-v-1',
    organization_id: 'sample-org',
    name: 'Al-Noor Marble & Granite Quarries',
    category: 'Materials',
    contact_person: 'Tariq Mansoor',
    email: 'procurement@alnoormarble.sa',
    phone: '+966 11 498 7700',
    location: 'Industrial City, Riyadh',
    status: 'Active',
    notes: 'Premium natural stone and installation specialists',
    created_at: '2026-06-10T10:00:00Z',
  },
  {
    id: 'sample-v-2',
    organization_id: 'sample-org',
    name: 'Milanese Luxury Textiles & Leathers',
    category: 'Furniture',
    contact_person: 'Gianluca Rossi',
    email: 'orders@milanotextiles.it',
    phone: '+39 02 8845 2210',
    location: 'Milan, Italy',
    status: 'Active',
    notes: 'Direct importer of bespoke drapery and velvet fabrics',
    created_at: '2026-06-18T11:00:00Z',
  },
  {
    id: 'sample-v-3',
    organization_id: 'sample-org',
    name: 'Lumina Architectural Lighting Studio',
    category: 'Lighting',
    contact_person: 'Sophie Vance',
    email: 'contracts@luminalighting.co.uk',
    phone: '+44 20 7946 0912',
    location: 'London / Dubai',
    status: 'Active',
    notes: 'Bespoke chandeliers and low-voltage magnetic track lighting',
    created_at: '2026-07-02T13:00:00Z',
  },
];

const SAMPLE_INVENTORY: InventoryItem[] = [
  {
    id: 'sample-item-1',
    organization_id: 'sample-org',
    vendor_id: 'sample-v-1',
    project_id: 'proj-01',
    name: 'Carrara Honed Marble Slabs 20mm',
    category: 'Materials',
    sku: 'MAT-101',
    quantity: 85,
    unit: 'm2',
    unit_cost: 165,
    low_stock_threshold: 25,
    storage_location: 'Warehouse 01 - Bay 4',
    created_at: '2026-08-10T09:00:00Z',
  },
  {
    id: 'sample-item-2',
    organization_id: 'sample-org',
    vendor_id: 'sample-v-2',
    project_id: 'proj-02',
    name: 'Olive Velvet Upholstery Fabric',
    category: 'Fabric',
    sku: 'FAB-204',
    quantity: 12,
    unit: 'm',
    unit_cost: 85,
    low_stock_threshold: 20,
    storage_location: 'Studio Material Library',
    created_at: '2026-08-14T11:30:00Z',
  },
  {
    id: 'sample-item-3',
    organization_id: 'sample-org',
    vendor_id: 'sample-v-3',
    project_id: null,
    name: 'Recessed Magnetic Track Spotlights 3000K',
    category: 'Materials',
    sku: 'LGT-305',
    quantity: 48,
    unit: 'pcs',
    unit_cost: 120,
    low_stock_threshold: 15,
    storage_location: 'Central Depot - Shelf C',
    created_at: '2026-09-01T15:00:00Z',
  },
  {
    id: 'sample-item-4',
    organization_id: 'sample-org',
    vendor_id: 'sample-v-1',
    project_id: 'proj-03',
    name: 'Brushed Brass Edge Trim 3m Lengths',
    category: 'Materials',
    sku: 'HRD-410',
    quantity: 6,
    unit: 'pcs',
    unit_cost: 45,
    low_stock_threshold: 10,
    storage_location: 'Warehouse 01 - Bin 12',
    created_at: '2026-09-18T10:00:00Z',
  },
];

export const ReportsPage: React.FC = () => {
  const { currentOrg, currentMemberRole, isDemoMode } = useAuth();
  const { showToast } = useToast();

  const isOwnerOrAdmin =
    currentMemberRole === 'owner' ||
    currentMemberRole === 'admin' ||
    isDemoMode;

  // Date range filter states
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('this_year');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data states from Supabase
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Flags for whether live data was found
  const [hasRealProjects, setHasRealProjects] = useState(false);
  const [hasRealClients, setHasRealClients] = useState(false);
  const [hasRealTasks, setHasRealTasks] = useState(false);
  const [hasRealDesigns, setHasRealDesigns] = useState(false);
  const [hasRealFinance, setHasRealFinance] = useState(false);
  const [hasRealInventory, setHasRealInventory] = useState(false);

  // Active preview modal state
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [tableSearchTerm, setTableSearchTerm] = useState<string>('');

  // Fetch all live data for the current organization
  const fetchAllData = async () => {
    if (!currentOrg?.id) {
      setProjects(DEMO_PROJECTS);
      setClients(SAMPLE_CLIENTS);
      setTasks(DEMO_TASKS);
      setDesigns(SAMPLE_DESIGNS);
      setInvoices(SAMPLE_INVOICES);
      setTransactions(SAMPLE_TRANSACTIONS);
      setVendors(SAMPLE_VENDORS);
      setInventory(SAMPLE_INVENTORY);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Projects
      const { data: pData } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (pData && pData.length > 0) {
        setProjects(pData as Project[]);
        setHasRealProjects(true);
      } else {
        setProjects(DEMO_PROJECTS);
        setHasRealProjects(false);
      }

      // 2. Clients
      const { data: cData } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (cData && cData.length > 0) {
        setClients(cData as Client[]);
        setHasRealClients(true);
      } else {
        setClients(SAMPLE_CLIENTS);
        setHasRealClients(false);
      }

      // 3. Tasks
      const { data: tData } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', currentOrg.id);

      if (tData && tData.length > 0) {
        setTasks(tData as Task[]);
        setHasRealTasks(true);
      } else {
        setTasks(DEMO_TASKS);
        setHasRealTasks(false);
      }

      // 4. Designs
      const { data: dData } = await supabase
        .from('designs')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (dData && dData.length > 0) {
        setDesigns(dData as Design[]);
        setHasRealDesigns(true);
      } else {
        setDesigns(SAMPLE_DESIGNS);
        setHasRealDesigns(false);
      }

      // 5. Invoices & Transactions (if owner/admin)
      if (isOwnerOrAdmin) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('issue_date', { ascending: false });

        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('transaction_date', { ascending: false });

        const hasInv = invData && invData.length > 0;
        const hasTx = txData && txData.length > 0;

        if (hasInv || hasTx) {
          setInvoices((invData as Invoice[]) || []);
          setTransactions((txData as Transaction[]) || []);
          setHasRealFinance(true);
        } else {
          setInvoices(SAMPLE_INVOICES);
          setTransactions(SAMPLE_TRANSACTIONS);
          setHasRealFinance(false);
        }
      }

      // 6. Vendors & Inventory
      const { data: vData } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', currentOrg.id);

      const { data: iData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', currentOrg.id);

      if (vData && vData.length > 0) {
        setVendors(vData as Vendor[]);
      } else {
        setVendors(SAMPLE_VENDORS);
      }

      if (iData && iData.length > 0) {
        setInventory(iData as InventoryItem[]);
        setHasRealInventory(true);
      } else {
        setInventory(SAMPLE_INVENTORY);
        setHasRealInventory(false);
      }
    } catch (err) {
      console.error('Error fetching reports data:', err);
      // Fallbacks already in place
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentOrg?.id, currentMemberRole, isDemoMode]);

  // Compute Active Date Range Boundaries
  const dateBoundaries = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dateRangeType) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'custom':
        start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(2020, 0, 1);
        end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
        break;
      default:
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    }

    return { start, end };
  }, [dateRangeType, customStartDate, customEndDate]);

  // Helper: check if date is within range
  const isDateInRange = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return true;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      return d >= dateBoundaries.start && d <= dateBoundaries.end;
    } catch {
      return true;
    }
  };

  // --- FILTERED DATASETS ---
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => isDateInRange(p.start_date || p.created_at));
  }, [projects, dateBoundaries]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => isDateInRange(c.created_at));
  }, [clients, dateBoundaries]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => isDateInRange(t.due_date || t.created_at));
  }, [tasks, dateBoundaries]);

  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => isDateInRange(d.created_at));
  }, [designs, dateBoundaries]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => isDateInRange(i.issue_date || i.created_at));
  }, [invoices, dateBoundaries]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => isDateInRange(t.transaction_date || t.created_at));
  }, [transactions, dateBoundaries]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((i) => isDateInRange(i.created_at));
  }, [inventory, dateBoundaries]);

  // Map client ID to client name
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  // Map project ID to project name
  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  // Map vendor ID to vendor name
  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [vendors]);

  // --- REPORT METRIC COMPUTATIONS ---

  // 1. Project Status Summary
  const projectMetrics = useMemo(() => {
    const total = filteredProjects.length;
    const active = filteredProjects.filter((p) => p.status === 'active').length;
    const planning = filteredProjects.filter((p) => p.status === 'planning').length;
    const onHold = filteredProjects.filter((p) => p.status === 'on_hold').length;
    const completed = filteredProjects.filter((p) => p.status === 'completed').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = filteredProjects.filter((p) => {
      return p.status !== 'completed' && p.due_date && p.due_date < todayStr;
    }).length;

    // Calculate progress % for each project based on tasks
    const projectsWithProgress = filteredProjects.map((p) => {
      const projTasks = tasks.filter((t) => t.project_id === p.id);
      let progress = 0;
      if (projTasks.length > 0) {
        const doneTasks = projTasks.filter((t) => t.status === 'done').length;
        progress = Math.round((doneTasks / projTasks.length) * 100);
      } else {
        if (p.status === 'completed') progress = 100;
        else if (p.status === 'active') progress = 65;
        else if (p.status === 'planning') progress = 20;
        else progress = 45;
      }
      const isOverdue = p.status !== 'completed' && !!p.due_date && p.due_date < todayStr;
      return {
        ...p,
        clientName: p.client_id ? clientMap.get(p.client_id) || 'Corporate Client' : 'Direct Enterprise',
        progress,
        isOverdue,
      };
    });

    const avgProgress =
      total > 0
        ? Math.round(
            projectsWithProgress.reduce((acc, curr) => acc + curr.progress, 0) / total
          )
        : 0;

    return {
      total,
      active,
      planning,
      onHold,
      completed,
      overdue,
      avgProgress,
      projectsList: projectsWithProgress,
    };
  }, [filteredProjects, tasks, clientMap]);

  // 2. Client Summary
  const clientMetrics = useMemo(() => {
    const total = filteredClients.length;
    const residential = filteredClients.filter((c) => c.type === 'Residential').length;
    const commercial = filteredClients.filter((c) => c.type === 'Commercial').length;
    const hospitality = filteredClients.filter((c) => c.type === 'Hospitality').length;

    // Unique locations count
    const locations = Array.from(new Set(filteredClients.map((c) => c.location).filter(Boolean)));

    // Count projects per client
    const clientProjectsCount = new Map<string, number>();
    projects.forEach((p) => {
      if (p.client_id) {
        clientProjectsCount.set(p.client_id, (clientProjectsCount.get(p.client_id) || 0) + 1);
      }
    });

    const clientsWithProjectCounts = filteredClients.map((c) => ({
      ...c,
      projectCount: clientProjectsCount.get(c.id) || 0,
    }));

    const avgProjectsPerClient =
      total > 0
        ? (projects.length / total).toFixed(1)
        : '0.0';

    return {
      total,
      residential,
      commercial,
      hospitality,
      locationCount: locations.length,
      avgProjectsPerClient,
      clientsList: clientsWithProjectCounts,
    };
  }, [filteredClients, projects]);

  // 3. Budget & Revenue Report (Owner / Admin only)
  const budgetMetrics = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpenses = filteredTransactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const netOperatingProfit = totalIncome - totalExpenses;

    const outstandingInvoicesList = filteredInvoices.filter(
      (inv) => inv.status === 'Sent' || inv.status === 'Overdue'
    );
    const outstandingInvoicesAmount = outstandingInvoicesList.reduce(
      (sum, inv) => sum + Number(inv.amount || 0),
      0
    );

    const overdueInvoicesList = filteredInvoices.filter((inv) => inv.status === 'Overdue');
    const overdueInvoicesAmount = overdueInvoicesList.reduce(
      (sum, inv) => sum + Number(inv.amount || 0),
      0
    );

    // Monthly breakdown of current year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((m, idx) => {
      const monthIncome = filteredTransactions
        .filter((t) => {
          if (t.type !== 'Income') return false;
          const d = new Date(t.transaction_date);
          return d.getMonth() === idx;
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const monthExpense = filteredTransactions
        .filter((t) => {
          if (t.type !== 'Expense') return false;
          const d = new Date(t.transaction_date);
          return d.getMonth() === idx;
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        month: m,
        income: monthIncome,
        expenses: monthExpense,
        net: monthIncome - monthExpense,
      };
    });

    return {
      totalIncome,
      totalExpenses,
      netOperatingProfit,
      outstandingAmount: outstandingInvoicesAmount,
      outstandingCount: outstandingInvoicesList.length,
      overdueAmount: overdueInvoicesAmount,
      overdueCount: overdueInvoicesList.length,
      monthlyData,
      invoicesList: filteredInvoices,
      transactionsList: filteredTransactions,
    };
  }, [filteredTransactions, filteredInvoices]);

  // 4. Design Approval Report
  const designMetrics = useMemo(() => {
    const total = filteredDesigns.length;
    const approved = filteredDesigns.filter((d) => d.status === 'Approved').length;
    const pending = filteredDesigns.filter((d) => d.status === 'Pending').length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const moodBoards = filteredDesigns.filter((d) => d.type === 'Mood Board').length;
    const renders = filteredDesigns.filter((d) => d.type === '3D Render').length;
    const floorPlans = filteredDesigns.filter((d) => d.type === 'Floor Plan').length;
    const others = filteredDesigns.filter((d) => d.type === 'Other').length;

    const designsWithProjects = filteredDesigns.map((d) => ({
      ...d,
      projectName: d.project_id ? projectMap.get(d.project_id) || 'General Studio Concept' : 'Unassigned Concept',
    }));

    return {
      total,
      approved,
      pending,
      approvalRate: rate,
      moodBoards,
      renders,
      floorPlans,
      others,
      designsList: designsWithProjects,
    };
  }, [filteredDesigns, projectMap]);

  // 5. Inventory & Procurement Report
  const inventoryMetrics = useMemo(() => {
    const totalItems = filteredInventory.length;
    const totalStockValue = filteredInventory.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unit_cost || 0);
    }, 0);

    const lowStockItems = filteredInventory.filter(
      (item) => Number(item.quantity || 0) <= Number(item.low_stock_threshold || 0)
    );

    // Group items by vendor
    const vendorCounts = new Map<string, { name: string; count: number; totalVal: number }>();
    filteredInventory.forEach((item) => {
      const vName = item.vendor_id ? vendorMap.get(item.vendor_id) || 'Direct Mill / Quarry' : 'Unassigned Vendor';
      const existing = vendorCounts.get(vName) || { name: vName, count: 0, totalVal: 0 };
      existing.count += 1;
      existing.totalVal += Number(item.quantity || 0) * Number(item.unit_cost || 0);
      vendorCounts.set(vName, existing);
    });

    const inventoryListWithDetails = filteredInventory.map((item) => ({
      ...item,
      vendorName: item.vendor_id ? vendorMap.get(item.vendor_id) || 'Direct Mill / Quarry' : 'Direct Supplier',
      projectName: item.project_id ? projectMap.get(item.project_id) || 'General Stock' : 'Central Warehouse',
      totalVal: Number(item.quantity || 0) * Number(item.unit_cost || 0),
      isLowStock: Number(item.quantity || 0) <= Number(item.low_stock_threshold || 0),
    }));

    return {
      totalItems,
      totalStockValue,
      lowStockCount: lowStockItems.length,
      vendorBreakdown: Array.from(vendorCounts.values()),
      inventoryList: inventoryListWithDetails,
    };
  }, [filteredInventory, vendorMap, projectMap]);

  // 6. Task Progress Report
  const taskMetrics = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((t) => t.status === 'done').length;
    const inProgress = filteredTasks.filter((t) => t.status === 'in_progress').length;
    const todo = filteredTasks.filter((t) => t.status === 'todo').length;
    const highPriority = filteredTasks.filter((t) => t.priority === 'high').length;

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Group tasks per project
    const projectTaskStats = new Map<string, { name: string; total: number; done: number; inProgress: number; todo: number }>();
    filteredTasks.forEach((t) => {
      const pName = t.project_id ? projectMap.get(t.project_id) || 'Global Task Queue' : 'Unassigned Project';
      const stats = projectTaskStats.get(pName) || { name: pName, total: 0, done: 0, inProgress: 0, todo: 0 };
      stats.total += 1;
      if (t.status === 'done') stats.done += 1;
      else if (t.status === 'in_progress') stats.inProgress += 1;
      else stats.todo += 1;
      projectTaskStats.set(pName, stats);
    });

    const tasksWithDetails = filteredTasks.map((t) => ({
      ...t,
      projectName: t.project_id ? projectMap.get(t.project_id) || 'General Workstream' : 'General Workstream',
    }));

    return {
      total,
      done,
      inProgress,
      todo,
      highPriority,
      completionRate,
      projectBreakdown: Array.from(projectTaskStats.values()),
      tasksList: tasksWithDetails,
    };
  }, [filteredTasks, projectMap]);

  // Format currency helper using organization currency
  const formatCurrency = (val: number) => {
    const orgCurrency = currentOrg?.currency || 'USD';
    const currencySymbols: Record<string, string> = {
      USD: '$',
      NGN: '₦',
      GBP: '£',
      EUR: '€',
    };
    const sym = currencySymbols[orgCurrency] || '$';
    const formatted = Math.abs(val).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
    return val < 0 ? `-${sym}${formatted}` : `${sym}${formatted}`;
  };

  // --- CSV GENERATOR HELPER ---
  const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escapeCell = (val: string | number) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => row.map(escapeCell).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handler: Download individual CSV report
  const handleDownloadReport = (reportId: string) => {
    const timestamp = new Date().toISOString().split('T')[0];

    switch (reportId) {
      case 'project_status': {
        const headers = ['Project Name', 'Client', 'Status', 'Start Date', 'Due Date', 'Progress %', 'Overdue'];
        const rows = projectMetrics.projectsList.map((p) => [
          p.name,
          p.clientName,
          p.status.toUpperCase(),
          p.start_date || 'N/A',
          p.due_date || 'N/A',
          `${p.progress}%`,
          p.isOverdue ? 'YES' : 'NO',
        ]);
        downloadCSV(`De-Olive_Project_Status_Summary_${timestamp}`, headers, rows);
        showToast('Downloaded Project Status Summary CSV', 'success');
        break;
      }
      case 'client_summary': {
        const headers = ['Client Name', 'Sector Type', 'Location', 'Email', 'Phone', 'Active Projects', 'Created Date'];
        const rows = clientMetrics.clientsList.map((c) => [
          c.name,
          c.type,
          c.location || 'N/A',
          c.email || 'N/A',
          c.phone || 'N/A',
          c.projectCount,
          new Date(c.created_at).toLocaleDateString(),
        ]);
        downloadCSV(`De-Olive_Client_Summary_${timestamp}`, headers, rows);
        showToast('Downloaded Client Summary CSV', 'success');
        break;
      }
      case 'budget_revenue': {
        if (!isOwnerOrAdmin) return;
        const orgCurrency = currentOrg?.currency || 'USD';
        const headers = ['Record Type', 'Ref / Number', 'Description', 'Category', `Amount (${orgCurrency})`, 'Status / Type', 'Date'];
        const rows: (string | number)[][] = [];
        budgetMetrics.invoicesList.forEach((inv) => {
          rows.push([
            'Invoice',
            inv.invoice_number,
            inv.notes || 'Client invoice fee schedule',
            'Accounts Receivable',
            inv.amount,
            inv.status,
            inv.issue_date,
          ]);
        });
        budgetMetrics.transactionsList.forEach((tx) => {
          rows.push([
            'Transaction',
            tx.id.slice(0, 8),
            tx.description,
            tx.category,
            tx.amount,
            tx.type,
            tx.transaction_date,
          ]);
        });
        downloadCSV(`De-Olive_Budget_and_Revenue_Report_${timestamp}`, headers, rows);
        showToast('Downloaded Budget & Revenue Report CSV', 'success');
        break;
      }
      case 'design_approval': {
        const headers = ['Design Name', 'Project', 'Asset Type', 'Approval Status', 'File Path', 'Upload Date'];
        const rows = designMetrics.designsList.map((d) => [
          d.name,
          d.projectName,
          d.type,
          d.status,
          d.file_path,
          new Date(d.created_at).toLocaleDateString(),
        ]);
        downloadCSV(`De-Olive_Design_Approval_Report_${timestamp}`, headers, rows);
        showToast('Downloaded Design Approval Report CSV', 'success');
        break;
      }
      case 'inventory_procurement': {
        const orgCurrency = currentOrg?.currency || 'USD';
        const headers = ['Item Name', 'SKU', 'Category', 'Vendor', 'Location', 'Quantity', 'Unit', `Unit Cost (${orgCurrency})`, `Total Valuation (${orgCurrency})`, 'Low Stock'];
        const rows = inventoryMetrics.inventoryList.map((i) => [
          i.name,
          i.sku || 'N/A',
          i.category,
          i.vendorName,
          i.storage_location || 'N/A',
          i.quantity,
          i.unit,
          i.unit_cost,
          i.totalVal,
          i.isLowStock ? 'ALERT: LOW' : 'OPTIMAL',
        ]);
        downloadCSV(`De-Olive_Inventory_and_Procurement_Report_${timestamp}`, headers, rows);
        showToast('Downloaded Inventory & Procurement Report CSV', 'success');
        break;
      }
      case 'task_progress': {
        const headers = ['Task Title', 'Project', 'Status', 'Priority', 'Due Date', 'Created Date'];
        const rows = taskMetrics.tasksList.map((t) => [
          t.title,
          t.projectName,
          t.status.toUpperCase(),
          t.priority.toUpperCase(),
          t.due_date || 'N/A',
          new Date(t.created_at).toLocaleDateString(),
        ]);
        downloadCSV(`De-Olive_Task_Progress_Report_${timestamp}`, headers, rows);
        showToast('Downloaded Task Progress Report CSV', 'success');
        break;
      }
      default:
        break;
    }
  };

  // Handler: Export All Reports as separate CSV files
  const handleExportAll = () => {
    const accessibleReportIds = [
      'project_status',
      'client_summary',
      ...(isOwnerOrAdmin ? ['budget_revenue'] : []),
      'design_approval',
      'inventory_procurement',
      'task_progress',
    ];

    showToast(`Generating and exporting ${accessibleReportIds.length} live reports...`, 'info');

    // Trigger sequential downloads with small interval so browser doesn't drop parallel triggers
    accessibleReportIds.forEach((id, index) => {
      setTimeout(() => {
        handleDownloadReport(id);
      }, index * 200);
    });
  };

  // Browser Print / Save as PDF
  const handlePrintReport = () => {
    window.print();
  };

  // Report Definition Cards
  const reportCards = [
    {
      id: 'project_status',
      title: 'Project Status Summary',
      description: 'Comprehensive breakdown of active, planning, and completed projects with milestones, progress %, and overdue alerts.',
      category: 'Operations',
      icon: FolderKanban,
      isRealData: hasRealProjects,
      kpis: [
        { label: 'Total Projects', value: projectMetrics.total },
        { label: 'Avg Progress', value: `${projectMetrics.avgProgress}%` },
        { label: 'Overdue', value: projectMetrics.overdue, alert: projectMetrics.overdue > 0 },
      ],
    },
    {
      id: 'client_summary',
      title: 'Client Portfolio & Account Summary',
      description: 'Portfolio distribution across Residential, Commercial, and Hospitality sectors, regional footprints, and project density.',
      category: 'Client Relations',
      icon: Users,
      isRealData: hasRealClients,
      kpis: [
        { label: 'Total Accounts', value: clientMetrics.total },
        { label: 'Sectors', value: '3 Active' },
        { label: 'Avg Projects', value: `${clientMetrics.avgProjectsPerClient}/cli` },
      ],
    },
    ...(isOwnerOrAdmin
      ? [
          {
            id: 'budget_revenue',
            title: 'Budget, Cash Flow & Revenue Report',
            description: 'Year-to-date income vs operational disbursements, invoice aging analysis, and outstanding retainer variance.',
            category: 'Finance & Accounts',
            icon: DollarSign,
            isRealData: hasRealFinance,
            kpis: [
              { label: 'Revenue YTD', value: formatCurrency(budgetMetrics.totalIncome) },
              { label: 'Operating Net', value: formatCurrency(budgetMetrics.netOperatingProfit) },
              { label: 'Outstanding', value: formatCurrency(budgetMetrics.outstandingAmount), alert: budgetMetrics.outstandingAmount > 0 },
            ],
          },
        ]
      : []),
    {
      id: 'design_approval',
      title: 'Design Approval & Creative Revisions',
      description: 'Review tracking of mood boards, 3D renders, and architectural floor plans with approval ratios and project links.',
      category: 'Design Governance',
      icon: Palette,
      isRealData: hasRealDesigns,
      kpis: [
        { label: 'Total Assets', value: designMetrics.total },
        { label: 'Approval Rate', value: `${designMetrics.approvalRate}%` },
        { label: 'Pending Review', value: designMetrics.pending, alert: designMetrics.pending > 0 },
      ],
    },
    {
      id: 'inventory_procurement',
      title: 'Inventory & Material Procurement Ledger',
      description: 'Valuation of materials and FF&E in storage, stock depletion thresholds, and procurement supplier breakdown.',
      category: 'Procurement',
      icon: Package,
      isRealData: hasRealInventory,
      kpis: [
        { label: 'Stock Valuation', value: formatCurrency(inventoryMetrics.totalStockValue) },
        { label: 'SKU Records', value: inventoryMetrics.totalItems },
        { label: 'Low Stock Alerts', value: inventoryMetrics.lowStockCount, alert: inventoryMetrics.lowStockCount > 0 },
      ],
    },
    {
      id: 'task_progress',
      title: 'Task Progress & Team Velocity',
      description: 'Detailed analysis of sprint deliverables, completion velocities, priority backlogs, and status distributions per project.',
      category: 'Execution',
      icon: Kanban,
      isRealData: hasRealTasks,
      kpis: [
        { label: 'Total Tasks', value: taskMetrics.total },
        { label: 'Completed', value: `${taskMetrics.completionRate}%` },
        { label: 'High Priority', value: taskMetrics.highPriority, alert: taskMetrics.highPriority > 0 },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
              Reports & Analytics
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#77C614]/15 text-[#3F6F05] border border-[#77C614]/30">
              <BarChart3 className="w-3 h-3 text-[#77C614]" />
              Live DB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Generate, preview, and export high-precision operational, project, and financial reports from your database.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAll}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#77C614]" />
            <span>Export All Reports (CSV)</span>
          </button>
        </div>
      </div>

      {/* Global Date Range Filter Bar */}
      <div className="de-olive-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
          <Calendar className="w-4 h-4 text-[#77C614]" />
          <span>Report Date Range:</span>
          <span className="text-stone-400 font-normal">
            ({dateBoundaries.start.toLocaleDateString()} — {dateBoundaries.end.toLocaleDateString()})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'this_month', label: 'This Month' },
              { id: 'last_3_months', label: 'Last 3 Months' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((filter) => {
            const active = dateRangeType === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setDateRangeType(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#111113] text-[#77C614] shadow-xs ring-1 ring-[#111113]'
                    : 'bg-[#F8F8FA] hover:bg-stone-200/70 text-stone-600 border border-[#EEEEF2]'
                }`}
              >
                {filter.label}
              </button>
            );
          })}

          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#77C614]"
              />
              <span className="text-xs text-stone-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#77C614]"
              />
            </div>
          )}

          <button
            onClick={fetchAllData}
            title="Refresh database records"
            className="p-1.5 rounded-lg bg-[#F8F8FA] hover:bg-stone-200/70 text-stone-500 hover:text-stone-900 border border-[#EEEEF2] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((rpt) => {
          const Icon = rpt.icon;
          return (
            <div
              key={rpt.id}
              className="de-olive-card p-5.5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800 group-hover:bg-[#111113] group-hover:text-[#77C614] transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded-full">
                      {rpt.category}
                    </span>
                  </div>

                  {rpt.isRealData ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#77C614]/15 text-[#3F6F05] border border-[#77C614]/30">
                      <CheckCircle2 className="w-3 h-3 text-[#77C614]" />
                      Live Data
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      <Info className="w-3 h-3 text-amber-500" />
                      Sample Data
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-stone-950 leading-tight">
                  {rpt.title}
                </h2>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed line-clamp-2">
                  {rpt.description}
                </p>

                {/* Mini Snapshot KPIs */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#EEEEF2]">
                  {rpt.kpis.map((kpi, idx) => (
                    <div key={idx} className="bg-[#F8F8FA] p-2 rounded-lg text-center">
                      <span className="block text-[10px] text-stone-400 font-medium truncate">
                        {kpi.label}
                      </span>
                      <span
                        className={`text-xs font-bold block mt-0.5 truncate ${
                          kpi.alert ? 'text-rose-600' : 'text-stone-900'
                        }`}
                      >
                        {kpi.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#EEEEF2] flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => {
                    setActiveReportId(rpt.id);
                    setTableSearchTerm('');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white font-semibold transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#77C614]" />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => handleDownloadReport(rpt.id)}
                  title="Download CSV"
                  className="inline-flex items-center justify-center p-2 rounded-xl bg-[#F8F8FA] hover:bg-stone-100 border border-[#EEEEF2] text-stone-700 font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-stone-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* DETAILED REPORT PREVIEW & PRINT MODAL */}
      {/* ========================================================================= */}
      {activeReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] print-dialog-content">
            {/* Modal Top Control Bar (Hidden in Print) */}
            <div className="no-print px-6 py-4 bg-[#111113] text-white flex items-center justify-between border-b border-[#222226]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black ring-1 ring-[#77C614] flex items-center justify-center p-1">
                  <img
                    src="/logo.png"
                    alt="De-Olive"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.svg';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                    Report Preview
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {dateBoundaries.start.toLocaleDateString()} — {dateBoundaries.end.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#77C614]" />
                  <span>Print / Save as PDF</span>
                </button>

                <button
                  onClick={() => handleDownloadReport(activeReportId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#77C614] hover:bg-[#68B012] text-[#0A0A0A] text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setActiveReportId(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Header (Clean styling with Logo, Organization & Timestamp) */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              {/* Executive Formal Header */}
              <div className="border-b border-stone-200 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-black ring-2 ring-[#77C614] p-1.5 flex items-center justify-center shrink-0">
                      <img
                        src="/logo.png"
                        alt="De-Olive"
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold tracking-widest text-[#77C614] uppercase">
                        DE-OLIVE CONCEPT DBMS
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-stone-950 font-serif">
                        {activeReportId === 'project_status' && 'Project Status & Milestone Delivery Summary'}
                        {activeReportId === 'client_summary' && 'Client Portfolio & Account Density Summary'}
                        {activeReportId === 'budget_revenue' && 'Budget, Revenue & Cash Flow Ledger'}
                        {activeReportId === 'design_approval' && 'Design Governance & Creative Approval Report'}
                        {activeReportId === 'inventory_procurement' && 'Inventory Valuation & Material Procurement Report'}
                        {activeReportId === 'task_progress' && 'Sprint Velocity & Task Progress Report'}
                      </h2>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-stone-500 space-y-1">
                    <div>
                      <span className="font-semibold text-stone-700">Organization: </span>
                      {currentOrg?.name || 'De-Olive Design Lab'}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700">Period: </span>
                      {dateBoundaries.start.toLocaleDateString()} — {dateBoundaries.end.toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700">Generated: </span>
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Live vs Sample Status Banner */}
                <div className="mt-4 flex items-center justify-between">
                  {((activeReportId === 'project_status' && hasRealProjects) ||
                    (activeReportId === 'client_summary' && hasRealClients) ||
                    (activeReportId === 'budget_revenue' && hasRealFinance) ||
                    (activeReportId === 'design_approval' && hasRealDesigns) ||
                    (activeReportId === 'inventory_procurement' && hasRealInventory) ||
                    (activeReportId === 'task_progress' && hasRealTasks)) ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live Database Report: Generated directly from synchronized records.</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Sample Data: No synchronized records found for this criteria in your organization.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* REPORT 1: PROJECT STATUS SUMMARY */}
              {/* ------------------------------------------------------------- */}
              {activeReportId === 'project_status' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-xs text-stone-500 font-medium">Total Projects</span>
                      <div className="text-2xl font-bold text-stone-900 mt-1">{projectMetrics.total}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                      <span className="text-xs text-blue-700 font-medium">Active In Progress</span>
                      <div className="text-2xl font-bold mt-1">{projectMetrics.active}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <span className="text-xs text-emerald-700 font-medium">Completed</span>
                      <div className="text-2xl font-bold mt-1">{projectMetrics.completed}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                      <span className="text-xs text-rose-700 font-medium">Overdue Deadlines</span>
                      <div className="text-2xl font-bold mt-1">{projectMetrics.overdue}</div>
                    </div>
                  </div>

                  {/* Visual Chart: Status Breakdown Bars */}
                  <div className="p-5 rounded-xl border border-stone-200 bg-white">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                      Project Status Distribution
                    </h4>
                    <div className="w-full h-5 rounded-full overflow-hidden flex bg-stone-100">
                      {projectMetrics.total > 0 && (
                        <>
                          <div
                            style={{ width: `${(projectMetrics.active / projectMetrics.total) * 100}%` }}
                            className="bg-blue-600 h-full"
                            title={`Active: ${projectMetrics.active}`}
                          />
                          <div
                            style={{ width: `${(projectMetrics.planning / projectMetrics.total) * 100}%` }}
                            className="bg-amber-500 h-full"
                            title={`Planning: ${projectMetrics.planning}`}
                          />
                          <div
                            style={{ width: `${(projectMetrics.onHold / projectMetrics.total) * 100}%` }}
                            className="bg-stone-400 h-full"
                            title={`On Hold: ${projectMetrics.onHold}`}
                          />
                          <div
                            style={{ width: `${(projectMetrics.completed / projectMetrics.total) * 100}%` }}
                            className="bg-[#77C614] h-full"
                            title={`Completed: ${projectMetrics.completed}`}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-stone-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> Active ({projectMetrics.active})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Planning ({projectMetrics.planning})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-stone-400 inline-block" /> On Hold ({projectMetrics.onHold})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[#77C614] inline-block" /> Completed ({projectMetrics.completed})
                      </span>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Project Deliverable Schedule
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {projectMetrics.projectsList.length} Records
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4">Project</th>
                            <th className="py-2.5 px-4">Client</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Progress</th>
                            <th className="py-2.5 px-4">Due Date</th>
                            <th className="py-2.5 px-4 text-right">Delivery Alert</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {projectMetrics.projectsList.map((p) => (
                            <tr key={p.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-4 font-semibold text-stone-900">{p.name}</td>
                              <td className="py-3 px-4 text-stone-600">{p.clientName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                  p.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                  p.status === 'planning' ? 'bg-amber-100 text-amber-800' :
                                  'bg-stone-100 text-stone-700'
                                }`}>
                                  {p.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-stone-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${p.progress}%` }}
                                      className={`h-full ${p.progress === 100 ? 'bg-[#77C614]' : 'bg-blue-600'}`}
                                    />
                                  </div>
                                  <span className="font-mono text-stone-700">{p.progress}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-stone-600">{p.due_date || '—'}</td>
                              <td className="py-3 px-4 text-right">
                                {p.isOverdue ? (
                                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    OVERDUE
                                  </span>
                                ) : (
                                  <span className="text-stone-400">On Track</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* REPORT 2: CLIENT SUMMARY */}
              {/* ------------------------------------------------------------- */}
              {activeReportId === 'client_summary' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-xs text-stone-500 font-medium">Total Clients</span>
                      <div className="text-2xl font-bold text-stone-900 mt-1">{clientMetrics.total}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
                      <span className="text-xs text-purple-700 font-medium">Residential Estates</span>
                      <div className="text-2xl font-bold mt-1">{clientMetrics.residential}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                      <span className="text-xs text-blue-700 font-medium">Commercial HQ</span>
                      <div className="text-2xl font-bold mt-1">{clientMetrics.commercial}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <span className="text-xs text-emerald-700 font-medium">Hospitality Resorts</span>
                      <div className="text-2xl font-bold mt-1">{clientMetrics.hospitality}</div>
                    </div>
                  </div>

                  {/* Chart: Client Sector Distribution */}
                  <div className="p-5 rounded-xl border border-stone-200 bg-white">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                      Client Sector Distribution
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-purple-800 font-semibold block">Residential</span>
                          <span className="text-[11px] text-purple-600">
                            {clientMetrics.total > 0 ? Math.round((clientMetrics.residential / clientMetrics.total) * 100) : 0}% of accounts
                          </span>
                        </div>
                        <span className="text-lg font-bold text-purple-900">{clientMetrics.residential}</span>
                      </div>
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-blue-800 font-semibold block">Commercial</span>
                          <span className="text-[11px] text-blue-600">
                            {clientMetrics.total > 0 ? Math.round((clientMetrics.commercial / clientMetrics.total) * 100) : 0}% of accounts
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-900">{clientMetrics.commercial}</span>
                      </div>
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-emerald-800 font-semibold block">Hospitality</span>
                          <span className="text-[11px] text-emerald-600">
                            {clientMetrics.total > 0 ? Math.round((clientMetrics.hospitality / clientMetrics.total) * 100) : 0}% of accounts
                          </span>
                        </div>
                        <span className="text-lg font-bold text-emerald-900">{clientMetrics.hospitality}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Client Account Register
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {clientMetrics.clientsList.length} Accounts
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4">Client Name</th>
                            <th className="py-2.5 px-4">Sector Type</th>
                            <th className="py-2.5 px-4">Geographic Location</th>
                            <th className="py-2.5 px-4">Email Contact</th>
                            <th className="py-2.5 px-4">Phone</th>
                            <th className="py-2.5 px-4 text-right">Commissioned Projects</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {clientMetrics.clientsList.map((c) => (
                            <tr key={c.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-4 font-semibold text-stone-900">{c.name}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.type === 'Residential' ? 'bg-purple-100 text-purple-800' :
                                  c.type === 'Commercial' ? 'bg-blue-100 text-blue-800' :
                                  'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {c.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-stone-600">{c.location || '—'}</td>
                              <td className="py-3 px-4 font-mono text-stone-600">{c.email || '—'}</td>
                              <td className="py-3 px-4 font-mono text-stone-600">{c.phone || '—'}</td>
                              <td className="py-3 px-4 text-right font-bold text-stone-900">
                                {c.projectCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* REPORT 3: BUDGET & REVENUE REPORT (OWNER/ADMIN) */}
              {/* ------------------------------------------------------------- */}
              {activeReportId === 'budget_revenue' && isOwnerOrAdmin && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                      <span className="text-xs text-emerald-800 font-medium">Total Income / Revenue</span>
                      <div className="text-2xl font-bold mt-1 text-emerald-900">
                        {formatCurrency(budgetMetrics.totalIncome)}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                      <span className="text-xs text-rose-800 font-medium">Total Expenses</span>
                      <div className="text-2xl font-bold mt-1 text-rose-900">
                        {formatCurrency(budgetMetrics.totalExpenses)}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-900 text-white">
                      <span className="text-xs text-[#77C614] font-medium">Net Operating Margin</span>
                      <div className="text-2xl font-bold mt-1">
                        {formatCurrency(budgetMetrics.netOperatingProfit)}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                      <span className="text-xs text-amber-800 font-medium">Outstanding Invoices</span>
                      <div className="text-2xl font-bold mt-1 text-amber-900">
                        {formatCurrency(budgetMetrics.outstandingAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Monthly Cash Flow Comparison Chart */}
                  <div className="p-5 rounded-xl border border-stone-200 bg-white">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-4">
                      2026 Monthly Revenue vs Expense Cash Flow
                    </h4>
                    <div className="space-y-2">
                      {budgetMetrics.monthlyData.map((m) => {
                        const maxVal = Math.max(
                          ...budgetMetrics.monthlyData.map((d) => Math.max(d.income, d.expenses)),
                          1
                        );
                        return (
                          <div key={m.month} className="flex items-center gap-3 text-xs">
                            <span className="w-8 font-mono font-bold text-stone-500">{m.month}</span>
                            <div className="flex-1 space-y-1">
                              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${(m.income / maxVal) * 100}%` }}
                                  className="bg-emerald-500 h-full"
                                  title={`Income: ${formatCurrency(m.income)}`}
                                />
                              </div>
                              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${(m.expenses / maxVal) * 100}%` }}
                                  className="bg-rose-500 h-full"
                                  title={`Expenses: ${formatCurrency(m.expenses)}`}
                                />
                              </div>
                            </div>
                            <div className="text-right font-mono text-[11px] w-28">
                              <span className="text-emerald-700 block">+{formatCurrency(m.income)}</span>
                              <span className="text-rose-600 block">-{formatCurrency(m.expenses)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table: Invoices Aging */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Invoice Schedule & Status
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {budgetMetrics.invoicesList.length} Invoices
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4">Invoice #</th>
                            <th className="py-2.5 px-4">Amount</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Issue Date</th>
                            <th className="py-2.5 px-4">Due Date</th>
                            <th className="py-2.5 px-4">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {budgetMetrics.invoicesList.map((inv) => (
                            <tr key={inv.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-4 font-bold font-mono text-stone-900">{inv.invoice_number}</td>
                              <td className="py-3 px-4 font-mono font-bold text-stone-900">
                                {formatCurrency(inv.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                                  inv.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                  inv.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                                  'bg-stone-100 text-stone-700'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-stone-600">{inv.issue_date}</td>
                              <td className="py-3 px-4 font-mono text-stone-600">{inv.due_date}</td>
                              <td className="py-3 px-4 text-stone-500 truncate max-w-xs">{inv.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* REPORT 4: DESIGN APPROVAL REPORT */}
              {/* ------------------------------------------------------------- */}
              {activeReportId === 'design_approval' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-xs text-stone-500 font-medium">Total Creative Assets</span>
                      <div className="text-2xl font-bold text-stone-900 mt-1">{designMetrics.total}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <span className="text-xs text-emerald-700 font-medium">Approved by Client</span>
                      <div className="text-2xl font-bold mt-1">{designMetrics.approved}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                      <span className="text-xs text-amber-700 font-medium">Pending Formal Sign-off</span>
                      <div className="text-2xl font-bold mt-1">{designMetrics.pending}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#111113] text-white">
                      <span className="text-xs text-[#77C614] font-medium">Approval Efficiency</span>
                      <div className="text-2xl font-bold mt-1">{designMetrics.approvalRate}%</div>
                    </div>
                  </div>

                  {/* Chart: Asset Type Distribution */}
                  <div className="p-5 rounded-xl border border-stone-200 bg-white">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                      Design Asset Categories
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 block">Mood Boards</span>
                        <span className="text-lg font-bold text-stone-900 mt-0.5 block">{designMetrics.moodBoards}</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 block">3D Renders</span>
                        <span className="text-lg font-bold text-stone-900 mt-0.5 block">{designMetrics.renders}</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 block">Floor Plans</span>
                        <span className="text-lg font-bold text-stone-900 mt-0.5 block">{designMetrics.floorPlans}</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-xs text-stone-500 block">Technical Joinery</span>
                        <span className="text-lg font-bold text-stone-900 mt-0.5 block">{designMetrics.others}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Design Governance Ledger
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {designMetrics.designsList.length} Items
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4">Design Asset Title</th>
                            <th className="py-2.5 px-4">Associated Project</th>
                            <th className="py-2.5 px-4">Type</th>
                            <th className="py-2.5 px-4">Approval Status</th>
                            <th className="py-2.5 px-4 text-right">Upload Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {designMetrics.designsList.map((d) => (
                            <tr key={d.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-4 font-semibold text-stone-900">{d.name}</td>
                              <td className="py-3 px-4 text-stone-600">{d.projectName}</td>
                              <td className="py-3 px-4 text-stone-600">{d.type}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {d.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-stone-600">
                                {new Date(d.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* REPORT 5: INVENTORY & PROCUREMENT REPORT */}
              {/* ------------------------------------------------------------- */}
              {activeReportId === 'inventory_procurement' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-stone-900 text-white">
                      <span className="text-xs text-[#77C614] font-medium">Total Inventory Value</span>
                      <div className="text-2xl font-bold mt-1">
                        {formatCurrency(inventoryMetrics.totalStockValue)}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-xs text-stone-500 font-medium">Catalogued SKUs</span>
                      <div className="text-2xl font-bold text-stone-900 mt-1">{inventoryMetrics.totalItems}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                      <span className="text-xs text-rose-800 font-medium">Low Stock Alerts</span>
                      <div className="text-2xl font-bold mt-1 text-rose-900">
                        {inventoryMetrics.lowStockCount}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
                      <span className="text-xs text-blue-800 font-medium">Active Suppliers</span>
                      <div className="text-2xl font-bold mt-1 text-blue-900">
                        {inventoryMetrics.vendorBreakdown.length}
                      </div>
                    </div>
                  </div>

                  {/* Chart: Supplier Procurement Distribution */}
                  <div className="p-5 rounded-xl border border-stone-200 bg-white">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                      Procurement Value by Supplier
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {inventoryMetrics.vendorBreakdown.map((vb) => (
                        <div key={vb.name} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-stone-800 block">{vb.name}</span>
                            <span className="text-[11px] text-stone-500">{vb.count} catalogued items</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-stone-900">
                            {formatCurrency(vb.totalVal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Warehouse Inventory Ledger
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {inventoryMetrics.inventoryList.length} Items
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4">Material / Item</th>
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Supplier</th>
                            <th className="py-2.5 px-4">In Stock</th>
                            <th className="py-2.5 px-4">Unit Cost</th>
                            <th className="py-2.5 px-4 text-right">Total Valuation</th>
                            <th className="py-2.5 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {inventoryMetrics.inventoryList.map((item) => (
                            <tr key={item.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-4 font-semibold text-stone-900">{item.name}</td>
                              <td className="py-3 px-4 font-mono text-stone-500">{item.sku || '—'}</td>
                              <td className="py-3 px-4 text-stone-600">{item.category}</td>
                              <td className="py-3 px-4 text-stone-600">{item.vendorName}</td>
                              <td className="py-3 px-4 font-mono font-bold text-stone-900">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-3 px-4 font-mono text-stone-600">
                                {formatCurrency(item.unit_cost)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                                {formatCurrency(item.totalVal)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {item.isLowStock ? (
                                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                    LOW STOCK
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                                    OPTIMAL
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* REPORT 6: TASK PROGRESS REPORT */}
              {/* ------------------------------------------------------------- */}
              {activeReportId === 'task_progress' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-xs text-stone-500 font-medium">Total Tasks</span>
                      <div className="text-2xl font-bold text-stone-900 mt-1">{taskMetrics.total}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <span className="text-xs text-emerald-700 font-medium">Tasks Completed</span>
                      <div className="text-2xl font-bold mt-1">{taskMetrics.done}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                      <span className="text-xs text-blue-700 font-medium">In Progress</span>
                      <div className="text-2xl font-bold mt-1">{taskMetrics.inProgress}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                      <span className="text-xs text-rose-700 font-medium">High Priority</span>
                      <div className="text-2xl font-bold mt-1">{taskMetrics.highPriority}</div>
                    </div>
                  </div>

                  {/* Chart: Project Velocity Breakdown */}
                  <div className="p-5 rounded-xl border border-stone-200 bg-white">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-4">
                      Sprint Task Velocity by Project
                    </h4>
                    <div className="space-y-3">
                      {taskMetrics.projectBreakdown.map((p) => {
                        const pctDone = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                        return (
                          <div key={p.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-stone-900">{p.name}</span>
                              <span className="font-mono text-stone-500">
                                {p.done}/{p.total} Done ({pctDone}%)
                              </span>
                            </div>
                            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden flex">
                              <div
                                style={{ width: `${(p.done / p.total) * 100}%` }}
                                className="bg-[#77C614] h-full"
                              />
                              <div
                                style={{ width: `${(p.inProgress / p.total) * 100}%` }}
                                className="bg-blue-500 h-full"
                              />
                              <div
                                style={{ width: `${(p.todo / p.total) * 100}%` }}
                                className="bg-stone-300 h-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Task Workstream Ledger
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {taskMetrics.tasksList.length} Tasks
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-600 uppercase font-semibold border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4">Task Title</th>
                            <th className="py-2.5 px-4">Project</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Priority</th>
                            <th className="py-2.5 px-4 text-right">Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {taskMetrics.tasksList.map((t) => (
                            <tr key={t.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-4 font-semibold text-stone-900">{t.title}</td>
                              <td className="py-3 px-4 text-stone-600">{t.projectName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  t.status === 'done' ? 'bg-emerald-100 text-emerald-800' :
                                  t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-stone-100 text-stone-700'
                                }`}>
                                  {t.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  t.priority === 'high' ? 'bg-rose-100 text-rose-800' :
                                  t.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-stone-100 text-stone-600'
                                }`}>
                                  {t.priority.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-stone-600">
                                {t.due_date || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Printable Footer */}
              <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-400 gap-2">
                <div>
                  De-Olive Concept Architecture & Design Management System • Confidential Executive Document
                </div>
                <div>
                  Page 1 of 1 • Generated automatically from Supabase Database
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
