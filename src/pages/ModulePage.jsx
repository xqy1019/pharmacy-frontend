import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { allModules } from '../config/modules';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { moduleResolvers } from '../data/moduleResolvers';
import { useAsyncData } from '../hooks/useAsyncData';

const toneAccents = [
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500'
];

function findModule(pathname) {
  for (const m of allModules) {
    if (m.children) {
      const child = m.children.find((c) => c.path === pathname);
      if (child) return child;
    } else if (m.path === pathname) {
      return m;
    }
  }
  return null;
}

function ModulePage() {
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentModule = findModule(location.pathname);
  const resolver = currentModule ? moduleResolvers[currentModule.key] : null;

  const { data: content, loading, error } = useAsyncData(
    () => (resolver ? resolver() : Promise.resolve(null)),
    [resolver, refreshKey]
  );

  const filteredRows = useMemo(() => {
    if (!content?.tableRows) return [];
    const kw = appliedKeyword.trim().toLowerCase();
    if (!kw) return content.tableRows;
    return content.tableRows.filter((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes(kw))
    );
  }, [content, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  if (!currentModule) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">页面不存在。</div>;
  }

  if (loading || !content) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">正在加载 {currentModule.label} 数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">模块数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        {content.metrics.map((item, i) => (
          <SummaryCard
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
            accent={toneAccents[i % toneAccents.length]}
          />
        ))}
      </section>

      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h3 className="text-sm font-semibold text-slate-700">{content.tableTitle}</h3>
          <div className="flex items-center gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
              placeholder="关键字搜索..."
              className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
            <button
              type="button"
              onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white transition hover:bg-emerald-700"
            >
              查询
            </button>
            <button
              type="button"
              onClick={() => { setKeyword(''); setAppliedKeyword(''); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              重置
            </button>
            <button
              type="button"
              onClick={() => { setRefreshKey((v) => v + 1); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              刷新
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {content.tableColumns.map((col) => (
                    <th key={col} className="px-5 py-3 font-medium first:pl-6 last:pr-6">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, rowIndex) => (
                  <tr
                    key={`row-${rowIndex}`}
                    className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70"
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={`cell-${rowIndex}-${cellIndex}`} className="px-5 py-3 first:pl-6 last:pr-6">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={content.tableColumns.length} className="px-5 py-10 text-center text-slate-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager
            total={filteredRows.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </section>
    </div>
  );
}

export default ModulePage;
