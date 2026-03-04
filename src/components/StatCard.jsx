import styled from 'styled-components';

const toneMap = {
  primary: 'from-teal-50 to-white text-slate-800',
  accent: 'from-blue-50 to-white text-slate-800',
  warning: 'from-amber-50 to-white text-slate-800',
  danger: 'from-rose-50 to-white text-slate-800'
};

const Card = styled.article`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.panel};
  box-shadow: 0 10px 24px rgba(22, 48, 71, 0.05);
`;

function StatCard({ label, value, change, tone = 'primary', detail }) {
  return (
    <Card className={`bg-gradient-to-br ${toneMap[tone]} p-5`}>
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className="font-display text-3xl font-semibold text-slate-800">{value}</strong>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{change || detail}</span>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-500">{detail}</p> : null}
    </Card>
  );
}

export default StatCard;
