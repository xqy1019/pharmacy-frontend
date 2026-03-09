// 统一摘要卡片组件
// accent: Tailwind 渐变类字符串，如 'from-cyan-500 to-teal-500'
// tone: 快捷别名 → info / success / warning / danger
const TONE_MAP = {
  info:    { gradient: 'from-cyan-500 to-teal-400',    ring: 'ring-cyan-100',    bg: 'bg-cyan-50' },
  success: { gradient: 'from-emerald-500 to-green-400', ring: 'ring-emerald-100', bg: 'bg-emerald-50' },
  warning: { gradient: 'from-amber-500 to-orange-400',  ring: 'ring-amber-100',   bg: 'bg-amber-50' },
  danger:  { gradient: 'from-rose-500 to-red-400',      ring: 'ring-rose-100',    bg: 'bg-rose-50' },
  primary: { gradient: 'from-indigo-500 to-blue-500',   ring: 'ring-indigo-100',  bg: 'bg-indigo-50' },
  purple:  { gradient: 'from-purple-500 to-violet-400', ring: 'ring-purple-100',  bg: 'bg-purple-50' },
};

function SummaryCard({ label, value, detail, accent, tone }) {
  const config = TONE_MAP[tone] || TONE_MAP.info;
  const gradient = accent || config.gradient;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <strong className="mt-3 block text-[22px] font-bold text-slate-900">{value}</strong>
          {detail && <p className="mt-1.5 text-sm text-slate-500">{detail}</p>}
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <span className="h-2 w-2 rounded-full bg-white/70" />
        </div>
      </div>
      {/* 底部装饰条 */}
      <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r ${gradient} opacity-60`} />
    </article>
  );
}

export default SummaryCard;
