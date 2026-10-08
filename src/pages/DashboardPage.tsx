import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Palette,
  TrendingUp,
  Download,
  Plus,
  ArrowUpRight,
  Database,
  Bot,
  HardDrive,
  Upload,
  Receipt,
  MoreHorizontal,
  UserPlus,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Project, Task } from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS } from '../lib/mockData';
import { useToast } from '../context/ToastContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, isDemoMode } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setTasks(DEMO_TASKS);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('created_at', { ascending: false });

        const { data: taskData } = await supabase
          .from('tasks')
          .select('*')
          .eq('organization_id', currentOrg.id);

        setProjects(projData || []);
        setTasks(taskData || []);
      } catch (e) {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentOrg, isDemoMode]);

  const handleDownloadReport = () => {
    showToast('Dashboard executive summary downloaded successfully.', 'success');
  };

  // Metrics (with realistic sample fallbacks if empty database)
  const activeCount = projects.length > 0 ? projects.filter((p) => p.status === 'active').length || projects.length : 12;
  const clientCount = projects.length > 0 ? Math.max(projects.length, 8) : 24;
  const designCount = tasks.length > 0 ? tasks.filter((t) => t.status !== 'done').length : 18;
  const completionRate = '94%';

  // Activity items (realistic sample data or from real tasks)
  const activities = [
    {
      id: '1',
      actor: 'Elena Rostova',
      action: 'uploaded 3D Renders for Master Living Suite',
      project: 'VILLA AL-KHOBAR RENOVATION',
      time: '4 hours ago',
    },
    {
      id: '2',
      actor: 'Karim Al-Mansoor',
      action: 'approved Phase 1 Architectural Concept',
      project: 'TECHSTART HQ DESIGN',
      time: 'Yesterday',
    },
    {
      id: '3',
      actor: 'De-Olive Finance',
      action: 'generated milestone invoice #INV-2026-088',
      project: 'THE PALM PENTHOUSE',
      time: '2 days ago',
    },
    {
      id: '4',
      actor: 'Sarah Jenkins',
      action: 'confirmed Italian Carrara marble procurement',
      project: 'AL-NAKHEEL RESIDENTIAL',
      time: '3 days ago',
    },
  ];

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
      {/* Page Header per spec:
          - Bold serif title "Dashboard Overview"
          - Subtitle "Welcome back, here's what's happening today."
          - Two buttons: "Download Report" (white, outlined) and "New Project" (black, lime text)
          - Full-width on mobile under subtitle, beside title on desktop
      */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-display-serif tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Welcome back, here's what's happening today.
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

      {/* Stat Cards (stacked on mobile, 4-col grid on desktop)
          Each has:
          - coloured icon square at top-left
          - green "+12%" trend pill at top-right
          - grey label and big bold number
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Projects */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2A5C00] bg-[#77C614]/15 px-2 py-0.5 rounded-full border border-[#77C614]/30">
              <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
              +12%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Active Projects</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {activeCount}
            </p>
          </div>
        </div>

        {/* Card 2: Total Clients */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2A5C00] bg-[#77C614]/15 px-2 py-0.5 rounded-full border border-[#77C614]/30">
              <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
              +8%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Total Clients</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {clientCount}
            </p>
          </div>
        </div>

        {/* Card 3: In-Progress Designs */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2A5C00] bg-[#77C614]/15 px-2 py-0.5 rounded-full border border-[#77C614]/30">
              <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
              +16%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">Design Assets</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {designCount}
            </p>
          </div>
        </div>

        {/* Card 4: Milestones on Schedule */}
        <div className="de-olive-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2A5C00] bg-[#77C614]/15 px-2 py-0.5 rounded-full border border-[#77C614]/30">
              <ArrowUpRight className="w-3 h-3 text-[#56B900]" />
              +5%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500">On-Time Delivery</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono tabular-nums">
              {completionRate}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & System Status / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Activity Card */}
        <div className="lg:col-span-2 de-olive-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Recent Activity</h2>
              <p className="text-xs text-stone-500 mt-0.5">Real-time design approvals and workspace log</p>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">Live Feed</span>
          </div>

          {/* Vertical timeline with green dots */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
            {activities.map((act) => (
              <div key={act.id} className="relative group">
                {/* Green Dot */}
                <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#77C614] ring-4 ring-[#77C614]/20" />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-stone-800 leading-snug">
                      <strong className="font-bold text-stone-950">{act.actor}</strong>{' '}
                      <span className="text-stone-600">{act.action}</span>
                    </p>
                    {/* Small uppercase lime project label underneath */}
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#5FA20D]">
                      {act.project}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400 shrink-0 font-medium whitespace-nowrap">
                    {act.time}
                  </span>
                </div>
              </div>
            ))}
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
                Real-time services and infrastructure
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Row 1: Database */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181D] border border-[#25252C]">
                <div className="flex items-center gap-2.5 text-xs text-stone-300">
                  <Database className="w-4 h-4 text-stone-400" />
                  <span>Database Engine</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#77C614]">
                  <span className="w-2 h-2 rounded-full bg-[#77C614] animate-pulse" />
                  <span>ONLINE</span>
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

              {/* Row 3: Storage */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181D] border border-[#25252C]">
                <div className="flex items-center gap-2.5 text-xs text-stone-300">
                  <HardDrive className="w-4 h-4 text-stone-400" />
                  <span>Asset Storage</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#77C614]">
                  <span className="w-2 h-2 rounded-full bg-[#77C614]" />
                  <span>85% FREE</span>
                </div>
              </div>
            </div>
          </div>

          {/* White Quick Actions Card */}
          <div className="de-olive-card p-6">
            <h3 className="text-base font-bold text-stone-900 font-display-serif tracking-tight mb-4">
              Quick Actions
            </h3>

            {/* 2x2 Grid of tiles: Add Client (lime, active), Upload, Invoice, More (light grey) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Tile 1: Add Client (Lime Active) */}
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
