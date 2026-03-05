import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import { allModules } from '../config/modules';
import DashboardPage from '../pages/DashboardPage';
import InventoryPage from '../pages/InventoryPage';
import AlertsPage from '../pages/AlertsPage';
import LocationsPage from '../pages/LocationsPage';
import DispensingPage from '../pages/DispensingPage';
import ProcurementPage from '../pages/ProcurementPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import ModulePage from '../pages/ModulePage';

const specialPaths = ['/', '/inventory', '/inventory/alerts', '/inventory/locations', '/dispensing', '/procurement', '/analytics'];
const flatModules = allModules.flatMap((m) => (m.children ? m.children : [m]));

export function RouterProvider() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/alerts" element={<AlertsPage />} />
        <Route path="/inventory/locations" element={<LocationsPage />} />
        <Route path="/dispensing" element={<DispensingPage />} />
        <Route path="/procurement" element={<ProcurementPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        {flatModules
          .filter((item) => !specialPaths.includes(item.path))
          .map((item) => (
            <Route key={item.path} path={item.path} element={<ModulePage />} />
          ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
