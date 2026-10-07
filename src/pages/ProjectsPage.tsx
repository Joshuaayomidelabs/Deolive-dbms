import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowRight,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Project, ProjectStatus, Task } from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS } from '../lib/mockData';

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, user, isDemoMode, reportRLSError } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('planning');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setTasks(DEMO_TASKS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
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

      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', currentOrg.id);

      if (taskErr) {
        reportRLSError('tasks', 'SELECT', taskErr);
      } else {
        setTasks(taskData || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentOrg, isDemoMode]);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormDescription('');
    setFormStatus('planning');
    setFormStartDate('');
    setFormDueDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormStatus(project.status);
    setFormStartDate(project.start_date || '');
    setFormDueDate(project.due_date || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? Associated tasks will be affected.')) {
      return;
    }

    if (isDemoMode) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) {
        reportRLSError('projects', 'DELETE', error);
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Project name is required.');
      return;
    }
    if (!currentOrg) {
      setFormError('No active organization selected.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const projectPayload = {
      organization_id: currentOrg.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      status: formStatus,
      start_date: formStartDate || null,
      due_date: formDueDate || null,
    };

    if (isDemoMode) {
      if (editingProject) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id ? { ...p, ...projectPayload } : p
          )
        );
      } else {
        const newProj: Project = {
          ...projectPayload,
          id: `proj-${Date.now()}`,
          created_by: user?.id || 'demo-user-id',
          created_at: new Date().toISOString(),
        };
        setProjects((prev) => [newProj, ...prev]);
      }
      setSubmitting(false);
      setIsModalOpen(false);
      return;
    }

    try {
      if (editingProject) {
        const { data, error } = await supabase
          .from('projects')
          .update(projectPayload)
          .eq('id', editingProject.id)
          .select()
          .single();

        if (error) {
          reportRLSError('projects', 'UPDATE', error);
          setFormError(error.message);
        } else {
          setProjects((prev) =>
            prev.map((p) => (p.id === editingProject.id ? data : p))
          );
          setIsModalOpen(false);
        }
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            ...projectPayload,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) {
          reportRLSError('projects', 'INSERT', error);
          setFormError(error.message);
        } else {
          setProjects((prev) => [data, ...prev]);
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 font-sans">
            Projects Portfolio
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage scopes, schedules, and deliverables for {currentOrg?.name}.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-brand-black text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
        {/* Interactive Filter Tabs (functional segmented control) */}
        <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg w-full sm:w-auto overflow-x-auto">
          {['all', 'planning', 'active', 'on_hold', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap capitalize ${
                filterStatus === st
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 focus:bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-colors"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          <span className="text-xs">Loading projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 shadow-2xs">
          <FolderKanban className="w-10 h-10 text-stone-300 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-stone-800">No projects found</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : 'Create your first project to organize tasks, assignees, and deadlines.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
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
                className="group p-5 bg-white border border-stone-200 rounded-xl hover:border-brand-primary/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-stone-900 group-hover:text-stone-950 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditModal(project, e)}
                        title="Edit Project"
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        title="Delete Project"
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Clean unboxed metadata with separator */}
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                    <span className="capitalize">{project.status.replace('_', ' ')}</span>
                    {project.due_date && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Due {project.due_date}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2 mb-4 leading-relaxed">
                    {project.description || 'No detailed scope description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono tabular-nums">
                    <span>{projectDone} / {projectTasks.length} tasks completed</span>
                    <span>{progressPct}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-end text-[11px] text-brand-primary-dark font-semibold group-hover:underline">
                    <span>View Task Board &rarr;</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Infrastructure Modernization"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Description / Deliverables
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Overview of project objectives, scope, and technical context..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors capitalize text-xs"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-colors font-mono text-xs"
                  />
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
                  disabled={submitting || !formName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg font-bold transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50 text-xs cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-black" />}
                  <span>{editingProject ? 'Save Changes' : 'Create Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
