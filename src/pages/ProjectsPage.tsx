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
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Project, ProjectStatus, Task } from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS } from '../lib/mockData';
import { ConfirmModal } from '../components/modals/ConfirmModal';

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: 'Planning', value: 'planning' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, user, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Safety Confirmation Modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageProjects = currentMemberRole === 'owner' || currentMemberRole === 'admin';

  const fetchProjects = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      setProjects(DEMO_PROJECTS);
      setTasks(DEMO_TASKS);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (projErr) {
        reportRLSError('projects', 'SELECT', projErr);
        setErrorMessage(projErr.message);
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load projects.');
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

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    const targetId = projectToDelete.id;
    const targetName = projectToDelete.name;

    if (isDemoMode) {
      setProjects((prev) => prev.filter((p) => p.id !== targetId));
      toast.success(`Project "${targetName}" deleted.`);
      setIsDeleting(false);
      setProjectToDelete(null);
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', targetId);
      if (error) {
        reportRLSError('projects', 'DELETE', error);
        toast.error(error.message || 'Failed to delete project.');
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== targetId));
        toast.success(`Project "${targetName}" deleted successfully.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred while deleting project.');
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Project name is required.');
      return;
    }

    // Sensible date validation
    if (formStartDate && formDueDate && formDueDate < formStartDate) {
      setFormError('Due date cannot be earlier than the project start date.');
      return;
    }

    if (!currentOrg) {
      setFormError('No active organization selected.');
      return;
    }

    setSubmitting(true);

    const projectPayload = {
      organization_id: currentOrg.id,
      name: trimmedName,
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
        toast.success(`Project "${trimmedName}" updated.`);
      } else {
        const newProj: Project = {
          ...projectPayload,
          id: `proj-${Date.now()}`,
          created_by: user?.id || 'demo-user-id',
          created_at: new Date().toISOString(),
        };
        setProjects((prev) => [newProj, ...prev]);
        toast.success(`Project "${trimmedName}" created.`);
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
          toast.success(`Project "${trimmedName}" updated successfully.`);
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
          toast.success(`Project "${trimmedName}" created successfully.`);
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
            Projects
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Organize milestones, coordinate delivery teams, and track milestones.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg text-xs font-semibold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Error state banner */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchProjects}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-stone-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-700 font-medium focus:outline-none focus:ring-1 focus:ring-brand-primary transition-colors cursor-pointer"
          >
            <option value="all">All Statuses ({projects.length})</option>
            {STATUS_OPTIONS.map((st) => {
              const count = projects.filter((p) => p.status === st.value).length;
              return (
                <option key={st.value} value={st.value}>
                  {st.label} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Project Cards Grid / Loading / Empty States */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-stone-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
          <span className="text-xs font-medium">Loading workspace projects...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white border border-stone-200 rounded-xl shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-brand-accent-light text-brand-primary flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-6 h-6 text-brand-primary" />
          </div>
          <h3 className="text-sm font-semibold text-stone-800">
            {searchQuery || filterStatus !== 'all' ? 'No projects match your filter' : 'No projects created yet'}
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery || filterStatus !== 'all'
              ? 'Try modifying your search keywords or switching back to all statuses.'
              : 'Create your first project to organize task boards, track milestones, and assign work.'}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            {searchQuery || filterStatus !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-black rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Create First Project
              </button>
            )}
          </div>
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
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {canManageProjects && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                          }}
                          title="Delete Project"
                          className="p-1 text-stone-400 hover:text-red-600 hover:bg-stone-100 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
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
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
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

      {/* Safety Confirmation Modal for Deleting Projects */}
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? All associated tasks will be removed.`}
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
