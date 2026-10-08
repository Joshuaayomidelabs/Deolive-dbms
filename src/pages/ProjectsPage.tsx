import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
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
  Kanban,
  Table as TableIcon,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Project, ProjectStatus, Task, Client } from '../types/database';
import { DEMO_PROJECTS, DEMO_TASKS } from '../lib/mockData';
import { ConfirmModal } from '../components/modals/ConfirmModal';

const STATUS_MAPPINGS: Record<string, { label: string; badgeClass: string }> = {
  planning: { label: 'Concept', badgeClass: 'badge-concept' },
  active: { label: 'Execution', badgeClass: 'badge-execution' },
  on_hold: { label: 'Design', badgeClass: 'badge-design' },
  completed: { label: 'Completed', badgeClass: 'badge-completed' },
};

const SAMPLE_CLIENT_NAMES = [
  'Sheikh Saud Estate',
  'Al-Areen Resort',
  'TechStart Regional HQ',
  'Villa Al-Nakheel Oasis',
  'Olea Artisan Dining',
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, user, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('active');
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

      // Fetch clients for dropdown assignment
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name', { ascending: true });

      if (clientData) {
        setClients(clientData);
      }
    } catch (err: any) {
      // Fallback
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
    setFormClientId('');
    setFormStatus('active');
    setFormDueDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormName(proj.name);
    setFormDescription(proj.description || '');
    const savedClientId = proj.client_id || localStorage.getItem(`deolive_project_client_${proj.id}`) || '';
    setFormClientId(savedClientId);
    setFormStatus(proj.status);
    setFormDueDate(proj.due_date ? proj.due_date.slice(0, 10) : '');
    setFormError(null);
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Project title is required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingProject) {
        if (isDemoMode) {
          const updated = projects.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  name: formName.trim(),
                  description: formDescription.trim(),
                  status: formStatus,
                  due_date: formDueDate || null,
                  client_id: formClientId || null,
                }
              : p
          );
          setProjects(updated);
          if (formClientId) {
            localStorage.setItem(`deolive_project_client_${editingProject.id}`, formClientId);
          }
          showToast(`Project "${formName}" updated successfully.`, 'success');
          setIsModalOpen(false);
          return;
        }

        const updatePayload: any = {
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
          due_date: formDueDate || null,
          client_id: formClientId && !formClientId.startsWith('sample-') ? formClientId : null,
        };

        let { data, error } = await supabase
          .from('projects')
          .update(updatePayload)
          .eq('id', editingProject.id)
          .select()
          .single();

        // If client_id column does not exist on existing projects table in Supabase, retry cleanly without it
        if (error && error.message?.includes('client_id')) {
          delete updatePayload.client_id;
          const retry = await supabase
            .from('projects')
            .update(updatePayload)
            .eq('id', editingProject.id)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          reportRLSError('projects', 'UPDATE', error);
          setFormError(error.message);
        } else {
          if (formClientId) {
            localStorage.setItem(`deolive_project_client_${editingProject.id}`, formClientId);
          } else {
            localStorage.removeItem(`deolive_project_client_${editingProject.id}`);
          }
          setProjects(projects.map((p) => (p.id === editingProject.id ? { ...data, client_id: formClientId || null } : p)));
          showToast(`Project "${data.name}" updated.`, 'success');
          setIsModalOpen(false);
        }
      } else {
        if (!currentOrg) return;

        if (isDemoMode) {
          const newProjectId = `proj-${Date.now()}`;
          const newProject: Project = {
            id: newProjectId,
            organization_id: currentOrg.id,
            name: formName.trim(),
            description: formDescription.trim(),
            status: formStatus,
            start_date: new Date().toISOString().split('T')[0],
            due_date: formDueDate || null,
            client_id: formClientId || null,
            created_by: user?.id || 'demo-user',
            created_at: new Date().toISOString(),
          };
          if (formClientId) {
            localStorage.setItem(`deolive_project_client_${newProjectId}`, formClientId);
          }
          setProjects([newProject, ...projects]);
          showToast(`Project "${formName}" created.`, 'success');
          setIsModalOpen(false);
          return;
        }

        const insertPayload: any = {
          organization_id: currentOrg.id,
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
          due_date: formDueDate || null,
          created_by: user?.id,
        };
        if (formClientId && !formClientId.startsWith('sample-')) {
          insertPayload.client_id = formClientId;
        }

        let { data, error } = await supabase
          .from('projects')
          .insert(insertPayload)
          .select()
          .single();

        // If client_id column does not exist on existing projects table in Supabase, retry cleanly without it
        if (error && error.message?.includes('client_id')) {
          delete insertPayload.client_id;
          const retry = await supabase
            .from('projects')
            .insert(insertPayload)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          reportRLSError('projects', 'INSERT', error);
          setFormError(error.message);
        } else {
          if (formClientId) {
            localStorage.setItem(`deolive_project_client_${data.id}`, formClientId);
          }
          setProjects([{ ...data, client_id: formClientId || data.client_id }, ...projects]);
          showToast(`Project "${data.name}" created successfully.`, 'success');
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    try {
      if (isDemoMode) {
        setProjects(projects.filter((p) => p.id !== projectToDelete.id));
        showToast(`Project "${projectToDelete.name}" deleted.`, 'info');
        setProjectToDelete(null);
        return;
      }

      const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);
      if (error) {
        reportRLSError('projects', 'DELETE', error);
        showToast(error.message, 'error');
      } else {
        setProjects(projects.filter((p) => p.id !== projectToDelete.id));
        showToast(`Project "${projectToDelete.name}" deleted.`, 'info');
        setProjectToDelete(null);
      }
    } catch (err: any) {
      showToast('Failed to delete project.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getProjectProgress = (projId: string, idx: number) => {
    const projTasks = tasks.filter((t) => t.project_id === projId);
    if (projTasks.length === 0) {
      return (idx * 23 + 45) % 100; // realistic preview percentage
    }
    const completed = projTasks.filter((t) => t.status === 'done').length;
    return Math.round((completed / projTasks.length) * 100);
  };

  const getClientForProject = (proj: Project, idx: number) => {
    const savedClientId = proj.client_id || localStorage.getItem(`deolive_project_client_${proj.id}`);
    if (savedClientId) {
      if (savedClientId.startsWith('sample-')) {
        return savedClientId.replace('sample-', '');
      }
      const matched = clients.find((c) => c.id === savedClientId);
      if (matched) return matched.name;
    }

    if (isDemoMode) {
      return SAMPLE_CLIENT_NAMES[idx % SAMPLE_CLIENT_NAMES.length];
    }

    return '—';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Page Header per spec:
          - Title: "Project Management"
          - Subtitle: "Track all projects from concept to completion."
          - Black "+ New Project" button (full width on mobile under subtitle, beside title on desktop)
      */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Project Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track all projects from concept to completion.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex bg-stone-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-black shadow-xs' : 'text-stone-600 hover:text-black'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-stone-600 hover:text-black cursor-pointer"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="de-olive-card p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name or client..."
              className="w-full bg-[#F8F8FA] border border-[#EEEEF2] rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#77C614] focus:bg-white transition-colors"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <span>Filters {filterStatus !== 'all' ? `(${filterStatus})` : ''}</span>
            </button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-stone-400">
                  Filter Status
                </div>
                {['all', 'planning', 'active', 'on_hold', 'completed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setFilterStatus(st);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left capitalize hover:bg-stone-50 transition-colors ${
                      filterStatus === st ? 'text-[#3F6F05] font-bold bg-[#77C614]/10' : 'text-stone-700'
                    }`}
                  >
                    {st === 'all' ? 'All Projects' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table Card per spec:
          Columns: PROJECT NAME (+ ID), CLIENT, STATUS (badge), PROGRESS (thin lime progress bar + percent), DEADLINE (small calendar icon + date), ACTIONS (three-dot menu)
          Header: small uppercase grey text on light grey row
          Horizontally scrollable on mobile
      */}
      <div className="de-olive-card overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#77C614]" />
            <span className="text-xs">Loading projects...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F4F4F6] border-b border-[#EEEEF2]">
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    PROJECT NAME
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    CLIENT
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    STATUS
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    PROGRESS
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5">
                    DEADLINE
                  </th>
                  <th className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase px-6 py-3.5 text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEF2] text-xs">
                {filteredProjects.map((project, idx) => {
                  const statusInfo = STATUS_MAPPINGS[project.status] || {
                    label: project.status,
                    badgeClass: 'badge-concept',
                  };
                  const progress = getProjectProgress(project.id, idx);
                  const clientName = getClientForProject(project, idx);
                  const projectIdCode = `#${String(idx + 1).padStart(4, '0')}`;
                  const deadlineStr = project.due_date
                    ? new Date(project.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Flexible';

                  return (
                    <tr key={project.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* PROJECT NAME (+ ID) */}
                      <td className="px-6 py-4">
                        <div>
                          <p
                            onClick={() => navigate('/tasks')}
                            className="font-bold text-stone-900 text-sm hover:text-[#5FA20D] cursor-pointer transition-colors"
                          >
                            {project.name}
                          </p>
                          <span className="text-[11px] font-mono text-stone-400 mt-0.5 block">
                            ID: {projectIdCode}
                          </span>
                        </div>
                      </td>

                      {/* CLIENT */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-stone-800">{clientName}</span>
                      </td>

                      {/* STATUS (badge) */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* PROGRESS: thin lime progress bar + percent */}
                      <td className="px-6 py-4">
                        <div className="w-36 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-stone-600">
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#EEEEF2] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#77C614] rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* DEADLINE: small calendar icon + date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{deadlineStr}</span>
                        </div>
                      </td>

                      {/* ACTIONS: three-dot menu */}
                      <td className="px-6 py-4 text-right relative">
                        <div className="inline-block text-left">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === project.id ? null : project.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === project.id && (
                            <div className="absolute right-6 top-10 w-44 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  navigate('/tasks');
                                }}
                                className="w-full px-3.5 py-2 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Kanban className="w-3.5 h-3.5 text-stone-500" />
                                <span>Open Kanban</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(project)}
                                className="w-full px-3.5 py-2 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                                <span>Edit Project</span>
                              </button>
                              {canManageProjects && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setProjectToDelete(project);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete Project</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-stone-400">
                      <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-500" />
                      <p className="text-xs">No projects found. Create one with "+ New Project".</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">
                {editingProject ? 'Edit Project' : 'New Project'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Villa Al-Khobar Renovation"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Client Account</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Select a client (or leave unassigned)...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.type}
                    </option>
                  ))}
                  {clients.length === 0 && isDemoMode && (
                    <>
                      <option disabled value="">— Sample Clients —</option>
                      {SAMPLE_CLIENT_NAMES.map((name) => (
                        <option key={name} value={`sample-${name}`}>
                          {name} (Sample)
                        </option>
                      ))}
                    </>
                  )}
                  {clients.length === 0 && !isDemoMode && (
                    <option disabled value="">(No clients yet. Add clients in Clients page)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Description / Scope</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Comprehensive interior design, luxury joinery, and material procurement..."
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                  >
                    <option value="planning">Concept (Planning)</option>
                    <option value="active">Execution (Active)</option>
                    <option value="on_hold">Design (On Hold)</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProject ? 'Save Changes' : 'Create Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={Boolean(projectToDelete)}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${projectToDelete?.name}"? All associated tasks will be removed.`}
        confirmLabel="Delete Project"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
