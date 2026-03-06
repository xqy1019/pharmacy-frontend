import { useMemo, useState } from 'react';
import { fetchAuditLogs } from '../api/pharmacy';
import Pager from '../components/Pager';
import PermGuard from '../components/PermGuard';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../utils/formatters';

const MODULE_OPTIONS = [
  { value: '', label: '全部模块' },
  { value: 'auth',        label: '登录认证' },
  { value: 'iam',         label: '系统权限' },
  { value: 'inventory',   label: '库存管理' },
  { value: 'procurement', label: '采购管理' },
  { value: 'prescription',label: '处方管理' },
  { value: 'sales',       label: '销售管理' },
  { value: 'transfer',    label: '调拨管理' },
  { value: 'stocktake',   label: '盘点管理' },
  { value: 'quality',     label: '质量召回' },
  { value: 'integration', label: '系统集成' },
];

const MODULE_BADGE = {
  auth:         'bg-slate-100 text-slate-600',
  iam:          'bg-violet-100 text-violet-700',
  inventory:    'bg-cyan-100 text-cyan-700',
  procurement:  'bg-amber-100 text-amber-700',
  prescription: 'bg-emerald-100 text-emerald-700',
  sales:        'bg-blue-100 text-blue-700',
  transfer:     'bg-teal-100 text-teal-700',
  stocktake:    'bg-orange-100 text-orange-700',
  quality:      'bg-rose-100 text-rose-700',
  integration:  'bg-indigo-100 text-indigo-700',
};

export default function SystemAuditPage() {
  const [refresh, setRefresh] = useState(0);
  const [module, setModule] = useState('');
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState({ module: '', keyword: '' });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const { data: logs, loading } = useAsyncData(fetchAuditLogs, [refresh]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      const mod = applied.module ? l.module === applied.module : true;
      const kw = applied.keyword.trim().toLowerCase();
      const kwMatch = kw
        ? [l.username, l.action, l.targetId, l.module].some((v) => String(v || '').toLowerCase().includes(kw))
        : true;
      return mod && kwMatch;
    });
  }, [logs, applied]);

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  function applyFilter() { setApplied({ module, keyword }); setPage(1); }
  function resetFilter() { setModule(''); setKeyword(''); setApplied({ module: '', keyword: '' }); setPage(1); }

  async function handleExport() {
    window.open('/api/v1/iam/audit-logs-export.pdf', '_blank');
  }

  // 统计
  const stats = useMemo(() => {
    if (!logs) return { total: 0, users: 0, modules: 0 };
    return {
      total:   logs.length,
      users:   new Set(logs.map((l) => l.username)).size,
      modules: new Set(logs.map((l) => l.module)).size,
    };
  }, [logs]);

  return (
    <div className="space-y-5">
      {/* 统计 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '日志总数', value: stats.total, sub: '近期操作记录', color: 'from-slate-500 to-slate-600' },
          { label: '操作用户数', value: stats.users, sub: '不同账号', color: 'from-blue-500 to-cyan-500' },
          { label: '涉及模块', value: stats.modules, sub: '操作模块种类', color: 'from-violet-500 to-purple-500' },
        ].map((s) => (
          <article key={s.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <strong className="mt-3 block text-3xl font-semibold text-slate-800">{s.value}</strong>
                <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
              </div>
              <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${s.color} opacity-80`} />
            </div>
          </article>
        ))}
      </section>

      {/* 日志表格 */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">操作日志</h3>
          <select value={module} onChange={(e) => setModule(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300">
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyFilter(); }}
            placeholder="操作人/操作类型..."
            className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
          <button onClick={applyFilter}
            className="rounded-xl bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800 transition">查询</button>
          <button onClick={resetFilter}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">重置</button>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setRefresh((v) => v + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">刷新</button>
            <PermGuard perm="iam.audit.export">
              <button onClick={handleExport}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition">
                导出 PDF
              </button>
            </PermGuard>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">操作人</th>
                  <th className="px-4 py-3 font-medium">模块</th>
                  <th className="px-4 py-3 font-medium">操作类型</th>
                  <th className="px-4 py-3 font-medium">目标对象</th>
                  <th className="px-4 py-3 font-medium">IP 地址</th>
                  <th className="px-4 py-3 font-medium pr-6">操作时间</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {String(l.username || l.operatorName || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700">{l.username || l.operatorName || '--'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${MODULE_BADGE[l.module] || 'bg-slate-100 text-slate-500'}`}>
                        {MODULE_OPTIONS.find((o) => o.value === l.module)?.label || l.module || '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                        {l.action || '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.targetId || l.resourceId || '--'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{l.ipAddress || l.ip || '--'}</td>
                    <td className="px-4 py-3 pr-6 text-xs text-slate-400">{formatDateTime(l.createdAt)}</td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">
                    {loading ? '加载中...' : '暂无审计日志'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pager total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} />
      </section>
    </div>
  );
}
