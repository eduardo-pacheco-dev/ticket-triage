import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from '@carbon/react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';
import { ErrorBoundary } from './components/ErrorBoundary';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const AdminQueuePage = lazy(() => import('./pages/AdminQueuePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ArchivedPage = lazy(() => import('./pages/ArchivedPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));

function RouteFallback() {
  return (
    <div style={{ position: 'relative', minHeight: 300 }}>
      <Loading withOverlay={false} description="Carregando..." />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toaster />
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/status/:siteId" element={<StatusPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminQueuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/arquivados"
              element={
                <ProtectedRoute>
                  <ArchivedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute>
                  <ConfigPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
