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
