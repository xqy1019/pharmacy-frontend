import { useEffect, useRef } from 'react';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getInstanceByDom, init, use } from 'echarts/core';

use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

function ChartCard({ title, subtitle, option, height = 320 }) {
  const chartRef = useRef(null);

  // 只初始化一次，不随 option 销毁重建
  useEffect(() => {
    if (!chartRef.current) return undefined;
    const chart = init(chartRef.current);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  // option 变化时增量更新，不重建实例
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = getInstanceByDom(chartRef.current);
    if (chart) chart.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <section className="rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
      {(title || subtitle) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
      )}
      <div ref={chartRef} style={{ height }} />
    </section>
  );
}

export default ChartCard;
