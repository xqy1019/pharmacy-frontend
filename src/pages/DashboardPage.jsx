import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDashboardOverview,
  fetchIntegrationJobs,
  fetchInventoryTurnover,
  fetchPrescriptions,
  fetchProcurementOverview,
  fetchTransfersOverview,
} from '../api/pharmacy';
import AiAnalysisPanel from '../components/AiAnalysisPanel';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatNumber, formatPercent } from '../utils/formatters';

function AlertRow({ icon, label, count, unit, urgency, to }) {
  const urgencyStyle = {
    high: 'bg-rose-50 border-rose-200 text-rose-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-slate-50 border-slate-200 text-slate-600'
  }[urgency] || 'bg-slate-50 border-slate-200 text-slate-600';

  const countStyle = {
    high: 'text-rose-600',
    medium: 'text-amber-600',
    low: 'text-slate-700'
  }[urgency] || 'text-slate-700';

  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm ${urgencyStyle}`}>
      <span className="text-sm">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className={`text-base font-bold tabular-nums ${countStyle}`}>{count}</span>
      <span className="text-xs opacity-60">{unit}</span>
      <svg className="shrink-0 opacity-40" width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function QuickLink({ icon, label, to, badge }) {
  return (
    <Link to={to} className="group flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-sm">
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium text-slate-700 group-hover:text-cyan-700">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 leading-none">{badge}</span>
      )}
    </Link>
  );
}

function DashboardPage() {
  const { data, loading, error } = useAsyncData(
    async () => {
      const [overview, procurementOverview, transferOverview, prescriptions, integrationJobs] = await Promise.all([
        fetchDashboardOverview(),
        fetchProcurementOverview(),
        fetchTransfersOverview(),
        fetchPrescriptions(),
        fetchIntegrationJobs()
      ]);

      return { overview, procurementOverview, transferOverview, prescriptions, integrationJobs };
    },
    []
  );

  const overview = data?.overview;

  const dashboardStats = useMemo(() => {
    if (!overview) return [];
    return [
      { label: '库存总量', value: formatNumber(overview.totalInventory), change: `${formatNumber(overview.inventoryWarningCount)} 条预警`, tone: 'primary' },
      { label: '近效期批次', value: formatNumber(overview.nearExpiry), change: '30 天内效期风险', tone: 'warning' },
      { label: '低库存药品', value: formatNumber(overview.lowStock), change: '需补货关注', tone: 'accent' },
      { label: '采购达成率', value: formatPercent(overview.procurementAchieveRate, 2), change: `待审处方 ${formatNumber(overview.pendingPrescriptions)}`, tone: 'danger' }
    ];
  }, [overview]);

  const pendingPrescriptions = useMemo(() => {
    const list = data?.prescriptions || [];
    return {
      pending: list.filter((p) => p.status === 'PENDING').length,
      highRisk: list.filter((p) => p.riskLevel === 'HIGH').length,
      rejected: list.filter((p) => p.status === 'REJECTED').length,
      latest: list[0]
    };
  }, [data]);

  const integrationSummary = useMemo(() => {
    const jobs = data?.integrationJobs || [];
    return {
      total: jobs.length,
      pending: jobs.filter((item) => item.status === 'PENDING').length,
      success: jobs.filter((item) => item.status === 'SUCCESS').length,
      latest: jobs[0]
    };
  }, [data]);

  const categoryBarOption = useMemo(() => {
    const dist = [...(overview?.inventoryDistribution || [])].sort((a, b) => Number(b.qty) - Number(a.qty));
    const palette = ['#0ea5a4', '#2f80ed', '#7c3aed', '#d97706', '#dc5b73', '#64748b', '#059669', '#b45309'];
    return {
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params) => `${params[0].name}<br/>库存量：<b>${formatNumber(params[0].value)}</b>`
      },
      grid: { left: 16, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: dist.map((d) => d.category),
        axisLabel: { color: '#486173', fontSize: 11, interval: 0 },
        axisLine: { lineStyle: { color: '#d6e2ea' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#6b879b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e6eef3', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        barWidth: 32,
        barMaxWidth: 48,
        data: dist.map((d, i) => ({
          value: Number(d.qty || 0),
          itemStyle: {
            color: palette[i % palette.length],
            borderRadius: [6, 6, 0, 0],
            opacity: 0.88
          }
        })),
        label: {
          show: true, position: 'top', color: '#486173', fontSize: 11,
          formatter: (p) => formatNumber(p.value)
        },
        emphasis: { itemStyle: { opacity: 1 } }
      }]
    };
  }, [overview]);

  const expiryRiskOption = useMemo(() => {
    const list = overview?.nearExpiryTop10 || [];
    const today = Date.now();
    // 优先用 daysToExpiry，缺失时从 expiryDate 计算
    const days = (d) => {
      if (d.daysToExpiry != null) return Number(d.daysToExpiry);
      if (d.expiryDate) return Math.ceil((new Date(d.expiryDate) - today) / 86400000);
      return 999;
    };
    const buckets = [
      { name: '≤7天',   color: '#ef4444', test: (v) => v <= 7 },
      { name: '8-15天', color: '#f97316', test: (v) => v > 7 && v <= 15 },
      { name: '16-30天', color: '#eab308', test: (v) => v > 15 && v <= 30 }
    ].map((b) => ({ ...b, count: list.filter((d) => b.test(days(d))).length }))
     .filter((b) => b.count > 0);

    // 若实在无法分桶，按品类分组展示
    const finalData = buckets.length > 0
      ? buckets.map((b) => ({ name: b.name, value: b.count, itemStyle: { color: b.color } }))
      : (() => {
          const byCategory = {};
          list.forEach((d) => { byCategory[d.category || '其他'] = (byCategory[d.category || '其他'] || 0) + 1; });
          const colors = ['#f97316', '#eab308', '#0ea5a4', '#2f80ed', '#7c3aed'];
          return Object.entries(byCategory).map(([name, value], i) => ({
            name, value, itemStyle: { color: colors[i % colors.length] }
          }));
        })();

    return {
      tooltip: { trigger: 'item', formatter: (p) => `${p.name}：${p.value} 批 (${p.percent}%)` },
      legend: { bottom: 0, textStyle: { color: '#6b879b', fontSize: 11 }, icon: 'circle', itemGap: 10 },
      series: [{
        type: 'pie', radius: ['44%', '64%'], center: ['50%', '42%'],
        data: finalData,
        itemStyle: { borderRadius: 4, borderColor: '#f4f8fb', borderWidth: 3 },
        label: { show: finalData.length > 1, formatter: '{b}:{c}批', color: '#486173', fontSize: 10 },
        labelLine: { length: 6, length2: 4 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.15)' } }
      }]
    };
  }, [overview]);

  const barOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params) => `${params[0].name}<br/>库存量：<b>${formatNumber(params[0].value)}</b>`
    },
    grid: { left: 12, right: 56, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#6b879b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#e6eef3', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'category',
      data: (overview?.lowTurnoverTop5 || []).map((item) => item.drugName),
      axisLabel: { color: '#486173', fontSize: 11, width: 72, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#d6e2ea' } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar', barWidth: 16, barMaxWidth: 20,
      data: (overview?.lowTurnoverTop5 || []).map((item) => Number(item.stockQty || 0)),
      itemStyle: { borderRadius: [0, 6, 6, 0], color: '#94a3b8', opacity: 0.88 },
      label: {
        show: true, position: 'right', color: '#486173', fontSize: 11,
        formatter: (p) => formatNumber(p.value)
      },
      emphasis: { itemStyle: { opacity: 1 } }
    }]
  }), [overview]);

  if (loading || !overview) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-600 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">正在加载首页数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">首页数据加载失败：{error}</div>;
  }

  const warningCount = overview.inventoryWarningCount || 0;
  const pendingRx = overview.pendingPrescriptions || 0;
  const nearExpiryCount = overview.nearExpiry || 0;
  const lowStockCount = overview.lowStock || 0;

  return (
    <div className="space-y-4">
      {/* ── 第一行：KPI 统计 ── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((item, index) => (
          <div key={item.label} className="animate-rise" style={{ animationDelay: `${index * 70}ms` }}>
            <StatCard {...item} />
          </div>
        ))}
      </section>

      {/* ── 第二行：业务趋势图 + 待处理 & 快捷入口 ── */}
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* 左：品类库存分布 */}
        <ChartCard title="品类库存分布" subtitle="各品类当前库存量，按数量降序排列" option={categoryBarOption} height={300} />

        {/* 右：待处理事项 + 快捷入口 */}
        <div className="flex flex-col gap-4">
          {/* 待处理事项 + 底部3个独立快捷入口 */}
          <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">待处理事项</h3>
              {(pendingRx + warningCount) > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {pendingRx + warningCount} 项
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <AlertRow icon="📋" label="待审处方" count={pendingRx} unit="张"
                urgency={pendingRx > 5 ? 'high' : pendingRx > 0 ? 'medium' : 'low'} to="/dispensing" />
              <AlertRow icon="🔴" label="高风险处方" count={pendingPrescriptions.highRisk} unit="张"
                urgency={pendingPrescriptions.highRisk > 0 ? 'high' : 'low'} to="/dispensing" />
              <AlertRow icon="📉" label="低库存预警" count={lowStockCount} unit="种"
                urgency={lowStockCount > 10 ? 'high' : lowStockCount > 0 ? 'medium' : 'low'} to="/inventory/alerts" />
              <AlertRow icon="⏳" label="近效期批次" count={nearExpiryCount} unit="批"
                urgency={nearExpiryCount > 5 ? 'high' : nearExpiryCount > 0 ? 'medium' : 'low'} to="/inventory/alerts" />
              <AlertRow icon="🚚" label="采购待到货" count={data?.procurementOverview?.dueArrivals || 0} unit="单"
                urgency={data?.procurementOverview?.dueArrivals > 0 ? 'medium' : 'low'} to="/procurement" />
              <AlertRow icon="🔗" label="接口任务" count={integrationSummary.pending} unit="条"
                urgency={integrationSummary.pending > 0 ? 'medium' : 'low'} to="/system" />
            </div>

            {/* 分隔线 + 3个无待处理计数的独立入口 */}
            <div className="mt-3 border-t border-slate-100 pt-3 grid grid-cols-3 gap-2">
              <QuickLink icon="📦" label="库存批次" to="/inventory" />
              <QuickLink icon="🔄" label="调拨配送" to="/allocation" badge={data?.transferOverview?.pending || 0} />
              <QuickLink icon="📊" label="分析中心" to="/analytics" />
            </div>
          </div>
        </div>
      </section>

      {/* ── AI 运营洞察 ── */}
      <AiAnalysisPanel
        context={{ page: '仪表盘' }}
        actions={[
          {
            key: 'daily_report',
            icon: '📋',
            label: '今日运营简报',
            getPrompt: () => {
              const kpis = [
                `- 库存总量：${formatNumber(overview.totalInventory)} 种`,
                `- 库存预警：${overview.inventoryWarningCount} 条（低库存 ${overview.lowStock} 种，近效期 ${overview.nearExpiry} 批）`,
                `- 待审处方：${overview.pendingPrescriptions} 张`,
                `- 今日销售：¥${formatNumber(overview.todaySales)}`,
                `- 采购达成率：${formatPercent(overview.procurementAchieveRate, 2)}`,
                `- 待到货采购单：${data?.procurementOverview?.dueArrivals || 0} 单`,
                `- 调拨待处理：${data?.transferOverview?.pending || 0} 单`,
              ].join('\n');
              const expiryTop = (overview.nearExpiryTop10 || []).slice(0, 5)
                .map((i) => `- ${i.drugName}（批号 ${i.batchNo}）：效期 ${formatDate(i.expiryDate)}，可售 ${formatNumber(i.availableQty)}`)
                .join('\n') || '  暂无';
              return `你是专业药房运营分析师。请根据以下今日药房运营数据，生成一份简洁的运营简报：

## 今日核心 KPI
${kpis}

## 近效期 Top5
${expiryTop}

请：
1. 用 2~3 句话评价今日整体运营状态（好/一般/需关注）
2. 指出 2~3 个最需要优先处理的问题，并说明原因
3. 给出 1~2 条明确的行动建议

语言简洁专业，使用 Markdown 格式，重点加粗。`;
            },
          },
          {
            key: 'risk',
            icon: '⚠️',
            label: '风险综合评估',
            getPrompt: async () => {
              const turnover = await fetchInventoryTurnover().catch(() => []);
              const lowTurnoverLines = (turnover || []).slice(0, 5)
                .map((t) => `- ${t.drugName || t.name || JSON.stringify(t)}`)
                .join('\n') || '  暂无低周转数据';
              const expiryLines = (overview.nearExpiryTop10 || []).slice(0, 5)
                .map((i) => `- ${i.drugName}：距效期 ${Math.ceil((new Date(i.expiryDate) - new Date()) / 86400000)} 天，可售 ${formatNumber(i.availableQty)}`)
                .join('\n') || '  暂无';
              return `你是专业药房风险管理药师。请对以下药房数据进行综合风险评估：

## 库存风险指标
- 低库存品种：${overview.lowStock} 种
- 近效期批次：${overview.nearExpiry} 批
- 库存预警总数：${overview.inventoryWarningCount} 条

## 效期风险 Top5
${expiryLines}

## 低周转品种 Top5（积压风险）
${lowTurnoverLines}

## 业务风险
- 待审处方：${overview.pendingPrescriptions} 张（含高风险处方）
- 采购达成率：${formatPercent(overview.procurementAchieveRate, 2)}

请：
1. 从库存安全、效期管理、业务连续性三个维度给出综合风险评级（🔴高/🟡中/🟢低）
2. 识别出当前最突出的 2~3 个风险点，说明潜在影响
3. 给出针对每个风险点的改善建议

结构清晰，使用 Markdown 格式。`;
            },
          },
        ]}
      />

      {/* ── 第三行：库存分布 + 低周转 + 近效期列表 ── */}
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <ChartCard title="近效期风险分布" subtitle="按剩余天数分层（批次数）" option={expiryRiskOption} height={220} />
        <ChartCard title="低周转药品 Top 5" subtitle="按库存量监控" option={barOption} height={220} />

        {/* 近效期预警列表 */}
        <div className="rounded-2xl border border-white bg-white p-4 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">近效期预警</h3>
            <Link to="/inventory/alerts" className="text-xs text-cyan-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-2">
            {(overview?.nearExpiryTop10 || []).slice(0, 5).map((item) => (
              <div key={item.batchNo} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{item.drugName}</div>
                  <div className="text-xs text-slate-500">{item.batchNo} · {formatDate(item.expiryDate)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-amber-700">{formatNumber(item.availableQty)}</div>
                  <div className="text-[10px] text-slate-400">可售量</div>
                </div>
              </div>
            ))}
            {!(overview?.nearExpiryTop10?.length) && (
              <div className="py-6 text-center text-sm text-slate-400">暂无近效期预警</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
