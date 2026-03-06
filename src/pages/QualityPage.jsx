import { useMemo, useState } from 'react';
import {
  completeRecall,
  createRecall,
  executeRecall,
  fetchRecalls,
} from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime, formatNumber } from '../utils/formatters';

const STATUS_MAP = {
  NOTIFIED:  { label: '已通知', color: 'bg-amber-100 text-amber-700' },
  EXECUTING: { label: '执行中', color: 'bg-cyan-100 text-cyan-700' },
  COMPLETED: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: '已取消', color: 'bg-slate-100 text-slate-500' },
};

const LEVEL_MAP = {
  PRIMARY:   { label: '一级（高风险）', color: 'bg-rose-100 text-rose-700' },
  SECONDARY: { label: '二级（中风险）', color: 'bg-amber-100 text-amber-700' },
  TERTIARY:  { label: '三级（低风险）', color: 'bg-slate-100 text-slate-600' },
};

const DISPOSITION = {
  DESTROY:           '销毁',
  RETURN_TO_SUPPLIER: '退供应商',
  RETEST:            '重新检验',
  QUARANTINE:        '隔离处置',
};

function Badge({ status, map }) {
  const cfg = (map || STATUS_MAP)[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── 新建召回单 Modal ──────────────────────────────────────────────────────────
function CreateRecallModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    drugName: '', batchNo: '', reason: '',
    recallLevel: 'SECONDARY', dispositionType: 'DESTROY'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!form.drugName.trim() || !form.batchNo.trim()) { setError('请填写药品名称和批号'); return; }
    if (!form.reason.trim()) { setError('请填写召回原因'); return; }
    setError('');
    setSubmitting(true);
    try {
      await createRecall({
        drugName: form.drugName,
        batchNo: form.batchNo,
        reason: form.reason,
        recallLevel: form.recallLevel,
        dispositionType: form.dispositionType,
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">发起质量召回</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="space-y-4 px-6 py-4">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          召回后该批次将被自动冻结，请确认信息准确后再提交。
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">药品名称 *</label>
            <input value={form.drugName} onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
              placeholder="药品名称"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">批号 *</label>
            <input value={form.batchNo} onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))}
              placeholder="需要召回的批号"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">召回级别</label>
            <select value={form.recallLevel} onChange={(e) => setForm((f) => ({ ...f, recallLevel: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300">
              <option value="PRIMARY">一级（高风险）</option>
              <option value="SECONDARY">二级（中风险）</option>
              <option value="TERTIARY">三级（低风险）</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">处置方式</label>
            <select value={form.dispositionType} onChange={(e) => setForm((f) => ({ ...f, dispositionType: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300">
              {Object.entries(DISPOSITION).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}

            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">召回原因 *</label>
          <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={3}
            placeholder="详细描述召回原因，如：质量检验不合格、出现不良反应报告等"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300" />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className="rounded-xl bg-rose-600 px-5 py-2 text-sm text-white transition hover:bg-rose-700 disabled:opacity-50">
          {submitting ? '提交中...' : '发起召回'}
        </button>
      </div>
    </Modal>
  );
}

// ── 推进状态 Modal ────────────────────────────────────────────────────────────
function ProgressModal({ recall, onClose, onSuccess }) {
  const isExecuting = recall.status === 'NOTIFIED';
  const title = isExecuting ? '开始执行召回' : '完成召回';
  const [note, setNote] = useState('');
  const [dispositionType, setDispositionType] = useState(recall.dispositionType || 'DESTROY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      if (isExecuting) {
        await executeRecall(recall.id, { executionNote: note || undefined });
      } else {
        await completeRecall(recall.id, { executionNote: note || undefined, dispositionType });
      }
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="space-y-4 px-6 py-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
          <div className="flex justify-between text-slate-500"><span>药品</span><span className="font-medium text-slate-800">{recall.drugName}</span></div>
          <div className="flex justify-between text-slate-500"><span>批号</span><span className="font-mono font-medium text-slate-800">{recall.batchNo}</span></div>
          <div className="flex justify-between text-slate-500"><span>召回原因</span><span className="text-slate-700">{recall.reason}</span></div>
        </div>

        {!isExecuting && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">最终处置方式</label>
            <select value={dispositionType} onChange={(e) => setDispositionType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300">
              {Object.entries(DISPOSITION).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}

            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-slate-500">执行备注</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="可填写执行说明"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className={`rounded-xl px-5 py-2 text-sm text-white transition disabled:opacity-50 ${isExecuting ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
          {submitting ? '提交中...' : title}
        </button>
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function QualityPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [progressRecall, setProgressRecall] = useState(null);
  const toast = useToast();

  const { data: recalls, loading } = useAsyncData(fetchRecalls, [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  const stats = useMemo(() => {
    if (!recalls) return { total: 0, initiated: 0, executing: 0, completed: 0 };
    return {
      total: recalls.length,
      initiated: recalls.filter((r) => r.status === 'NOTIFIED').length,
      executing: recalls.filter((r) => r.status === 'EXECUTING').length,
      completed: recalls.filter((r) => r.status === 'COMPLETED').length,
    };
  }, [recalls]);

  const filtered = useMemo(() => {
    if (!recalls) return [];
    let list = statusFilter ? recalls.filter((r) => r.status === statusFilter) : recalls;
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((r) =>
      [r.drugName, r.batchNo, r.reason].some((v) => String(v || '').toLowerCase().includes(kw))
    );
    return list;
  }, [recalls, statusFilter, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: '召回总数', value: formatNumber(stats.total), sub: '全部', cls: 'text-slate-800' },
          { label: '待执行', value: formatNumber(stats.initiated), sub: '已发起未执行', cls: 'text-amber-700' },
          { label: '执行中', value: formatNumber(stats.executing), sub: '进行中', cls: 'text-cyan-700' },
          { label: '已完成', value: formatNumber(stats.completed), sub: '闭环完成', cls: 'text-emerald-700' },
        ].map((item) => (
          <article key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <strong className={`mt-3 block text-2xl ${item.cls}`}>{item.value}</strong>
            <p className="mt-1 text-xs text-slate-400">{item.sub}</p>
          </article>
        ))}
      </section>

      {/* 主工作区 */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部状态</option>
            <option value="NOTIFIED">已通知</option>
            <option value="EXECUTING">执行中</option>
            <option value="COMPLETED">已完成</option>
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="药品名称 / 批号..."
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setStatusFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>
          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white transition hover:bg-rose-700">+ 发起召回</button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium pl-6">药品名称</th>
                  <th className="px-5 py-3 font-medium">批号</th>
                  <th className="px-5 py-3 font-medium">召回级别</th>
                  <th className="px-5 py-3 font-medium">处置方式</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium">召回原因</th>
                  <th className="px-5 py-3 font-medium">发起时间</th>
                  <th className="px-5 py-3 font-medium pr-6">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-3 pl-6 font-medium">{r.drugName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.batchNo}</td>
                    <td className="px-5 py-3">
                      {r.recallLevel ? <Badge status={r.recallLevel} map={LEVEL_MAP} /> : '--'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{DISPOSITION[r.dispositionType] || r.dispositionType || '--'}</td>
                    <td className="px-5 py-3"><Badge status={r.status} map={STATUS_MAP} /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs max-w-[180px] truncate" title={r.reason}>{r.reason || '--'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{formatDateTime(r.createdAt)}</td>
                    <td className="px-5 py-3 pr-6">
                      {(r.status === 'NOTIFIED' || r.status === 'EXECUTING') && (
                        <button onClick={() => setProgressRecall(r)}
                          className={`rounded-lg px-3 py-1 text-xs text-white transition ${r.status === 'NOTIFIED' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                          {r.status === 'NOTIFIED' ? '开始执行' : '标记完成'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">暂无召回记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </section>

      {/* Modals */}
      {showCreate && (
        <CreateRecallModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh(); toast.success('召回单已发起'); }}
        />
      )}
      {progressRecall && (
        <ProgressModal
          recall={progressRecall}
          onClose={() => setProgressRecall(null)}
          onSuccess={() => {
            setProgressRecall(null);
            refresh();
            toast.success('状态已更新');
          }}
        />
      )}
    </div>
  );
}
