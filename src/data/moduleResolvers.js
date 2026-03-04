import {
  fetchAuditLogs,
  fetchBusinessOverview,
  fetchDashboardOverview,
  fetchDrugs,
  fetchDrugCategories,
  fetchIntegrationJobs,
  fetchInventoryBatches,
  fetchInventoryLocations,
  fetchInventoryOverview,
  fetchInventoryTransactions,
  fetchInventoryTurnover,
  fetchLowStockAlerts,
  fetchNearExpiryAlerts,
  fetchPermissions,
  fetchPrescriptions,
  fetchProcurementOrders,
  fetchProcurementOverview,
  fetchProcurementSuppliers,
  fetchRecalls,
  fetchReportCategoryDistribution,
  fetchReportKpis,
  fetchRoles,
  fetchSalesTrend,
  fetchStocktakes,
  fetchTransfers,
  fetchTransfersOverview,
  fetchUsers
} from '../api/pharmacy';
import { flattenCategoryTree, formatDate, formatDateTime, formatNumber, formatPercent } from '../utils/formatters';

function metric(label, value, detail) {
  return {
    label,
    value,
    detail
  };
}

function chartPoint(name, value) {
  return {
    name,
    value: Number(value || 0)
  };
}

export const moduleResolvers = {
  drugMaster: async () => {
    const [drugs, categories] = await Promise.all([fetchDrugs(), fetchDrugCategories()]);
    const flatCategories = flattenCategoryTree(categories);
    const pendingCompliance = drugs.filter((item) => item.complianceStatus === 'PENDING').length;

    return {
      title: '药品基础数据管理',
      subtitle: '药品档案与分类维护。',
      metrics: [
        metric('药品档案数', formatNumber(drugs.length), `启用品规 ${formatNumber(drugs.length)} 个`),
        metric('分类节点', formatNumber(flatCategories.length), `一级/二级分类共 ${formatNumber(flatCategories.length)} 个`),
        metric('合规待处理', formatNumber(pendingCompliance), '按药品合规状态实时统计')
      ],
      chartTitle: '药品分类分布',
      chartData: flatCategories.slice(0, 6).map((item) => chartPoint(item.categoryName, item.children?.length || 1)),
      tasks: [
        `待处理合规药品 ${pendingCompliance} 个`,
        `分类树节点 ${flatCategories.length} 个`,
        `最近更新药品：${drugs[0]?.name || '--'}`,
        `优先供应商样本：${drugs[0]?.preferredSupplierName || '--'}`
      ],
      tableTitle: '药品档案',
      tableColumns: ['药品编码', '药品名称', '规格', '分类', '生产厂家', '合规状态'],
      tableRows: drugs.slice(0, 10).map((item) => [
        item.drugCode,
        item.name,
        item.spec,
        item.category,
        item.manufacturer,
        item.complianceStatusLabel
      ])
    };
  },
  suppliers: async () => {
    const [overview, suppliers, orders] = await Promise.all([
      fetchProcurementOverview(),
      fetchProcurementSuppliers(),
      fetchProcurementOrders()
    ]);

    return {
      title: '采购与供应商管理',
      subtitle: '采购计划、订单与供应商履约管理。',
      metrics: [
        metric('供应商总数', formatNumber(overview.supplierTotal), `有效供应商 ${formatNumber(overview.validSuppliers)} 家`),
        metric('采购订单', formatNumber(overview.orderTotal), `待到货 ${formatNumber(overview.dueArrivals)} 单`),
        metric('采购达成率', formatPercent(overview.procurementAchieveRate, 2), `累计金额 ¥${formatNumber(overview.totalProcurementAmount)}`)
      ],
      chartTitle: '供应商状态',
      chartData: [
        chartPoint('有效', overview.validSuppliers),
        chartPoint('总量', overview.supplierTotal),
        chartPoint('待审批', overview.pendingApproval),
        chartPoint('待到货', overview.dueArrivals)
      ],
      tasks: [
        `待到货订单 ${overview.dueArrivals} 单`,
        `有效供应商 ${suppliers.length} 家`,
        `最新订单：${orders[0]?.orderNo || '--'}`,
        `最新供应商：${suppliers[0]?.name || '--'}`
      ],
      tableTitle: '采购订单',
      tableColumns: ['订单号', '供应商', '总金额', '订单状态', '审批状态', '计划到货'],
      tableRows: orders.slice(0, 10).map((item) => [
        item.orderNo,
        item.supplierName,
        `¥${formatNumber(item.totalAmount)}`,
        item.statusLabel,
        item.approvalStatusLabel,
        formatDate(item.plannedArrivalDate)
      ])
    };
  },
  inventory: async () => {
    const [overview, batches, lowStock, nearExpiry] = await Promise.all([
      fetchInventoryOverview(),
      fetchInventoryBatches(),
      fetchLowStockAlerts(),
      fetchNearExpiryAlerts()
    ]);

    return {
      title: '库存批次与货位管理',
      subtitle: '库存概览、批次台账与预警管理。',
      metrics: [
        metric('批次数量', formatNumber(overview.totalBatchCount), `货位数 ${formatNumber(overview.locationCount)}`),
        metric('可用库存', formatNumber(overview.availableQty), `冻结 ${formatNumber(overview.frozenQty)} / 预留 ${formatNumber(overview.reservedQty)}`),
        metric('库存预警', formatNumber(overview.lowStockCount + overview.nearExpiryCount), `低库存 ${overview.lowStockCount}，近效期 ${overview.nearExpiryCount}`)
      ],
      chartTitle: '库存告警结构',
      chartData: [
        chartPoint('低库存', overview.lowStockCount),
        chartPoint('近效期', overview.nearExpiryCount),
        chartPoint('缺失追溯码', overview.missingTraceCount),
        chartPoint('异常批次', overview.abnormalBatchCount)
      ],
      tasks: [
        `低库存药品 ${lowStock.length} 个`,
        `30 天内近效期批次 ${nearExpiry.length} 个`,
        `最新批次：${batches[0]?.batchNo || '--'}`,
        `当前仓库 ID：${overview.warehouseId}`
      ],
      tableTitle: '库存批次台账',
      tableColumns: ['批号', '药品', '货位', '可用量', '效期', '质量状态'],
      tableRows: batches.slice(0, 10).map((item) => [
        item.batchNo,
        item.drugName,
        item.locationCode,
        formatNumber(item.availableQty),
        formatDate(item.expiryDate),
        item.qualityStatusLabel
      ])
    };
  },
  warehouse: async () => {
    const [transactions, locations, overview] = await Promise.all([
      fetchInventoryTransactions(),
      fetchInventoryLocations(),
      fetchInventoryOverview()
    ]);

    return {
      title: '出入库管理',
      subtitle: '入库、出库、冻结与移位流转管理。',
      metrics: [
        metric('库存流水', formatNumber(transactions.length), `展示最近 ${formatNumber(transactions.length)} 条记录`),
        metric('货位总数', formatNumber(locations.length), `有效货位 ${formatNumber(locations.length)} 个`),
        metric('在库总量', formatNumber(overview.totalQty), `可用量 ${formatNumber(overview.availableQty)}`)
      ],
      chartTitle: '库存流水类型',
      chartData: Object.entries(
        transactions.reduce((acc, item) => {
          acc[item.txTypeLabel] = (acc[item.txTypeLabel] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => chartPoint(name, value)),
      tasks: [
        `最新流水类型：${transactions[0]?.txTypeLabel || '--'}`,
        `最新操作药品：${transactions[0]?.drugName || '--'}`,
        `最新货位：${locations[0]?.locationCode || '--'}`,
        `异常批次 ${overview.abnormalBatchCount} 个`
      ],
      tableTitle: '出入库流水',
      tableColumns: ['流水类型', '药品', '批号', '数量', '货位', '发生时间'],
      tableRows: transactions.slice(0, 10).map((item) => [
        item.txTypeLabel,
        item.drugName,
        item.batchNo,
        formatNumber(item.qty),
        item.locationCode || '--',
        item.occurredAt
      ])
    };
  },
  allocation: async () => {
    const [overview, transfers] = await Promise.all([fetchTransfersOverview(), fetchTransfers()]);

    return {
      title: '调拨与配送管理',
      subtitle: '调拨、在途、签收与异常状态管理。',
      metrics: [
        metric('调拨总单数', formatNumber(overview.total), `待处理 ${formatNumber(overview.pending)} 单`),
        metric('在途任务', formatNumber(overview.inTransit), `异常 ${formatNumber(overview.abnormal)} 单`),
        metric('已签收', formatNumber(overview.signed), `含差异签收单据`)
      ],
      chartTitle: '调拨状态分布',
      chartData: [
        chartPoint('待处理', overview.pending),
        chartPoint('在途', overview.inTransit),
        chartPoint('已签收', overview.signed),
        chartPoint('异常', overview.abnormal)
      ],
      tasks: [
        `最新调拨单：${transfers[0]?.orderNo || '--'}`,
        `最新目的地：${transfers[0]?.toStore || '--'}`,
        `配送承运：${transfers[0]?.carrierName || '--'}`,
        `超时/异常 ${overview.abnormal} 单`
      ],
      tableTitle: '调拨配送单',
      tableColumns: ['单号', '调出', '调入', '状态', '承运人', '创建时间'],
      tableRows: transfers.slice(0, 10).map((item) => [
        item.orderNo,
        item.fromStore,
        item.toStore,
        item.statusLabel,
        item.carrierName || '--',
        formatDateTime(item.createdAt)
      ])
    };
  },
  dispensing: async () => {
    const prescriptions = await fetchPrescriptions();
    const pendingCount = prescriptions.filter((item) => item.status === 'PENDING').length;
    const highRiskCount = prescriptions.filter((item) => item.riskLevel === 'HIGH').length;

    return {
      title: '发药与处方管理',
      subtitle: '处方审核、风险等级与审方结论管理。',
      metrics: [
        metric('处方总数', formatNumber(prescriptions.length), `待处理 ${formatNumber(pendingCount)} 张`),
        metric('高风险处方', formatNumber(highRiskCount), '来自审方分析风险等级'),
        metric('已审核处方', formatNumber(prescriptions.length - pendingCount), '包含通过和驳回')
      ],
      chartTitle: '处方状态',
      chartData: Object.entries(
        prescriptions.reduce((acc, item) => {
          acc[item.statusLabel] = (acc[item.statusLabel] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => chartPoint(name, value)),
      tasks: [
        `待处理处方 ${pendingCount} 张`,
        `高风险处方 ${highRiskCount} 张`,
        `最新处方号：${prescriptions[0]?.rxNo || '--'}`,
        `最近审方药师：${prescriptions[0]?.reviewedBy || '--'}`
      ],
      tableTitle: '处方审核记录',
      tableColumns: ['处方号', '患者', '医生', '科室', '状态', '风险等级'],
      tableRows: prescriptions.slice(0, 10).map((item) => [
        item.rxNo,
        item.patientName,
        item.doctorName,
        item.departmentName || '--',
        item.statusLabel,
        item.riskLevelLabel
      ])
    };
  },
  stocktake: async () => {
    const stocktakes = await fetchStocktakes();
    const pendingCount = stocktakes.filter((item) => item.status === 'PENDING').length;

    return {
      title: '盘点与损益管理',
      subtitle: '盘点差异与损益调整管理。',
      metrics: [
        metric('盘点记录', formatNumber(stocktakes.length), `待复核 ${formatNumber(pendingCount)} 条`),
        metric('盘亏数量', formatNumber(stocktakes.filter((item) => item.diffType === 'LOSS').length), '按差异类型统计'),
        metric('已完成调整', formatNumber(stocktakes.filter((item) => item.adjustmentStatus === 'DONE').length), '已回写库存')
      ],
      chartTitle: '盘点状态分布',
      chartData: Object.entries(
        stocktakes.reduce((acc, item) => {
          acc[item.statusLabel] = (acc[item.statusLabel] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => chartPoint(name, value)),
      tasks: [
        `最新盘点药品：${stocktakes[0]?.drugName || '--'}`,
        `差异原因：${stocktakes[0]?.reason || '--'}`,
        `待复核 ${pendingCount} 条`,
        `已调整 ${stocktakes.filter((item) => item.adjustmentStatus === 'DONE').length} 条`
      ],
      tableTitle: '盘点差异记录',
      tableColumns: ['药品', '批号', '系统数', '实盘数', '差异', '状态'],
      tableRows: stocktakes.slice(0, 10).map((item) => [
        item.drugName,
        item.batchNo || '--',
        formatNumber(item.systemQty),
        formatNumber(item.actualQty),
        formatNumber(item.diffQty),
        item.statusLabel
      ])
    };
  },
  quality: async () => {
    const recalls = await fetchRecalls();
    const executingCount = recalls.filter((item) => item.status === 'EXECUTING').length;

    return {
      title: '质量控制与召回管理',
      subtitle: '召回通知、执行、冻结与闭环管理。',
      metrics: [
        metric('召回记录', formatNumber(recalls.length), `执行中 ${formatNumber(executingCount)} 条`),
        metric('受影响数量', formatNumber(recalls.reduce((sum, item) => sum + Number(item.affectedQty || 0), 0)), '按召回记录累计'),
        metric('冻结数量', formatNumber(recalls.reduce((sum, item) => sum + Number(item.frozenQty || 0), 0)), '已冻结批次数量')
      ],
      chartTitle: '召回状态',
      chartData: Object.entries(
        recalls.reduce((acc, item) => {
          acc[item.statusLabel] = (acc[item.statusLabel] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => chartPoint(name, value)),
      tasks: [
        `执行中召回 ${executingCount} 条`,
        `最新召回批号：${recalls[0]?.batchNo || '--'}`,
        `处置方式：${recalls[0]?.dispositionTypeLabel || '--'}`,
        `执行人：${recalls[0]?.executedBy || '--'}`
      ],
      tableTitle: '召回记录',
      tableColumns: ['批号', '药品', '召回等级', '受影响数量', '执行进度', '状态'],
      tableRows: recalls.slice(0, 10).map((item) => [
        item.batchNo,
        item.drugName,
        item.recallLevelLabel,
        formatNumber(item.affectedQty),
        `${formatNumber(item.executionProgress)}%`,
        item.statusLabel
      ])
    };
  },
  analytics: async () => {
    const [kpis, overview, salesTrend, categoryDistribution] = await Promise.all([
      fetchReportKpis(),
      fetchBusinessOverview(),
      fetchSalesTrend(),
      fetchReportCategoryDistribution()
    ]);

    return {
      title: '统计报表与分析中心',
      subtitle: 'KPI、经营概览、销售趋势与品类分析。',
      metrics: [
        metric('总库存量', formatNumber(kpis.totalInventory), `近效期 ${formatNumber(kpis.nearExpiry)} 项`),
        metric('缺货风险', formatNumber(kpis.lowStock), '按缺货阈值实时统计'),
        metric('采购达成率', formatPercent(kpis.procurementAchieveRate, 2), `销售额 ¥${formatNumber(kpis.salesAmount)}`)
      ],
      chartTitle: '近 7 日销售趋势',
      chartData: salesTrend.map((item) => chartPoint(item.date.slice(5), item.salesAmount)),
      tasks: [
        `供应商排行第 1：${overview.supplierRanking?.[0]?.supplierName || '--'}`,
        `库存周转样本 ${overview.inventoryTurnover?.length || 0} 条`,
        `品类分布 ${categoryDistribution.length} 组`,
        `滞销药品提醒：${overview.inventoryTurnover?.[0]?.drugName || '--'}`
      ],
      tableTitle: '库存周转分析',
      tableColumns: ['药品', '分类', '库存量', '30天销量', '周转天数', '状态'],
      tableRows: (overview.inventoryTurnover || []).slice(0, 10).map((item) => [
        item.drugName,
        item.category,
        formatNumber(item.stockQty),
        formatNumber(item.soldQty30d),
        formatNumber(item.turnoverDays),
        item.turnoverDays >= 999 ? '低周转' : '正常'
      ])
    };
  },
  system: async () => {
    const [users, roles, permissions, auditLogs, jobs] = await Promise.all([
      fetchUsers(),
      fetchRoles(),
      fetchPermissions(),
      fetchAuditLogs(),
      fetchIntegrationJobs()
    ]);

    return {
      title: '系统管理与权限审计',
      subtitle: '用户、角色、权限、审计与接口任务管理。',
      metrics: [
        metric('系统用户', formatNumber(users.length), `角色数 ${formatNumber(roles.length)}`),
        metric('权限项', formatNumber(permissions.length), `管理员权限 ${roles[0]?.permissionCount || 0}`),
        metric('接口任务', formatNumber(jobs.length), `审计日志 ${formatNumber(auditLogs.length)} 条`)
      ],
      chartTitle: '接口任务状态',
      chartData: Object.entries(
        jobs.reduce((acc, item) => {
          acc[item.statusLabel] = (acc[item.statusLabel] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => chartPoint(name, value)),
      tasks: [
        `在线管理账号样本：${users[0]?.username || '--'}`,
        `审计最新动作：${auditLogs[0]?.action || '--'}`,
        `最新接口平台：${jobs[0]?.platform || '--'}`,
        `权限模块覆盖 ${new Set(permissions.map((item) => item.module)).size} 个域`
      ],
      tableTitle: '审计与接口任务',
      tableColumns: ['时间/编号', '主体', '模块/平台', '动作/方向', '状态', '说明'],
      tableRows: [
        ...auditLogs.slice(0, 5).map((item) => [
          formatDateTime(item.createdAt),
          item.username,
          item.module,
          item.action,
          '已记录',
          JSON.stringify(item.detail || {})
        ]),
        ...jobs.slice(0, 5).map((item) => [
          item.jobNo,
          item.platform,
          item.bizType,
          item.directionLabel,
          item.statusLabel,
          item.responseMessage || '--'
        ])
      ]
    };
  }
};
