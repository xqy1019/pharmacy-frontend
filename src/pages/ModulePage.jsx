import { useLocation } from 'react-router-dom';
import ChartCard from '../components/ChartCard';
import DataTable from '../components/DataTable';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import { allModules } from '../config/modules';
import { moduleResolvers } from '../data/moduleResolvers';
import { useAsyncData } from '../hooks/useAsyncData';

function buildModuleOption(chartData) {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 20, right: 20, top: 30, bottom: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.name),
      axisLabel: { color: '#94a3b8', interval: 0, rotate: 10 },
      axisLine: { lineStyle: { color: '#334155' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } }
    },
    series: [
      {
        type: 'bar',
        barWidth: 28,
        data: chartData.map((item) => item.value),
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#2dd4bf' }
            ]
          }
        }
      }
    ]
  };
}

function ModulePage() {
  const location = useLocation();
  const currentModule = allModules.find((item) => item.path === location.pathname);
  const resolver = currentModule ? moduleResolvers[currentModule.key] : null;
  const { data: content, loading, error } = useAsyncData(
    () => (resolver ? resolver() : Promise.resolve(null)),
    [resolver]
  );

  if (!currentModule) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">页面不存在。</div>;
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">正在加载 {currentModule.label} 数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">模块数据加载失败：{error}</div>;
  }

  if (!content) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">暂无可展示数据。</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-700">{currentModule.shortLabel}</p>
              <h3 className="mt-3 text-4xl font-semibold text-slate-800">{content.title}</h3>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{content.subtitle}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {content.metrics.map((metric, index) => (
                <div key={metric.label} className="animate-rise" style={{ animationDelay: `${index * 80}ms` }}>
                  <StatCard label={metric.label} value={metric.value} detail={metric.detail} tone={['primary', 'accent', 'warning'][index % 3]} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {content.tasks.map((task) => (
              <div key={task} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                {task}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartCard title={content.chartTitle || `${content.title}关键指标`} subtitle="模块级核心指标实时图" option={buildModuleOption(content.chartData || [])} />
        <SectionCard title="执行建议" badge="运营提示">
          <div className="space-y-4">
            {content.tasks.map((task, index) => (
              <div key={task} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-medium text-slate-800">{task}</h4>
                  <span className="text-xs text-slate-500">P{index + 1}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  建议将该能力对接后端审批流、主数据规则和事件中心，实现自动触发、留痕与闭环追踪。
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <DataTable title={content.tableTitle || `${content.title}业务台账`} columns={content.tableColumns} rows={content.tableRows} />
    </div>
  );
}

export default ModulePage;
