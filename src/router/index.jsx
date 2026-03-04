import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import { allModules } from '../config/modules';
import DashboardPage from '../pages/DashboardPage';
import InventoryPage from '../pages/InventoryPage';
import ModulePage from '../pages/ModulePage';

export function RouterProvider() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        {allModules
          .filter((item) => item.path !== '/' && item.path !== '/inventory')
          .map((item) => (
            <Route key={item.path} path={item.path} element={<ModulePage />} />
          ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
