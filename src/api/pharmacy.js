import client from './client';

export function fetchDashboardOverview() {
  return client.get('/api/v1/dashboard/overview');
}

export function fetchDrugs() {
  return client.get('/api/drugs');
}

export function fetchDrugCategories() {
  return client.get('/api/drugs/categories/tree');
}

export function fetchInventoryOverview(warehouseId = 1) {
  return client.get('/api/inventory/overview', { params: { warehouseId } });
}

export function fetchInventoryBatches(warehouseId = 1) {
  return client.get('/api/inventory/batches', { params: { warehouseId } });
}

export function fetchInventoryTransactions(warehouseId = 1) {
  return client.get('/api/inventory/transactions', { params: { warehouseId } });
}

export function fetchInventoryLocations(warehouseId = 1) {
  return client.get('/api/inventory/locations', { params: { warehouseId } });
}

export function inboundBulk(body) {
  return client.post('/api/inventory/inbound/bulk', body);
}

export function fetchLowStockAlerts(warehouseId = 1) {
  return client.get('/api/inventory/alerts/low-stock', { params: { warehouseId } });
}

export function fetchNearExpiryAlerts(warehouseId = 1, days = 30) {
  return client.get('/api/inventory/alerts/near-expiry', { params: { warehouseId, days } });
}

export function freezeBatch(batchId, body) {
  return client.post(`/api/inventory/batches/${batchId}/freeze`, body);
}

export function unfreezeBatch(batchId, body) {
  return client.post(`/api/inventory/batches/${batchId}/unfreeze`, body);
}

export function moveBatch(batchId, body) {
  return client.post(`/api/inventory/batches/${batchId}/move`, body);
}

export function fetchProcurementOverview() {
  return client.get('/api/v1/procurement/overview');
}

export function fetchProcurementSuppliers() {
  return client.get('/api/v1/procurement/suppliers');
}

export function fetchProcurementOrders(params = {}) {
  return client.get('/api/v1/procurement/orders', { params });
}

export function fetchProcurementOrderDetail(id) {
  return client.get(`/api/v1/procurement/orders/${id}`);
}

export function createProcurementOrder(body) {
  return client.post('/api/v1/procurement/orders', body);
}

export function submitProcurementOrder(id) {
  return client.post(`/api/v1/procurement/orders/${id}/submit`);
}

export function approveProcurementOrder(id, body) {
  return client.post(`/api/v1/procurement/orders/${id}/approve`, body);
}

export function receiveProcurementOrder(id, body) {
  return client.post(`/api/v1/procurement/orders/${id}/receive`, body);
}

export function fetchTransfersOverview() {
  return client.get('/api/v1/transfers/overview');
}

export function fetchTransfers() {
  return client.get('/api/v1/transfers');
}

export function fetchPrescriptions(params = {}) {
  return client.get('/api/v1/prescriptions', { params });
}

export function fetchPrescriptionDetail(id) {
  return client.get(`/api/v1/prescriptions/${id}`);
}

export function analyzePrescription(id) {
  return client.post(`/api/v1/prescriptions/${id}/analyze`);
}

export function reviewPrescription(id, body) {
  return client.post(`/api/v1/prescriptions/${id}/review`, body);
}

export function fetchStocktakes() {
  return client.get('/api/v1/stocktakes');
}

export function fetchRecalls() {
  return client.get('/api/v1/quality/recalls');
}

export function fetchReportKpis() {
  return client.get('/api/v1/reports/kpis');
}

export function fetchBusinessOverview() {
  return client.get('/api/v1/reports/business-overview');
}

export function fetchInventoryTurnover() {
  return client.get('/api/v1/reports/inventory-turnover');
}

export function fetchSalesTrend(days = 7) {
  return client.get('/api/v1/reports/sales-trend', { params: { days } });
}

export function fetchReportCategoryDistribution() {
  return client.get('/api/v1/reports/category-distribution');
}

export function fetchExpiryLoss() {
  return client.get('/api/v1/reports/expiry-loss');
}

export function fetchStockoutRate() {
  return client.get('/api/v1/reports/stockout-rate');
}

export function fetchUsers() {
  return client.get('/api/v1/iam/users');
}

export function fetchRoles() {
  return client.get('/api/v1/iam/roles');
}

export function fetchPermissions() {
  return client.get('/api/v1/iam/permissions');
}

export function fetchAuditLogs() {
  return client.get('/api/v1/iam/audit-logs');
}

export function fetchIntegrationJobs() {
  return client.get('/api/v1/integrations/jobs');
}

// ── 销售管理 ────────────────────────────────────────────────────────────────
export function fetchSalesOrders() {
  return client.get('/api/v1/sales/orders');
}

export function fetchSalesOrderDetail(id) {
  return client.get(`/api/v1/sales/orders/${id}`);
}

export function fetchSalesReturns() {
  return client.get('/api/v1/sales/returns');
}

export function createSaleOrder(body) {
  return client.post('/api/v1/sales/orders', body);
}

export function calculateSaleOrder(body) {
  return client.post('/api/v1/sales/orders/calculate', body);
}

export function paySaleOrder(id, body) {
  return client.post(`/api/v1/sales/orders/${id}/pay`, body);
}

export function cancelSaleOrder(id) {
  return client.post(`/api/v1/sales/orders/${id}/cancel`);
}

export function refundSaleOrder(id, body) {
  return client.post(`/api/v1/sales/orders/${id}/refund`, body);
}

export function fetchTraceCodes(traceCode) {
  return client.get('/api/v1/sales/trace-codes', { params: { traceCode } });
}

// ── 出入库管理 ──────────────────────────────────────────────────────────────
export function outboundBulk(body) {
  return client.post('/api/inventory/outbound', body);
}

// ── 调拨配送 ────────────────────────────────────────────────────────────────
export function fetchTransferDetail(id) {
  return client.get(`/api/v1/transfers/${id}`);
}

export function createTransfer(body) {
  return client.post('/api/v1/transfers', body);
}

export function dispatchTransfer(id, body) {
  return client.post(`/api/v1/transfers/${id}/dispatch`, body);
}

export function signTransfer(id, body) {
  return client.post(`/api/v1/transfers/${id}/sign`, body);
}

// ── 盘点损益 ────────────────────────────────────────────────────────────────
export function createStocktake(body) {
  return client.post('/api/v1/stocktakes', body);
}

export function approveStocktake(id, body) {
  return client.post(`/api/v1/stocktakes/${id}/approve`, body);
}

export function rejectStocktake(id, body) {
  return client.post(`/api/v1/stocktakes/${id}/reject`, body);
}

// ── 质量召回 ────────────────────────────────────────────────────────────────
export function createRecall(body) {
  return client.post('/api/v1/quality/recalls', body);
}

export function executeRecall(id, body) {
  return client.post(`/api/v1/quality/recalls/${id}/execute`, body);
}

export function completeRecall(id, body) {
  return client.post(`/api/v1/quality/recalls/${id}/complete`, body);
}

// ── 药品档案 ────────────────────────────────────────────────────────────────
export function fetchDrugDetail(id) {
  return client.get(`/api/drugs/${id}`);
}

export function createDrug(body) {
  return client.post('/api/drugs', body);
}

export function updateDrug(id, body) {
  return client.patch(`/api/drugs/${id}`, body);
}

// ── 系统管理/IAM ────────────────────────────────────────────────────────────
export function createUser(body) {
  return client.post('/api/v1/iam/users', body);
}

export function assignUserRoles(id, roleIds) {
  return client.post(`/api/v1/iam/users/${id}/roles`, { roleIds });
}

export function createRole(body) {
  return client.post('/api/v1/iam/roles', body);
}

export function deleteUser(id) {
  return client.delete(`/api/v1/iam/users/${id}`);
}

export function deleteRole(id) {
  return client.delete(`/api/v1/iam/roles/${id}`);
}

export function assignRolePerms(id, permissionIds) {
  return client.post(`/api/v1/iam/roles/${id}/permissions`, { permissionIds });
}

// ── 发药确认 ────────────────────────────────────────────────────────────────
export function dispensePrescription(id, body) {
  return client.post(`/api/v1/prescriptions/${id}/dispense`, body);
}
