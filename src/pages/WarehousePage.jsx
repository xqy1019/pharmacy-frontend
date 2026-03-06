import { useMemo, useState } from 'react';
import {
  fetchInventoryBatches,
  fetchInventoryOverview,
  fetchInventoryTransactions,
  inboundBulk,
  outboundBulk,
} from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatDateTime, formatNumber } from '../utils/formatters';

const toneAccents = ['from-cyan-500 to-teal-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500'];

const TX_TYPE = {
  IN:       { label: '入库',   color: 'bg-emerald-100 text-emerald-700' },
  OUT:      { label: '出库',   color: 'bg-amber-100 text-amber-700' },
  MOVE:     { label: '移位',   color: 'bg-cyan-100 text-cyan-700' },
  FREEZE:   { label: '冻结',   color: 'bg-slate-100 text-slate-600' },
  UNFREEZE: { label: '解冻',   color: 'bg-blue-100 text-blue-700' },
  ADJUST:   { label: '调整',   color: 'bg-purple-100 text-purple-700' },
};

function TxBadge({ type }) {
  const cfg = TX_TYPE[type] || { label: type, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── 入库 Modal ───────────────────────────────────────────────────────────────
const EMPTY_IN_ITEM = () => ({
  drugName: '', batchNo: '', expiryDate: '', quantity: '10',
  unitCost: '0.00', locationCode: '', supplierName: '',
});

function InboundModal({ onClose, onSuccess }) {
  const [items, setItems] = useState([EMPTY_IN_ITEM()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  async function handleSubmit() {
    const invalid = items.find((i) => !i.drugName.trim() || !i.batchNo.trim() || !i.quantity);
    if (invalid) { setError('药品名称、批号、数量为必填项'); return; }
    setError('');
    setSubmitting(true);
    try {
      await inboundBulk({
        warehouseId: 1,
        sourceType: 'MANUAL',
        items: items.map((i) => ({
          drugName: i.drugName,
          batchNo: i.batchNo,
          expiryDate: i.expiryDate || undefined,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost || 0),
          locationCode: i.locationCode || undefined,
          supplierName: i.supplierName || undefined,
        })),
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '入库失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">批量入库</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">入库明细（共 {items.length} 行）</span>
          <button onClick={() => setItems((p) => [...p, EMPTY_IN_ITEM()])}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100">
            + 添加行
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium min-w-[130px]">药品名称 *</th>
                  <th className="px-3 py-2 text-left font-medium w-28">批号 *</th>
                  <th className="px-3 py-2 text-left font-medium w-32">效期</th>
                  <th className="px-3 py-2 text-left font-medium w-20">数量 *</th>
                  <th className="px-3 py-2 text-left font-medium w-24">单价(元)</th>
                  <th className="px-3 py-2 text-left font-medium w-28">货位</th>
                  <th className="px-3 py-2 text-left font-medium w-28">供应商</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input value={item.drugName} onChange={(e) => updateItem(idx, 'drugName', e.target.value)}
                        placeholder="药品名称"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.batchNo} onChange={(e) => updateItem(idx, 'batchNo', e.target.value)}
                        placeholder="批号"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" value={item.expiryDate} onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" value={item.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.locationCode} onChange={(e) => updateItem(idx, 'locationCode', e.target.value)}
                        placeholder="如 A01-01"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.supplierName} onChange={(e) => updateItem(idx, 'supplierName', e.target.value)}
                        placeholder="供应商"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {items.length > 1 && (
                        <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-600">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? '提交中...' : '确认入库'}
        </button>
      </div>
    </Modal>
  );
}

// ── 出库 Modal ───────────────────────────────────────────────────────────────
function OutboundModal({ batches, onClose, onSuccess }) {
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('SALE');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedBatch = batches.find((b) => String(b.id) === String(batchId));

  async function handleSubmit() {
    if (!batchId) { setError('请选择批次'); return; }
    if (!quantity || Number(quantity) <= 0) { setError('请填写有效数量'); return; }
    setError('');
    setSubmitting(true);
    try {
      await outboundBulk({
        warehouseId: 1,
        drugId: selectedBatch.drugId,
        qty: String(quantity),
        batchId: Number(batchId),
        refId: note || undefined,
      });
      onSuccess();
    } catch (e) {
      setError(e?.message || '出库失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">出库操作</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="space-y-4 px-6 py-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">选择批次 *</label>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300">
            <option value="">-- 请选择批次 --</option>
            {batches.filter((b) => b.status === 'ACTIVE' && Number(b.availableQty || b.remainingQty || 0) > 0).map((b) => (
              <option key={b.id} value={b.id}>
                {b.drugName} | 批号: {b.batchNo} | 可出: {b.availableQty ?? b.remainingQty ?? 0}
              </option>
            ))}
          </select>
        </div>

        {selectedBatch && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <span className="mr-4">效期：{formatDate(selectedBatch.expiryDate)}</span>
            <span>货位：{selectedBatch.locationCode || '--'}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">出库数量 *</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              max={selectedBatch?.availableQty ?? selectedBatch?.remainingQty}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300" />
            {selectedBatch && (
              <p className="mt-1 text-xs text-slate-400">最大可出: {selectedBatch.availableQty ?? selectedBatch.remainingQty}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">出库原因</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300">
              <option value="SALE">销售出库</option>
              <option value="DISPENSE">发药出库</option>
              <option value="TRANSFER">调拨出库</option>
              <option value="DAMAGE">报损</option>
              <option value="EXPIRY">过期处置</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">备注</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="可选备注"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-300" />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className="rounded-xl bg-amber-500 px-5 py-2 text-sm text-white transition hover:bg-amber-600 disabled:opacity-50">
          {submitting ? '提交中...' : '确认出库'}
        </button>
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function WarehousePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInbound, setShowInbound] = useState(false);
  const [showOutbound, setShowOutbound] = useState(false);
  const toast = useToast();

  const { data: overview } = useAsyncData(() => fetchInventoryOverview(1), [refreshKey]);
  const { data: transactions, loading: txLoading } = useAsyncData(() => fetchInventoryTransactions(1), [refreshKey]);
  const { data: batches } = useAsyncData(() => fetchInventoryBatches(1), [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  const filteredTx = useMemo(() => {
    if (!transactions) return [];
    let list = typeFilter ? transactions.filter((t) => t.txType === typeFilter) : transactions;
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((t) =>
      [t.drugName, t.batchNo, t.operatorName, t.remark].some((v) => String(v || '').toLowerCase().includes(kw)),
    );
    return list;
  }, [transactions, typeFilter, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTx.slice(start, start + pageSize);
  }, [filteredTx, page, pageSize]);

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      {overview && (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: '在库批次',   value: formatNumber(overview.batchCount ?? overview.totalBatches ?? overview.totalBatchCount), detail: '当前有效批次数', accent: toneAccents[0] },
            { label: '库存总量',   value: formatNumber(overview.totalQuantity ?? overview.totalQty ?? overview.totalStock), detail: '所有药品总库存', accent: toneAccents[1] },
            { label: '今日出入库', value: formatNumber(overview.todayTxCount ?? '--'), detail: '今日操作笔数', accent: toneAccents[2] },
          ].map((item) => (
            <SummaryCard key={item.label} {...item} />
          ))}
        </section>
      )}

      {/* 主工作区 */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <span className="text-sm font-semibold text-slate-700">出入库流水</span>

          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部类型</option>
            <option value="IN">入库</option>
            <option value="OUT">出库</option>
            <option value="MOVE">移位</option>
            <option value="FREEZE">冻结</option>
            <option value="UNFREEZE">解冻</option>
          </select>

          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="药品名称 / 批号..."
            className="w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setTypeFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>

          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setShowOutbound(true)}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 transition hover:bg-amber-100">出库</button>
            <button onClick={() => setShowInbound(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700">+ 入库</button>
          </div>
        </div>

        {/* 流水表格 */}
        {txLoading ? (
          <div className="py-16 text-center text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium pl-6">药品名称</th>
                  <th className="px-5 py-3 font-medium">批号</th>
                  <th className="px-5 py-3 font-medium">类型</th>
                  <th className="px-5 py-3 font-medium">数量变动</th>
                  <th className="px-5 py-3 font-medium">操作人</th>
                  <th className="px-5 py-3 font-medium">备注</th>
                  <th className="px-5 py-3 font-medium pr-6">时间</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-3 pl-6 font-medium">{tx.drugName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{tx.batchNo || '--'}</td>
                    <td className="px-5 py-3"><TxBadge type={tx.txType} /></td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${(tx.quantityChange ?? tx.qty ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {(tx.quantityChange ?? tx.qty ?? 0) > 0 ? '+' : ''}{tx.quantityChange ?? tx.qty ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{tx.operatorName || '--'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{tx.remark || '--'}</td>
                    <td className="px-5 py-3 pr-6 text-xs text-slate-400">{formatDateTime(tx.createdAt || tx.occurredAt)}</td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">暂无出入库记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pager
          total={filteredTx.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </section>

      {/* Modals */}
      {showInbound && (
        <InboundModal
          onClose={() => setShowInbound(false)}
          onSuccess={() => { setShowInbound(false); refresh(); toast.success('入库成功'); }}
        />
      )}
      {showOutbound && batches && (
        <OutboundModal
          batches={batches}
          onClose={() => setShowOutbound(false)}
          onSuccess={() => { setShowOutbound(false); refresh(); toast.success('出库成功'); }}
        />
      )}
    </div>
  );
}
