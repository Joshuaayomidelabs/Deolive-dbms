import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { TeamPage } from './pages/TeamPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { OrganizationSetupModal } from './components/modals/OrganizationSetupModal';
import { MissingEnvErrorScreen } from './components/MissingEnvErrorScreen';
import { isSupabaseConfigured } from './lib/supabase';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemoMode, isLoading, organizations } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center text-stone-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <span className="text-xs font-medium">Initializing De-Olive DBMS workspace...</span>
      </div>
    );
  }

  // Not authenticated and not in demo mode -> go to /login
  if (!user && !isDemoMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but has 0 organizations, force Organization Setup wizard
  if (user && !isDemoMode && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <OrganizationSetupModal isOpen={true} isMandatory={true} />
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [demoBypass, setDemoBypass] = useState(false);
  const isConfigured = isSupabaseConfigured();

  // If Supabase environment variables are missing, display clear setup screen instead of blank page
  if (!isConfigured && !demoBypass) {
    return <MissingEnvErrorScreen onContinueDemo={() => setDemoBypass(true)} />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="team" element={<TeamPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
