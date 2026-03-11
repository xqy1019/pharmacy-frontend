import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Table, Space } from 'antd';
import {
  approveProcurementOrder,
  cancelProcurementOrder,
  createProcurementOrder,
  fetchLowStockAlerts,
  fetchProcurementOrderDetail,
  fetchProcurementOrders,
  fetchProcurementOverview,
  fetchSalesTrend,
  receiveProcurementOrder,
  submitProcurementOrder,
  updateProcurementOrderItems,
} from '../api/pharmacy';
import AiAnalysisPanel from '../components/AiAnalysisPanel';
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

function CreateOrderModal({ onClose, onSuccess, initialItems, initialForm }) {
  const [form, setForm] = useState({ supplierName: '', plannedArrivalDate: '', priorityLevel: 'NORMAL', remark: '', ...(initialForm || {}) });
  const [items, setItems] = useState(initialItems?.length ? initialItems : [EMPTY_ITEM()]);
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

  const procItemColumns = [
    { title: '药品名称 *', dataIndex: 'drugName', key: 'drugName', render: (_, __, idx) => (
      <input value={items[idx].drugName} onChange={(e) => updateItem(idx, 'drugName', e.target.value)}
        placeholder="药品名称"
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '规格', dataIndex: 'spec', key: 'spec', width: 96, render: (_, __, idx) => (
      <input value={items[idx].spec} onChange={(e) => updateItem(idx, 'spec', e.target.value)}
        placeholder="规格"
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, render: (_, __, idx) => (
      <input type="number" min="1" value={items[idx].quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '单价(元)', dataIndex: 'unitPrice', key: 'unitPrice', width: 96, render: (_, __, idx) => (
      <input type="number" min="0" step="0.01" value={items[idx].unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '小计', key: 'subtotal', width: 80, render: (_, __, idx) => (
      <span className="text-xs text-slate-600">¥{(Number(items[idx].quantity || 0) * Number(items[idx].unitPrice || 0)).toFixed(2)}</span>
    )},
    { title: '', key: 'actions', width: 32, render: (_, __, idx) => (
      items.length > 1 ? (
        <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
          className="text-rose-400 hover:text-rose-600">✕</button>
      ) : null
    )},
  ];

  return (
    <Modal open onCancel={onClose} title={
      <div className="flex items-center gap-2">
        <span>新建采购单</span>
        {initialItems?.length > 0 && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600">AI 预填</span>
        )}
      </div>
    } width={896} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={submitting}>
          {submitting ? '保存中...' : '保存草稿'}
        </Button>,
      ]}>
      <div className="space-y-5">
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
          <Table columns={procItemColumns} dataSource={items} rowKey={(_, idx) => idx}
            size="small" pagination={false} />
          <div className="mt-2 text-right text-sm font-semibold text-slate-700">
            合计：¥{total.toFixed(2)}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Approve Modal ────────────────────────────────────────────────────────────
function ApproveModal({ order, onClose, onSuccess }) {
  const { data: detail, loading: detailLoading } = useAsyncData(
    () => fetchProcurementOrderDetail(order.id), [order.id]
  );
  // 可编辑的明细行（含单价）
  const [editLines, setEditLines] = useState([]);
  const [pass, setPass] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 详情加载完毕后初始化可编辑行
  useEffect(() => {
    if (detail?.items) {
      setEditLines(detail.items.map((i) => ({
        id: i.id,
        drugName: i.drugName,
        spec: i.spec || '',
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice || 0) === 0 ? '' : String(Number(i.unitPrice)),
      })));
    }
  }, [detail]);

  function updatePrice(idx, val) {
    setEditLines((prev) => prev.map((l, i) => i === idx ? { ...l, unitPrice: val } : l));
  }

  // 计算合计（使用编辑框中的值）
  const calcTotal = editLines.reduce(
    (s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0
  );
  const hasNullPrice = editLines.some((l) => !l.unitPrice || Number(l.unitPrice) === 0);
  const priceChanged = detail?.items?.some((orig, idx) => {
    const edited = Number(editLines[idx]?.unitPrice || 0);
    return Math.abs(edited - Number(orig.unitPrice || 0)) > 0.0001;
  });

  async function handleSubmit() {
    if (!pass && !note.trim()) { setError('请填写驳回原因'); return; }
    setSubmitting(true);
    setError('');
    try {
      // 若有价格变动，先保存明细
      if (priceChanged && editLines.length > 0) {
        await updateProcurementOrderItems(order.id, editLines.map((l) => ({
          id: l.id,
          drugName: l.drugName,
          spec: l.spec || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice || '0',
        })));
      }
      await approveProcurementOrder(order.id, { pass, approvalNote: note });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  const totalQty = editLines.reduce((s, l) => s + Number(l.quantity || 0), 0);

  return (
    <Modal open onCancel={onClose} title={
      <div>
        <div className="text-base font-semibold text-slate-900">采购单审批</div>
        <p className="mt-0.5 text-xs font-normal text-slate-400">核对采购明细，可直接在表格中补充单价，再进行审批</p>
      </div>
    } width={860} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}
          disabled={submitting || detailLoading}
          danger={!pass}>
          {submitting ? '提交中...' : (pass ? '✓ 审批通过' : '✕ 确认驳回')}
        </Button>,
      ]}>
      <div className="space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">采购单号</p>
            <p className="mt-0.5 font-mono text-xs font-medium text-slate-800">{order.orderNo}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">供应商</p>
            <p className="mt-0.5 font-medium text-slate-800">{order.supplierName || '--'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">优先级</p>
            <p className={`mt-0.5 font-medium ${['URGENT','CRITICAL'].includes(order.priorityLevel) ? 'text-rose-600' : 'text-slate-700'}`}>
              {order.priorityLevelLabel || order.priorityLevel || '--'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">计划到货</p>
            <p className="mt-0.5 font-medium text-slate-800">{formatDate(order.plannedArrivalDate) || '--'}</p>
          </div>
          {order.remark && (
            <div className="col-span-4">
              <p className="text-xs text-slate-400">备注</p>
              <p className="mt-0.5 text-slate-600">{order.remark}</p>
            </div>
          )}
        </div>

        {/* 单价缺失提示 */}
        {!detailLoading && hasNullPrice && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            <svg width="16" height="16" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>部分药品单价未填写，建议在下方表格中补充单价后再审批，以确保金额核算准确。</span>
          </div>
        )}

        {/* 采购明细（单价可编辑）*/}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">采购明细</span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-500">单价可在此填写</span>
            </div>
            {!detailLoading && (
              <span className="text-xs text-slate-400">共 {editLines.length} 品种 · {formatNumber(totalQty)} 件</span>
            )}
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              加载明细中...
            </div>
          ) : editLines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">暂无采购明细</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">药品名称</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">规格</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500">采购数量</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500">
                      单价(元)
                      <span className="ml-1 text-amber-500">✎</span>
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">小计(元)</th>
                  </tr>
                </thead>
                <tbody>
                  {editLines.map((line, idx) => {
                    const subtotal = Number(line.quantity || 0) * Number(line.unitPrice || 0);
                    const noPrice = !line.unitPrice || Number(line.unitPrice) === 0;
                    return (
                      <tr key={line.id ?? idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : ''}>
                        <td className="px-4 py-2 font-medium text-slate-800">{line.drugName}</td>
                        <td className="px-3 py-2 text-slate-500">{line.spec || '--'}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{formatNumber(line.quantity)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400">¥</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updatePrice(idx, e.target.value)}
                              placeholder="待填写"
                              className={`w-24 rounded-lg border px-2 py-1 text-right text-xs outline-none transition focus:ring-2 focus:ring-indigo-100 ${noPrice ? 'border-amber-300 bg-amber-50 placeholder:text-amber-400 focus:border-amber-400' : 'border-slate-200 bg-white focus:border-indigo-300'}`}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {noPrice
                            ? <span className="text-xs text-slate-400">--</span>
                            : <span className="font-medium text-slate-800">¥{subtotal.toFixed(2)}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold text-slate-600">合计金额</td>
                    <td className="px-4 py-3 text-right">
                      {calcTotal > 0
                        ? <span className="text-lg font-bold text-slate-900">¥{calcTotal.toFixed(2)}</span>
                        : <span className="text-sm text-amber-500 font-medium">金额未填写</span>
                      }
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* 审批意见 */}
        <div className={`rounded-xl border-2 p-4 transition ${pass ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <div className="mb-3 flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={pass} onChange={() => setPass(true)} className="accent-emerald-500" />
              <span className={`text-sm font-medium ${pass ? 'text-emerald-700' : 'text-slate-500'}`}>✓ 审批通过</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={!pass} onChange={() => setPass(false)} className="accent-rose-500" />
              <span className={`text-sm font-medium ${!pass ? 'text-rose-700' : 'text-slate-500'}`}>✕ 驳回申请</span>
            </label>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder={pass ? '审批意见（可选）' : '请填写驳回原因 *'}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>
        )}
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
          spec: item.spec || '',
          orderedQty: item.quantity,
          unitPrice: item.unitPrice || '0',
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

  const receiveColumns = [
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', render: (v, _, idx) => (
      <div>
        <span className="font-medium text-slate-700">{v}</span>
        {lines[idx]?.spec && <p className="text-xs text-slate-400">{lines[idx].spec}</p>}
      </div>
    )},
    { title: '订购量', dataIndex: 'orderedQty', key: 'orderedQty', width: 72, render: (v) => <span className="text-slate-600">{v}</span> },
    { title: '单价(元)', key: 'unitPrice', width: 96, render: (_, __, idx) => {
      const p = Number(lines[idx]?.unitPrice || 0);
      return p > 0
        ? <span className="text-slate-700">¥{p.toFixed(2)}</span>
        : <span className="text-amber-500 text-xs">未填写</span>;
    }},
    { title: '实收量', key: 'receivedQty', width: 80, render: (_, __, idx) => (
      <input type="number" min="0" max={lines[idx].orderedQty} value={lines[idx].receivedQty}
        onChange={(e) => updateLine(idx, 'receivedQty', e.target.value)}
        className={`w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300 ${Number(lines[idx].receivedQty) > Number(lines[idx].orderedQty) ? 'border-rose-400 text-rose-600' : 'border-slate-200'}`} />
    )},
    { title: '验收量', key: 'acceptedQty', width: 80, render: (_, __, idx) => (
      <input type="number" min="0" max={lines[idx].receivedQty} value={lines[idx].acceptedQty}
        onChange={(e) => updateLine(idx, 'acceptedQty', e.target.value)}
        className={`w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300 ${Number(lines[idx].acceptedQty) > Number(lines[idx].receivedQty) ? 'border-rose-400 text-rose-600' : 'border-slate-200'}`} />
    )},
    { title: '小计(元)', key: 'subtotal', width: 96, render: (_, __, idx) => {
      const subtotal = Number(lines[idx]?.acceptedQty || 0) * Number(lines[idx]?.unitPrice || 0);
      return Number(lines[idx]?.unitPrice || 0) > 0
        ? <span className="font-medium text-slate-800">¥{subtotal.toFixed(2)}</span>
        : <span className="text-slate-300 text-xs">--</span>;
    }},
    { title: '批号', key: 'batchNo', width: 112, render: (_, __, idx) => (
      <input value={lines[idx].batchNo}
        onChange={(e) => updateLine(idx, 'batchNo', e.target.value)}
        placeholder="批号"
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '效期', key: 'expiryDate', width: 128, render: (_, __, idx) => (
      <input type="date" value={lines[idx].expiryDate}
        onChange={(e) => updateLine(idx, 'expiryDate', e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
  ];

  return (
    <Modal open onCancel={onClose} title="确认收货入库" width={1024} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit}
          loading={submitting} disabled={submitting || loading || lines.length === 0}>
          {submitting ? '提交中...' : '确认收货入库'}
        </Button>,
      ]}>
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

          <Table columns={receiveColumns} dataSource={lines} rowKey={(_, idx) => idx}
            size="small" pagination={false}
            locale={{ emptyText: '暂无采购明细' }} />

          {/* 收货金额合计 */}
          {lines.length > 0 && (() => {
            const acceptedTotal = lines.reduce((s, l) => s + Number(l.acceptedQty || 0) * Number(l.unitPrice || 0), 0);
            const orderedTotal  = lines.reduce((s, l) => s + Number(l.orderedQty  || 0) * Number(l.unitPrice || 0), 0);
            const hasPrice = lines.some((l) => Number(l.unitPrice || 0) > 0);
            if (!hasPrice) return (
              <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-600">
                该采购单未填写单价，收货金额无法计算。如需统计金额，请联系采购人员补录单价。
              </div>
            );
            return (
              <div className="mt-2 flex justify-end gap-6 rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                <span className="text-slate-500">订购金额：<span className="font-medium text-slate-700">¥{orderedTotal.toFixed(2)}</span></span>
                <span className="text-slate-500">实际验收金额：<span className="text-lg font-bold text-emerald-700">¥{acceptedTotal.toFixed(2)}</span></span>
              </div>
            );
          })()}

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </>
      )}
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
  const [aiInitialItems, setAiInitialItems] = useState(null); // AI 预填的采购明细
  const [aiGenerating, setAiGenerating] = useState(false);
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

  async function handleAiGenerateOrder() {
    setAiGenerating(true);
    try {
      const lowAlerts = await fetchLowStockAlerts().catch(() => []);
      const items = lowAlerts
        .filter((a) => a.currentQty < a.threshold)
        .map((a) => ({
          drugName: a.drugName || '',
          spec: a.spec || '',
          quantity: String(Math.ceil(Math.max(1, a.threshold * 1.5 - (a.currentQty || 0)))),
          unitPrice: '0.00',
        }));
      setAiInitialItems(items.length ? items : null);
      setShowCreate(true);
    } catch {
      setAiInitialItems(null);
      setShowCreate(true);
    } finally {
      setAiGenerating(false);
    }
  }

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

  // ── AI 补货建议 actions（必须在条件 return 之前定义，遵守 Hooks 规则）──────
  const aiActions = useMemo(() => [
    {
      key: 'restock',
      icon: '🛒',
      label: '智能补货建议',
      getPrompt: async () => {
        const [lowAlerts, salesTrend] = await Promise.all([
          fetchLowStockAlerts().catch(() => []),
          fetchSalesTrend(30).catch(() => []),
        ]);

        // 在途采购单（已审批/部分收货）
        const inTransit = (data?.orders || [])
          .filter((o) => ['APPROVED', 'PARTIAL_RECEIVED'].includes(o.status))
          .map((o) => `  - 单号 ${o.orderNo}（${o.supplierName}），计划到货 ${formatDate(o.plannedArrivalDate) || '未定'}`)
          .join('\n');

        const stockLines = lowAlerts.length
          ? lowAlerts.map((a) => `- ${a.drugName}：库存 ${formatNumber(a.currentQty)}，阈值 ${formatNumber(a.threshold)}，缺口 ${formatNumber(Math.max(0, a.threshold - a.currentQty))}`).join('\n')
          : '（暂无低库存预警）';

        const trendLines = salesTrend.length
          ? salesTrend.slice(0, 10).map((t) => `- ${t.drugName || t.date || JSON.stringify(t)}`).join('\n')
          : '（暂无近期销售趋势数据）';

        return `你是专业药房采购计划药师。请根据以下数据，制定补货建议：

## 低库存预警（共 ${lowAlerts.length} 条）
${stockLines}

## 近30天销售趋势（Top10）
${trendLines}

## 在途采购单（已审批/部分收货，共 ${data?.orders?.filter((o) => ['APPROVED', 'PARTIAL_RECEIVED'].includes(o.status)).length || 0} 单）
${inTransit || '（暂无在途采购）'}

请：
1. 结合在途采购，筛选出**真正需要补货**的药品（排除在途已覆盖缺口的品种）
2. 按紧急程度排序：🔴 立即下单 / 🟡 本周内 / 🟢 本月内
3. 对每个需补货品种给出：建议补货量（参考：覆盖阈值150%~200%）、预计最晚下单时间
4. 给出简短的采购策略建议（集中批量 or 分批补货）

回答结构清晰，使用 Markdown 格式。`;
      },
    },
    {
      key: 'supplier',
      icon: '🏭',
      label: '供应商风险分析',
      getPrompt: () => {
        const orders = data?.orders || [];
        const suppliers = {};
        orders.forEach((o) => {
          if (!suppliers[o.supplierName]) suppliers[o.supplierName] = { total: 0, rejected: 0, delayed: 0 };
          suppliers[o.supplierName].total += 1;
          if (o.status === 'REJECTED') suppliers[o.supplierName].rejected += 1;
        });
        const supplierLines = Object.entries(suppliers)
          .map(([name, s]) => `- ${name}：共 ${s.total} 单，驳回 ${s.rejected} 单`)
          .join('\n');

        return `你是专业药房供应链管理药师。以下是当前供应商采购数据：

${supplierLines || '（暂无供应商数据）'}

整体概况：
- 有效供应商 ${formatNumber(overview.validSuppliers)} 家（共 ${formatNumber(overview.supplierTotal)} 家）
- 采购达成率：${formatPercent(overview.procurementAchieveRate, 2)}
- 待到货订单：${formatNumber(overview.dueArrivals)} 单

请：
1. 分析供应商履约情况，识别高风险供应商（驳回率高、延迟多）
2. 评估供应链集中度风险（是否过度依赖单一供应商）
3. 给出供应商管理建议

回答结构清晰，使用 Markdown 格式。`;
      },
    },
  ], [data, overview]);

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
          { label: '供应商', value: formatNumber(overview.supplierTotal), detail: `有效供应商 ${formatNumber(overview.validSuppliers)} 家`, accent: toneAccents[0],
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: '采购订单', value: formatNumber(overview.orderTotal), detail: `待到货 ${formatNumber(overview.dueArrivals)} 单`, accent: toneAccents[1],
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
          { label: '采购达成率', value: formatPercent(overview.procurementAchieveRate, 2), detail: `累计金额 ¥${formatNumber(overview.totalProcurementAmount)}`, accent: toneAccents[2],
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
        ].map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </section>

      {/* AI 智能分析 */}
      <AiAnalysisPanel
        actions={aiActions}
        context={{ page: '采购管理' }}
        renderFooter={({ activeKey, isDone }) => {
          if (activeKey !== 'restock' || !isDone) return null;
          return (
            <div className="mt-4 flex items-center justify-between border-t border-indigo-100 pt-3">
              <p className="text-xs text-slate-400">
                基于低库存预警数据自动填入采购明细，可在表单中逐项调整后保存
              </p>
              <button
                onClick={handleAiGenerateOrder}
                disabled={aiGenerating}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {aiGenerating ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                )}
                {aiGenerating ? '准备中...' : '一键生成采购单'}
              </button>
            </div>
          );
        }}
      />

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
        <Table
          columns={[
            { title: '采购单号', dataIndex: 'orderNo', key: 'orderNo', render: (v, order) => (
              <div>
                <div className="font-mono text-xs">{v}</div>
                {order.planNo && <div className="mt-0.5 text-xs text-slate-400">{order.planNo}</div>}
              </div>
            )},
            { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
            { title: '总金额', dataIndex: 'totalAmount', key: 'totalAmount', render: (v) => <span className="font-medium">¥{formatNumber(v)}</span> },
            { title: '收货进度', key: 'progress', render: (_, order) => {
              const progress = Number(order.totalAmount || 0) > 0
                ? Math.round((Number(order.receivedAmount || 0) / Number(order.totalAmount)) * 100)
                : 0;
              return (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{progress}%</span>
                </div>
              );
            }},
            { title: '优先级', dataIndex: 'priorityLevel', key: 'priorityLevel', render: (v, order) => (
              <span className={`rounded-full px-2 py-0.5 text-xs ${['URGENT', 'CRITICAL'].includes(v) ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                {order.priorityLevelLabel || v || '--'}
              </span>
            )},
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Badge status={v} /> },
            { title: '计划到货', dataIndex: 'plannedArrivalDate', key: 'plannedArrivalDate', render: (v) => <span className="text-slate-500">{formatDate(v) || '--'}</span> },
            { title: '操作', key: 'actions', render: (_, order) => (
              <Space>
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
              </Space>
            )},
          ]}
          dataSource={pagedOrders}
          rowKey="id"
          size="middle"
          pagination={false}
          locale={{ emptyText: '暂无数据' }}
        />

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
          initialItems={aiInitialItems}
          initialForm={aiInitialItems?.length ? { priorityLevel: 'URGENT', remark: 'AI 智能补货建议自动生成' } : undefined}
          onClose={() => { setShowCreate(false); setAiInitialItems(null); }}
          onSuccess={() => { setShowCreate(false); setAiInitialItems(null); refresh(); }}
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
