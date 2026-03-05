import { useMemo, useState } from 'react';
import { fetchInventoryLocations } from '../api/pharmacy';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatNumber } from '../utils/formatters';

function toneClass(type = 'neutral') {
  const toneMap = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200'
  };
  return toneMap[type] || toneMap.neutral;
}

function statusTone(value) {
  const text = String(value || '').toUpperCase();
  if (text.includes('异常') || text.includes('禁用')) return 'danger';
  if (text.includes('正常') || text.includes('启用')) return 'success';
  if (text.includes('维护') || text.includes('待')) return 'warning';
  return 'neutral';
}

function Pager({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1
  );

  return (
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
      <span className="text-slate-400">共 {total} 条</span>
      <label className="flex items-center gap-1.5 text-slate-400">
        每页
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-600 outline-none"
        >
          {[10, 20, 50].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        条
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        {pageNums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && pageNums[i - 1] !== n - 1 && <span className="px-0.5 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(n)}
              className={`min-w-[28px] rounded-lg border px-2 py-1.5 transition ${
                n === page
                  ? 'border-emerald-500 bg-emerald-500 font-medium text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function LocationsPage() {
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: locations, loading, error } = useAsyncData(
    () => fetchInventoryLocations(),
    [refreshKey]
  );

  const zones = useMemo(
    () => [...new Set((locations || []).map((item) => item.zoneName).filter(Boolean))],
    [locations]
  );

  const filtered = useMemo(() => {
    if (!locations) return [];
    const kw = appliedKeyword.trim().toLowerCase();
    return locations.filter((item) =>
      !kw ||
      String(item.locationCode || '').toLowerCase().includes(kw) ||
      String(item.locationName || '').toLowerCase().includes(kw) ||
      String(item.zoneName || '').toLowerCase().includes(kw)
    );
  }, [locations, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  if (loading || !locations) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">正在加载货位数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">货位数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">货位总数</p>
          <strong className="mt-3 block text-3xl font-semibold text-slate-800">{formatNumber(locations.length)}</strong>
        </article>
        <article className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">分区数量</p>
          <strong className="mt-3 block text-3xl font-semibold text-slate-800">{formatNumber(zones.length)}</strong>
        </article>
        <article className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">正常货位</p>
          <strong className="mt-3 block text-3xl font-semibold text-emerald-600">
            {formatNumber(locations.filter((l) => statusTone(l.statusLabel) === 'success').length)}
          </strong>
        </article>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-1 gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
              placeholder="货位编码 / 名称 / 分区"
              className="w-64 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
            <button
              type="button"
              onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              查询
            </button>
            <button
              type="button"
              onClick={() => { setKeyword(''); setAppliedKeyword(''); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              重置
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((v) => v + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              刷新
            </button>
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm text-white transition hover:bg-emerald-700"
            >
              新增货位
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['货位编码', '货位名称', '分区', '货架', '仓库', '状态'].map((col) => (
                    <th key={col} className="px-5 py-3 font-medium first:pl-6 last:pr-6">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 text-slate-700 hover:bg-slate-50/70">
                    <td className="px-5 py-3 pl-6 font-mono text-slate-800">{item.locationCode}</td>
                    <td className="px-5 py-3">{item.locationName}</td>
                    <td className="px-5 py-3">{item.zoneName}</td>
                    <td className="px-5 py-3">{item.shelfName}</td>
                    <td className="px-5 py-3">{item.storeName}</td>
                    <td className="px-5 py-3 pr-6">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(item.statusLabel))}`}>
                        {item.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">暂无货位数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </section>
    </div>
  );
}

export default LocationsPage;
