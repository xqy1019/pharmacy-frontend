import { useMemo, useState } from 'react';
import {
  approveReturn,
  cancelSaleOrder,
  createSaleOrder,
  fetchInventoryBatches,
  fetchSalesOrders,
  fetchSalesReturns,
  fetchTraceCodes,
  paySaleOrder,
  refundSaleOrder,
  rejectReturn,
} from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime, formatNumber } from '../utils/formatters';

// ── 状态字典 ──────────────────────────────────────────────────────────────────
const ORDER_STATUS = {
  PENDING:   { label: '待支付', color: 'bg-amber-100 text-amber-700' },
  PAID:      { label: '已支付', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: '已取消', color: 'bg-slate-100 text-slate-500' },
  REFUNDED:  { label: '已退款', color: 'bg-rose-100 text-rose-700' },
};

const RETURN_STATUS = {
  PENDING:   { label: '待处理', color: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED:  { label: '已驳回', color: 'bg-rose-100 text-rose-700' },
};

const PAY_METHOD = {
  CASH:    '现金',
  CARD:    '刷卡',
  ALIPAY:  '支付宝',
  WECHAT:  '微信',
  MEDICAL_INSURANCE: '医保',
};

const toneAccents = ['from-cyan-500 to-teal-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500'];

function Badge({ status, map }) {
  const cfg = map[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── 新建销售订单 Modal ────────────────────────────────────────────────────────
const EMPTY_ITEM = () => ({ batchId: '', drugId: null, drugName: '', spec: '', quantity: '1', unitPrice: '0.00' });

function CreateOrderModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ patientName: '', patientAge: '', remark: '' });
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: batchesData } = useAsyncData(() => fetchInventoryBatches(1), []);
  const activeBatches = useMemo(() => {
    if (!batchesData) return [];
    const list = Array.isArray(batchesData) ? batchesData : (batchesData.list || []);
    return list.filter((b) => b.status === 'ACTIVE' && Number(b.availableQty || b.remainingQty || 0) > 0);
  }, [batchesData]);

  const total = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function selectBatch(idx, batchId) {
    const batch = activeBatches.find((b) => String(b.id) === String(batchId));
    if (!batch) { updateItem(idx, 'batchId', ''); return; }
    setItems((prev) => prev.map((it, i) => i === idx ? {
      ...it,
      batchId: String(batch.id),
      drugId: batch.drugId,
      drugName: batch.drugName,
      spec: batch.spec || '',
    } : it));
  }

  async function handleSave() {
    if (!form.patientName.trim()) { setError('请填写患者姓名'); return; }
    if (items.some((i) => !i.batchId)) { setError('请为每行选择药品批次'); return; }
    setError('');
    setSubmitting(true);
    try {
      const order = await createSaleOrder({
        patientName: form.patientName,
        patientAge: form.patientAge ? Number(form.patientAge) : undefined,
        saleNote: form.remark || undefined,
        items: items.map((i) => ({
          drugName: i.drugName,
          drugId: i.drugId || undefined,
          spec: i.spec || undefined,
          batchId: Number(i.batchId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      onSuccess(order);
    } catch (e) {
      setError(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">新建销售订单</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">患者姓名 *</label>
            <input value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
              placeholder="患者姓名"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">年龄</label>
            <input type="number" min="0" value={form.patientAge} onChange={(e) => setForm((f) => ({ ...f, patientAge: e.target.value }))}
              placeholder="岁"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">备注</label>
            <input value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
              placeholder="可选备注"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">销售明细（从库存批次选取药品）</span>
            <button onClick={() => setItems((p) => [...p, EMPTY_ITEM()])}
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700 hover:bg-cyan-100">
              + 添加行
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium min-w-[200px]">选择批次 *</th>
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
                      <select value={item.batchId} onChange={(e) => selectBatch(idx, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-cyan-300">
                        <option value="">-- 选择药品批次 --</option>
                        {activeBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.drugName}｜{b.batchNo}｜可售:{b.availableQty ?? b.remainingQty}
                          </option>
                        ))}
                      </select>
                      {item.spec && <p className="mt-0.5 pl-1 text-slate-400">{item.spec}</p>}
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
          {submitting ? '创建中...' : '创建订单'}
        </button>
      </div>
    </Modal>
  );
}

// ── 收款 Modal ───────────────────────────────────────────────────────────────
function PayModal({ order, onClose, onSuccess }) {
  const [payMethod, setPayMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const amount = Number(order.totalAmount || 0);

  async function handlePay() {
    setSubmitting(true);
    setError('');
    try {
      await paySaleOrder(order.id, { paymentMethod: payMethod, amount });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '收款失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">收款确认</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="space-y-4 px-6 py-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <div className="mb-2 flex justify-between text-slate-500">
            <span>订单号</span><span className="font-mono font-medium text-slate-800">{order.orderNo}</span>
          </div>
          <div className="mb-2 flex justify-between text-slate-500">
            <span>患者</span><span className="font-medium text-slate-800">{order.patientName}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>应收金额</span>
            <span className="text-lg font-bold text-emerald-700">¥{formatNumber(amount)}</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs text-slate-500">支付方式</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PAY_METHOD).map(([k, v]) => (
              <button key={k} type="button"
                onClick={() => setPayMethod(k)}
                className={`rounded-xl border py-2 text-sm transition ${
                  payMethod === k
                    ? 'border-cyan-400 bg-cyan-50 font-medium text-cyan-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handlePay} disabled={submitting}
          className="rounded-xl bg-emerald-600 px-5 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50">
          {submitting ? '处理中...' : `确认收款 ¥${formatNumber(amount)}`}
        </button>
      </div>
    </Modal>
  );
}

// ── 退款 Modal ───────────────────────────────────────────────────────────────
function RefundModal({ order, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleRefund() {
    setSubmitting(true);
    setError('');
    try {
      await refundSaleOrder(order.id, { returnReason: reason || undefined, stockAction: 'RETURN' });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '退款失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">退款申请</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="space-y-4 px-6 py-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          退款后库存将自动回收，订单状态变更为「已退款」，此操作不可撤销。
        </div>
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <div className="mb-2 flex justify-between text-slate-500">
            <span>订单号</span><span className="font-mono font-medium text-slate-800">{order.orderNo}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>退款金额</span><span className="font-bold text-rose-700">¥{formatNumber(order.totalAmount)}</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">退款原因</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="填写退款原因（可选）"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleRefund} disabled={submitting}
          className="rounded-xl bg-rose-500 px-5 py-2 text-sm text-white transition hover:bg-rose-600 disabled:opacity-50">
          {submitting ? '处理中...' : '确认退款'}
        </button>
      </div>
    </Modal>
  );
}

// ── 退货审核 Modal ────────────────────────────────────────────────────────────
function ReviewReturnModal({ returnRecord, onClose, onSuccess }) {
  const [pass, setPass] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      if (pass) {
        await approveReturn(returnRecord.id, { reviewNote: note || undefined });
        toast.success('退货已审核通过');
      } else {
        await rejectReturn(returnRecord.id, { reviewNote: note || undefined });
        toast.success('退货已驳回');
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
        <h2 className="text-lg font-semibold text-slate-800">退货审核</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="space-y-4 px-6 py-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
          <div className="flex justify-between text-slate-500">
            <span>退货单号</span><span className="font-mono font-medium text-slate-800">{returnRecord.returnNo || '--'}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>原订单</span><span className="font-mono text-slate-700">{returnRecord.originalOrderNo || '--'}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>退款金额</span><span className="font-bold text-rose-700">¥{formatNumber(returnRecord.refundAmount || returnRecord.totalAmount)}</span>
          </div>
          {returnRecord.returnReason && (
            <div className="flex justify-between text-slate-500">
              <span>退货原因</span><span className="text-slate-700">{returnRecord.returnReason}</span>
            </div>
          )}
        </div>
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={pass} onChange={() => setPass(true)} className="accent-emerald-500" />
            <span className="text-sm font-medium text-emerald-700">审核通过</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={!pass} onChange={() => setPass(false)} className="accent-rose-500" />
            <span className="text-sm font-medium text-rose-700">驳回</span>
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">审核意见（可选）</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="填写审核意见..."
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

// ── 追溯查询 Modal ────────────────────────────────────────────────────────────
function TraceModal({ onClose }) {
  const [traceCode, setTraceCode] = useState('');
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleQuery() {
    if (!traceCode.trim()) { setError('请输入追溯码'); return; }
    setQuerying(true);
    setError('');
    setResult(null);
    try {
      const data = await fetchTraceCodes(traceCode.trim());
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '查询失败');
    } finally {
      setQuerying(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">追溯码查询</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="space-y-4 px-6 py-4">
        <div className="flex gap-2">
          <input value={traceCode} onChange={(e) => setTraceCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuery(); }}
            placeholder="输入追溯码进行查询..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          <button onClick={handleQuery} disabled={querying}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700 disabled:opacity-50">
            {querying ? '查询中...' : '查询'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {result && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {Array.isArray(result) && result.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">未找到该追溯码的记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">追溯码</th>
                      <th className="px-3 py-2 text-left font-medium">药品</th>
                      <th className="px-3 py-2 text-left font-medium">批号</th>
                      <th className="px-3 py-2 text-left font-medium">状态</th>
                      <th className="px-3 py-2 text-left font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(result) ? result : [result]).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono text-slate-600">{r.traceCode}</td>
                        <td className="px-3 py-2 font-medium text-slate-700">{r.drugName}</td>
                        <td className="px-3 py-2 text-slate-500">{r.batchNo || '--'}</td>
                        <td className="px-3 py-2 text-slate-500">{r.status || r.action || '--'}</td>
                        <td className="px-3 py-2 text-slate-400">{formatDateTime(r.createdAt || r.actionAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">关闭</button>
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [tab, setTab] = useState('orders'); // 'orders' | 'returns'
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [payOrder, setPayOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [reviewReturn, setReviewReturn] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  const { data: orders, loading: ordersLoading } = useAsyncData(fetchSalesOrders, [refreshKey]);
  const { data: returns, loading: returnsLoading } = useAsyncData(fetchSalesReturns, [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  const stats = useMemo(() => {
    if (!orders) return { total: 0, paid: 0, totalAmount: 0, todayAmount: 0 };
    const today = new Date().toDateString();
    return {
      total: orders.length,
      paid: orders.filter((o) => o.status === 'PAID').length,
      totalAmount: orders.filter((o) => o.status === 'PAID').reduce((s, o) => s + Number(o.totalAmount || 0), 0),
      todayAmount: orders.filter((o) => o.status === 'PAID' && new Date(o.paidAt || o.createdAt).toDateString() === today)
        .reduce((s, o) => s + Number(o.totalAmount || 0), 0),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let list = orders;
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((o) =>
      [o.orderNo, o.patientName, o.prescriptionNo].some((v) => String(v || '').toLowerCase().includes(kw))
    );
    return list;
  }, [orders, statusFilter, appliedKeyword]);

  const filteredReturns = useMemo(() => {
    if (!returns) return [];
    const kw = appliedKeyword.trim().toLowerCase();
    if (!kw) return returns;
    return returns.filter((r) =>
      [r.returnNo, r.patientName, r.originalOrderNo].some((v) => String(v || '').toLowerCase().includes(kw))
    );
  }, [returns, appliedKeyword]);

  const currentList = tab === 'orders' ? filteredOrders : filteredReturns;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, page, pageSize]);

  async function handleCancel(order) {
    setCancellingId(order.id);
    try {
      await cancelSaleOrder(order.id);
      toast.success('订单已取消');
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || '取消失败');
    } finally {
      setCancellingId(null);
    }
  }

  const loading = tab === 'orders' ? ordersLoading : returnsLoading;

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: '订单总数', value: formatNumber(stats.total), detail: `已支付 ${formatNumber(stats.paid)} 单`, accent: toneAccents[0] },
          { label: '累计营业额', value: `¥${formatNumber(stats.totalAmount)}`, detail: '全部已支付订单', accent: toneAccents[1] },
          { label: '今日营业额', value: `¥${formatNumber(stats.todayAmount)}`, detail: '今日已支付金额', accent: toneAccents[2] },
        ].map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </section>

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        {/* Tab & 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {[{ key: 'orders', label: '销售订单' }, { key: 'returns', label: '退货记录' }].map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
                className={`px-4 py-2 text-sm transition ${tab === t.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'orders' && (
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
              <option value="">全部状态</option>
              <option value="PENDING">待支付</option>
              <option value="PAID">已支付</option>
              <option value="CANCELLED">已取消</option>
              <option value="REFUNDED">已退款</option>
            </select>
          )}

          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="搜索订单号 / 患者姓名..."
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setStatusFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>

          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowTrace(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">追溯查询</button>
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新建订单</button>
          </div>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            {tab === 'orders' ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium pl-6">订单号</th>
                    <th className="px-5 py-3 font-medium">患者</th>
                    <th className="px-5 py-3 font-medium">药品数</th>
                    <th className="px-5 py-3 font-medium">金额</th>
                    <th className="px-5 py-3 font-medium">支付方式</th>
                    <th className="px-5 py-3 font-medium">状态</th>
                    <th className="px-5 py-3 font-medium">创建时间</th>
                    <th className="px-5 py-3 font-medium pr-6">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                      <td className="px-5 py-3 pl-6 font-mono text-xs text-slate-500">{order.orderNo}</td>
                      <td className="px-5 py-3 font-medium">{order.patientName}</td>
                      <td className="px-5 py-3 text-center">{order.items?.length ?? '--'}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">¥{formatNumber(order.totalAmount ?? order.payableAmount)}</td>
                      <td className="px-5 py-3 text-slate-500">{PAY_METHOD[order.payments?.[0]?.paymentMethod] || '--'}</td>
                      <td className="px-5 py-3"><Badge status={order.status} map={ORDER_STATUS} /></td>
                      <td className="px-5 py-3 text-xs text-slate-400">{formatDateTime(order.createdAt)}</td>
                      <td className="px-5 py-3 pr-6">
                        <div className="flex items-center gap-2">
                          {order.status === 'PENDING' && (
                            <>
                              <button onClick={() => setPayOrder(order)}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white transition hover:bg-emerald-700">
                                收款
                              </button>
                              <button disabled={cancellingId === order.id}
                                onClick={() => handleCancel(order)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                                取消
                              </button>
                            </>
                          )}
                          {order.status === 'PAID' && (
                            <button onClick={() => setRefundOrder(order)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 transition hover:bg-rose-100">
                              退款
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pagedRows.length === 0 && (
                    <tr className="border-t border-slate-100">
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-500">暂无销售订单</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium pl-6">退货单号</th>
                    <th className="px-5 py-3 font-medium">原订单号</th>
                    <th className="px-5 py-3 font-medium">患者</th>
                    <th className="px-5 py-3 font-medium">退款金额</th>
                    <th className="px-5 py-3 font-medium">退货原因</th>
                    <th className="px-5 py-3 font-medium">状态</th>
                    <th className="px-5 py-3 font-medium">时间</th>
                    <th className="px-5 py-3 font-medium pr-6">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                      <td className="px-5 py-3 pl-6 font-mono text-xs text-slate-500">{r.returnNo || '--'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.originalOrderNo || '--'}</td>
                      <td className="px-5 py-3 font-medium">{r.patientName || '--'}</td>
                      <td className="px-5 py-3 font-semibold text-rose-700">¥{formatNumber(r.refundAmount || r.totalAmount)}</td>
                      <td className="px-5 py-3 text-slate-500">{r.returnReason || '--'}</td>
                      <td className="px-5 py-3"><Badge status={r.status} map={RETURN_STATUS} /></td>
                      <td className="px-5 py-3 text-xs text-slate-400">{formatDateTime(r.createdAt)}</td>
                      <td className="px-5 py-3 pr-6">
                        {r.status === 'PENDING' && (
                          <button onClick={() => setReviewReturn(r)}
                            className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white transition hover:bg-amber-600">
                            审核
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pagedRows.length === 0 && (
                    <tr className="border-t border-slate-100">
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">暂无退货记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        <Pager
          total={currentList.length}
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
          onSuccess={() => { setShowCreate(false); refresh(); setStatusFilter('PENDING'); setPage(1); toast.success('订单创建成功，请及时收款'); }}
        />
      )}
      {payOrder && (
        <PayModal
          order={payOrder}
          onClose={() => setPayOrder(null)}
          onSuccess={() => { setPayOrder(null); refresh(); toast.success('收款成功'); }}
        />
      )}
      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={() => { setRefundOrder(null); refresh(); toast.success('退款成功'); }}
        />
      )}
      {showTrace && <TraceModal onClose={() => setShowTrace(false)} />}
      {reviewReturn && (
        <ReviewReturnModal
          returnRecord={reviewReturn}
          onClose={() => setReviewReturn(null)}
          onSuccess={() => { setReviewReturn(null); refresh(); }}
        />
      )}
    </div>
  );
}
