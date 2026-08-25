import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
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
const ServiceOrdersPage = lazy(() => import('./pages/ServiceOrdersPage'));
const StationsPage = lazy(() => import('./pages/StationsPage'));

function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 300, alignItems: 'center' }}>
      <CircularProgress size={32} aria-label="Carregando..." />
    </Box>
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
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminQueuePage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="arquivados" element={<ArchivedPage />} />
              <Route path="configuracoes" element={<ConfigPage />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="ordens-de-servico" element={<ServiceOrdersPage />} />
              <Route path="estacoes" element={<StationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
