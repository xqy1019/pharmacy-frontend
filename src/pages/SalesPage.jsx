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
import { Button, Modal, Space, Table } from 'antd';
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

  const itemColumns = [
    {
      title: '选择批次 *', dataIndex: 'batchId', key: 'batchId', width: 260,
      render: (_, item) => {
        const idx = items.indexOf(item);
        return (
          <div>
            <select value={item.batchId} onChange={(e) => selectBatch(idx, e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300">
              <option value="">-- 选择药品批次 --</option>
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.drugName}｜{b.batchNo}｜可售:{b.availableQty ?? b.remainingQty}
                </option>
              ))}
            </select>
            {item.spec && <p className="mt-0.5 pl-1 text-xs text-slate-400">{item.spec}</p>}
          </div>
        );
      },
    },
    {
      title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80,
      render: (_, item) => {
        const idx = items.indexOf(item);
        return (
          <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
        );
      },
    },
    {
      title: '单价(元)', dataIndex: 'unitPrice', key: 'unitPrice', width: 100,
      render: (_, item) => {
        const idx = items.indexOf(item);
        return (
          <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
        );
      },
    },
    {
      title: '小计', key: 'subtotal', width: 80,
      render: (_, item) => <span className="text-xs text-slate-600">¥{(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}</span>,
    },
    {
      title: '', key: 'actions', width: 40,
      render: (_, item) => {
        const idx = items.indexOf(item);
        return items.length > 1 ? (
          <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
            className="text-rose-400 hover:text-rose-600 text-xs">✕</button>
        ) : null;
      },
    },
  ];

  return (
    <Modal
      open
      onCancel={onClose}
      title="新建销售订单"
      width={896}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={submitting}>创建订单</Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-5">
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
          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey={(_, idx) => idx}
            size="small"
            pagination={false}
          />
          <div className="mt-2 text-right text-sm font-semibold text-slate-700">
            合计：¥{total.toFixed(2)}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
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
    <Modal
      open
      onCancel={onClose}
      title="收款确认"
      width={480}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handlePay} loading={submitting}
          className="!bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700">
          {submitting ? '处理中...' : `确认收款 ¥${formatNumber(amount)}`}
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
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
    <Modal
      open
      onCancel={onClose}
      title="退款申请"
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" danger onClick={handleRefund} loading={submitting}>确认退款</Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
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
    <Modal
      open
      onCancel={onClose}
      title="退货审核"
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" danger={!pass} onClick={handleSubmit} loading={submitting}>
          {pass ? '确认通过' : '确认驳回'}
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
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

  const traceColumns = [
    { title: '追溯码', dataIndex: 'traceCode', key: 'traceCode', render: (v) => <span className="font-mono text-slate-600">{v}</span> },
    { title: '药品', dataIndex: 'drugName', key: 'drugName', render: (v) => <span className="font-medium text-slate-700">{v}</span> },
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
    { title: '状态', key: 'status', render: (_, r) => <span className="text-slate-500">{r.status || r.action || '--'}</span> },
    { title: '时间', key: 'time', render: (_, r) => <span className="text-slate-400">{formatDateTime(r.createdAt || r.actionAt)}</span> },
  ];

  const traceData = result ? (Array.isArray(result) ? result : [result]) : [];

  return (
    <Modal
      open
      onCancel={onClose}
      title="追溯码查询"
      width={640}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
      ]}
      destroyOnClose
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input value={traceCode} onChange={(e) => setTraceCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuery(); }}
            placeholder="输入追溯码进行查询..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          <Button type="primary" onClick={handleQuery} loading={querying}>
            {querying ? '查询中...' : '查询'}
          </Button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {result && (
          traceData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">未找到该追溯码的记录</p>
          ) : (
            <Table
              columns={traceColumns}
              dataSource={traceData}
              rowKey={(_, i) => i}
              size="small"
              pagination={false}
            />
          )
        )}
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
          { label: '订单总数', value: formatNumber(stats.total), detail: `已支付 ${formatNumber(stats.paid)} 单`, accent: toneAccents[0],
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
          { label: '累计营业额', value: `¥${formatNumber(stats.totalAmount)}`, detail: '全部已支付订单', accent: toneAccents[1],
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
          { label: '今日营业额', value: `¥${formatNumber(stats.todayAmount)}`, detail: '今日已支付金额', accent: toneAccents[2],
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
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
        {tab === 'orders' ? (
          <Table
            columns={[
              { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
              { title: '患者', dataIndex: 'patientName', key: 'patientName', render: (v) => <span className="font-medium">{v}</span> },
              { title: '药品数', key: 'itemCount', align: 'center', render: (_, r) => r.items?.length ?? '--' },
              { title: '金额', key: 'amount', render: (_, r) => <span className="font-semibold text-slate-800">¥{formatNumber(r.totalAmount ?? r.payableAmount)}</span> },
              { title: '支付方式', key: 'payMethod', render: (_, r) => <span className="text-slate-500">{PAY_METHOD[r.payments?.[0]?.paymentMethod] || '--'}</span> },
              { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Badge status={v} map={ORDER_STATUS} /> },
              { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
              {
                title: '操作', key: 'actions',
                render: (_, order) => (
                  <Space>
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
                  </Space>
                ),
              },
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
            locale={{ emptyText: '暂无销售订单' }}
          />
        ) : (
          <Table
            columns={[
              { title: '退货单号', dataIndex: 'returnNo', key: 'returnNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v || '--'}</span> },
              { title: '原订单号', dataIndex: 'originalOrderNo', key: 'originalOrderNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v || '--'}</span> },
              { title: '患者', dataIndex: 'patientName', key: 'patientName', render: (v) => <span className="font-medium">{v || '--'}</span> },
              { title: '退款金额', key: 'refundAmount', render: (_, r) => <span className="font-semibold text-rose-700">¥{formatNumber(r.refundAmount || r.totalAmount)}</span> },
              { title: '退货原因', dataIndex: 'returnReason', key: 'returnReason', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
              { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Badge status={v} map={RETURN_STATUS} /> },
              { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
              {
                title: '操作', key: 'actions',
                render: (_, r) => r.status === 'PENDING' ? (
                  <button onClick={() => setReviewReturn(r)}
                    className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white transition hover:bg-amber-600">
                    审核
                  </button>
                ) : null,
              },
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
            locale={{ emptyText: '暂无退货记录' }}
          />
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
