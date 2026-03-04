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
  return client.get('/api/inventory/overview', {
    params: { warehouseId }
  });
}

export function fetchInventoryBatches(warehouseId = 1) {
  return client.get('/api/inventory/batches', {
    params: { warehouseId }
  });
}

export function fetchInventoryTransactions(warehouseId = 1) {
  return client.get('/api/inventory/transactions', {
    params: { warehouseId }
  });
}

export function fetchInventoryLocations(warehouseId = 1) {
  return client.get('/api/inventory/locations', {
    params: { warehouseId }
  });
}

export function fetchLowStockAlerts(warehouseId = 1) {
  return client.get('/api/inventory/alerts/low-stock', {
    params: { warehouseId }
  });
}

export function fetchNearExpiryAlerts(warehouseId = 1, days = 30) {
  return client.get('/api/inventory/alerts/near-expiry', {
    params: { warehouseId, days }
  });
}

export function fetchProcurementOverview() {
  return client.get('/api/v1/procurement/overview');
}

export function fetchProcurementSuppliers() {
  return client.get('/api/v1/procurement/suppliers');
}

export function fetchProcurementOrders() {
  return client.get('/api/v1/procurement/orders');
}

export function fetchTransfersOverview() {
  return client.get('/api/v1/transfers/overview');
}

export function fetchTransfers() {
  return client.get('/api/v1/transfers');
}

export function fetchPrescriptions() {
  return client.get('/api/v1/prescriptions');
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
  return client.get('/api/v1/reports/sales-trend', {
    params: { days }
  });
}

export function fetchReportCategoryDistribution() {
  return client.get('/api/v1/reports/category-distribution');
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
