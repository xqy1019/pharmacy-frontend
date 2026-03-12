import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import { usePermission } from '../hooks/usePermission';
import DashboardPage from '../pages/DashboardPage';
import DrugMasterPage from '../pages/DrugMasterPage';
import ProcurementPage from '../pages/ProcurementPage';
import InventoryPage from '../pages/InventoryPage';
import AlertsPage from '../pages/AlertsPage';
import LocationsPage from '../pages/LocationsPage';
import WarehousePage from '../pages/WarehousePage';
import AllocationPage from '../pages/AllocationPage';
import DispensingPage from '../pages/DispensingPage';
import SalesPage from '../pages/SalesPage';
import StocktakePage from '../pages/StocktakePage';
import QualityPage from '../pages/QualityPage';
import ADRPage from '../pages/ADRPage';
import ControlledDrugsPage from '../pages/ControlledDrugsPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import TemperatureLogPage from '../pages/TemperatureLogPage';
import SystemUsersPage from '../pages/SystemUsersPage';
import SystemRolesPage from '../pages/SystemRolesPage';
import SystemAuditPage from '../pages/SystemAuditPage';
import IntegrationPage from '../pages/IntegrationPage';
import ModulePage from '../pages/ModulePage';

// 路由权限守卫：无权限跳回首页（perm 单个，perms 任一满足）
function RequirePerm({ perm, perms, children }) {
  const { hasPerm } = usePermission();
  const list = perm ? [perm] : (perms || []);
  if (list.length > 0 && !list.some((p) => hasPerm(p))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// /system 智能跳转：跳到第一个有权限的子页面
function SystemRedirect() {
  const { hasPerm } = usePermission();
  if (hasPerm('iam.user.view'))  return <Navigate to="/system/users" replace />;
  if (hasPerm('iam.role.view'))  return <Navigate to="/system/roles" replace />;
  if (hasPerm('iam.audit.view')) return <Navigate to="/system/audit" replace />;
  return <Navigate to="/" replace />;
}

export function RouterProvider() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />

        <Route path="/drug-master" element={
          <RequirePerm perm="inventory.drug.manage"><DrugMasterPage /></RequirePerm>
        } />
        <Route path="/procurement" element={
          <RequirePerm perm="procurement.order.view"><ProcurementPage /></RequirePerm>
        } />
        <Route path="/inventory" element={
          <RequirePerm perm="inventory.batch.manage"><InventoryPage /></RequirePerm>
        } />
        <Route path="/inventory/alerts" element={
          <RequirePerm perm="inventory.batch.manage"><AlertsPage /></RequirePerm>
        } />
        <Route path="/inventory/locations" element={
          <RequirePerm perm="inventory.batch.manage"><LocationsPage /></RequirePerm>
        } />
        <Route path="/warehouse" element={
          <RequirePerm perm="inventory.batch.manage"><WarehousePage /></RequirePerm>
        } />
        <Route path="/allocation" element={
          <RequirePerm perm="transfer.view"><AllocationPage /></RequirePerm>
        } />
        <Route path="/dispensing" element={
          <RequirePerm perm="prescription.view"><DispensingPage /></RequirePerm>
        } />
        <Route path="/sales" element={
          <RequirePerm perm="sales.order.view"><SalesPage /></RequirePerm>
        } />
        <Route path="/stocktake" element={
          <RequirePerm perm="stocktake.view"><StocktakePage /></RequirePerm>
        } />
        <Route path="/quality" element={
          <RequirePerm perm="quality.recall.view"><QualityPage /></RequirePerm>
        } />
        <Route path="/quality/adr" element={
          <RequirePerm perm="quality.recall.view"><ADRPage /></RequirePerm>
        } />
        <Route path="/controlled-drugs" element={
          <RequirePerm perm="controlled.drug.manage"><ControlledDrugsPage /></RequirePerm>
        } />
        <Route path="/inventory/temperature" element={
          <RequirePerm perm="inventory.batch.manage"><TemperatureLogPage /></RequirePerm>
        } />
        <Route path="/analytics" element={
          <RequirePerm perm="report.kpi.view"><AnalyticsPage /></RequirePerm>
        } />
        {/* 系统管理子模块 */}
        <Route path="/system" element={<SystemRedirect />} />
        <Route path="/system/users" element={
          <RequirePerm perm="iam.user.view"><SystemUsersPage /></RequirePerm>
        } />
        <Route path="/system/roles" element={
          <RequirePerm perm="iam.role.view"><SystemRolesPage /></RequirePerm>
        } />
        <Route path="/system/audit" element={
          <RequirePerm perm="iam.audit.view"><SystemAuditPage /></RequirePerm>
        } />
        <Route path="/system/integration" element={
          <RequirePerm perm="integration.job.view"><IntegrationPage /></RequirePerm>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
