import { useMemo } from 'react';
import { fetchDashboardOverview } from '../api/pharmacy';
import ChartCard from '../components/ChartCard';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatNumber, formatPercent } from '../utils/formatters';

function DashboardPage() {
  const { data, loading, error } = useAsyncData(fetchDashboardOverview, []);

  const dashboardStats = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: '库存总量', value: formatNumber(data.totalInventory), change: `${formatNumber(data.inventoryWarningCount)} 条预警`, tone: 'primary' },
      { label: '近效期批次', value: formatNumber(data.nearExpiry), change: '30 天内效期风险', tone: 'warning' },
      { label: '低库存药品', value: formatNumber(data.lowStock), change: '需补货关注', tone: 'accent' },
      { label: '采购达成率', value: formatPercent(data.procurementAchieveRate, 2), change: `待审处方 ${formatNumber(data.pendingPrescriptions)}`, tone: 'danger' }
    ];
  }, [data]);

  const lineOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { left: 16, right: 16, top: 24, bottom: 16, containLabel: true },
    xAxis: {
      type: 'category',
      data: (data?.salesTrend7d || []).map((item) => item.date.slice(5)),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#d6e2ea' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b879b' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#e6eef3' } },
      axisLabel: { color: '#6b879b' }
    },
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        data: (data?.salesTrend7d || []).map((item) => Number(item.salesAmount || 0)),
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#2f80ed', width: 3 },
        areaStyle: { color: 'rgba(47,128,237,0.08)' },
        itemStyle: { color: '#2f80ed' }
      },
      {
        name: '订单量',
        type: 'line',
        smooth: true,
        data: (data?.salesTrend7d || []).map((item) => Number(item.orderCount || 0)),
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#0ea5a4', width: 3 },
        areaStyle: { color: 'rgba(14,165,164,0.08)' },
        itemStyle: { color: '#0ea5a4' }
      }
    ]
  }), [data]);

  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#6b879b' }, icon: 'circle' },
    series: [
      {
        type: 'pie',
        radius: ['58%', '76%'],
        center: ['50%', '40%'],
        data: (data?.inventoryDistribution || []).map((item) => ({ name: item.category, value: item.qty })),
        itemStyle: {
          borderRadius: 4,
          borderColor: '#f4f8fb',
          borderWidth: 3
        },
        label: { color: '#486173' },
        color: ['#2f80ed', '#0ea5a4', '#7c9ab0', '#94aebf', '#d97706', '#dc5b73']
      }
    ]
  }), [data]);

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
      data: (data?.lowTurnoverTop5 || []).map((item) => item.drugName),
      axisLabel: { color: '#486173' },
      axisLine: { lineStyle: { color: '#d6e2ea' } }
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: (data?.lowTurnoverTop5 || []).map((item) => Number(item.stockQty || 0)),
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: '#7c9ab0'
        }
      }
    ]
  }), [data]);

  if (loading) {
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
        <ChartCard title="近 7 日出入库趋势" subtitle="按日跟踪仓储吞吐与发药节奏" option={lineOption} height={420} />

        <div className="grid gap-6">
          <ChartCard title="库存结构分布" subtitle="按品类查看库存占比" option={pieOption} height={260} />
          <ChartCard title="低周转药品 Top 5" subtitle="按库存量监控低周转品项" option={barOption} height={260} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-700">首页概览</p>
              <h3 className="mt-3 text-4xl font-semibold text-slate-800">医院药房运营态势实时驾驶舱</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                当前页面已接入后端真实接口，聚合采购、库存、处方、质量与经营指标，面向药学部、采购部、仓储与管理层提供统一运营视图。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-cyan-800">待审处方 {formatNumber(data.pendingPrescriptions)}</div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-blue-800">库存预警 {formatNumber(data.inventoryWarningCount)}</div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-amber-800">近效期 {formatNumber(data.nearExpiry)}</div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-rose-800">缺货风险 {formatNumber(data.lowStock)}</div>
            </div>
          </div>
        </section>

        <SectionCard title="待办中心" badge="4 项待处理">
          <div className="space-y-3">
            {(data?.aiInsights || []).slice(0, 4).map((item, index) => (
              <article key={`${item}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-slate-800">运营建议 {index + 1}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item}</p>
                  </div>
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs text-cyan-700">实时</span>
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">dashboard.ai</div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <section>
        <SectionCard title="关键预警" badge="实时联动">
          <div className="grid gap-4 xl:grid-cols-3">
            {(data?.nearExpiryTop10 || []).slice(0, 3).map((item) => (
              <div key={item.batchNo} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-slate-800">{item.drugName}</strong>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700">近效期</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  批号 {item.batchNo} 位于 {item.locationCode}，效期至 {item.expiryDate}，当前可用量 {formatNumber(item.availableQty)}。
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

export default DashboardPage;
