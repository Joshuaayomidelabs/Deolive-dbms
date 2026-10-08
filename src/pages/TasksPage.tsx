import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Kanban,
  Table as TableIcon,
  Plus,
  Search,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  Clock,
  Circle,
  MoreVertical,
  Trash2,
  Edit2,
  ArrowRight,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Task, TaskStatus, TaskPriority, Project, Profile } from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS, DEMO_TEAM_MEMBERS } from '../lib/mockData';
import { ConfirmModal } from '../components/modals/ConfirmModal';

const STATUS_COLUMNS: { id: TaskStatus; title: string; countColor: string }[] = [
  { id: 'todo', title: 'To Do', countColor: 'text-stone-500' },
  { id: 'in_progress', title: 'In Progress', countColor: 'text-amber-700' },
  { id: 'done', title: 'Done', countColor: 'text-brand-primary-dark font-bold' },
];

const PRIORITIES: { label: string; value: TaskPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export const TasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project') || 'all';

  const { currentOrg, user, isDemoMode, reportRLSError } = useAuth();
  const toast = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [teamMembers, setTeamMembers] = useState<{ id: string; user_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileColumnTab, setMobileColumnTab] = useState<TaskStatus>('todo');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formAssigneeId, setFormAssigneeId] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Safety Confirm Modal State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkspaceData = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setTasks(DEMO_TASKS);
      const map: Record<string, Profile> = {};
      DEMO_TEAM_MEMBERS.forEach((m) => {
        map[m.user_id] = m.profile;
      });
      setProfilesMap(map);
      setTeamMembers(
        DEMO_TEAM_MEMBERS.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          full_name: m.profile.full_name || 'Member',
        }))
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch projects for dropdown and matching
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (projErr) reportRLSError('projects', 'SELECT', projErr);
      setProjects(projData || []);

      // 2. Fetch tasks
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (taskErr) reportRLSError('tasks', 'SELECT', taskErr);
      setTasks(taskData || []);

      // 3. Fetch org members and profiles (for assignee dropdown)
      const { data: memberData, error: memErr } = await supabase
        .from('organization_members')
        .select('id, user_id, role')
        .eq('organization_id', currentOrg.id);

      if (memErr) reportRLSError('organization_members', 'SELECT', memErr);

      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*');

      if (profErr) reportRLSError('profiles', 'SELECT', profErr);

      if (profData) {
        const pMap: Record<string, Profile> = {};
        profData.forEach((p) => {
          pMap[p.id] = p;
        });
        setProfilesMap(pMap);

        if (memberData) {
          const membersList = memberData.map((m) => ({
            id: m.id,
            user_id: m.user_id,
            full_name: pMap[m.user_id]?.full_name || 'Team Member',
          }));
          setTeamMembers(membersList);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching tasks data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [currentOrg, isDemoMode]);

  // Keep search param synced
  useEffect(() => {
    const qProject = searchParams.get('project');
    if (qProject) {
      setSelectedProjectId(qProject);
    }
  }, [searchParams]);

  const handleProjectSelect = (pId: string) => {
    setSelectedProjectId(pId);
    if (pId === 'all') {
      searchParams.delete('project');
    } else {
      searchParams.set('project', pId);
    }
    setSearchParams(searchParams);
  };

  const handleOpenCreateModal = (defaultStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormProjectId(
      selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || ''
    );
    setFormStatus(defaultStatus);
    setFormPriority('medium');
    setFormAssigneeId(user?.id || '');
    setFormDueDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormProjectId(task.project_id);
    setFormStatus(task.status);
    setFormPriority(task.priority);
    setFormAssigneeId(task.assignee_id || '');
    setFormDueDate(task.due_date || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (task: Task, newStatus: TaskStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}.`);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id)
        .select()
        .single();

      if (error) {
        reportRLSError('tasks', 'UPDATE', error);
        toast.error(error.message || 'Failed to update task status.');
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        );
        toast.success(`Task moved to ${newStatus.replace('_', ' ')}.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task status.');
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);

    const targetId = taskToDelete.id;
    const targetTitle = taskToDelete.title;

    if (isDemoMode) {
      setTasks((prev) => prev.filter((t) => t.id !== targetId));
      toast.success(`Task "${targetTitle}" deleted.`);
      setIsDeleting(false);
      setTaskToDelete(null);
      return;
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', targetId);
      if (error) {
        reportRLSError('tasks', 'DELETE', error);
        toast.error(error.message || 'Failed to delete task.');
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== targetId));
        toast.success(`Task "${targetTitle}" deleted successfully.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while deleting task.');
    } finally {
      setIsDeleting(false);
      setTaskToDelete(null);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Task title is required.');
      return;
    }
    if (!formProjectId) {
      setFormError('Please select a project for this task.');
      return;
    }
    if (!currentOrg) {
      setFormError('No active organization.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const taskPayload = {
      organization_id: currentOrg.id,
      project_id: formProjectId,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      status: formStatus,
      priority: formPriority,
      assignee_id: formAssigneeId || null,
      due_date: formDueDate || null,
    };

    if (isDemoMode) {
      if (editingTask) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id ? { ...t, ...taskPayload } : t
          )
        );
        toast.success(`Task "${formTitle.trim()}" updated.`);
      } else {
        const newTask: Task = {
          ...taskPayload,
          id: `task-${Date.now()}`,
          created_by: user?.id || 'demo-user-id',
          created_at: new Date().toISOString(),
        };
        setTasks((prev) => [newTask, ...prev]);
        toast.success(`Task "${formTitle.trim()}" created.`);
      }
      setSubmitting(false);
      setIsModalOpen(false);
      return;
    }

    try {
      if (editingTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update(taskPayload)
          .eq('id', editingTask.id)
          .select()
          .single();

        if (error) {
          reportRLSError('tasks', 'UPDATE', error);
          setFormError(error.message);
        } else {
          setTasks((prev) =>
            prev.map((t) => (t.id === editingTask.id ? data : t))
          );
          toast.success(`Task "${formTitle.trim()}" updated successfully.`);
          setIsModalOpen(false);
        }
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...taskPayload,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) {
          reportRLSError('tasks', 'INSERT', error);
          setFormError(error.message);
        } else {
          setTasks((prev) => [data, ...prev]);
          toast.success(`Task "${formTitle.trim()}" created successfully.`);
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesProject =
      selectedProjectId === 'all' || t.project_id === selectedProjectId;
    const matchesPriority =
      priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProject && matchesPriority && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Tasks & Deliverables
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Plan, monitor sprint execution, and track task delivery for {currentOrg?.name || 'Workspace'}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-stone-200/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal('todo')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Project Selection Controls */}
      <div className="de-olive-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Project selector */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium shrink-0">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary cursor-pointer text-xs"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium shrink-0">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary capitalize cursor-pointer text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>
      </div>

      {/* Mobile Kanban Tab Selector (visible on small screens) */}
      {viewMode === 'kanban' && (
        <div className="md:hidden flex rounded-lg bg-stone-200/80 p-1 text-xs font-medium">
          {STATUS_COLUMNS.map((col) => {
            const count = filteredTasks.filter((t) => t.status === col.id).length;
            const active = mobileColumnTab === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setMobileColumnTab(col.id)}
                className={`flex-1 py-1.5 text-center rounded-md transition-colors ${
                  active
                    ? 'bg-white text-stone-900 font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>{col.title}</span>{' '}
                <span className="text-[10px] font-mono text-stone-400">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Task View */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          <span className="text-xs">Loading task board...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 shadow-2xs">
          <Kanban className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-stone-800">No project available</h3>
          <p className="text-xs text-stone-500 mt-1">
            Tasks must be linked to a project. Please create a project first.
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATUS_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            const isHiddenOnMobile = mobileColumnTab !== col.id;

            return (
              <div
                key={col.id}
                className={`bg-stone-50/70 border border-stone-200 rounded-xl p-4 flex flex-col min-h-[460px] ${
                  isHiddenOnMobile ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-stone-800 tracking-tight">
                      {col.title}
                    </h3>
                    <span className={`text-xs font-mono font-semibold tabular-nums ${col.countColor}`}>
                      ({columnTasks.length})
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenCreateModal(col.id)}
                    title={`Add task to ${col.title}`}
                    className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Tasks List */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {columnTasks.map((task) => {
                    const assignee = task.assignee_id ? profilesMap[task.assignee_id] : null;
                    const taskProject = projects.find((p) => p.id === task.project_id);

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleOpenEditModal(task)}
                        className="p-3.5 bg-white border border-stone-200 rounded-lg hover:border-brand-primary/50 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        {/* Project name indicator & priority */}
                        <div className="flex items-center justify-between gap-2 text-[10px] text-stone-400">
                          <span className="font-medium text-stone-600 truncate max-w-[140px]">
                            {taskProject?.name || 'Project'}
                          </span>
                          <span
                            className={`font-mono capitalize font-semibold ${
                              task.priority === 'high'
                                ? 'text-red-700'
                                : task.priority === 'medium'
                                ? 'text-amber-700'
                                : 'text-stone-500'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-stone-900 group-hover:text-stone-950 transition-colors leading-snug">
                          {task.title}
                        </h4>

                        {/* Description snippet */}
                        {task.description && (
                          <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Footer: Assignee, Due date & Actions */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                          <div className="flex items-center gap-1.5 truncate">
                            {assignee?.avatar_url ? (
                              <img
                                src={assignee.avatar_url}
                                alt={assignee.full_name || ''}
                                className="w-4 h-4 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-stone-200 text-stone-700 text-[9px] font-bold flex items-center justify-center shrink-0">
                                {assignee?.full_name ? assignee.full_name[0] : 'U'}
                              </div>
                            )}
                            <span className="truncate max-w-[90px]">
                              {assignee?.full_name || 'Unassigned'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.due_date && (
                              <span className="font-mono tabular-nums text-[10px] text-stone-400">
                                {task.due_date}
                              </span>
                            )}

                            {/* Quick status transition buttons */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.id !== 'todo' && (
                                <button
                                  onClick={(e) => handleUpdateStatus(task, 'todo', e)}
                                  title="Move to To Do"
                                  className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 text-[10px] cursor-pointer"
                                >
                                  &larr;
                                </button>
                              )}
                              {col.id !== 'in_progress' && (
                                <button
                                  onClick={(e) => handleUpdateStatus(task, 'in_progress', e)}
                                  title="Move to In Progress"
                                  className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-amber-700 text-[10px] cursor-pointer"
                                >
                                  {col.id === 'todo' ? '&rarr;' : '&larr;'}
                                </button>
                              )}
                              {col.id !== 'done' && (
                                <button
                                  onClick={(e) => handleUpdateStatus(task, 'done', e)}
                                  title="Mark Done"
                                  className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-brand-primary-dark text-[10px] cursor-pointer"
                                >
                                  &check;
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task);
                                }}
                                title="Delete Task"
                                className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="h-32 border border-dashed border-stone-200 rounded-lg flex flex-col items-center justify-center text-[11px] text-stone-400 gap-1">
                      <span>No tasks in {col.title}</span>
                      <button
                        onClick={() => handleOpenCreateModal(col.id)}
                        className="text-brand-primary-dark hover:underline font-semibold cursor-pointer"
                      >
                        + Add task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-stone-500 font-medium">
                  <th className="py-2.5 px-4">Task Title</th>
                  <th className="py-2.5 px-4">Project</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Assignee</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredTasks.map((task) => {
                  const assignee = task.assignee_id ? profilesMap[task.assignee_id] : null;
                  const taskProj = projects.find((p) => p.id === task.project_id);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => handleOpenEditModal(task)}
                      className="hover:bg-stone-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-medium text-stone-900 max-w-xs truncate">
                        {task.title}
                      </td>
                      <td className="py-2.5 px-4 text-stone-500 truncate">
                        {taskProj?.name || 'Project'}
                      </td>
                      <td className="py-2.5 px-4 capitalize">
                        <span className={`font-medium ${
                          task.status === 'done' ? 'text-brand-primary-dark font-semibold' : task.status === 'in_progress' ? 'text-amber-700' : 'text-stone-500'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 capitalize font-mono text-[11px]">
                        <span className={`font-semibold ${
                          task.priority === 'high' ? 'text-red-700' : task.priority === 'medium' ? 'text-amber-700' : 'text-stone-500'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-stone-600">
                        {assignee ? assignee.full_name : 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-stone-500">
                        {task.due_date || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(task)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTaskToDelete(task)}
                            className="p-1 text-stone-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No tasks found matching your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Creation / Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Audit connection pooling limits"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors text-xs cursor-pointer"
                >
                  <option value="" disabled>Select target project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Description / Execution Notes
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide technical specifics, instructions, or acceptance criteria..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors capitalize text-xs cursor-pointer"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors capitalize text-xs cursor-pointer"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Assignee (Team Member)
                  </label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors text-xs cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg font-bold transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-black" />}
                  <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Deleting Tasks */}
      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
