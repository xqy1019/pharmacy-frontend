import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import { allModules } from '../config/modules';
import DashboardPage from '../pages/DashboardPage';
import ModulePage from '../pages/ModulePage';

export function RouterProvider() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        {allModules
          .filter((item) => item.path !== '/')
          .map((item) => (
            <Route key={item.path} path={item.path} element={<ModulePage />} />
          ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
