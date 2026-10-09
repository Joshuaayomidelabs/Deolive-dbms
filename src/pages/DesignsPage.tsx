import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  File,
  ExternalLink,
  Trash2,
  Loader2,
  Upload,
  AlertCircle,
  MoreVertical,
  Copy,
  Check,
  Code2,
  Database,
  Info,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Design, DesignType, DesignStatus, Project } from '../types/database';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { isRLSError } from '../lib/rlsHelper';

interface DisplayDesign {
  id: string;
  name: string;
  projectName: string;
  projectId?: string | null;
  type: string;
  status: 'Approved' | 'Pending';
  date: string;
  filePath: string;
  fileUrl?: string | null;
  signedUrl?: string | null;
  isPdf: boolean;
  isSample?: boolean;
  imageBgGradient?: string;
}

export const DesignsPage: React.FC = () => {
  const { currentOrg, user, currentMemberRole, isDemoMode, reportRLSError } = useAuth();
  const { showToast } = useToast();

  const isOwnerOrAdmin = currentMemberRole === 'owner' || currentMemberRole === 'admin' || isDemoMode;

  const [realDesigns, setRealDesigns] = useState<Design[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formType, setFormType] = useState<DesignType>('3D Render');
  const [formStatus, setFormStatus] = useState<DesignStatus>('Pending');

  // Preview & Lightbox modal state
  const [previewItem, setPreviewItem] = useState<DisplayDesign | null>(null);

  // Delete modal state
  const [designToDelete, setDesignToDelete] = useState<DisplayDesign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!currentOrg) return;

    if (isDemoMode) {
      const saved = localStorage.getItem(`deolive_designs_${currentOrg.id}`);
      if (saved) {
        try {
          setRealDesigns(JSON.parse(saved));
        } catch {
          setRealDesigns([]);
        }
      } else {
        setRealDesigns([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch real designs
      const { data: designsData, error: designsErr } = await supabase
        .from('designs')
        .select('*, project:projects(id, name)')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (designsErr) {
        const msg = (designsErr.message || '').toLowerCase();
        if (msg.includes('relation') && msg.includes('does not exist')) {
          setTableExists(false);
        } else if (isRLSError(designsErr)) {
          reportRLSError('designs', 'SELECT', designsErr);
        }
        setRealDesigns([]);
      } else {
        setTableExists(true);
        setRealDesigns(designsData || []);

        // 2. Fetch signed URLs for private files
        if (designsData && designsData.length > 0) {
          fetchSignedUrls(designsData);
        }
      }

      // 3. Fetch organization projects for dropdown
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (projData) {
        setProjects(projData);
      }
    } catch {
      setRealDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignedUrls = async (items: Design[]) => {
    const urls: Record<string, string> = {};
    for (const item of items) {
      if (item.file_path) {
        try {
          const { data, error } = await supabase.storage
            .from('designs')
            .createSignedUrl(item.file_path, 3600); // 1 hour validity

          if (data?.signedUrl) {
            urls[item.id] = data.signedUrl;
          }
        } catch {
          // Fallback to file_url if available
          if (item.file_url) {
            urls[item.id] = item.file_url;
          }
        }
      }
    }
    setSignedUrls(urls);
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg, isDemoMode]);

  // Format designs for display
  const displayDesigns: DisplayDesign[] = realDesigns.map((d) => {
    const isPdf = d.file_path.toLowerCase().endsWith('.pdf') || (d.file_url?.toLowerCase().endsWith('.pdf') ?? false);
    const signedUrl = signedUrls[d.id] || d.file_url || null;
    return {
      id: d.id,
      name: d.name,
      projectName: d.project?.name || 'General Project',
      projectId: d.project_id,
      type: d.type,
      status: d.status,
      date: new Date(d.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      filePath: d.file_path,
      fileUrl: d.file_url,
      signedUrl,
      isPdf,
      isSample: false,
      imageBgGradient: 'from-stone-800 to-stone-900',
    };
  });

  // Filter items
  const filteredDesigns = displayDesigns.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File exceeds 10MB limit. Please choose a smaller file.', 'error');
      setModalError('File size exceeds the 10MB limit.');
      return;
    }

    // Validate type (images and pdfs)
    const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!isValidType) {
      showToast('Unsupported file type. Please upload an image or PDF.', 'error');
      setModalError('Please upload an image (JPG, PNG, WEBP) or PDF file.');
      return;
    }

    setSelectedFile(file);
    setModalError(null);

    // Auto-prefill title if empty
    if (!formName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Auto-detect type
    if (file.type === 'application/pdf') {
      setFormType('Floor Plan');
      setFilePreviewUrl(null);
    } else {
      const preview = URL.createObjectURL(file);
      setFilePreviewUrl(preview);
    }
  };

  const handleOpenUploadModal = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFormName('');
    setFormProjectId(projects[0]?.id || '');
    setFormType('3D Render');
    setFormStatus('Pending');
    setModalError(null);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Asset title is required.');
      return;
    }
    if (!selectedFile) {
      setModalError('Please choose a file to upload (image or PDF, max 10MB).');
      return;
    }
    if (!currentOrg) return;

    setUploadProgress(true);
    setModalError(null);

    try {
      if (isDemoMode) {
        // Offline / Demo Mode simulation
        const isPdf = selectedFile.type === 'application/pdf';
        const simulatedUrl = filePreviewUrl || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80';
        const newDesign: Design = {
          id: `design-${Date.now()}`,
          organization_id: currentOrg.id,
          project_id: formProjectId || null,
          name: formName.trim(),
          type: formType,
          status: formStatus,
          file_path: `${currentOrg.id}/${selectedFile.name}`,
          file_url: simulatedUrl,
          uploaded_by: user?.id || null,
          created_at: new Date().toISOString(),
          project: projects.find((p) => p.id === formProjectId),
        };

        const updated = [newDesign, ...realDesigns];
        setRealDesigns(updated);
        localStorage.setItem(`deolive_designs_${currentOrg.id}`, JSON.stringify(updated));
        showToast(`Design asset "${formName}" uploaded successfully.`, 'success');
        setShowUploadModal(false);
        return;
      }

      // 1. Upload file to private Supabase Storage bucket 'designs'
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${currentOrg.id}/${Date.now()}_${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('designs')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type,
        });

      if (uploadError) {
        throw new Error('Something went wrong, please try again.');
      }

      // 2. Generate initial signed URL for preview
      const { data: signedData } = await supabase.storage
        .from('designs')
        .createSignedUrl(storagePath, 3600);

      // 3. Insert record into 'designs' table
      const { data: recordData, error: insertError } = await supabase
        .from('designs')
        .insert({
          organization_id: currentOrg.id,
          project_id: formProjectId || null,
          name: formName.trim(),
          type: formType,
          status: formStatus,
          file_path: storagePath,
          file_url: signedData?.signedUrl || storagePath,
          uploaded_by: user?.id || null,
        })
        .select('*, project:projects(id, name)')
        .single();

      if (insertError) {
        throw new Error('Something went wrong, please try again.');
      }

      // Update state
      if (signedData?.signedUrl) {
        setSignedUrls((prev) => ({ ...prev, [recordData.id]: signedData.signedUrl }));
      }
      setRealDesigns([recordData, ...realDesigns]);
      showToast(`Asset "${recordData.name}" saved successfully.`, 'success');
      setShowUploadModal(false);
    } catch {
      setModalError('Something went wrong, please try again.');
      showToast('Something went wrong, please try again.', 'error');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleToggleStatus = async (item: DisplayDesign) => {
    if (item.isSample) {
      showToast('Sample assets cannot have their approval status changed in the database.', 'info');
      return;
    }

    const nextStatus: DesignStatus = item.status === 'Approved' ? 'Pending' : 'Approved';

    try {
      if (isDemoMode) {
        const updated = realDesigns.map((d) =>
          d.id === item.id ? { ...d, status: nextStatus } : d
        );
        setRealDesigns(updated);
        localStorage.setItem(`deolive_designs_${currentOrg?.id}`, JSON.stringify(updated));
        showToast(`Status updated to "${nextStatus}".`, 'success');
        setActiveMenuId(null);
        return;
      }

      const { data, error } = await supabase
        .from('designs')
        .update({ status: nextStatus })
        .eq('id', item.id)
        .select('*, project:projects(id, name)')
        .single();

      if (error) {
        if (isRLSError(error)) {
          reportRLSError('designs', 'UPDATE', error);
        }
        showToast('Something went wrong, please try again.', 'error');
      } else {
        setRealDesigns(realDesigns.map((d) => (d.id === item.id ? data : d)));
        showToast(`Design marked as ${nextStatus}.`, 'success');
      }
    } catch {
      showToast('Error updating status.', 'error');
    } finally {
      setActiveMenuId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!designToDelete) return;

    if (designToDelete.isSample) {
      showToast('Sample design items cannot be deleted from the database.', 'info');
      setDesignToDelete(null);
      return;
    }

    setIsDeleting(true);

    try {
      if (isDemoMode) {
        const updated = realDesigns.filter((d) => d.id !== designToDelete.id);
        setRealDesigns(updated);
        localStorage.setItem(`deolive_designs_${currentOrg?.id}`, JSON.stringify(updated));
        showToast(`Design "${designToDelete.name}" deleted.`, 'info');
        setDesignToDelete(null);
        return;
      }

      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('designs')
        .delete()
        .eq('id', designToDelete.id);

      if (dbError) {
        showToast('Something went wrong, please try again.', 'error');
        return;
      }

      // 2. Delete file from storage
      if (designToDelete.filePath) {
        await supabase.storage.from('designs').remove([designToDelete.filePath]);
      }

      setRealDesigns(realDesigns.filter((d) => d.id !== designToDelete.id));
      showToast(`Asset "${designToDelete.name}" deleted successfully.`, 'info');
    } catch {
      showToast('Something went wrong, please try again.', 'error');
    } finally {
      setIsDeleting(false);
      setDesignToDelete(null);
    }
  };

  const handleDownloadFile = async (item: DisplayDesign) => {
    if (item.isSample) {
      showToast(`Downloaded "${item.name}" sample preview package.`, 'success');
      return;
    }

    try {
      showToast(`Initiating download for "${item.name}"...`, 'info');

      // Download directly from Supabase storage
      const { data, error } = await supabase.storage
        .from('designs')
        .download(item.filePath);

      if (error || !data) {
        // Fallback to opening signed URL
        if (item.signedUrl) {
          window.open(item.signedUrl, '_blank');
          return;
        }
        throw new Error('Could not download file from storage.');
      }

      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      const extension = item.filePath.split('.').pop() || 'bin';
      link.download = `${item.name.replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      showToast(`File download complete.`, 'success');
    } catch {
      showToast('Failed to download file. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-950 font-sans tracking-tight">
            Design Library
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage creative assets, architectural renders, specifications, and client approvals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleOpenUploadModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#77C614]" />
            <span>Upload Design</span>
          </button>
        </div>
      </div>

      {/* Search and Type Filter Card (Shown when designs exist) */}
      {realDesigns.length > 0 && (
        <div className="de-olive-card p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search design assets or project name..."
                className="w-full bg-[#F8F8FA] border border-[#EEEEF2] rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#77C614] focus:bg-white transition-colors"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <span>Type: {typeFilter}</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-stone-400">
                    Filter by Type
                  </div>
                  {['All', 'Mood Board', '3D Render', 'Floor Plan', 'Other'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTypeFilter(t);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-stone-50 transition-colors cursor-pointer ${
                        typeFilter === t ? 'text-[#3F6F05] font-bold bg-[#77C614]/10' : 'text-stone-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content: Loading state vs Empty State vs Design Cards Grid */}
      {loading ? (
        <div className="de-olive-card p-16 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#77C614]" />
          <span className="text-xs">Loading design assets and signed URLs...</span>
        </div>
      ) : realDesigns.length === 0 ? (
        <div className="de-olive-card p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
            <Palette className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Design Portfolio</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-sm">
              No designs uploaded yet. Upload your first mood board, 3D render, or floor plan.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleOpenUploadModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#77C614]" />
              <span>Upload First Design</span>
            </button>
          </div>
        </div>
      ) : (
        /* Design Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((item) => (
            <div
              key={item.id}
              className="de-olive-card overflow-hidden group flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              {/* Top Image or PDF Document Preview */}
              <div className="relative h-48 w-full bg-stone-900 flex items-center justify-center overflow-hidden border-b border-[#EEEEF2]">
                {item.isPdf ? (
                  /* PDF Document Preview Card */
                  <div className="w-full h-full bg-gradient-to-br from-stone-900 to-stone-950 flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-2 shadow-inner">
                      <FileText className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-red-300 font-semibold px-2 py-0.5 rounded bg-red-950/60 border border-red-800/40">
                      PDF DOCUMENT
                    </span>
                    <p className="text-[11px] text-stone-400 mt-2 truncate max-w-[200px]">
                      {item.filePath.split('/').pop()}
                    </p>
                  </div>
                ) : item.signedUrl || item.fileUrl ? (
                  /* Real Image Preview */
                  <img
                    src={item.signedUrl || item.fileUrl || ''}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback placeholder if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  /* Fallback Placeholder */
                  <div className={`w-full h-full bg-gradient-to-br ${item.imageBgGradient || 'from-stone-800 to-stone-900'} flex flex-col items-center justify-center text-stone-400 p-4`}>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center mb-2 text-stone-300 border border-white/15">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300">
                      {item.type}
                    </span>
                  </div>
                )}

                {/* Hover Overlay with View and Download Buttons */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-10">
                  <button
                    onClick={() => setPreviewItem(item)}
                    title="View Design Preview"
                    className="w-10 h-10 rounded-full bg-white text-stone-900 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadFile(item)}
                    title="Download Original File"
                    className="w-10 h-10 rounded-full bg-white text-stone-900 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Sample Badge */}
                {item.isSample && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-amber-300 text-[10px] font-semibold border border-amber-400/30 z-10">
                    Sample data
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">
                      {item.name}
                    </h3>

                    {/* Card Actions Menu */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-stone-200 rounded-xl shadow-xl z-30 py-1 text-xs">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer text-left"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                            <span>
                              {item.status === 'Approved' ? 'Mark as Pending' : 'Mark as Approved'}
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleDownloadFile(item);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer text-left"
                          >
                            <Download className="w-3.5 h-3.5 text-stone-500" />
                            <span>Download File</span>
                          </button>

                          {isOwnerOrAdmin && (
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setDesignToDelete(item);
                              }}
                              className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete Asset</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-stone-500 font-medium truncate max-w-[180px]">
                      {item.projectName}
                    </p>

                    {/* Status Badge */}
                    <span
                      onClick={() => handleToggleStatus(item)}
                      title="Click to toggle status"
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-opacity hover:opacity-80 ${
                        item.status === 'Approved' ? 'badge-approved' : 'badge-pending'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Bottom Bar: Type & Date */}
                <div className="pt-3 border-t border-[#EEEEF2] flex items-center justify-between text-xs text-stone-400">
                  <span className="font-medium text-stone-600">{item.type}</span>
                  <span className="font-mono text-[11px]">{item.date}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredDesigns.length === 0 && (
            <div className="col-span-full py-16 text-center text-stone-400">
              <Palette className="w-10 h-10 mx-auto mb-2 opacity-40 text-stone-500" />
              <p className="text-xs font-medium text-stone-600">No design assets found matching your filter.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('All');
                }}
                className="mt-2 text-xs text-[#5FA20D] hover:underline font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Design Asset Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-900">Upload Design Asset</h2>
              <button
                onClick={() => setShowUploadModal(false)}
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

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4 text-xs">
              {/* File Upload Selector & Dropzone */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Design File (Image or PDF, max 10MB) <span className="text-red-500">*</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-[#77C614] bg-stone-50 hover:bg-[#77C614]/5 rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-stone-200 flex items-center justify-center mb-2.5 text-stone-500">
                      <Upload className="w-6 h-6 text-[#5FA20D]" />
                    </div>
                    <p className="font-semibold text-stone-800 text-xs">
                      Click to choose file or drag & drop
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      PNG, JPG, WEBP, GIF, or PDF (up to 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {selectedFile.type === 'application/pdf' ? (
                        <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      ) : filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="preview"
                          className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-200 text-stone-600 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800 text-xs truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-stone-400 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-100 cursor-pointer transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Asset Title */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Asset Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Master Suite 3D Visualization"
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              {/* Associated Project Dropdown */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Associated Project</label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Leave Unassigned (General Library)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Asset Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as DesignType)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Mood Board">Mood Board</option>
                    <option value="3D Render">3D Render</option>
                    <option value="Floor Plan">Floor Plan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Approval State</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DesignStatus)}
                    className="w-full bg-stone-50 border border-stone-200 focus:bg-white focus:border-[#77C614] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="px-5 py-2 rounded-xl bg-[#111113] hover:bg-[#222226] text-white font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadProgress && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#77C614]" />}
                  <span>{uploadProgress ? 'Uploading...' : 'Save & Upload'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-Resolution Preview / Lightbox Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-stone-950 border border-stone-800 rounded-2xl max-w-4xl w-full p-4 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-white">
              <div>
                <h3 className="text-sm font-bold truncate max-w-md">{previewItem.name}</h3>
                <p className="text-[11px] text-stone-400">
                  {previewItem.projectName} • {previewItem.type} • {previewItem.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewItem)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[320px]">
              {previewItem.isPdf ? (
                <div className="text-center p-8 text-stone-300">
                  <FileText className="w-16 h-16 text-red-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold">{previewItem.name}</p>
                  <p className="text-xs text-stone-400 mt-1 mb-4">PDF Document</p>
                  {previewItem.signedUrl && (
                    <a
                      href={previewItem.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-stone-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open PDF in New Window</span>
                    </a>
                  )}
                </div>
              ) : previewItem.signedUrl || previewItem.fileUrl ? (
                <img
                  src={previewItem.signedUrl || previewItem.fileUrl || ''}
                  alt={previewItem.name}
                  className="max-h-[75dvh] max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-stone-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No direct image preview available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(designToDelete)}
        title="Delete Design Asset"
        message={`Are you sure you want to delete "${designToDelete?.name}"? The record and associated file will both be permanently deleted.`}
        confirmLabel="Delete Asset"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDesignToDelete(null)}
      />
    </div>
  );
};
