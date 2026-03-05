import { useMemo, useState } from 'react';
import { fetchLowStockAlerts, fetchNearExpiryAlerts, freezeBatch } from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatNumber } from '../utils/formatters';

// ── 冻结批次 Modal（近效期处置）────────────────────────────────────────
function FreezeModal({ alert, onClose, onDone }) {
  const [qty, setQty] = useState(String(alert.availableQty || ''));
  const [reason, setReason] = useState(`近效期处置：${alert.drugName} 批号 ${alert.batchNo}`);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { setError('请输入有效数量'); return; }
    if (!reason.trim()) { setError('请填写处置原因'); return; }
    setSubmitting(true);
    setError('');
    try {
      await freezeBatch(alert.batchId, { qty: qtyNum, reason: reason.trim(), freezeType: 'NEAR_EXPIRY' });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-slate-800">冻结批次 · 近效期处置</h3>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">✕</button>
      </div>

        <div className="space-y-4 px-6 py-5">
          {/* 批次信息 */}
          <div className="rounded-[14px] bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
            <p className="font-medium text-amber-800">{alert.drugName}</p>
            <p className="mt-1 text-amber-600">
              批号：{alert.batchNo} · 效期：{formatDate(alert.expiryDate)} · 可售：{formatNumber(alert.availableQty)}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">冻结数量</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min="0.0001"
              max={alert.availableQty}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
            <p className="mt-1 text-xs text-slate-400">可售库存 {formatNumber(alert.availableQty)}，可全部或部分冻结</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">处置原因</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            取消
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50">
            {submitting ? '提交中...' : '确认冻结'}
          </button>
        </div>
    </Modal>
  );
}

// ── 主页面 ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all', label: '全部' },
  { key: 'low', label: '低库存' },
  { key: 'expiry', label: '近效期' },
];

export default function AlertsPage() {
  const [activeType, setActiveType] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  // 本地已知晓集合（低库存用，key = drugId）
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());
  // 已冻结批次集合（近效期用，key = batchId）
  const [frozenBatchIds, setFrozenBatchIds] = useState(new Set());
  // 冻结 Modal
  const [freezeTarget, setFreezeTarget] = useState(null);
  // 是否只显示待处理
  const [onlyPending, setOnlyPending] = useState(true);

  const { data, loading, error } = useAsyncData(
    async () => {
      const [low, expiry] = await Promise.all([fetchLowStockAlerts(), fetchNearExpiryAlerts()]);
      return { low, expiry };
    },
    [refreshKey]
  );

  const counts = useMemo(() => {
    if (!data) return { all: 0, low: 0, expiry: 0 };
    return { all: data.low.length + data.expiry.length, low: data.low.length, expiry: data.expiry.length };
  }, [data]);

  // 合并 + 标注处置状态
  const allRows = useMemo(() => {
    if (!data) return [];
    const lowRows = data.low.map((item) => ({
      ...item,
      _type: 'low',
      _key: `low-${item.drugId}`,
      _handled: acknowledgedIds.has(item.drugId),
    }));
    const expiryRows = data.expiry.map((item) => ({
      ...item,
      _type: 'expiry',
      _key: `expiry-${item.batchId}`,
      _handled: frozenBatchIds.has(item.batchId),
    }));
    return [...lowRows, ...expiryRows];
  }, [data, acknowledgedIds, frozenBatchIds]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (activeType === 'low') rows = rows.filter((r) => r._type === 'low');
    if (activeType === 'expiry') rows = rows.filter((r) => r._type === 'expiry');
    if (onlyPending) rows = rows.filter((r) => !r._handled);
    return rows;
  }, [allRows, activeType, onlyPending]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handledCount = useMemo(() => allRows.filter((r) => r._handled).length, [allRows]);

  if (loading || !data) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">正在加载预警数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">预警数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="全部预警" value={formatNumber(counts.all)} detail={`待处理 ${counts.all - handledCount} 条`} accent="from-rose-500 to-red-500" />
        <SummaryCard label="低库存" value={formatNumber(counts.low)} detail={`已知晓 ${acknowledgedIds.size} 条`} accent="from-amber-500 to-orange-400" />
        <SummaryCard label="近效期批次" value={formatNumber(counts.expiry)} detail={`已冻结 ${frozenBatchIds.size} 批`} accent="from-purple-500 to-violet-500" />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        {/* Tab 栏 + 控制 */}
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex gap-6">
            {TABS.map((t) => (
              <button key={t.key} type="button"
                onClick={() => { setActiveType(t.key); setPage(1); }}
                className={`border-b-2 pb-3 text-sm font-medium transition ${activeType === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{counts[t.key]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
              <input type="checkbox" checked={onlyPending} onChange={(e) => { setOnlyPending(e.target.checked); setPage(1); }}
                className="rounded" />
              只看待处理
            </label>
            <button type="button" onClick={() => { setRefreshKey((v) => v + 1); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              刷新
            </button>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['预警类型', '药品', '当前值 / 批号', '阈值 / 效期', '货位', '说明', '处置操作'].map((col) => (
                    <th key={col} className="px-5 py-3 font-medium first:pl-6 last:pr-6">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row._key}
                    className={`border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70 ${row._handled ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3 pl-6">
                      {row._type === 'low' ? (
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">低库存</span>
                      ) : (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">近效期</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.drugName}</td>
                    <td className="px-5 py-3">
                      {row._type === 'low'
                        ? <span className="font-semibold text-rose-600">{formatNumber(row.currentQty)}</span>
                        : <span className="font-mono text-xs text-slate-600">{row.batchNo}</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {row._type === 'low'
                        ? `阈值 ${formatNumber(row.threshold)}`
                        : <span className="text-amber-600">{formatDate(row.expiryDate)}</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {row._type === 'low' ? '--' : (row.locationCode || '--')}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {row._type === 'low'
                        ? `冻结 ${formatNumber(row.frozenQty)} / 占用 ${formatNumber(row.reservedQty)}`
                        : `可售 ${formatNumber(row.availableQty)}`}
                    </td>
                    <td className="px-5 py-3 pr-6">
                      {row._handled ? (
                        <span className="text-xs text-slate-400">已处置</span>
                      ) : row._type === 'low' ? (
                        <button type="button"
                          onClick={() => setAcknowledgedIds((prev) => new Set([...prev, row.drugId]))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
                          标记已知晓
                        </button>
                      ) : (
                        <button type="button"
                          onClick={() => setFreezeTarget(row)}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600">
                          冻结处置
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      {onlyPending ? '全部预警已处置完毕 ✓' : '暂无预警数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager total={filtered.length} page={page} pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </div>
      </section>

      {/* 冻结 Modal */}
      {freezeTarget && (
        <FreezeModal
          alert={freezeTarget}
          onClose={() => setFreezeTarget(null)}
          onDone={() => {
            setFrozenBatchIds((prev) => new Set([...prev, freezeTarget.batchId]));
            setFreezeTarget(null);
          }}
        />
      )}
    </div>
  );
}
