import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  Users,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Project, Task, Profile } from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS } from '../lib/mockData';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, isDemoMode, reportRLSError } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setTasks(DEMO_TASKS);
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch projects
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('created_at', { ascending: false });

        if (projErr) {
          reportRLSError('projects', 'SELECT', projErr);
        } else {
          setProjects(projData || []);
        }

        // 2. Fetch tasks
        const { data: taskData, error: taskErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('created_at', { ascending: false });

        if (taskErr) {
          reportRLSError('tasks', 'SELECT', taskErr);
        } else {
          setTasks(taskData || []);
        }

        // 3. Fetch profiles for assignees
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*');

        if (profErr) {
          reportRLSError('profiles', 'SELECT', profErr);
        } else if (profData) {
          const map: Record<string, Profile> = {};
          profData.forEach((p) => {
            map[p.id] = p;
          });
          setProfilesMap(map);
        }
      } catch (err: any) {
        // Handled via fallback state
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentOrg, isDemoMode, reportRLSError]);

  // Metrics
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        <span className="text-xs">Loading workspace metrics...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Kicker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-sans">
            Executive Project Overview
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time delivery progress across {currentOrg?.name || 'Workspace'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/projects')}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 transition-colors shadow-2xs cursor-pointer"
          >
            View All Projects
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-brand-black transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open Kanban Board</span>
          </button>
        </div>
      </div>

      {/* Structured Stats Grid (Anti-slop zero pills, single level elevation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Total Projects</span>
            <FolderKanban className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {projects.length}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="text-brand-primary-dark font-semibold">{activeProjects} active</span>
            <span aria-hidden="true">·</span>
            <span>{completedProjects} completed</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Active Tasks</span>
            <Layers className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {tasks.length}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1.5">
            <span className="text-amber-700 font-medium">{inProgressTasks} in progress</span>
            <span aria-hidden="true">·</span>
            <span>{doneTasks} done</span>
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Urgent Attention</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {highPriorityTasks}
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            High priority incomplete tasks
          </div>
        </div>

        <div className="p-5 bg-white border border-stone-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Team Footprint</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {currentOrg?.team_size || '1-5'}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 truncate">
            Industry: {currentOrg?.industry || 'Technology'}
          </div>
        </div>
      </div>

      {/* Projects & Tasks Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects (2 columns) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Key Projects</h2>
              <p className="text-xs text-stone-500">Milestones and execution status</p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-brand-primary-dark hover:text-stone-900 font-semibold flex items-center gap-1"
            >
              <span>Manage all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">
              <FolderKanban className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="font-medium text-stone-700">No projects created yet</p>
              <p className="mt-1 text-stone-400">Get started by creating your team's first project.</p>
              <button
                onClick={() => navigate('/projects')}
                className="mt-4 px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg font-bold transition-colors shadow-2xs"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {projects.slice(0, 5).map((project) => {
                const projectTasks = tasks.filter((t) => t.project_id === project.id);
                const projectDone = projectTasks.filter((t) => t.status === 'done').length;
                const progressPct =
                  projectTasks.length > 0
                    ? Math.round((projectDone / projectTasks.length) * 100)
                    : 0;

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/tasks?project=${project.id}`)}
                    className="p-4 hover:bg-stone-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-stone-900 truncate">
                          {project.name}
                        </h3>
                        {/* Status as clean unboxed text with separator */}
                        <span className="text-[11px] text-stone-400 capitalize">
                          · {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-xs">
                      {/* Due date */}
                      {project.due_date && (
                        <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-mono tabular-nums">{project.due_date}</span>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono tabular-nums">
                          <span>{projectDone}/{projectTasks.length} tasks</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-primary rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority Focus & Tasks Due (1 column) */}
        <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Priority Queue</h2>
              <p className="text-xs text-stone-500">Tasks requiring immediate focus</p>
            </div>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs text-brand-primary-dark hover:text-stone-900 font-semibold"
            >
              Board &rarr;
            </button>
          </div>

          <div className="p-4 flex-1 space-y-3">
            {tasks
              .filter((t) => t.status !== 'done')
              .slice(0, 5)
              .map((task) => {
                const assignee = task.assignee_id ? profilesMap[task.assignee_id] : null;

                return (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-lg border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-medium text-stone-900 line-clamp-1">
                        {task.title}
                      </h4>
                      <span className={`text-[10px] font-mono capitalize shrink-0 font-medium ${
                        task.priority === 'high' 
                          ? 'text-red-700' 
                          : task.priority === 'medium' 
                          ? 'text-amber-700' 
                          : 'text-stone-500'
                      }`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="truncate">
                        {assignee ? assignee.full_name : 'Unassigned'}
                      </span>
                      {task.due_date && (
                        <span className="font-mono tabular-nums text-stone-400">
                          {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {tasks.filter((t) => t.status !== 'done').length === 0 && (
              <div className="py-8 text-center text-xs text-stone-400">
                <CheckCircle2 className="w-6 h-6 text-brand-primary mx-auto mb-1.5" />
                <span>All caught up! No active pending tasks.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
