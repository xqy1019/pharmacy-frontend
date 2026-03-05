function SectionCard({ title, badge, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(22,48,71,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {badge ? <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs text-cyan-700">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default SectionCard;
