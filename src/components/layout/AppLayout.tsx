import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FolderKanban,
  LayoutDashboard,
  Kanban,
  Users,
  Settings,
  Plus,
  LogOut,
  ChevronDown,
  Building2,
  ShieldAlert,
  Database,
  ExternalLink,
  Sparkles,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RLSErrorModal } from '../modals/RLSErrorModal';
import { SupabaseConfigModal } from '../modals/SupabaseConfigModal';
import { OrganizationSetupModal } from '../modals/OrganizationSetupModal';

export const AppLayout: React.FC = () => {
  const {
    user,
    profile,
    organizations,
    currentOrg,
    currentMemberRole,
    signOut,
    switchOrganization,
    isDemoMode,
    isConfigured,
    rlsError,
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive page title for breadcrumb
  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/tasks')) return 'Task Board';
    if (path.startsWith('/team')) return 'Team & Roles';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Workspace';
  };

  const userDisplayName = profile?.full_name || user?.user_metadata?.full_name || 'Team Member';
  const userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Navigation Links component reusable for both desktop and mobile
  const renderNavLinks = () => (
    <nav className="flex-1 p-3 space-y-1 text-xs">
      <NavLink
        to="/"
        end
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            isActive
              ? 'bg-brand-primary/15 text-brand-accent border border-brand-primary/30 font-semibold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`
        }
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Overview</span>
      </NavLink>

      <NavLink
        to="/projects"
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            isActive
              ? 'bg-brand-primary/15 text-brand-accent border border-brand-primary/30 font-semibold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`
        }
      >
        <FolderKanban className="w-4 h-4" />
        <span>Projects</span>
      </NavLink>

      <NavLink
        to="/tasks"
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            isActive
              ? 'bg-brand-primary/15 text-brand-accent border border-brand-primary/30 font-semibold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`
        }
      >
        <Kanban className="w-4 h-4" />
        <span>Task Board</span>
      </NavLink>

      <NavLink
        to="/team"
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            isActive
              ? 'bg-brand-primary/15 text-brand-accent border border-brand-primary/30 font-semibold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`
        }
      >
        <Users className="w-4 h-4" />
        <span>Team & Roles</span>
      </NavLink>

      <NavLink
        to="/settings"
        onClick={() => setMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium transition-colors ${
            isActive
              ? 'bg-brand-primary/15 text-brand-accent border border-brand-primary/30 font-semibold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`
        }
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </NavLink>
    </nav>
  );

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-stone-900 text-stone-300">
      {/* Brand Wordmark & Top Zone */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-stone-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-stone-700/80 shadow-2xs">
            <img
              src="/logo.png"
              alt="De-Olive DBMS"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-white font-sans">
            De-Olive DBMS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isDemoMode && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Demo
            </span>
          )}
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-stone-400 hover:text-white p-1 rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Organization Switcher Dropdown */}
      <div className="p-3 border-b border-stone-800/80 relative">
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-800/70 hover:bg-stone-800 text-stone-200 transition-colors text-xs font-medium border border-stone-700/60"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 rounded bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-accent shrink-0">
              <Building2 className="w-3 h-3" />
            </div>
            <span className="truncate">{currentOrg?.name || 'Select Organization'}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Org Dropdown Menu */}
        {orgDropdownOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-30 py-1 text-xs">
            <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-400">
              Switch Organization
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrganization(org.id);
                  setOrgDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-800 transition-colors ${
                  org.id === currentOrg?.id ? 'text-brand-accent font-semibold' : 'text-stone-300'
                }`}
              >
                <span className="truncate">{org.name}</span>
                {org.id === currentOrg?.id && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-brand-accent" />}
              </button>
            ))}

            <div className="border-t border-stone-800 my-1 pt-1">
              <button
                onClick={() => {
                  setOrgDropdownOpen(false);
                  setShowNewOrgModal(true);
                }}
                className="w-full px-3 py-2 text-left text-stone-300 hover:text-white hover:bg-stone-800 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-brand-accent" />
                <span>Create Organization</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      {renderNavLinks()}

      {/* Database & Diagnostics Strip */}
      <div className="p-3 border-t border-stone-800/80 space-y-1.5">
        {rlsError && (
          <div className="p-2 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              RLS Diagnostic
            </span>
            <span className="underline cursor-pointer font-medium">Fix</span>
          </div>
        )}

        <button
          onClick={() => {
            setShowConfigModal(true);
            setMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-800/50 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors text-xs"
        >
          <span className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-brand-primary" />
            <span>Supabase Connection</span>
          </span>
          <span className="text-[10px] font-mono text-stone-500">
            {isConfigured ? 'LIVE' : 'SETUP'}
          </span>
        </button>
      </div>

      {/* Current User Profile Footer */}
      <div className="p-3 border-t border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={userDisplayName}
              className="w-7 h-7 rounded-full object-cover border border-stone-700 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-brand-accent flex items-center justify-center font-bold text-[11px] shrink-0">
              {userInitials}
            </div>
          )}
          <div className="truncate">
            <p className="text-xs font-medium text-stone-200 truncate leading-none">
              {userDisplayName}
            </p>
            <p className="text-[10px] text-stone-500 capitalize mt-1 leading-none">
              {currentMemberRole || 'Member'}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          title="Log out"
          className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex text-stone-900 font-sans antialiased selection:bg-brand-primary/20 selection:text-stone-900">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-stone-800 select-none flex-col">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-over Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Zone */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-stone-500">
              <span className="font-medium text-stone-700 truncate max-w-[120px] sm:max-w-none">
                {currentOrg?.name || 'Workspace'}
              </span>
              <span aria-hidden="true" className="text-stone-300">/</span>
              <span className="font-semibold text-stone-900">{getBreadcrumbTitle()}</span>
            </div>
          </div>

          {/* Action Zone */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isDemoMode && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Switch to Live Supabase</span>
              </button>
            )}

            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-brand-black text-xs font-semibold transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">Project</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <RLSErrorModal />
      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
      <OrganizationSetupModal
        isOpen={showNewOrgModal}
        onClose={() => setShowNewOrgModal(false)}
      />
    </div>
  );
};
