export const allModules = [
  { path: '/', key: 'dashboard', label: '仪表盘', shortLabel: '工作台', requiredPerm: 'dashboard.view' },
    { path: '/dispensing',  key: 'dispensing',  label: '发药与处方管理',   shortLabel: '发药处方', requiredPerm: 'prescription.view' },
  { path: '/drug-master', key: 'drugMaster', label: '药品基础数据管理', shortLabel: '药品档案', requiredPerm: 'inventory.drug.manage' },
  { path: '/procurement', key: 'suppliers', label: '采购与供应商管理', shortLabel: '采购管理', requiredPerm: 'procurement.order.view' },
  {
    path: '/inventory',
    key: 'inventory',
    label: '库存批次与货位管理',
    shortLabel: '库存批次',
    requiredPerm: 'inventory.batch.manage',
    children: [
      { path: '/inventory',           key: 'inventoryBatches',   label: '批次台账', shortLabel: '批次台账', requiredPerm: 'inventory.batch.manage' },
      { path: '/inventory/alerts',    key: 'inventoryAlerts',    label: '预警中心', shortLabel: '预警中心', requiredPerm: 'inventory.batch.manage' },
      { path: '/inventory/locations', key: 'inventoryLocations', label: '货位视图', shortLabel: '货位视图', requiredPerm: 'inventory.batch.manage' },
    ],
  },
  { path: '/warehouse',   key: 'warehouse',   label: '出入库管理',       shortLabel: '出入库',   requiredPerm: 'inventory.batch.manage' },
  { path: '/allocation',  key: 'allocation',  label: '调拨与配送管理',   shortLabel: '调拨配送', requiredPerm: 'transfer.view' },

  { path: '/sales',       key: 'sales',       label: '销售与收费管理',   shortLabel: '销售管理', requiredPerm: 'sales.order.view' },
  { path: '/stocktake',   key: 'stocktake',   label: '盘点与损益管理',   shortLabel: '盘点损益', requiredPerm: 'stocktake.view' },
  { path: '/quality',     key: 'quality',     label: '质量控制与召回管理', shortLabel: '质量召回', requiredPerm: 'quality.recall.view' },
  { path: '/analytics',   key: 'analytics',   label: '统计报表与分析中心', shortLabel: '分析中心', requiredPerm: 'report.kpi.view' },
  {
    path: '/system',
    key: 'system',
    label: '系统管理',
    shortLabel: '系统管理',
    children: [
      { path: '/system/users',  key: 'systemUsers',  label: '用户管理', shortLabel: '用户管理', requiredPerm: 'iam.user.view' },
      { path: '/system/roles',  key: 'systemRoles',  label: '角色权限', shortLabel: '角色权限', requiredPerm: 'iam.role.view' },
      { path: '/system/audit',  key: 'systemAudit',  label: '审计日志', shortLabel: '审计日志', requiredPerm: 'iam.audit.view' },
    ],
  },
];
