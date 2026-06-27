import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications } from './store/slices/notificationSlice';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import EquipmentPage from './pages/EquipmentPage';
import InterventionsPage from './pages/InterventionsPage';
import ContractsPage from './pages/ContractsPage';
import InvoicesPage from './pages/InvoicesPage';
import CalendarPage from './pages/CalendarPage';
import TechnicianPage from './pages/TechnicianPage';
import UsersPage from './pages/UsersPage';
import TrainingsPage from './pages/TrainingsPage';
import ActivityPage from './pages/ActivityPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import SalesReportsPage from './pages/SalesReportsPage';

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);
  const { darkMode, language } = useSelector((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    // Force le format de date jj/mm/aaaa (français) sur les sélecteurs de date natifs
    document.documentElement.lang = language === 'ar' ? 'ar' : 'fr-FR';
  }, [darkMode, language]);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchNotifications());
  }, [token, dispatch]);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="interventions" element={<InterventionsPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="suppliers" element={
            <ProtectedRoute roles={['super_admin', 'admin', 'accountant']}>
              <SuppliersPage />
            </ProtectedRoute>
          } />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="trainings" element={<TrainingsPage />} />
          <Route path="technician" element={
            <ProtectedRoute roles={['technician', 'super_admin', 'admin']}>
              <TechnicianPage />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <UsersPage />
            </ProtectedRoute>
          } />
          <Route path="reports" element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <SalesReportsPage />
            </ProtectedRoute>
          } />
          <Route path="activity" element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <ActivityPage />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
