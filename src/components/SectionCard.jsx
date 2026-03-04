import styled from 'styled-components';

const Panel = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.panel};
  box-shadow: 0 10px 24px rgba(22, 48, 71, 0.05);
`;

function SectionCard({ title, badge, children }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {badge ? <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700">{badge}</span> : null}
      </div>
      {children}
    </Panel>
  );
}

export default SectionCard;
