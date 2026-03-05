const toneMap = {
  primary: 'border-l-[4px] border-l-cyan-600',
  accent: 'border-l-[4px] border-l-blue-600',
  warning: 'border-l-[4px] border-l-amber-500',
  danger: 'border-l-[4px] border-l-rose-500'
};

function StatCard({ label, value, change, tone = 'primary', detail }) {
  return (
    <article className={`${toneMap[tone]} rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(22,48,71,0.05)]`}>
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-5 flex items-end justify-between gap-4">
        <strong className="font-display text-3xl font-semibold text-slate-800">{value}</strong>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{change || detail}</span>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-500">{detail}</p> : null}
    </article>
  );
}

export default StatCard;
