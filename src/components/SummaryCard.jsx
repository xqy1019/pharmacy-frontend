// 统一摘要卡片组件
// accent: Tailwind 渐变类字符串，如 'from-cyan-500 to-teal-500'
// tone: 快捷别名 → info / success / warning / danger
const TONE_ACCENTS = {
  info:    'from-cyan-500 to-teal-500',
  success: 'from-emerald-500 to-green-500',
  warning: 'from-amber-500 to-orange-500',
  danger:  'from-rose-500 to-red-500',
  primary: 'from-blue-500 to-cyan-500',
  purple:  'from-purple-500 to-violet-500',
};

function SummaryCard({ label, value, detail, accent, tone }) {
  const gradient = accent || TONE_ACCENTS[tone] || TONE_ACCENTS.info;

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="mt-4 block text-[20px] font-semibold text-slate-800">{value}</strong>
          {detail && <p className="mt-2 text-sm text-slate-500">{detail}</p>}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-semibold text-white`}>
          ·
        </div>
      </div>
    </article>
  );
}

export default SummaryCard;
