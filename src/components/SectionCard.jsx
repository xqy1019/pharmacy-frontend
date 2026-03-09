function SectionCard({ title, badge, children }) {
  return (
    <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {badge ? (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-100">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default SectionCard;
