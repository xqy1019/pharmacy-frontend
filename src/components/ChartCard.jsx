import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { init, use } from 'echarts/core';

use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const Card = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(180deg, #fbfdfe, #f4f8fb);
  box-shadow: 0 10px 24px rgba(22, 48, 71, 0.05);
`;

function ChartCard({ title, subtitle, option, height = 320 }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    const chart = init(chartRef.current);
    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [option]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div ref={chartRef} style={{ height }} />
    </Card>
  );
}

export default ChartCard;
