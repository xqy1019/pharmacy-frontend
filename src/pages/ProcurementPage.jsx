import { useEffect, useMemo, useState } from 'react';
import {
  approveProcurementOrder,
  cancelProcurementOrder,
  createProcurementOrder,
  fetchProcurementOrderDetail,
  fetchProcurementOrders,
  fetchProcurementOverview,
  receiveProcurementOrder,
  submitProcurementOrder,
} from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { DEFAULT_WAREHOUSE_ID } from '../config/warehouse';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatNumber, formatPercent } from '../utils/formatters';

// ── Status ──────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  DRAFT:            { label: '草稿',   color: 'bg-slate-100 text-slate-600' },
  PENDING_APPROVAL: { label: '待审批', color: 'bg-amber-100 text-amber-700' },
  APPROVED:         { label: '已审批', color: 'bg-blue-100 text-blue-700' },
  REJECTED:         { label: '已驳回', color: 'bg-rose-100 text-rose-700' },
  PARTIAL_RECEIVED: { label: '部分收货', color: 'bg-cyan-100 text-cyan-700' },
  RECEIVED:         { label: '已收货', color: 'bg-emerald-100 text-emerald-700' }
};

function Badge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── Shared ───────────────────────────────────────────────────────────────────
const toneAccents = ['from-cyan-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-emerald-500 to-green-500'];

// ── Create Order Modal ───────────────────────────────────────────────────────
const EMPTY_ITEM = () => ({ drugName: '', spec: '', quantity: '10', unitPrice: '0.00' });

function CreateOrderModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ supplierName: '', plannedArrivalDate: '', priorityLevel: 'NORMAL', remark: '' });
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  async function handleSave() {
    if (!form.supplierName.trim()) { setError('请填写供应商名称'); return; }
    if (items.some((i) => !i.drugName.trim())) { setError('请填写所有药品名称'); return; }
    setError('');
    setSubmitting(true);
    try {
      const order = await createProcurementOrder({
        supplierName: form.supplierName,
        plannedArrivalDate: form.plannedArrivalDate || undefined,
        priorityLevel: form.priorityLevel,
        remark: form.remark || undefined,
        items: items.map((i) => ({ drugName: i.drugName, spec: i.spec || undefined, quantity: i.quantity, unitPrice: i.unitPrice }))
      });
      onSuccess(order);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">新建采购单</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">供应商名称 *</label>
              <input value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
                placeholder="输入供应商名称"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">计划到货日期</label>
              <input type="date" value={form.plannedArrivalDate} onChange={(e) => setForm((f) => ({ ...f, plannedArrivalDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">优先级</label>
              <select value={form.priorityLevel} onChange={(e) => setForm((f) => ({ ...f, priorityLevel: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300">
                <option value="NORMAL">普通</option>
                <option value="URGENT">紧急</option>
                <option value="CRITICAL">特急</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">备注</label>
              <input value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                placeholder="可选备注"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
            </div>
          </div>

          {/* 采购明细 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">采购明细</span>
              <button onClick={() => setItems((p) => [...p, EMPTY_ITEM()])}
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700 hover:bg-cyan-100">
                + 添加行
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">药品名称 *</th>
                    <th className="px-3 py-2 text-left font-medium w-24">规格</th>
                    <th className="px-3 py-2 text-left font-medium w-20">数量</th>
                    <th className="px-3 py-2 text-left font-medium w-24">单价(元)</th>
                    <th className="px-3 py-2 text-left font-medium w-20">小计</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input value={item.drugName} onChange={(e) => updateItem(idx, 'drugName', e.target.value)}
                          placeholder="药品名称"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.spec} onChange={(e) => updateItem(idx, 'spec', e.target.value)}
                          placeholder="规格"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300" />
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        ¥{(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
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
            <div className="mt-2 text-right text-sm font-semibold text-slate-700">
              合计：¥{total.toFixed(2)}
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
          <button onClick={handleSave} disabled={submitting}
            className="rounded-xl bg-cyan-600 px-5 py-2 text-sm text-white transition hover:bg-cyan-700 disabled:opacity-50">
            {submitting ? '保存中...' : '保存草稿'}
          </button>
        </div>
    </Modal>
  );
}

// ── Approve Modal ────────────────────────────────────────────────────────────
function ApproveModal({ order, onClose, onSuccess }) {
  const [pass, setPass] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await approveProcurementOrder(order.id, { pass, approvalNote: note });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '审批失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">采购单审批</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="space-y-4 px-6 py-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <div className="mb-2 flex justify-between text-slate-500"><span>采购单号</span><span className="font-medium text-slate-800">{order.orderNo}</span></div>
          <div className="mb-2 flex justify-between text-slate-500"><span>供应商</span><span className="font-medium text-slate-800">{order.supplierName}</span></div>
          <div className="flex justify-between text-slate-500"><span>总金额</span><span className="font-medium text-slate-800">¥{formatNumber(order.totalAmount)}</span></div>
        </div>
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={pass} onChange={() => setPass(true)} className="accent-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">审批通过</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={!pass} onChange={() => setPass(false)} className="accent-rose-500" />
            <span className="text-sm font-medium text-rose-700">驳回</span>
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">审批意见（可选）</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="填写审批意见..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className={`rounded-xl px-5 py-2 text-sm text-white transition disabled:opacity-50 ${pass ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-500 hover:bg-rose-600'}`}>
          {submitting ? '提交中...' : (pass ? '确认通过' : '确认驳回')}
        </button>
      </div>
    </Modal>
  );
}

// ── Receive Modal ─────────────────────────────────────────────────────────────
function ReceiveModal({ orderId, onClose, onSuccess }) {
  const { data: order, loading } = useAsyncData(() => fetchProcurementOrderDetail(orderId), [orderId]);
  const [lines, setLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order?.items) {
      setLines(
        order.items.map((item) => ({
          itemId: item.id,
          drugName: item.drugName,
          orderedQty: item.quantity,
          receivedQty: item.quantity,
          acceptedQty: item.quantity,
          batchNo: item.batchNo || '',
          expiryDate: item.expiryDate || ''
        }))
      );
    }
  }, [order]);

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function handleSubmit() {
    // 超量校验
    for (const l of lines) {
      if (Number(l.receivedQty) > Number(l.orderedQty)) {
        setError(`「${l.drugName}」实收量（${l.receivedQty}）不能超过订购量（${l.orderedQty}）`);
        return;
      }
      if (Number(l.acceptedQty) > Number(l.receivedQty)) {
        setError(`「${l.drugName}」验收量（${l.acceptedQty}）不能超过实收量（${l.receivedQty}）`);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      await receiveProcurementOrder(orderId, {
        warehouseId: DEFAULT_WAREHOUSE_ID,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          receivedQty: l.receivedQty,
          acceptedQty: l.acceptedQty,
          batchNo: l.batchNo || undefined,
          expiryDate: l.expiryDate || undefined
        }))
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '收货失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">确认收货入库</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-10 text-center text-slate-400">加载采购单明细...</div>
          ) : (
            <>
              <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex flex-wrap gap-6">
                  <span className="text-slate-500">单号：<span className="font-medium text-slate-800">{order?.orderNo}</span></span>
                  <span className="text-slate-500">供应商：<span className="font-medium text-slate-800">{order?.supplierName}</span></span>
                  <span className="text-slate-500">计划到货：<span className="font-medium text-slate-800">{formatDate(order?.plannedArrivalDate) || '--'}</span></span>
                  <span className="text-slate-500">总金额：<span className="font-medium text-slate-800">¥{formatNumber(order?.totalAmount)}</span></span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">药品名称</th>
                      <th className="px-3 py-2 text-left font-medium w-16">订购量</th>
                      <th className="px-3 py-2 text-left font-medium w-20">实收量</th>
                      <th className="px-3 py-2 text-left font-medium w-20">验收量</th>
                      <th className="px-3 py-2 text-left font-medium w-28">批号</th>
                      <th className="px-3 py-2 text-left font-medium w-32">效期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-700">{line.drugName}</td>
                        <td className="px-3 py-2 text-slate-500">{line.orderedQty}</td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max={line.orderedQty} value={line.receivedQty}
                            onChange={(e) => updateLine(idx, 'receivedQty', e.target.value)}
                            className={`w-full rounded-lg border bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300 ${Number(line.receivedQty) > Number(line.orderedQty) ? 'border-rose-400 text-rose-600' : 'border-slate-200'}`} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max={line.receivedQty} value={line.acceptedQty}
                            onChange={(e) => updateLine(idx, 'acceptedQty', e.target.value)}
                            className={`w-full rounded-lg border bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300 ${Number(line.acceptedQty) > Number(line.receivedQty) ? 'border-rose-400 text-rose-600' : 'border-slate-200'}`} />
                        </td>
                        <td className="px-3 py-2">
                          <input value={line.batchNo}
                            onChange={(e) => updateLine(idx, 'batchNo', e.target.value)}
                            placeholder="批号"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="date" value={line.expiryDate}
                            onChange={(e) => updateLine(idx, 'expiryDate', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300" />
                        </td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">暂无采购明细</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            </>
          )}
        </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting || loading || lines.length === 0}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? '提交中...' : '确认收货入库'}
        </button>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function ProcurementPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedApprove, setSelectedApprove] = useState(null);
  const [selectedReceive, setSelectedReceive] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  const { data, loading, error } = useAsyncData(async () => {
    const [overview, orders] = await Promise.all([fetchProcurementOverview(), fetchProcurementOrders()]);
    return { overview, orders };
  }, [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  async function handleCancelOrder(order) {
    if (!window.confirm(`确认撤销采购单「${order.orderNo}」？此操作不可撤销。`)) return;
    setCancellingId(order.id);
    try {
      await cancelProcurementOrder(order.id);
      toast.success('采购单已撤销');
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || '撤销失败');
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSubmitOrder(order) {
    setSubmittingId(order.id);
    try {
      await submitProcurementOrder(order.id);
      toast.success('已提交审批');
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || '提交失败');
    } finally {
      setSubmittingId(null);
    }
  }

  const filteredOrders = useMemo(() => {
    let list = data?.orders || [];
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((o) =>
      [o.orderNo, o.supplierName, o.planNo].some((v) => String(v || '').toLowerCase().includes(kw))
    );
    return list;
  }, [data, statusFilter, appliedKeyword]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const overview = data?.overview;

  if (loading || !overview) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">正在加载采购数据...</div>;
  }
  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* 统计 */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: '供应商', value: formatNumber(overview.supplierTotal), detail: `有效供应商 ${formatNumber(overview.validSuppliers)} 家` },
          { label: '采购订单', value: formatNumber(overview.orderTotal), detail: `待到货 ${formatNumber(overview.dueArrivals)} 单` },
          { label: '采购达成率', value: formatPercent(overview.procurementAchieveRate, 2), detail: `累计金额 ¥${formatNumber(overview.totalProcurementAmount)}` }
        ].map((item, i) => (
          <SummaryCard key={item.label} {...item} accent={toneAccents[i]} />
        ))}
      </section>

      {/* 订单列表 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PENDING_APPROVAL">待审批</option>
            <option value="APPROVED">已审批</option>
            <option value="REJECTED">已驳回</option>
            <option value="PARTIAL_RECEIVED">部分收货</option>
            <option value="RECEIVED">已收货</option>
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="搜索单号 / 供应商..."
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setStatusFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>
          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新建采购单</button>
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium first:pl-6">采购单号</th>
                <th className="px-5 py-3 font-medium">供应商</th>
                <th className="px-5 py-3 font-medium">总金额</th>
                <th className="px-5 py-3 font-medium">收货进度</th>
                <th className="px-5 py-3 font-medium">优先级</th>
                <th className="px-5 py-3 font-medium">状态</th>
                <th className="px-5 py-3 font-medium">计划到货</th>
                <th className="px-5 py-3 font-medium last:pr-6">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrders.map((order) => {
                const progress = Number(order.totalAmount || 0) > 0
                  ? Math.round((Number(order.receivedAmount || 0) / Number(order.totalAmount)) * 100)
                  : 0;
                return (
                  <tr key={order.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-3 first:pl-6">
                      <div className="font-mono text-xs">{order.orderNo}</div>
                      {order.planNo && <div className="mt-0.5 text-xs text-slate-400">{order.planNo}</div>}
                    </td>
                    <td className="px-5 py-3">{order.supplierName}</td>
                    <td className="px-5 py-3 font-medium">¥{formatNumber(order.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${['URGENT', 'CRITICAL'].includes(order.priorityLevel) ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {order.priorityLevelLabel || order.priorityLevel || '--'}
                      </span>
                    </td>
                    <td className="px-5 py-3"><Badge status={order.status} /></td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(order.plannedArrivalDate) || '--'}</td>
                    <td className="px-5 py-3 last:pr-6">
                      <div className="flex items-center gap-2">
                        {order.status === 'DRAFT' && (
                          <>
                            <button disabled={submittingId === order.id} onClick={() => handleSubmitOrder(order)}
                              className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white transition hover:bg-amber-600 disabled:opacity-50">
                              提交审批
                            </button>
                            <button disabled={cancellingId === order.id} onClick={() => handleCancelOrder(order)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                              {cancellingId === order.id ? '撤销中...' : '撤销'}
                            </button>
                          </>
                        )}
                        {order.status === 'PENDING_APPROVAL' && (
                          <button onClick={() => setSelectedApprove(order)}
                            className="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white transition hover:bg-blue-600">
                            审批
                          </button>
                        )}
                        {(order.status === 'APPROVED' || order.status === 'PARTIAL_RECEIVED') && (
                          <button onClick={() => setSelectedReceive(order.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white transition hover:bg-emerald-700">
                            确认收货
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagedOrders.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pager
          total={filteredOrders.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </section>

      {/* Modals */}
      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh(); }}
        />
      )}
      {selectedApprove && (
        <ApproveModal
          order={selectedApprove}
          onClose={() => setSelectedApprove(null)}
          onSuccess={() => { setSelectedApprove(null); refresh(); }}
        />
      )}
      {selectedReceive !== null && (
        <ReceiveModal
          orderId={selectedReceive}
          onClose={() => setSelectedReceive(null)}
          onSuccess={() => { setSelectedReceive(null); refresh(); }}
        />
      )}
    </div>
  );
}

export default ProcurementPage;
