import { useMemo, useState } from 'react';
import ChartCard from '../components/ChartCard';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import {
  fetchExpiryLoss,
  fetchInventoryTurnover,
  fetchReportCategoryDistribution,
  fetchReportKpis,
  fetchSalesTrend,
  fetchStockoutRate
} from '../api/pharmacy';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatNumber, formatPercent } from '../utils/formatters';

// ── ABC 分类算法 ─────────────────────────────────────────────────────────────
function classifyABC(turnoverList) {
  const sorted = [...turnoverList].sort((a, b) => Number(b.soldQty30d) - Number(a.soldQty30d));
  const totalSales = sorted.reduce((sum, d) => sum + Number(d.soldQty30d || 0), 0);
  let cumulative = 0;
  return sorted.map((drug) => {
    cumulative += Number(drug.soldQty30d || 0);
    const pct = totalSales > 0 ? (cumulative / totalSales) * 100 : 100;
    const cls = pct <= 70 ? 'A' : pct <= 90 ? 'B' : 'C';
    return { ...drug, abcClass: cls, cumulativePct: pct };
  });
}

const ABC_STYLE = {
  A: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: '#10b981' },
  B: { bg: 'bg-amber-100',   text: 'text-amber-700',   bar: '#f59e0b' },
  C: { bg: 'bg-slate-100',   text: 'text-slate-600',   bar: '#94a3b8' }
};

function SectionTitle({ children, badge }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h3 className="text-base font-semibold text-slate-800">{children}</h3>
      {badge && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{badge}</span>}
    </div>
  );
}

// ── ABC Table ─────────────────────────────────────────────────────────────────
function ABCTable({ data }) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    if (!filter) return data;
    return data.filter((d) => d.abcClass === filter);
  }, [data, filter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {['', 'A', 'B', 'C'].map((cls) => (
          <button key={cls} onClick={() => { setFilter(cls); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === cls ? 'bg-slate-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {cls === '' ? '全部' : `${cls} 类`}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">共 {filtered.length} 品种</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">药品</th>
              <th className="px-4 py-2.5 text-left font-medium">分类</th>
              <th className="px-4 py-2.5 text-left font-medium">库存量</th>
              <th className="px-4 py-2.5 text-left font-medium">30天销量</th>
              <th className="px-4 py-2.5 text-left font-medium">周转天数</th>
              <th className="px-4 py-2.5 text-left font-medium">累计销量占比</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((drug, i) => {
              const s = ABC_STYLE[drug.abcClass];
              return (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{drug.drugName}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>{drug.abcClass}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{formatNumber(drug.stockQty)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatNumber(drug.soldQty30d)}</td>
                  <td className="px-4 py-2.5">
                    <span className={drug.turnoverDays >= 90 ? 'text-rose-600 font-medium' : drug.turnoverDays >= 60 ? 'text-amber-600' : 'text-slate-600'}>
                      {drug.turnoverDays >= 999 ? '无销量' : `${formatNumber(drug.turnoverDays)} 天`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, drug.cumulativePct)}%`, backgroundColor: s.bar }} />
                      </div>
                      <span className="text-slate-500">{drug.cumulativePct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <Pager total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const [salesDays, setSalesDays] = useState(7);

  const { data, loading, error } = useAsyncData(async () => {
    const [kpis, turnover, categoryDist, expiryLoss, stockoutRate] = await Promise.all([
      fetchReportKpis(),
      fetchInventoryTurnover(),
      fetchReportCategoryDistribution(),
      fetchExpiryLoss(),
      fetchStockoutRate()
    ]);
    return { kpis, turnover, categoryDist, expiryLoss, stockoutRate };
  }, []);

  const { data: salesTrend, loading: salesLoading } = useAsyncData(
    () => fetchSalesTrend(salesDays),
    [salesDays]
  );

  const abcList = useMemo(() => {
    if (!data?.turnover) return [];
    return classifyABC(data.turnover);
  }, [data]);

  const abcCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0 };
    abcList.forEach((d) => counts[d.abcClass]++);
    return counts;
  }, [abcList]);

  // Charts
  const abcPieOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#6b879b' }, icon: 'circle' },
    series: [{
      type: 'pie', radius: ['52%', '72%'], center: ['50%', '42%'],
      data: [
        { name: 'A 类（高价值）', value: abcCounts.A, itemStyle: { color: '#10b981' } },
        { name: 'B 类（中价值）', value: abcCounts.B, itemStyle: { color: '#f59e0b' } },
        { name: 'C 类（低价值）', value: abcCounts.C, itemStyle: { color: '#94a3b8' } }
      ],
      label: { color: '#486173' },
      itemStyle: { borderRadius: 4, borderColor: '#f4f8fb', borderWidth: 3 }
    }]
  }), [abcCounts]);

  const stockoutBarOption = useMemo(() => {
    const list = (data?.stockoutRate || []).slice(0, 8);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 16, right: 24, top: 16, bottom: 16, containLabel: true },
      xAxis: {
        type: 'value', max: 100,
        axisLabel: { color: '#6b879b', formatter: (v) => `${v}%` },
        splitLine: { lineStyle: { color: '#e6eef3' } }
      },
      yAxis: {
        type: 'category',
        data: list.map((r) => r.category || '未分类'),
        axisLabel: { color: '#486173' },
        axisLine: { lineStyle: { color: '#d6e2ea' } }
      },
      series: [{
        type: 'bar', barWidth: 14,
        data: list.map((r) => ({
          value: Number(r.stockoutRate || 0),
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: Number(r.stockoutRate) >= 50 ? '#dc5b73' : Number(r.stockoutRate) >= 20 ? '#f59e0b' : '#0ea5a4'
          }
        }))
      }]
    };
  }, [data]);

  const salesTrendOption = useMemo(() => {
    const list = salesTrend || [];
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 16, right: 16, top: 12, bottom: 16, containLabel: true },
      xAxis: {
        type: 'category',
        data: list.map((d) => d.date.slice(5)),
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#d6e2ea' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b879b' }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#e6eef3' } },
        axisLabel: { color: '#6b879b', formatter: (v) => `¥${v}` }
      },
      series: [{
        type: 'line', smooth: true,
        data: list.map((d) => Number(d.salesAmount || 0)),
        symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#0ea5a4', width: 3 },
        itemStyle: { color: '#0ea5a4' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(14,165,164,0.2)' }, { offset: 1, color: 'rgba(14,165,164,0)' }] } }
      }]
    };
  }, [salesTrend]);

  const categoryPieOption = useMemo(() => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#6b879b' }, icon: 'circle' },
    series: [{
      type: 'pie', radius: ['50%', '70%'], center: ['50%', '40%'],
      data: (data?.categoryDist || []).map((item) => ({ name: item.category, value: Number(item.qty) })),
      label: { color: '#486173' },
      itemStyle: { borderRadius: 4, borderColor: '#f4f8fb', borderWidth: 3 },
      color: ['#2f80ed', '#0ea5a4', '#7c9ab0', '#94aebf', '#d97706', '#dc5b73', '#8b5cf6', '#ec4899']
    }]
  }), [data]);

  if (loading) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">正在加载分析数据...</div>;
  }
  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">数据加载失败：{error}</div>;
  }

  const kpis = data?.kpis || {};
  const stockoutList = data?.stockoutRate || [];
  const avgStockoutRate = stockoutList.length > 0
    ? (stockoutList.reduce((s, r) => s + Number(r.stockoutRate || 0), 0) / stockoutList.length).toFixed(1)
    : '0.0';

  const slowMovers = abcList.filter((d) => Number(d.turnoverDays) >= 90 && d.abcClass === 'C').length;

  return (
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="库存总量" value={formatNumber(kpis.totalInventory)} detail="当前全仓实时在库" tone="info" />
        <SummaryCard label="近效期批次" value={formatNumber(kpis.nearExpiry)} detail="30 天内需关注" tone="warning" />
        <SummaryCard label="低库存品种" value={formatNumber(kpis.lowStock)} detail="低于预警阈值" tone="danger" />
        <SummaryCard label="采购达成率" value={formatPercent(kpis.procurementAchieveRate, 1)} detail={`销售额 ¥${formatNumber(kpis.salesAmount)}`} tone="success" />
      </section>

      {/* ABC 分析 */}
      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <SectionTitle badge={`共 ${abcList.length} 品种`}>ABC 药品分类分析</SectionTitle>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {(['A', 'B', 'C'] ).map((cls) => {
            const s = ABC_STYLE[cls];
            const desc = { A: '核心品种，重点保障，占销量前 70%', B: '中等品种，按需备货，70%~90%', C: '长尾品种，精简库存，后 10%' }[cls];
            return (
              <div key={cls} className={`rounded-2xl border p-4 ${s.bg} border-opacity-50`}>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${s.text}`}>{cls} 类</span>
                  <span className={`text-3xl font-semibold ${s.text}`}>{abcCounts[cls]}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{desc}</p>
              </div>
            );
          })}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
          <ABCTable data={abcList} />
          <ChartCard title="ABC 分布" option={abcPieOption} height={240} />
        </div>
      </section>

      {/* 库存健康度 */}
      <section className="grid gap-6 xl:grid-cols-2">
        {/* 缺货率看板 */}
        <div className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
          <SectionTitle badge={`均值 ${avgStockoutRate}%`}>各品类缺货率</SectionTitle>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-rose-50 p-3 text-center">
              <div className="text-xs text-slate-500">高风险品类</div>
              <div className="mt-1 text-xl font-bold text-rose-600">
                {stockoutList.filter((r) => Number(r.stockoutRate) >= 50).length}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-center">
              <div className="text-xs text-slate-500">中风险品类</div>
              <div className="mt-1 text-xl font-bold text-amber-600">
                {stockoutList.filter((r) => Number(r.stockoutRate) >= 20 && Number(r.stockoutRate) < 50).length}
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-center">
              <div className="text-xs text-slate-500">健康品类</div>
              <div className="mt-1 text-xl font-bold text-emerald-600">
                {stockoutList.filter((r) => Number(r.stockoutRate) < 20).length}
              </div>
            </div>
          </div>
          <ChartCard title="" option={stockoutBarOption} height={220} />
        </div>

        {/* 效期损耗风险 */}
        <div className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
          <SectionTitle badge="30天内效期">效期损耗风险 Top 10</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">药品</th>
                  <th className="px-4 py-2.5 text-left font-medium">批号</th>
                  <th className="px-4 py-2.5 text-left font-medium">效期</th>
                  <th className="px-4 py-2.5 text-right font-medium">预计损失</th>
                </tr>
              </thead>
              <tbody>
                {(data?.expiryLoss || []).slice(0, 8).map((item, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-medium text-slate-700">{item.drugName}</td>
                    <td className="px-4 py-2 font-mono text-slate-500">{item.batchNo}</td>
                    <td className="px-4 py-2 text-rose-600">{formatDate(item.expiryDate)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-amber-700">
                      ¥{formatNumber(item.estimatedLoss)}
                    </td>
                  </tr>
                ))}
                {(data?.expiryLoss || []).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-emerald-600 font-medium">暂无近效期损耗风险</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {slowMovers > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-700">
                <span className="font-semibold">滞销预警</span>：共 <span className="text-amber-900 font-bold">{slowMovers}</span> 个 C 类药品周转天数超过 90 天，建议清库或促销处置。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 趋势 + 品类分布 */}
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">销售趋势</h3>
            <div className="flex gap-1">
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => setSalesDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${salesDays === d ? 'bg-cyan-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {d} 天
                </button>
              ))}
            </div>
          </div>
          {salesLoading
            ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">加载中...</div>
            : <ChartCard title="" option={salesTrendOption} height={240} />
          }
        </div>
        <ChartCard title="库存品类分布" subtitle="按药品品类查看库存结构" option={categoryPieOption} height={320} />
      </section>
    </div>
  );
}

export default AnalyticsPage;
