const toneMap = {
  primary: {
    bar: 'from-indigo-500 to-blue-500',
    badge: 'bg-indigo-50 text-indigo-600',
    value: 'text-slate-900'
  },
  accent: {
    bar: 'from-blue-500 to-cyan-500',
    badge: 'bg-blue-50 text-blue-600',
    value: 'text-slate-900'
  },
  warning: {
    bar: 'from-amber-500 to-orange-400',
    badge: 'bg-amber-50 text-amber-600',
    value: 'text-amber-700'
  },
  danger: {
    bar: 'from-rose-500 to-red-400',
    badge: 'bg-rose-50 text-rose-600',
    value: 'text-rose-700'
  }
};

function StatCard({ label, value, change, tone = 'primary', detail }) {
  const config = toneMap[tone] || toneMap.primary;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
      {/* 顶部渐变装饰条 */}
      <div className={`absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r ${config.bar}`} />
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className={`text-[28px] font-bold leading-none ${config.value}`}>{value}</strong>
        {(change || detail) && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.badge}`}>{change || detail}</span>
        )}
      </div>
      {detail && change ? <p className="mt-2.5 text-sm text-slate-500">{detail}</p> : null}
    </article>
  );
}

export default StatCard;
