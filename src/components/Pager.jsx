function Pager({ total, page, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50] }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1
  );

  return (
    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span className="text-slate-400">共 {total} 条</span>
      <label className="flex items-center gap-1.5 text-slate-400">
        每页
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-600 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
        >
          {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        条
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        {pageNums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && pageNums[i - 1] !== n - 1 && (
              <span className="px-0.5 text-slate-400">…</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(n)}
              className={`min-w-[28px] rounded-lg border px-2 py-1.5 transition ${
                n === page
                  ? 'border-indigo-500 bg-indigo-500 font-medium text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default Pager;
