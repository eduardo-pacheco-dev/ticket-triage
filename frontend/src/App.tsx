import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import StatusPage from './pages/StatusPage';
import AdminQueuePage from './pages/AdminQueuePage';
import DashboardPage from './pages/DashboardPage';
import ArchivedPage from './pages/ArchivedPage';
import ConfigPage from './pages/ConfigPage';

export default function App() {
  return (
    <>
      <Toaster />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
