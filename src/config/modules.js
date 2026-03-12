export const allModules = [
  { path: '/', key: 'dashboard', label: '仪表盘', shortLabel: '工作台', requiredPerm: 'dashboard.view' },

  { path: '/dispensing', key: 'dispensing', label: '发药与处方管理', shortLabel: '发药处方', requiredPerm: 'prescription.view' },

  // ── 药品管理 ──────────────────────────────────────────────────────────────
  {
    path: '/drug-master',
    key: 'drugManagement',
    label: '药品管理',
    shortLabel: '药品管理',
    requiredPerms: ['inventory.drug.manage', 'controlled.drug.manage'],
    children: [
      { path: '/drug-master',      key: 'drugMaster',      label: '药品档案',        shortLabel: '药品档案', requiredPerm: 'inventory.drug.manage' },
      { path: '/controlled-drugs', key: 'controlledDrugs', label: '麻醉和精神药品', shortLabel: '麻精管理', requiredPerm: 'controlled.drug.manage' },
    ],
  },

  // ── 采购与入库 ────────────────────────────────────────────────────────────
  {
    path: '/procurement',
    key: 'procurementGroup',
    label: '采购与入库管理',
    shortLabel: '采购入库',
    requiredPerms: ['procurement.order.view', 'inventory.batch.manage'],
    children: [
      { path: '/procurement', key: 'procurement', label: '采购管理',   shortLabel: '采购管理', requiredPerm: 'procurement.order.view' },
      { path: '/warehouse',   key: 'warehouse',   label: '出入库管理', shortLabel: '出入库',   requiredPerm: 'inventory.batch.manage' },
    ],
  },

  // ── 库存管理 ──────────────────────────────────────────────────────────────
  {
    path: '/inventory',
    key: 'inventoryGroup',
    label: '库存管理',
    shortLabel: '库存管理',
    requiredPerm: 'inventory.batch.manage',
    children: [
      { path: '/inventory',             key: 'inventoryBatches',     label: '批次台账', shortLabel: '批次台账', requiredPerm: 'inventory.batch.manage' },
      { path: '/inventory/alerts',      key: 'inventoryAlerts',      label: '预警中心', shortLabel: '预警中心', requiredPerm: 'inventory.batch.manage' },
      { path: '/inventory/locations',   key: 'inventoryLocations',   label: '货位视图', shortLabel: '货位视图', requiredPerm: 'inventory.batch.manage' },
      { path: '/inventory/temperature', key: 'inventoryTemperature', label: '冷链温控', shortLabel: '冷链温控', requiredPerm: 'inventory.batch.manage' },
      { path: '/allocation',            key: 'allocation',           label: '调拨与配送', shortLabel: '调拨配送', requiredPerm: 'transfer.view' },
    ],
  },

  { path: '/sales', key: 'sales', label: '销售与收费管理', shortLabel: '销售管理', requiredPerm: 'sales.order.view' },

  // ── 盘点与质量 ────────────────────────────────────────────────────────────
  {
    path: '/stocktake',
    key: 'qualityGroup',
    label: '盘点与质量管理',
    shortLabel: '盘点质量',
    requiredPerms: ['stocktake.view', 'quality.recall.view'],
    children: [
      { path: '/stocktake',   key: 'stocktake',    label: '盘点与损益',   shortLabel: '盘点损益', requiredPerm: 'stocktake.view' },
      { path: '/quality',     key: 'qualityRecall', label: '质量召回',    shortLabel: '质量召回', requiredPerm: 'quality.recall.view' },
      { path: '/quality/adr', key: 'qualityAdr',   label: 'ADR不良反应', shortLabel: 'ADR上报',  requiredPerm: 'quality.recall.view' },
    ],
  },

  { path: '/analytics', key: 'analytics', label: '统计报表与分析中心', shortLabel: '分析中心', requiredPerm: 'report.kpi.view' },

  // ── 系统管理 ──────────────────────────────────────────────────────────────
  {
    path: '/system',
    key: 'system',
    label: '系统管理',
    shortLabel: '系统管理',
    children: [
      { path: '/system/users', key: 'systemUsers', label: '用户管理', shortLabel: '用户管理', requiredPerm: 'iam.user.view' },
      { path: '/system/roles', key: 'systemRoles', label: '角色权限', shortLabel: '角色权限', requiredPerm: 'iam.role.view' },
      { path: '/system/audit', key: 'systemAudit', label: '审计日志', shortLabel: '审计日志', requiredPerm: 'iam.audit.view' },
      { path: '/system/integration', key: 'systemIntegration', label: '系统集成配置', shortLabel: '系统集成', requiredPerm: 'integration.job.view' },
    ],
  },
];
