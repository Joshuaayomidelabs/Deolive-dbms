import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  X,
  FileText,
  Search,
  Filter,
  Check,
  Copy,
  Code2,
  Database,
  Info,
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
  ChevronDown,
  Trash2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceStatus, Transaction, TransactionType, Client, Project } from '../types/database';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { isRLSError } from '../lib/rlsHelper';

export type CurrencyCode = 'USD' | 'NGN' | 'GBP' | 'EUR';

export const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; label: string; prefix: string }> = {
  USD: { symbol: '$', label: 'USD ($)', prefix: '$' },
  NGN: { symbol: '₦', label: 'NGN (₦)', prefix: '₦' },
  GBP: { symbol: '£', label: 'GBP (£)', prefix: '£' },
  EUR: { symbol: '€', label: 'EUR (€)', prefix: '€' },
};

export const FINANCE_SETUP_SQL = `-- ================================================================
-- De-Olive DBMS - Invoices & Transactions Tables Setup
-- Run this script in your Supabase Dashboard > SQL Editor.
-- Restricts read/write access to organization owners and admins.
-- ================================================================

-- 1. Create 'invoices' table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for 'invoices'
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 3. Enable Row Level Security (RLS) on 'invoices'
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 4. RLS for 'invoices': Only owners and admins
CREATE POLICY "Allow owners and admins to read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners and admins to create invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners and admins to update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners and admins to delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 5. Create 'transactions' table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Income', 'Expense')),
  category TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Indexes for 'transactions'
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON public.transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON public.transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);

-- 7. Enable Row Level Security (RLS) on 'transactions'
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 8. RLS for 'transactions': Only owners and admins
CREATE POLICY "Allow owners and admins to read transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners and admins to create transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners and admins to update transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Allow owners and admins to delete transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );`;

// Realistic Sample Fallback Data (only shown when organization has 0 records)
interface SampleTx {
  id: string;
  description: string;
  projectName: string;
  type: TransactionType;
  category: string;
  transaction_date: string;
  amount: number;
  isSample: true;
}

const SAMPLE_TRANSACTIONS: SampleTx[] = [
  {
    id: 'sample-tx-1',
    description: 'Milestone 2 Design & Architecture Retainer',
    projectName: 'Sheikh Saud Private Estate',
    type: 'Income',
    category: 'Client Invoicing',
    transaction_date: '2026-10-06',
    amount: 85000,
    isSample: true,
  },
  {
    id: 'sample-tx-2',
    description: 'Italian Carrara Honed Marble Procurement Batch #1',
    projectName: 'Villa Al-Khobar Renovation',
    type: 'Expense',
    category: 'Material Procurement',
    transaction_date: '2026-10-04',
    amount: 38400,
    isSample: true,
  },
  {
    id: 'sample-tx-3',
    description: 'Phase 1 Concept Approval Final Settlement',
    projectName: 'TechStart Regional HQ',
    type: 'Income',
    category: 'Client Invoicing',
    transaction_date: '2026-10-01',
    amount: 42000,
    isSample: true,
  },
  {
    id: 'sample-tx-4',
    description: 'Milanese Luxury Textiles & Upholstery Deposit',
    projectName: 'The Palm Penthouse',
    type: 'Expense',
    category: 'Material Procurement',
    transaction_date: '2026-09-27',
    amount: 16800,
    isSample: true,
  },
  {
    id: 'sample-tx-5',
    description: 'Consultancy Retainer Fee Billing #INV-109',
    projectName: 'Villa Al-Nakheel Oasis',
    type: 'Income',
    category: 'Consulting Retainer',
    transaction_date: '2026-09-22',
    amount: 22200,
    isSample: true,
  },
];

interface SampleInv {
  id: string;
  invoice_number: string;
  clientName: string;
  projectName: string;
  amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  isSample: true;
}

const SAMPLE_INVOICES: SampleInv[] = [
  {
    id: 'sample-inv-1',
    invoice_number: 'INV-0001',
    clientName: 'Sheikh Saud Private Estate',
    projectName: 'Sheikh Saud Private Estate',
    amount: 85000,
    status: 'Paid',
    issue_date: '2026-09-15',
    due_date: '2026-10-01',
    isSample: true,
  },
  {
    id: 'sample-inv-2',
    invoice_number: 'INV-0002',
    clientName: 'Al-Areen Luxury Boutique Resort',
    projectName: 'Al-Areen Resort Expansion',
    amount: 34500,
    status: 'Sent',
    issue_date: '2026-09-28',
    due_date: '2026-10-28',
    isSample: true,
  },
  {
    id: 'sample-inv-3',
    invoice_number: 'INV-0003',
    clientName: 'TechStart Regional Headquarters',
    projectName: 'TechStart Regional HQ',
    amount: 29700,
    status: 'Overdue',
    issue_date: '2026-08-10',
    due_date: '2026-09-10',
    isSample: true,
  },
];

export const FinancePage: React.FC = () => {
  const { currentOrg, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const { showToast } = useToast();

  // Primary data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  // Currency state
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(`deolive_currency_${currentOrg?.id}`);
    return (saved as CurrencyCode) || 'USD';
  });

  // Modal views
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [showInvoicesLedgerModal, setShowInvoicesLedgerModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // New Invoice Form state
  const [invClientId, setInvClientId] = useState('');
  const [invProjectId, setInvProjectId] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDueDate, setInvDueDate] = useState('');
  const [invIssueDate, setInvIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invStatus, setInvStatus] = useState<InvoiceStatus>('Sent');
  const [invNotes, setInvNotes] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // New Transaction Form state
  const [txDescription, setTxDescription] = useState('');
  const [txType, setTxType] = useState<TransactionType>('Expense');
  const [txCategory, setTxCategory] = useState('Material Procurement');
  const [txAmount, setTxAmount] = useState('');
  const [txProjectId, setTxProjectId] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Ledger Filter states
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');

  // Role permissions
  const isOwnerOrAdmin = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  // Format currency helper
  const formatAmount = (val: number, withSign = false, type?: TransactionType) => {
    const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
    const absVal = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (withSign) {
      const sign = type === 'Expense' || val < 0 ? '-' : '+';
      return `${sign}${cfg.symbol}${absVal}`;
    }
    return `${cfg.symbol}${absVal}`;
  };

  const handleCurrencyChange = (newCurr: CurrencyCode) => {
    setCurrency(newCurr);
    if (currentOrg) {
      localStorage.setItem(`deolive_currency_${currentOrg.id}`, newCurr);
    }
    showToast(`Currency format updated to ${CURRENCY_CONFIG[newCurr].label}.`, 'info');
  };

  const fetchData = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      const savedInv = localStorage.getItem(`deolive_invoices_${currentOrg.id}`);
      const savedTx = localStorage.getItem(`deolive_transactions_${currentOrg.id}`);
      setInvoices(savedInv ? JSON.parse(savedInv) : []);
      setTransactions(savedTx ? JSON.parse(savedTx) : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Invoices
      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .select('*, project:projects(id, name), client:clients(id, name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (invErr) {
        const msg = (invErr.message || '').toLowerCase();
        if (msg.includes('relation') && msg.includes('does not exist')) {
          setTableExists(false);
        } else if (isRLSError(invErr)) {
          reportRLSError('invoices', 'SELECT', invErr);
        }
        setInvoices([]);
      } else {
        setTableExists(true);
        setInvoices(invData || []);
      }

      // 2. Fetch Transactions
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*, project:projects(id, name), invoice:invoices(id, invoice_number)')
        .eq('organization_id', currentOrg.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txErr) {
        if (isRLSError(txErr)) {
          reportRLSError('transactions', 'SELECT', txErr);
        }
        setTransactions([]);
      } else {
        setTransactions(txData || []);
      }

      // 3. Fetch Clients for dropdown
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (clientData) setClients(clientData);

      // 4. Fetch Projects for dropdown
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (projData) setProjects(projData);
    } catch {
      setInvoices([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg, isDemoMode]);

  // Determine if using sample data: only when there are no records in the organization
  const hasNoRealData = invoices.length === 0 && transactions.length === 0;

  // Real calculations
  const currentYear = new Date().getFullYear();

  // Helper to check if invoice is past due
  const isInvoicePastDue = (inv: Invoice | SampleInv) => {
    if (inv.status === 'Paid') return false;
    const dueTime = new Date(inv.due_date).getTime();
    const todayTime = new Date().setHours(0, 0, 0, 0);
    return dueTime < todayTime;
  };

  const getEffectiveStatus = (inv: Invoice | SampleInv): InvoiceStatus => {
    if (inv.status === 'Paid') return 'Paid';
    if (isInvoicePastDue(inv)) return 'Overdue';
    return inv.status;
  };

  const metrics = useMemo(() => {
    if (hasNoRealData) {
      return {
        revenueYtd: 149200,
        outstanding: 64200,
        outstandingCount: 2,
        expensesYtd: 55200,
      };
    }

    // 1. Total Revenue (YTD) = sum of Income transactions this year
    const incomeThisYear = transactions
      .filter((t) => {
        if (t.type !== 'Income') return false;
        const txYear = new Date(t.transaction_date).getFullYear();
        return txYear === currentYear;
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // 2. Outstanding Invoices = sum of invoices that are Sent or Overdue
    const outstandingInvs = invoices.filter((inv) => {
      const status = getEffectiveStatus(inv);
      return status === 'Sent' || status === 'Overdue';
    });
    const outstandingSum = outstandingInvs.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    // 3. Total Expenses (YTD) = sum of Expense transactions this year
    const expensesThisYear = transactions
      .filter((t) => {
        if (t.type !== 'Expense') return false;
        const txYear = new Date(t.transaction_date).getFullYear();
        return txYear === currentYear;
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      revenueYtd: incomeThisYear,
      outstanding: outstandingSum,
      outstandingCount: outstandingInvs.length,
      expensesYtd: expensesThisYear,
    };
  }, [hasNoRealData, transactions, invoices, currentYear]);

  // Display transactions (latest 10 on dashboard)
  const displayTransactions = useMemo(() => {
    if (hasNoRealData) {
      return SAMPLE_TRANSACTIONS;
    }
    return transactions.slice(0, 10).map((t) => ({
      id: t.id,
      description: t.description,
      projectName: t.project?.name || 'General Financial Item',
      type: t.type,
      category: t.category,
      transaction_date: t.transaction_date,
      amount: Number(t.amount),
      isSample: false,
    }));
  }, [hasNoRealData, transactions]);

  // Generate Next Invoice Number
  const nextInvoiceNumber = useMemo(() => {
    const totalCount = invoices.length + 1;
    return `INV-${String(totalCount).padStart(4, '0')}`;
  }, [invoices.length]);

  const handleOpenInvoiceModal = () => {
    setInvClientId(clients[0]?.id || '');
    setInvProjectId(projects[0]?.id || '');
    setInvAmount('');
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    setInvDueDate(in30Days.toISOString().split('T')[0]);
    setInvIssueDate(new Date().toISOString().split('T')[0]);
    setInvStatus('Sent');
    setInvNotes('');
    setInvError(null);
    setShowInvoiceModal(true);
  };

  const handleOpenTransactionModal = (defaultType: TransactionType = 'Expense') => {
    setTxType(defaultType);
    setTxDescription('');
    setTxCategory(defaultType === 'Expense' ? 'Material Procurement' : 'Client Retainer');
    setTxAmount('');
    setTxProjectId(projects[0]?.id || '');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxError(null);
    setShowTransactionModal(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invAmount || Number(invAmount) <= 0) {
      setInvError('Please specify a valid invoice amount greater than 0.');
      return;
    }
    if (!invDueDate) {
      setInvError('Please select a payment due date.');
      return;
    }
    if (!currentOrg) return;

    setSavingInvoice(true);
    setInvError(null);

    const payload = {
      organization_id: currentOrg.id,
      project_id: invProjectId || null,
      client_id: invClientId || null,
      invoice_number: nextInvoiceNumber,
      amount: Number(invAmount),
      status: invStatus,
      issue_date: invIssueDate,
      due_date: invDueDate,
      notes: invNotes.trim() || null,
    };

    try {
      if (isDemoMode) {
        const newInv: Invoice = {
          id: `inv-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
          project: projects.find((p) => p.id === invProjectId),
          client: clients.find((c) => c.id === invClientId),
        };
        const updated = [newInv, ...invoices];
        setInvoices(updated);
        localStorage.setItem(`deolive_invoices_${currentOrg.id}`, JSON.stringify(updated));
        showToast(`Invoice ${newInv.invoice_number} generated.`, 'success');
        setShowInvoiceModal(false);
        return;
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert(payload)
        .select('*, project:projects(id, name), client:clients(id, name)')
        .single();

      if (error) {
        if (isRLSError(error)) {
          reportRLSError('invoices', 'INSERT', error);
        }
        setInvError(error.message);
      } else {
        setInvoices([data, ...invoices]);
        showToast(`Invoice ${data.invoice_number} created successfully.`, 'success');
        setShowInvoiceModal(false);
      }
    } catch (err: any) {
      setInvError(err.message || 'Failed to save invoice.');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription.trim()) {
      setTxError('Transaction description is required.');
      return;
    }
    if (!txAmount || Number(txAmount) <= 0) {
      setTxError('Please specify a valid amount greater than 0.');
      return;
    }
    if (!currentOrg) return;

    setSavingTransaction(true);
    setTxError(null);

    const payload = {
      organization_id: currentOrg.id,
      project_id: txProjectId || null,
      invoice_id: null,
      description: txDescription.trim(),
      type: txType,
      category: txCategory,
      amount: Number(txAmount),
      transaction_date: txDate,
    };

    try {
      if (isDemoMode) {
        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
          project: projects.find((p) => p.id === txProjectId),
        };
        const updated = [newTx, ...transactions];
        setTransactions(updated);
        localStorage.setItem(`deolive_transactions_${currentOrg.id}`, JSON.stringify(updated));
        showToast(`${txType} transaction recorded.`, 'success');
        setShowTransactionModal(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select('*, project:projects(id, name)')
        .single();

      if (error) {
        if (isRLSError(error)) {
          reportRLSError('transactions', 'INSERT', error);
        }
        setTxError(error.message);
      } else {
        setTransactions([data, ...transactions]);
        showToast(`${data.type} of ${formatAmount(Number(data.amount))} recorded.`, 'success');
        setShowTransactionModal(false);
      }
    } catch (err: any) {
      setTxError(err.message || 'Failed to save transaction.');
    } finally {
      setSavingTransaction(false);
    }
  };

  // Mark invoice as paid: updates invoice to 'Paid' AND creates Income transaction
  const handleMarkAsPaid = async (inv: Invoice | SampleInv) => {
    if ('isSample' in inv && inv.isSample) {
      showToast('Sample invoices cannot be marked as paid in the database.', 'info');
      return;
    }

    const realInv = inv as Invoice;
    if (!currentOrg) return;

    try {
      if (isDemoMode) {
        // 1. Update invoice
        const updatedInvs = invoices.map((i) =>
          i.id === realInv.id ? { ...i, status: 'Paid' as InvoiceStatus } : i
        );
        setInvoices(updatedInvs);
        localStorage.setItem(`deolive_invoices_${currentOrg.id}`, JSON.stringify(updatedInvs));

        // 2. Insert income transaction
        const clientName = realInv.client?.name || 'Client';
        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          organization_id: currentOrg.id,
          project_id: realInv.project_id,
          invoice_id: realInv.id,
          description: `Payment for ${realInv.invoice_number} (${clientName})`,
          type: 'Income',
          category: 'Client Invoicing',
          amount: Number(realInv.amount),
          transaction_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          project: realInv.project,
        };
        const updatedTx = [newTx, ...transactions];
        setTransactions(updatedTx);
        localStorage.setItem(`deolive_transactions_${currentOrg.id}`, JSON.stringify(updatedTx));

        showToast(`Invoice ${realInv.invoice_number} marked as Paid & Income transaction logged.`, 'success');
        return;
      }

      // 1. Update invoice in Supabase
      const { data: updatedInvData, error: updateErr } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .eq('id', realInv.id)
        .select('*, project:projects(id, name), client:clients(id, name)')
        .single();

      if (updateErr) {
        if (isRLSError(updateErr)) reportRLSError('invoices', 'UPDATE', updateErr);
        showToast(`Failed to update invoice: ${updateErr.message}`, 'error');
        return;
      }

      // 2. Automatically create an Income transaction
      const clientName = updatedInvData.client?.name || 'Client';
      const txPayload = {
        organization_id: currentOrg.id,
        project_id: updatedInvData.project_id || null,
        invoice_id: updatedInvData.id,
        description: `Payment for ${updatedInvData.invoice_number} (${clientName})`,
        type: 'Income',
        category: 'Client Invoicing',
        amount: Number(updatedInvData.amount),
        transaction_date: new Date().toISOString().split('T')[0],
      };

      const { data: createdTx, error: txErr } = await supabase
        .from('transactions')
        .insert(txPayload)
        .select('*, project:projects(id, name)')
        .single();

      if (txErr) {
        if (isRLSError(txErr)) reportRLSError('transactions', 'INSERT', txErr);
      } else {
        setTransactions([createdTx, ...transactions]);
      }

      setInvoices(invoices.map((i) => (i.id === realInv.id ? updatedInvData : i)));
      showToast(`Invoice ${realInv.invoice_number} marked as Paid. Income transaction recorded.`, 'success');
    } catch {
      showToast('Error processing invoice payment settlement.', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const listToExport = hasNoRealData ? SAMPLE_TRANSACTIONS : transactions;

    if (listToExport.length === 0) {
      showToast('No transaction data to export.', 'info');
      return;
    }

    const headers = ['Date', 'Description', 'Type', 'Category', 'Project', `Amount (${currency})`];
    const rows = listToExport.map((t: any) => [
      `"${t.transaction_date}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.type}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.project?.name || t.projectName || '').replace(/"/g, '""')}"`,
      Number(t.amount || 0).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deolive_ledger_${currentOrg?.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Financial ledger exported to CSV format.', 'success');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(FINANCE_SETUP_SQL);
    setCopiedSql(true);
    showToast('Supabase SQL copied to clipboard.', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Finance & Budgeting
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track project cash flow, client invoices, disbursements, and real-time revenue metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Selector */}
          <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-xs text-xs">
            <span className="text-[11px] font-semibold text-stone-400 px-2 uppercase">Curr:</span>
            {(['USD', 'NGN', 'GBP', 'EUR'] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                onClick={() => handleCurrencyChange(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  currency === c
                    ? 'bg-stone-900 text-[#77C614]'
                    : 'text-stone-600 hover:text-black hover:bg-stone-50'
                }`}
                title={CURRENCY_CONFIG[c].label}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSqlModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="View Supabase Schema SQL"
          >
            <Code2 className="w-3.5 h-3.5 text-[#5FA20D]" />
            <span>Supabase SQL</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-semibold shadow-xs hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenTransactionModal('Expense')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-stone-600" />
            <span>Add Transaction</span>
          </button>

          <button
            onClick={handleOpenInvoiceModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* SQL Setup Notice if table does not exist */}
      {!tableExists && !isDemoMode && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Supabase "invoices" & "transactions" Tables Required</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Run the SQL script in your Supabase SQL Editor to provision both tables with owner/admin Row Level Security.
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

      {/* Role permission notification for regular members */}
      {!isOwnerOrAdmin && !isDemoMode && (
        <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 flex items-center gap-2.5 text-xs text-stone-700">
          <Lock className="w-4 h-4 text-stone-500 shrink-0" />
          <span>
            You are currently signed in as a <strong className="font-semibold">{currentMemberRole}</strong>. In accordance with Row Level Security, financial records are restricted to organization owners and admins.
          </span>
        </div>
      )}

      {/* Sample Data Banner when organization has no records */}
      {hasNoRealData && !loading && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3 text-xs text-sky-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong className="font-semibold">Sample Data:</strong> No invoices or ledger transactions have been recorded in this organization yet. Click{' '}
              <strong className="font-semibold text-stone-900">"+ New Invoice"</strong> or <strong className="font-semibold text-stone-900">"+ Add Transaction"</strong> to start recording real cash flow.
            </span>
          </div>
          <button
            onClick={handleOpenInvoiceModal}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-medium text-[11px] rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <Plus className="w-3 h-3" />
            Create First Invoice
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Black Card: Total Revenue (YTD) = sum of Income transactions this year */}
        <div className="de-olive-dark-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Revenue (YTD)</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#77C614] bg-[#77C614]/15 px-2 py-0.5 rounded-full border border-[#77C614]/30">
              <ArrowUpRight className="w-3 h-3 text-[#77C614]" />
              {currentYear} Realized
            </span>
          </div>
          <div className="mt-5">
            <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {formatAmount(metrics.revenueYtd)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1.5 font-medium">
              Sum of completed income transactions in {currentYear}
            </p>
          </div>
        </div>

        {/* White Card: Outstanding Invoices = sum of Sent or Overdue invoices */}
        <div className="de-olive-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Outstanding Invoices</span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
              {metrics.outstandingCount} {metrics.outstandingCount === 1 ? 'Invoice' : 'Invoices'}
            </span>
          </div>
          <div className="mt-5">
            <p className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-mono tabular-nums tracking-tight">
              {formatAmount(metrics.outstanding)}
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-stone-400 font-medium">
                Sent or overdue client billings
              </p>
              <button
                onClick={() => setShowInvoicesLedgerModal(true)}
                className="text-[11px] font-bold text-[#5FA20D] hover:underline cursor-pointer"
              >
                View Invoices &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* White Card: Total Expenses = sum of Expense transactions this year */}
        <div className="de-olive-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Total Expenses (YTD)</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              Disbursements
            </span>
          </div>
          <div className="mt-5">
            <p className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-mono tabular-nums tracking-tight">
              {formatAmount(metrics.expensesYtd)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1.5 font-medium">
              Procurement, contractor fees & studio operating costs
            </p>
          </div>
        </div>
      </div>

      {/* Invoices Quick Summary Card */}
      <div className="de-olive-card overflow-hidden">
        <div className="p-5 border-b border-[#EEEEF2] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Invoices & Accounts Receivable</h2>
            <p className="text-xs text-stone-500 mt-0.5">Track payment states and collect milestone retainers</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInvoicesLedgerModal(true)}
              className="text-xs font-bold text-[#5FA20D] hover:underline cursor-pointer"
            >
              All Invoices ({hasNoRealData ? SAMPLE_INVOICES.length : invoices.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  INVOICE #
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  CLIENT / PROJECT
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  DUE DATE
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  STATUS
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                  AMOUNT
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEF2] text-xs">
              {(hasNoRealData ? SAMPLE_INVOICES : invoices.slice(0, 5)).map((inv: any) => {
                const effectiveStatus = getEffectiveStatus(inv);
                const isOverdue = effectiveStatus === 'Overdue';

                return (
                  <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-stone-900">
                      {inv.invoice_number}
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-stone-900 leading-tight">
                          {inv.client?.name || inv.clientName || 'General Client'}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {inv.project?.name || inv.projectName || 'General Architecture'}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-stone-400'}`} />
                        <span className={`font-mono ${isOverdue ? 'text-red-600 font-semibold' : 'text-stone-600'}`}>
                          {inv.due_date}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          effectiveStatus === 'Paid'
                            ? 'badge-completed'
                            : isOverdue
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'badge-concept'
                        }`}
                      >
                        {effectiveStatus}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right font-mono font-bold text-stone-900">
                      {formatAmount(Number(inv.amount))}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {effectiveStatus !== 'Paid' ? (
                        <button
                          onClick={() => handleMarkAsPaid(inv)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mark Paid</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!hasNoRealData && invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    No invoices issued yet. Click "+ New Invoice" to generate one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions Card */}
      <div className="de-olive-card overflow-hidden">
        <div className="p-5 border-b border-[#EEEEF2] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Recent Transactions</h2>
            <p className="text-xs text-stone-500 mt-0.5">Disbursements, retainers, and client billings</p>
          </div>

          <button
            onClick={() => setShowAllTransactionsModal(true)}
            className="text-xs font-bold text-[#5FA20D] hover:underline cursor-pointer"
          >
            View All ({hasNoRealData ? SAMPLE_TRANSACTIONS.length : transactions.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  DESCRIPTION
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  CATEGORY
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  TYPE
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                  DATE
                </th>
                <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEF2] text-xs">
              {displayTransactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-stone-50/70 transition-colors">
                  {/* DESCRIPTION */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-stone-900 text-sm leading-tight">
                        {tx.description}
                      </p>
                      <span className="text-[11px] text-stone-400 mt-0.5 block font-medium">
                        Project: {tx.projectName}
                      </span>
                    </div>
                  </td>

                  {/* CATEGORY */}
                  <td className="px-6 py-4">
                    <span className="text-stone-600 font-medium">
                      {tx.category || 'General'}
                    </span>
                  </td>

                  {/* TYPE */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        tx.type === 'Income' ? 'badge-completed' : 'badge-concept'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>

                  {/* DATE */}
                  <td className="px-6 py-4">
                    <span className="text-stone-500 font-mono text-[11px]">{tx.transaction_date}</span>
                  </td>

                  {/* AMOUNT */}
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`font-mono font-bold text-sm tabular-nums ${
                        tx.type === 'Income' ? 'text-emerald-700' : 'text-stone-900'
                      }`}
                    >
                      {formatAmount(tx.amount, true, tx.type)}
                    </span>
                  </td>
                </tr>
              ))}

              {!hasNoRealData && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    No transactions recorded yet. Click "+ Add Transaction" to add expenses or payments.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900">Create New Invoice</h2>
                <p className="text-xs text-stone-500 font-mono mt-0.5">Number: {nextInvoiceNumber}</p>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{invError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInvoice} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Client Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={invClientId}
                  onChange={(e) => setInvClientId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Select a Client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                  {clients.length === 0 && (
                    <>
                      <option value="c-1">Sheikh Saud Private Estate (Sample)</option>
                      <option value="c-2">Al-Areen Luxury Boutique Resort (Sample)</option>
                      <option value="c-3">TechStart Regional Headquarters (Sample)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Associated Project</label>
                <select
                  value={invProjectId}
                  onChange={(e) => setInvProjectId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Select a Project (Optional)...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {projects.length === 0 && (
                    <>
                      <option value="p-1">Villa Al-Khobar Renovation (Sample)</option>
                      <option value="p-2">Sheikh Saud Private Estate (Sample)</option>
                      <option value="p-3">TechStart Regional HQ (Sample)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Invoice Amount ({CURRENCY_CONFIG[currency].symbol}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    placeholder="25000.00"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Status</label>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as InvoiceStatus)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Sent">Sent (Ready for payment)</option>
                    <option value="Draft">Draft (Unsent)</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={invIssueDate}
                    onChange={(e) => setInvIssueDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="Payment due within 30 days via wire transfer..."
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInvoice}
                  className="px-5 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingInvoice && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#77C614]" />}
                  <span>Save Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal (Income or Expense) */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">Record Transaction</h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {txError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="flex-1">{txError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Transaction Type</label>
                  <select
                    value={txType}
                    onChange={(e) => {
                      const newT = e.target.value as TransactionType;
                      setTxType(newT);
                      setTxCategory(newT === 'Expense' ? 'Material Procurement' : 'Client Retainer');
                    }}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Expense">Expense (Disbursement)</option>
                    <option value="Income">Income (Revenue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Amount ({CURRENCY_CONFIG[currency].symbol}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="12500.00"
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="e.g. Italian Calacatta Honed Slabs Purchase Order #4"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    {txType === 'Expense' ? (
                      <>
                        <option value="Material Procurement">Material Procurement</option>
                        <option value="Subcontractor & Joinery">Subcontractor & Joinery</option>
                        <option value="Logistics & Shipping">Logistics & Shipping</option>
                        <option value="Site Survey & Structural">Site Survey & Structural</option>
                        <option value="Studio Operating Expense">Studio Operating Expense</option>
                        <option value="Software & CAD Tools">Software & CAD Tools</option>
                        <option value="Other Expense">Other Expense</option>
                      </>
                    ) : (
                      <>
                        <option value="Client Retainer">Client Retainer</option>
                        <option value="Milestone Settlement">Milestone Settlement</option>
                        <option value="Consultancy Fee">Consultancy Fee</option>
                        <option value="Client Invoicing">Client Invoicing</option>
                        <option value="Other Income">Other Income</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Associated Project</label>
                <select
                  value={txProjectId}
                  onChange={(e) => setTxProjectId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="">General (No project assigned)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {projects.length === 0 && (
                    <>
                      <option value="p-1">Villa Al-Khobar Renovation (Sample)</option>
                      <option value="p-2">Sheikh Saud Private Estate (Sample)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTransaction}
                  className="px-5 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingTransaction && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#77C614]" />}
                  <span>Record Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View All Transactions Modal */}
      {showAllTransactionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900">Complete Financial Ledger</h2>
                <p className="text-xs text-stone-500">Every income and expense entry recorded for {currentOrg?.name}</p>
              </div>
              <button
                onClick={() => setShowAllTransactionsModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="pt-4 pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearchTerm}
                  onChange={(e) => setTxSearchTerm(e.target.value)}
                  placeholder="Search ledger entries by description or project..."
                  className="w-full bg-[#F8F8FA] border border-[#EEEEF2] rounded-xl pl-10 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#77C614]"
                />
              </div>

              <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                {(['All', 'Income', 'Expense'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTxTypeFilter(t)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      txTypeFilter === t ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-y-auto border border-stone-100 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <tr>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      DATE
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      DESCRIPTION
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      CATEGORY
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      TYPE
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3 text-right">
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF2] text-xs">
                  {(hasNoRealData ? SAMPLE_TRANSACTIONS : transactions)
                    .filter((t: any) => {
                      const matchesSearch =
                        t.description.toLowerCase().includes(txSearchTerm.toLowerCase()) ||
                        (t.project?.name || t.projectName || '').toLowerCase().includes(txSearchTerm.toLowerCase());
                      const matchesType = txTypeFilter === 'All' || t.type === txTypeFilter;
                      return matchesSearch && matchesType;
                    })
                    .map((t: any) => (
                      <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-stone-500 text-[11px]">
                          {t.transaction_date}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{t.description}</p>
                          <p className="text-[10px] text-stone-400">
                            {t.project?.name || t.projectName || 'General'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{t.category}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.type === 'Income' ? 'badge-completed' : 'badge-concept'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={t.type === 'Income' ? 'text-emerald-700' : 'text-stone-900'}>
                            {formatAmount(Number(t.amount), true, t.type)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-between items-center text-xs text-stone-500">
              <span>Export or manage entries directly from Supabase</span>
              <button
                onClick={() => setShowAllTransactionsModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Invoices Modal */}
      {showInvoicesLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900">All Client Invoices</h2>
                <p className="text-xs text-stone-500">Track and settle receivable billings</p>
              </div>
              <button
                onClick={() => setShowInvoicesLedgerModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-stone-100 rounded-xl mt-4">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead className="sticky top-0 bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <tr>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      INVOICE #
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      CLIENT
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      PROJECT
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      DUE DATE
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3">
                      STATUS
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3 text-right">
                      AMOUNT
                    </th>
                    <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-4 py-3 text-right">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF2] text-xs">
                  {(hasNoRealData ? SAMPLE_INVOICES : invoices).map((inv: any) => {
                    const effectiveStatus = getEffectiveStatus(inv);
                    const isOverdue = effectiveStatus === 'Overdue';

                    return (
                      <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-stone-900">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3 font-semibold text-stone-800">
                          {inv.client?.name || inv.clientName || 'General Client'}
                        </td>
                        <td className="px-4 py-3 text-stone-500">
                          {inv.project?.name || inv.projectName || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          <span className={isOverdue ? 'text-red-600 font-bold' : 'text-stone-600'}>
                            {inv.due_date}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              effectiveStatus === 'Paid'
                                ? 'badge-completed'
                                : isOverdue
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'badge-concept'
                            }`}
                          >
                            {effectiveStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {formatAmount(Number(inv.amount))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {effectiveStatus !== 'Paid' ? (
                            <button
                              onClick={() => handleMarkAsPaid(inv)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700">Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setShowInvoicesLedgerModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script View Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#5FA20D]" />
                <h3 className="text-sm font-bold text-stone-900">Supabase SQL: Invoices & Transactions</h3>
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
              <span className="font-semibold text-stone-800">Supabase Dashboard &gt; SQL Editor</span>. It creates both the <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">invoices</code> and <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">transactions</code> tables, with Row Level Security restricting access to organization owners and admins (<code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800">role IN ('owner', 'admin')</code>).
            </p>

            <div className="mt-3 relative">
              <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed border border-stone-800">
                {FINANCE_SETUP_SQL}
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
