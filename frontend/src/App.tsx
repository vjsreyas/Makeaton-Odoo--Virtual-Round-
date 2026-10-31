import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { PublicOnly, RequireAuth, RequireRole, RoleHome } from './auth/guards';
import { ShellLayout } from './layouts/ShellLayout';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { StartPage } from './pages/auth/StartPage';
import { TokenPasswordPage } from './pages/auth/TokenPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PortalPlaceholder } from './pages/PortalPlaceholder';
import { LoadingScreen } from './components/ui/States';

const BusinessWorkspace = lazy(() => import('./workspace/BusinessWorkspace').then((m) => ({ default: m.BusinessWorkspace })));
const BusinessesPage = lazy(() => import('./pages/platform/BusinessesPage').then((m) => ({ default: m.BusinessesPage })));

function WorkspaceRoute() {
  const { me } = useAuth();
  return (
    <Suspense fallback={<LoadingScreen label="Loading workspace" />}>
      <BusinessWorkspace key={`${me?.active_context.type}:${me?.active_context.business_id}`} />
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/:slug" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<TokenPasswordPage mode="reset" />} />
      <Route path="/accept-invitation" element={<TokenPasswordPage mode="invite" />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RoleHome />} />
        <Route element={<RequireRole roles={['business_admin', 'business_staff']} />}>
          <Route path="/app/*" element={<WorkspaceRoute />} />
        </Route>
        <Route element={<ShellLayout />}>
          <Route element={<RequireRole roles={['platform']} />}>
            <Route path="/platform" element={<Navigate to="/platform/businesses" replace />} />
            <Route
              path="/platform/businesses"
              element={
                <Suspense fallback={<LoadingScreen label="Loading" />}>
                  <BusinessesPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<RequireRole roles={['customer']} />}>
            <Route path="/portal" element={<PortalPlaceholder />} />
          </Route>
          <Route element={<RequireRole roles={['none']} />}>
            <Route path="/start" element={<StartPage />} />
          </Route>
          <Route path="/account/password" element={<ChangePasswordPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
