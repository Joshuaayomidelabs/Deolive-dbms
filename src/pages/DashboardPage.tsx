import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Palette,
  Receipt,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  Bot,
  UserPlus,
  Upload,
  MoreHorizontal,
  Loader2,
  Clock,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Project, Task, Client, Design, Invoice } from '../types/database';
import { useToast } from '../context/ToastContext';

interface ActivityItem {
  id: string;
  type: 'project' | 'client' | 'design' | 'invoice' | 'task';
  actor: string;
  action: string;
  target: string;
  timestamp: string; // ISO string
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, isConfigured } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Load real data from Supabase
  useEffect(() => {
    if (!currentOrg?.id) {
      setProjects([]);
      setClients([]);
      setDesigns([]);
      setInvoices([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setDbStatus('checking');

      try {
        // Run parallel queries across all relevant tables
        const [
          { data: projData, error: projErr },
          { data: clientData, error: clientErr },
          { data: designData, error: designErr },
          { data: invoiceData, error: invoiceErr },
          { data: taskData, error: taskErr },
        ] = await Promise.all([
          supabase
            .from('projects')
            .select('*')
            .eq('organization_id', currentOrg.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('clients')
            .select('*')
            .eq('organization_id', currentOrg.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('designs')
            .select('*')
            .eq('organization_id', currentOrg.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('invoices')
            .select('*')
            .eq('organization_id', currentOrg.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('tasks')
            .select('*')
            .eq('organization_id', currentOrg.id)
            .order('created_at', { ascending: false }),
        ]);

        if (projErr && clientErr && designErr && invoiceErr && taskErr) {
          setDbStatus('offline');
        } else {
          setDbStatus('online');
        }

        setProjects(projData || []);
        setClients(clientData || []);
        setDesigns(designData || []);
        setInvoices(invoiceData || []);
        setTasks(taskData || []);
      } catch {
        setDbStatus('offline');
        setProjects([]);
        setClients([]);
        setDesigns([]);
        setInvoices([]);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrg?.id]);

  const handleDownloadReport = () => {
    // Generate clean CSV of active dashboard summary
    const headers = ['Metric', 'Count', 'Calculation'];
    const rows = [
      ['Active Projects', projects.filter((p) => p.status === 'active').length, 'Projects currently in execution'],
      ['Total Clients', clients.length, 'Active client accounts in organization'],
      ['Design Assets', designs.length, 'Stored mood boards, renders & drawings'],
      ['Pending Invoices', invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length, 'Awaiting settlement'],
      ['Total Tasks', tasks.length, 'Total work items in queue'],
      ['Completed Tasks', tasks.filter((t) => t.status === 'done').length, 'Closed tasks'],
    ];

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DeOlive_Dashboard_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Dashboard summary exported to CSV.', 'success');
  };

  // Helper for 30-day percentage change calculation
  const calculate30DayTrend = (items: { created_at: string }[]) => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const currentWindowStart = now - thirtyDaysMs;
    const previousWindowStart = now - 2 * thirtyDaysMs;

    const currentCount = items.filter((item) => {
      const t = new Date(item.created_at).getTime();
      return t >= currentWindowStart && t <= now;
    }).length;

    const previousCount = items.filter((item) => {
      const t = new Date(item.created_at).getTime();
      return t >= previousWindowStart && t < currentWindowStart;
    }).length;

    if (previousCount === 0) {
      if (currentCount > 0) return { label: `+${currentCount}`, isPositive: true };
      return null; // Nothing to compare, hide the trend pill
    }

    const pct = Math.round(((currentCount - previousCount) / previousCount) * 100);
    return {
      label: pct >= 0 ? `+${pct}%` : `${pct}%`,
      isPositive: pct >= 0,
    };
  };

  // Calculate Real Trends
  const projectTrend = useMemo(() => calculate30DayTrend(projects), [projects]);
  const clientTrend = useMemo(() => calculate30DayTrend(clients), [clients]);
  const designTrend = useMemo(() => calculate30DayTrend(designs), [designs]);
  const invoiceTrend = useMemo(() => calculate30DayTrend(invoices), [invoices]);

  // Real Counts
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const totalClientsCount = clients.length;
  const totalDesignsCount = designs.length;
  const pendingInvoicesCount = invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length;

  // Build Recent Activity from real records across tables sorted by date
  const recentActivities: ActivityItem[] = useMemo(() => {
    const combined: ActivityItem[] = [];

    projects.forEach((p) => {
      combined.push({
        id: `p-${p.id}`,
        type: 'project',
        actor: 'Project Team',
        action: 'created project',
        target: p.name,
        timestamp: p.created_at,
      });
    });

    clients.forEach((c) => {
      combined.push({
        id: `c-${c.id}`,
        type: 'client',
        actor: 'Client Accounts',
        action: 'added new client',
        target: c.name,
        timestamp: c.created_at,
      });
    });

    designs.forEach((d) => {
      combined.push({
        id: `d-${d.id}`,
        type: 'design',
        actor: 'Design Studio',
        action: d.status === 'Approved' ? 'approved asset' : 'uploaded design',
        target: `${d.name} (${d.type})`,
        timestamp: d.created_at,
      });
    });

    invoices.forEach((inv) => {
      combined.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        actor: 'Finance & Accounts',
        action: inv.status === 'Paid' ? 'settled invoice' : `issued invoice ${inv.invoice_number}`,
        target: `Invoice #${inv.invoice_number}`,
        timestamp: inv.created_at,
      });
    });

    tasks.forEach((t) => {
      if (t.status === 'done') {
        combined.push({
          id: `t-${t.id}`,
          type: 'task',
          actor: 'Team Member',
          action: 'completed deliverable',
          target: t.title,
          timestamp: t.created_at,
        });
      }
    });

    // Sort descending by timestamp, take top 10
    return combined
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [projects, clients, designs, invoices, tasks]);

  // Relative Time Formatter ("2 hours ago", "Yesterday", etc.)
  const formatTimeAgo = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
        <Loader2 className="w-7 h-7 animate-spin text-[#77C614]" />
        <span className="text-xs font-medium">Loading Dashboard Overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-display-serif tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Welcome back, here's what's happening today in {currentOrg?.name || 'your workspace'}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleDownloadReport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-semibold shadow-xs hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Download Report</span>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#111113] hover:bg-[#1C1C20] text-[#77C614] border border-[#77C614]/30 hover:border-[#77C614] text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Stat Cards (stacked on mobile, 4-col grid on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            {projectTrend && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  projectTrend.isPositive
                    ? 'text-[#2A5C00] bg-[#77C614]/15 border-[#77C614]/30'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}
              >
                {projectTrend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                )}
                {projectTrend.label}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Active Projects</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {activeProjectsCount}
            </p>
          </div>
        </div>

        {/* Card 2: Total Clients */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            {clientTrend && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  clientTrend.isPositive
                    ? 'text-[#2A5C00] bg-[#77C614]/15 border-[#77C614]/30'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}
              >
                {clientTrend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                )}
                {clientTrend.label}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Total Clients</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {totalClientsCount}
            </p>
          </div>
        </div>

        {/* Card 3: Design Assets */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            {designTrend && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  designTrend.isPositive
                    ? 'text-[#2A5C00] bg-[#77C614]/15 border-[#77C614]/30'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}
              >
                {designTrend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                )}
                {designTrend.label}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Design Assets</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {totalDesignsCount}
            </p>
          </div>
        </div>

        {/* Card 4: Pending Invoices */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            {invoiceTrend && (
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  invoiceTrend.isPositive
                    ? 'text-[#2A5C00] bg-[#77C614]/15 border-[#77C614]/30'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}
              >
                {invoiceTrend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                )}
                {invoiceTrend.label}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Pending Invoices</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {pendingInvoicesCount}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & System Status / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Activity Card */}
        <div className="lg:col-span-2 de-olive-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Recent Activity</h2>
                <p className="text-xs text-stone-500 mt-0.5">Live workspace history across projects, clients, designs, and finance</p>
              </div>
              <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                Live Log
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-800">No activity yet</h3>
                  <p className="text-xs text-stone-500 mt-0.5 max-w-xs">
                    Actions you take — creating projects, uploading designs, or invoicing — will automatically appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {recentActivities.map((act) => (
                  <div key={act.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#77C614] ring-4 ring-[#77C614]/20" />

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-stone-800 leading-snug">
                          <strong className="font-bold text-stone-950">{act.actor}</strong>{' '}
                          <span className="text-stone-600">{act.action}</span>
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#5FA20D]">
                          {act.target}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 shrink-0 font-medium whitespace-nowrap">
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Stack of System Status (Black) + Quick Actions (White) */}
        <div className="space-y-6">
          {/* Black System Status Card */}
          <div className="de-olive-dark-card p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white font-display-serif tracking-tight">
                System Status
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Real-time services and infrastructure health
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Row 1: Database Engine */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181D] border border-[#25252C]">
                <div className="flex items-center gap-2.5 text-xs text-stone-300">
                  <Database className="w-4 h-4 text-stone-400" />
                  <span>Database Engine</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {dbStatus === 'checking' ? (
                    <span className="text-stone-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      CHECKING
                    </span>
                  ) : dbStatus === 'online' ? (
                    <span className="text-[#77C614] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#77C614] animate-pulse" />
                      ONLINE
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      DISCONNECTED
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: AI Assistant */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181D] border border-[#25252C]">
                <div className="flex items-center gap-2.5 text-xs text-stone-300">
                  <Bot className="w-4 h-4 text-stone-400" />
                  <span>AI Assistant</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#77C614]">
                  <span className="w-2 h-2 rounded-full bg-[#77C614]" />
                  <span>READY</span>
                </div>
              </div>

              {/* Row 3: Security & RLS */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181D] border border-[#25252C]">
                <div className="flex items-center gap-2.5 text-xs text-stone-300">
                  <Sparkles className="w-4 h-4 text-stone-400" />
                  <span>Security Layer</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#77C614]">
                  <span className="w-2 h-2 rounded-full bg-[#77C614]" />
                  <span>PROTECTED</span>
                </div>
              </div>
            </div>
          </div>

          {/* White Quick Actions Card */}
          <div className="de-olive-card p-6">
            <h3 className="text-base font-bold text-stone-900 font-display-serif tracking-tight mb-4">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Tile 1: Add Client */}
              <button
                onClick={() => navigate('/clients')}
                className="p-3.5 rounded-xl bg-[#77C614] hover:bg-[#68B012] text-black font-bold flex flex-col justify-between h-24 shadow-[0_0_12px_rgba(119,198,20,0.3)] transition-all cursor-pointer text-left"
              >
                <UserPlus className="w-5 h-5 text-black" />
                <span className="text-xs font-extrabold leading-tight">Add Client</span>
              </button>

              {/* Tile 2: Upload */}
              <button
                onClick={() => navigate('/designs')}
                className="p-3.5 rounded-xl bg-[#F8F8FA] hover:bg-stone-100 border border-[#EEEEF2] text-stone-800 font-semibold flex flex-col justify-between h-24 transition-colors cursor-pointer text-left"
              >
                <Upload className="w-5 h-5 text-stone-600" />
                <span className="text-xs font-bold leading-tight">Upload</span>
              </button>

              {/* Tile 3: Invoice */}
              <button
                onClick={() => navigate('/finance')}
                className="p-3.5 rounded-xl bg-[#F8F8FA] hover:bg-stone-100 border border-[#EEEEF2] text-stone-800 font-semibold flex flex-col justify-between h-24 transition-colors cursor-pointer text-left"
              >
                <Receipt className="w-5 h-5 text-stone-600" />
                <span className="text-xs font-bold leading-tight">Invoice</span>
              </button>

              {/* Tile 4: More */}
              <button
                onClick={() => navigate('/projects')}
                className="p-3.5 rounded-xl bg-[#F8F8FA] hover:bg-stone-100 border border-[#EEEEF2] text-stone-800 font-semibold flex flex-col justify-between h-24 transition-colors cursor-pointer text-left"
              >
                <MoreHorizontal className="w-5 h-5 text-stone-600" />
                <span className="text-xs font-bold leading-tight">More</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
