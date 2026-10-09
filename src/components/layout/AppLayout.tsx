import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Palette,
  DollarSign,
  Truck,
  Package,
  UserCheck,
  BarChart3,
  Kanban,
  Calendar,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  ShieldAlert,
  Database,
  Plus,
  Bell,
  Menu,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RLSErrorModal } from '../modals/RLSErrorModal';
import { SupabaseConfigModal } from '../modals/SupabaseConfigModal';
import { OrganizationSetupModal } from '../modals/OrganizationSetupModal';
import { AIAssistantDrawer } from '../AIAssistantDrawer';

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

  const userDisplayName = profile?.full_name || user?.user_metadata?.full_name || 'Team Member';
  const userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'DO';

  const isOwnerOrAdmin = currentMemberRole === 'owner' || currentMemberRole === 'admin' || isDemoMode;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Designs', path: '/designs', icon: Palette },
    ...(isOwnerOrAdmin ? [{ name: 'Finance', path: '/finance', icon: DollarSign }] : []),
    { name: 'Vendors', path: '/vendors', icon: Truck },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Staff', path: '/staff', icon: UserCheck },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Tasks', path: '/tasks', icon: Kanban },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Team', path: '/team', icon: Shield },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-stone-300 border-r border-[#1C1C20] select-none">
      {/* Brand Header */}
      <div className="h-20 px-5 flex items-center justify-between border-b border-[#18181C]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black ring-2 ring-[#77C614] p-1 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(119,198,20,0.25)]">
            <img
              src="/logo.png"
              alt="DE-OLIVE"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white uppercase leading-none font-sans">
              DE-OLIVE
            </h1>
            <span className="text-[10px] tracking-[0.25em] font-bold text-[#77C614] uppercase block mt-1 leading-none">
              CONCEPT
            </span>
          </div>
        </div>

        {mobileMenuOpen && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-[#18181C] relative">
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#141417] hover:bg-[#1B1B20] text-stone-200 transition-colors text-xs font-medium border border-[#25252B]"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 rounded-md bg-[#77C614]/15 border border-[#77C614]/30 flex items-center justify-center text-[#77C614] shrink-0">
              <Building2 className="w-3 h-3" />
            </div>
            <span className="truncate">{currentOrg?.name || 'Workspace'}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${
              orgDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {orgDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-[#121215] border border-[#26262D] rounded-xl shadow-2xl z-30 py-1.5 text-xs animate-in fade-in duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Organizations
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  switchOrganization(org.id);
                  setOrgDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#1C1C22] transition-colors ${
                  org.id === currentOrg?.id ? 'text-[#77C614] font-bold' : 'text-stone-300'
                }`}
              >
                <span className="truncate">{org.name}</span>
                {org.id === currentOrg?.id && <Check className="w-3.5 h-3.5 shrink-0 text-[#77C614]" />}
              </button>
            ))}

            <div className="border-t border-[#202026] my-1 pt-1">
              <button
                onClick={() => {
                  setOrgDropdownOpen(false);
                  setShowNewOrgModal(true);
                }}
                className="w-full px-3 py-2 text-left text-stone-300 hover:text-white hover:bg-[#1C1C22] transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-[#77C614]" />
                <span>Create Organization</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-[#77C614] text-[#0A0A0A] font-bold shadow-[0_0_15px_rgba(119,198,20,0.35)]'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-[#151518] font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-stone-400'}`} />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Diagnostic & Database Status (owners and admins only) */}
      {isOwnerOrAdmin && (
        <div className="p-3 border-t border-[#18181C] space-y-1.5">
          {rlsError && (
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/50 text-amber-300 text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                RLS Policy
              </span>
              <span className="underline cursor-pointer font-medium">Review</span>
            </div>
          )}

          <button
            onClick={() => {
              setShowConfigModal(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-[#141417] hover:bg-[#1C1C20] text-stone-400 hover:text-stone-200 transition-colors text-xs border border-[#202026]"
          >
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#77C614]" />
              <span>Database Connection</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black text-[#77C614] border border-[#77C614]/30">
              {isConfigured ? 'CONNECTED' : 'LOCAL'}
            </span>
          </button>
        </div>
      )}

      {/* Footer Profile & Settings */}
      <div className="p-3 border-t border-[#18181C] space-y-1">
        <NavLink
          to="/settings"
          onClick={() => setMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs transition-colors ${
              isActive
                ? 'bg-[#77C614] text-black font-bold'
                : 'text-stone-400 hover:text-white hover:bg-[#151518]'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>

        <div className="pt-2 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-full bg-[#111113] ring-1 ring-[#77C614] text-[#77C614] flex items-center justify-center font-bold text-[11px] shrink-0">
              {userInitials}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-stone-200 truncate leading-none">
                {userDisplayName}
              </p>
              <p className="text-[10px] text-stone-500 capitalize mt-1 leading-none">
                {currentMemberRole || 'Administrator'}
              </p>
            </div>
          </div>

          <button
            onClick={signOut}
            title="Log out"
            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-[#1A1A20] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F8FA] flex text-[#111113] font-sans antialiased selection:bg-[#77C614]/30 selection:text-black">
      {/* Desktop Fixed Sidebar: permanently visible on the left */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-[#1C1C20] select-none flex-col h-screen sticky top-0">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-over Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop: dimmed, blurred page */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer slides in from the left with close X */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar (White) per Global Layout spec:
            - Hamburger menu on left
            - On the right: bell icon with small green dot, thin vertical divider, round avatar with user initials (black circle, lime text, lime ring)
        */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#EEEEF2] flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger menu on left */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-stone-700 hover:text-black hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Workspace Name */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-stone-900 tracking-tight">
                {currentOrg?.name || 'De-Olive Workspace'}
              </span>
              {isDemoMode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Demo Workspace
                </span>
              )}
            </div>
          </div>

          {/* Right zone: Bell with green dot, divider, and round avatar with initials */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              title="Notifications"
              className="relative p-2 rounded-xl text-stone-600 hover:text-stone-950 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#77C614] ring-2 ring-white" />
            </button>

            <div className="h-5 w-px bg-stone-200" />

            <div
              title={userDisplayName}
              className="w-9 h-9 rounded-full bg-[#111113] ring-2 ring-[#77C614] text-[#77C614] flex items-center justify-center font-bold text-xs shadow-xs select-none cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Button & Assistant Drawer */}
      <AIAssistantDrawer />

      {/* Global Modals (Owners and Admins Only) */}
      {isOwnerOrAdmin && <RLSErrorModal />}
      {isOwnerOrAdmin && (
        <SupabaseConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
        />
      )}
      <OrganizationSetupModal
        isOpen={showNewOrgModal}
        onClose={() => setShowNewOrgModal(false)}
      />
    </div>
  );
};
