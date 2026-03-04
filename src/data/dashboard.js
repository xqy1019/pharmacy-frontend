export const dashboardStats = [
  { label: '在库药品 SKU', value: '6,482', change: '+12.4%', tone: 'primary' },
  { label: '今日发药单量', value: '1,286', change: '+8.1%', tone: 'accent' },
  { label: '临期批次预警', value: '37', change: '-4.6%', tone: 'warning' },
  { label: '召回闭环率', value: '98.7%', change: '+1.2%', tone: 'danger' }
];

export const todoItems = [
  { title: '高风险处方复核', desc: '12 张处方等待药师二审', level: '紧急', owner: '门诊药房' },
  { title: '批次效期巡检', desc: '3 个仓位 30 天内到期', level: '高', owner: '中心库房' },
  { title: '供应商续约提醒', desc: '2 份合同将在 7 天内到期', level: '中', owner: '采购部' },
  { title: '医保目录更新', desc: '待同步 18 条医保支付规则', level: '中', owner: '主数据组' }
];

export const alertItems = [
  { name: '阿莫西林胶囊', message: '主仓安全库存低于阈值 15%', severity: '库存预警' },
  { name: '盐酸肾上腺素注射液', message: '冷链仓温湿度超出标准 8 分钟', severity: '环境预警' },
  { name: '头孢呋辛酯片', message: '批号 CX240912 进入召回流程', severity: '质量预警' }
];

export const trendSeries = {
  categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  inbound: [120, 132, 141, 154, 160, 118, 96],
  outbound: [98, 122, 136, 149, 171, 134, 105]
};

export const warehouseDistribution = [
  { name: '中心库', value: 42 },
  { name: '门诊药房', value: 28 },
  { name: '住院药房', value: 19 },
  { name: '冷链仓', value: 11 }
];

export const kpiRanking = [
  { name: '门诊药房', value: 96 },
  { name: '住院药房', value: 91 },
  { name: '静配中心', value: 88 },
  { name: '中心库', value: 84 }
];
