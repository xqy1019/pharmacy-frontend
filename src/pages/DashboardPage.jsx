import { useMemo } from 'react';
import {
  fetchDashboardOverview,
  fetchIntegrationJobs,
  fetchPrescriptions,
  fetchProcurementOrders,
  fetchProcurementOverview,
  fetchTransfers,
  fetchTransfersOverview
} from '../api/pharmacy';
import ChartCard from '../components/ChartCard';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatNumber, formatPercent } from '../utils/formatters';

function DashboardPage() {
  const { data, loading, error } = useAsyncData(
    async () => {
      const [overview, procurementOverview, procurementOrders, transferOverview, transfers, prescriptions, integrationJobs] = await Promise.all([
        fetchDashboardOverview(),
        fetchProcurementOverview(),
        fetchProcurementOrders(),
        fetchTransfersOverview(),
        fetchTransfers(),
        fetchPrescriptions(),
        fetchIntegrationJobs()
      ]);

      return {
        overview,
        procurementOverview,
        procurementOrders,
        transferOverview,
        transfers,
        prescriptions,
        integrationJobs
      };
    },
    []
  );

  const overview = data?.overview;

  const dashboardStats = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      { label: '库存总量', value: formatNumber(overview.totalInventory), change: `${formatNumber(overview.inventoryWarningCount)} 条预警`, tone: 'primary' },
      { label: '近效期批次', value: formatNumber(overview.nearExpiry), change: '30 天内效期风险', tone: 'warning' },
      { label: '低库存药品', value: formatNumber(overview.lowStock), change: '需补货关注', tone: 'accent' },
      { label: '采购达成率', value: formatPercent(overview.procurementAchieveRate, 2), change: `待审处方 ${formatNumber(overview.pendingPrescriptions)}`, tone: 'danger' }
    ];
  }, [overview]);

  const lineOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { color: '#5f788b' }
    },
    grid: { left: 16, right: 18, top: 48, bottom: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: (overview?.salesTrend7d || []).map((item) => item.date.slice(5)),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#d6e2ea' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b879b' }
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额',
        nameGap: 16,
        nameTextStyle: { color: '#6b879b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e6eef3' } },
        axisLabel: {
          color: '#6b879b',
          formatter: (value) => `¥${value}`
        }
      },
      {
        type: 'value',
        name: '单量/风险',
        nameGap: 16,
        nameTextStyle: { color: '#6b879b', fontSize: 11 },
        position: 'right',
        splitLine: { show: false },
        axisLabel: { color: '#6b879b' }
      }
    ],
    series: [
      {
        name: '销售额',
        type: 'bar',
        barWidth: 18,
        data: (overview?.salesTrend7d || []).map((item) => Number(item.salesAmount || 0)),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: '#c7d8e6'
        },
        emphasis: {
          itemStyle: { color: '#9fb8cb' }
        }
      },
      {
        name: '订单量',
        type: 'line',
        smooth: true,
        data: (overview?.salesTrend7d || []).map((item) => Number(item.orderCount || 0)),
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#0ea5a4', width: 3 },
        itemStyle: { color: '#0ea5a4' },
        emphasis: {
          focus: 'series'
        }
      },
      {
        name: '预警压力',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: (overview?.salesTrend7d || []).map((item, index, arr) => {
          const sales = Number(item.salesAmount || 0);
          const orders = Number(item.orderCount || 0);
          const base = Math.max(1, Math.round((overview?.inventoryWarningCount || 0) / Math.max(arr.length, 1)));
          return Math.max(1, Math.round(base + orders * 0.8 + (sales > 0 ? 1 : 0)));
        }),
        symbol: 'none',
        lineStyle: {
          color: '#dc5b73',
          width: 2,
          type: 'dashed'
        },
        emphasis: {
          focus: 'series'
        }
      }
    ]
  }), [overview]);

  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#6b879b' }, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['58%', '76%'],
        center: ['50%', '40%'],
        data: (overview?.inventoryDistribution || []).map((item) => ({ name: item.category, value: item.qty })),
        itemStyle: {
          borderRadius: 4,
          borderColor: '#f4f8fb',
          borderWidth: 3
        },
        label: { color: '#486173' },
        color: ['#2f80ed', '#0ea5a4', '#7c9ab0', '#94aebf', '#d97706', '#dc5b73']
      }
    ]
  }), [overview]);

  const barOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 20, right: 20, top: 20, bottom: 20, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#6b879b' },
      splitLine: { lineStyle: { color: '#e6eef3' } }
    },
    yAxis: {
      type: 'category',
      data: (overview?.lowTurnoverTop5 || []).map((item) => item.drugName),
      axisLabel: { color: '#486173' },
      axisLine: { lineStyle: { color: '#d6e2ea' } }
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: (overview?.lowTurnoverTop5 || []).map((item) => Number(item.stockQty || 0)),
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: '#7c9ab0'
        }
      }
    ]
  }), [overview]);

  const prescriptionSummary = useMemo(() => {
    const list = data?.prescriptions || [];
    return {
      total: list.length,
      highRisk: list.filter((item) => item.riskLevel === 'HIGH').length,
      rejected: list.filter((item) => item.status === 'REJECTED').length,
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

  if (loading || !overview) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">正在加载首页真实数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">首页数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((item, index) => (
          <div key={item.label} className="animate-rise" style={{ animationDelay: `${index * 70}ms` }}>
            <StatCard {...item} />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <ChartCard title="近 7 日业务趋势" subtitle="柱状图展示销售额，折线展示订单量与预警压力" option={lineOption} height={420} />

        <div className="grid gap-6">
          <ChartCard title="库存结构分布" subtitle="按品类查看库存占比" option={pieOption} height={260} />
          <ChartCard title="低周转药品 Top 5" subtitle="按库存量监控低周转品项" option={barOption} height={260} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-700">运营摘要</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-800">今日工作台</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500">
              预警 {formatNumber(overview.inventoryWarningCount)} 条
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">今日关注</div>
              <div className="mt-4 space-y-4">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-500">库存风险</span>
                  <span className="font-medium text-slate-800">{formatNumber(overview.inventoryWarningCount)} 条待处理</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-500">采购执行</span>
                  <span className="font-medium text-slate-800">{formatPercent(overview.procurementAchieveRate, 2)}</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-500">处方审核</span>
                  <span className="font-medium text-slate-800">{formatNumber(overview.pendingPrescriptions)} 张待审</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-500">近效期批次</span>
                  <span className="font-medium text-slate-800">{formatNumber(overview.nearExpiry)} 个</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">重点药品</div>
              <div className="mt-4 space-y-4">
                {(overview?.lowTurnoverTop5 || []).slice(0, 4).map((item, index) => (
                  <div key={item.drugName} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                        {index + 1}
                      </span>
                      <span className="text-sm text-slate-700">{item.drugName}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800">库存 {formatNumber(item.stockQty)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionCard title="待办中心" badge="4 项待处理">
          <div className="space-y-3">
            {(overview?.aiInsights || []).slice(0, 4).map((item, index) => (
              <article key={`${item}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">
                        {index + 1}
                      </span>
                      <h4 className="font-medium text-slate-800">运营建议</h4>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{item}</p>
                  </div>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs text-cyan-700">实时</span>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-3 text-xs uppercase tracking-[0.2em] text-slate-400">dashboard.ai</div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <section>
        <SectionCard title="关键预警" badge="实时联动">
          <div className="grid gap-4 xl:grid-cols-3">
            {(overview?.nearExpiryTop10 || []).slice(0, 3).map((item) => (
              <div key={item.batchNo} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">效期预警</div>
                    <strong className="mt-2 block text-slate-800">{item.drugName}</strong>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700">近效期</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">批号</span>
                    <span>{item.batchNo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">货位</span>
                    <span>{item.locationCode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">效期</span>
                    <span>{item.expiryDate}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">可用量</span>
                    <span>{formatNumber(item.availableQty)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="采购执行" badge="采购模块">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">供应商</div>
                <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(data?.procurementOverview?.supplierTotal)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">订单</div>
                <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(data?.procurementOverview?.orderTotal)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">待到货</div>
                <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(data?.procurementOverview?.dueArrivals)}</div>
              </div>
            </div>
            {(data?.procurementOrders || []).slice(0, 2).map((item) => (
              <div key={item.orderNo} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-800">{item.orderNo}</strong>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">{item.statusLabel}</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">{item.supplierName}</div>
                <div className="mt-3 text-sm font-medium text-slate-800">金额 ¥{formatNumber(item.totalAmount)}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="调拨配送" badge="调拨模块">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-400">总单量</div>
                <div className="mt-2 text-xl font-semibold text-slate-800">{formatNumber(data?.transferOverview?.total)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-400">待处理</div>
                <div className="mt-2 text-xl font-semibold text-slate-800">{formatNumber(data?.transferOverview?.pending)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-400">在途</div>
                <div className="mt-2 text-xl font-semibold text-slate-800">{formatNumber(data?.transferOverview?.inTransit)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-400">异常</div>
                <div className="mt-2 text-xl font-semibold text-rose-700">{formatNumber(data?.transferOverview?.abnormal)}</div>
              </div>
            </div>
            {(data?.transfers || []).slice(0, 2).map((item) => (
              <div key={item.orderNo} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-800">{item.orderNo}</strong>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">{item.statusLabel}</span>
                </div>
                <div className="mt-3 text-sm text-slate-500">{item.fromStore} {'->'} {item.toStore}</div>
                <div className="mt-2 text-sm text-slate-600">承运：{item.carrierName || '--'}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="处方与接口任务" badge="协同模块">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">高风险处方</div>
                <div className="mt-2 text-2xl font-semibold text-amber-700">{formatNumber(prescriptionSummary.highRisk)}</div>
                <div className="mt-2 text-sm text-slate-500">已驳回 {formatNumber(prescriptionSummary.rejected)} 张</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-400">接口任务</div>
                <div className="mt-2 text-2xl font-semibold text-slate-800">{formatNumber(integrationSummary.total)}</div>
                <div className="mt-2 text-sm text-slate-500">待处理 {formatNumber(integrationSummary.pending)} / 成功 {formatNumber(integrationSummary.success)}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">最新动态</div>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">最新处方</span>
                  <span className="font-medium text-slate-800">{prescriptionSummary.latest?.rxNo || '--'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">风险等级</span>
                  <span className="font-medium text-slate-800">{prescriptionSummary.latest?.riskLevelLabel || '--'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">最新接口平台</span>
                  <span className="font-medium text-slate-800">{integrationSummary.latest?.platform || '--'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500">接口状态</span>
                  <span className="font-medium text-slate-800">{integrationSummary.latest?.statusLabel || '--'}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

export default DashboardPage;
