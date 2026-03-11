import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Table, Space } from 'antd';
import {
  cancelTransfer,
  createTransfer,
  dispatchTransfer,
  fetchTransferDetail,
  fetchTransfers,
  fetchTransfersOverview,
  signTransfer,
} from '../api/pharmacy';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime, formatNumber } from '../utils/formatters';

const toneAccents = ['from-cyan-500 to-teal-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500'];

const STATUS_MAP = {
  PENDING:    { label: '待发货', color: 'bg-amber-100 text-amber-700' },
  DISPATCHED: { label: '在途',   color: 'bg-cyan-100 text-cyan-700' },
  SIGNED:     { label: '已签收', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:  { label: '已取消', color: 'bg-slate-100 text-slate-500' },
  PARTIAL:    { label: '部分签收', color: 'bg-blue-100 text-blue-700' },
};

function Badge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── 新建调拨单 Modal ──────────────────────────────────────────────────────────
const EMPTY_ITEM = () => ({ drugName: '', batchNo: '', plannedQty: '10', remark: '' });

function CreateTransferModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    fromStore: '', toStore: '',
    priorityLevel: 'NORMAL', carrierName: '', plannedAt: '', remark: ''
  });
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  async function handleSubmit() {
    if (!form.fromStore.trim() || !form.toStore.trim()) { setError('请填写发出方和接收方'); return; }
    if (items.some((i) => !i.drugName.trim())) { setError('请填写所有药品名称'); return; }
    setError('');
    setSubmitting(true);
    try {
      await createTransfer({
        fromStore: form.fromStore,
        toStore: form.toStore,
        priorityLevel: form.priorityLevel,
        carrierName: form.carrierName || undefined,
        plannedAt: form.plannedAt || undefined,
        remark: form.remark || undefined,
        items: items.map((i) => ({
          drugName: i.drugName,
          batchNo: i.batchNo || undefined,
          plannedQty: i.plannedQty,
          remark: i.remark || undefined,
        })),
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  const transferItemColumns = [
    { title: '药品名称 *', dataIndex: 'drugName', key: 'drugName', render: (_, __, idx) => (
      <input value={items[idx].drugName} onChange={(e) => updateItem(idx, 'drugName', e.target.value)}
        placeholder="药品名称"
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 112, render: (_, __, idx) => (
      <input value={items[idx].batchNo} onChange={(e) => updateItem(idx, 'batchNo', e.target.value)}
        placeholder="批号（可选）"
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '计划数量', dataIndex: 'plannedQty', key: 'plannedQty', width: 80, render: (_, __, idx) => (
      <input type="number" min="1" value={items[idx].plannedQty} onChange={(e) => updateItem(idx, 'plannedQty', e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '备注', dataIndex: 'remark', key: 'remark', width: 112, render: (_, __, idx) => (
      <input value={items[idx].remark} onChange={(e) => updateItem(idx, 'remark', e.target.value)}
        placeholder="备注"
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-cyan-300" />
    )},
    { title: '', key: 'actions', width: 32, render: (_, __, idx) => (
      items.length > 1 ? (
        <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
          className="text-rose-400 hover:text-rose-600">✕</button>
      ) : null
    )},
  ];

  return (
    <Modal open onCancel={onClose} title="新建调拨单" width={896} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? '创建中...' : '创建调拨单'}
        </Button>,
      ]}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">发出方 *</label>
            <input value={form.fromStore} onChange={(e) => setForm((f) => ({ ...f, fromStore: e.target.value }))}
              placeholder="如：中心药库"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">接收方 *</label>
            <input value={form.toStore} onChange={(e) => setForm((f) => ({ ...f, toStore: e.target.value }))}
              placeholder="如：门诊药房"
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
            <label className="mb-1 block text-xs text-slate-500">承运商</label>
            <input value={form.carrierName} onChange={(e) => setForm((f) => ({ ...f, carrierName: e.target.value }))}
              placeholder="可选"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">计划时间</label>
            <input type="datetime-local" value={form.plannedAt} onChange={(e) => setForm((f) => ({ ...f, plannedAt: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">调拨明细</span>
            <button onClick={() => setItems((p) => [...p, EMPTY_ITEM()])}
              className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700 hover:bg-cyan-100">
              + 添加行
            </button>
          </div>
          <Table columns={transferItemColumns} dataSource={items} rowKey={(_, idx) => idx}
            size="small" pagination={false} />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 操作 Modal（发货 / 签收）────────────────────────────────────────────────
function ActionModal({ transferId, action, onClose, onSuccess }) {
  const { data: transfer, loading } = useAsyncData(() => fetchTransferDetail(transferId), [transferId]);
  const [note, setNote] = useState('');
  const [lineActuals, setLineActuals] = useState([]); // [{ actualQty: string }]
  const [diffReason, setDiffReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDispatch = action === 'dispatch';
  const title = isDispatch ? '确认发货' : '确认签收';

  // 当 transfer 加载完成后初始化 lineActuals（用计划数量填充）
  const items = transfer?.items || transfer?.lines || [];
  useEffect(() => {
    if (items.length > 0) {
      setLineActuals(items.map((it) => ({ actualQty: String(it.plannedQty ?? '') })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer]);

  // 检查是否有差异（实收 < 计划）
  const hasDiff = !isDispatch && lineActuals.some((la, idx) => {
    const planned = Number(items[idx]?.plannedQty ?? 0);
    const actual = Number(la.actualQty);
    return !isNaN(actual) && actual < planned;
  });

  function updateActual(idx, val) {
    setLineActuals((prev) => prev.map((la, i) => i === idx ? { ...la, actualQty: val } : la));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      if (isDispatch) {
        await dispatchTransfer(transferId, { carrierName: note || undefined });
      } else {
        // 构造带实收数量的签收 payload
        const lines = items.map((it, idx) => ({
          itemId: it.id,
          drugName: it.drugName,
          plannedQty: it.plannedQty,
          actualQty: Number(lineActuals[idx]?.actualQty ?? it.plannedQty),
        }));
        await signTransfer(transferId, {
          lines,
          receiptNote: note || undefined,
          diffReason: hasDiff ? (diffReason || undefined) : undefined,
        });
      }
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  const signColumns = [
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', render: (v) => <span className="font-medium text-slate-700">{v}</span> },
    { title: '批号', dataIndex: 'batchNo', key: 'batchNo', width: 112, render: (v) => <span className="font-mono text-slate-500">{v || '--'}</span> },
    { title: '计划数量', dataIndex: 'plannedQty', key: 'plannedQty', width: 80, render: (v) => <span className="text-slate-600">{formatNumber(Number(v ?? 0))}</span> },
    { title: '实收数量', key: 'actualQty', width: 96, render: (_, __, idx) => (
      <input type="number" min="0" max={Number(items[idx]?.plannedQty ?? 0)}
        value={lineActuals[idx]?.actualQty ?? ''}
        onChange={(e) => updateActual(idx, e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-300" />
    )},
    { title: '差异', key: 'diff', width: 64, render: (_, it, idx) => {
      const planned = Number(it.plannedQty ?? 0);
      const actual = Number(lineActuals[idx]?.actualQty ?? planned);
      const diff = actual - planned;
      return <span className={`font-medium ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
        {diff === 0 ? '—' : (diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff))}
      </span>;
    }},
  ];

  return (
    <Modal open onCancel={onClose} title={title}
      width={!isDispatch && items.length > 0 ? 896 : 560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit}
          loading={submitting}
          disabled={submitting || loading || (hasDiff && !diffReason.trim())}>
          {submitting ? '提交中...' : title}
        </Button>,
      ]}>
      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-slate-400">加载中...</div>
        ) : transfer ? (
          <>
            {/* 基本信息 */}
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="mb-2 flex justify-between text-slate-500">
                <span>单号</span><span className="font-mono font-medium text-slate-800">{transfer.orderNo || '--'}</span>
              </div>
              <div className="mb-2 flex justify-between text-slate-500">
                <span>发出方</span><span className="font-medium text-slate-800">{transfer.fromStore}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>接收方</span><span className="font-medium text-slate-800">{transfer.toStore}</span>
              </div>
            </div>

            {/* 签收时：逐行填写实收数量 */}
            {!isDispatch && items.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">明细实收数量</p>
                <Table columns={signColumns} dataSource={items} rowKey={(_, idx) => idx}
                  size="small" pagination={false} />
              </div>
            )}

            {/* 差异原因（有差异时必填） */}
            {hasDiff && (
              <div>
                <label className="mb-1 block text-xs font-medium text-rose-600">差异原因 *（实收数量不足，请说明原因）</label>
                <textarea value={diffReason} onChange={(e) => setDiffReason(e.target.value)} rows={2}
                  placeholder="如：运输损耗、发货短缺等"
                  className="w-full resize-none rounded-xl border border-rose-200 bg-rose-50/30 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300" />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-slate-500">
                {isDispatch ? '承运商 / 备注' : '签收备注（可选）'}
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="可选填写"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
            </div>
          </>
        ) : null}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {hasDiff && !diffReason.trim() && (
          <p className="text-xs text-rose-500">请填写差异原因后方可提交</p>
        )}
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function AllocationPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [actionState, setActionState] = useState(null); // { id, action }
  const [cancellingId, setCancellingId] = useState(null);
  const toast = useToast();

  const { data: overview } = useAsyncData(fetchTransfersOverview, [refreshKey]);
  const { data: transfers, loading } = useAsyncData(fetchTransfers, [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  async function handleCancel(id) {
    if (!window.confirm('确认取消该调拨单？')) return;
    setCancellingId(id);
    try {
      await cancelTransfer(id);
      toast.success('调拨单已取消');
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || '取消失败');
    } finally {
      setCancellingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!transfers) return [];
    let list = statusFilter ? transfers.filter((t) => t.status === statusFilter) : transfers;
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((t) =>
      [t.transferNo, t.fromStore, t.toStore, t.carrierName].some((v) => String(v || '').toLowerCase().includes(kw))
    );
    return list;
  }, [transfers, statusFilter, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      {overview && (
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: '调拨总数', value: formatNumber(overview.total), detail: '全部调拨单', accent: toneAccents[0],
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg> },
            { label: '在途订单', value: formatNumber(overview.inTransit ?? overview.dispatched), detail: '已发货未签收', accent: toneAccents[1],
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
            { label: '本月完成', value: formatNumber(overview.completedThisMonth ?? overview.signed), detail: '已签收完成', accent: toneAccents[2],
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          ].map((item) => (
            <SummaryCard key={item.label} {...item} />
          ))}
        </section>
      )}

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部状态</option>
            <option value="PENDING">待发货</option>
            <option value="DISPATCHED">在途</option>
            <option value="SIGNED">已签收</option>
            <option value="CANCELLED">已取消</option>
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="单号 / 发出方 / 接收方..."
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setStatusFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>
          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新建调拨单</button>
          </div>
        </div>

        <Table
          columns={[
            { title: '调拨单号', dataIndex: 'orderNo', key: 'orderNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v || '--'}</span> },
            { title: '发出方', dataIndex: 'fromStore', key: 'fromStore', render: (v) => <span className="font-medium">{v}</span> },
            { title: '接收方', dataIndex: 'toStore', key: 'toStore' },
            { title: '药品名称', key: 'drugNames', render: (_, t) => (
              <span className="text-sm text-slate-600">
                {t.itemSummary || (t.items?.length > 0
                  ? t.items.map((i) => i.drugName).filter(Boolean).join('、')
                  : '--')}
              </span>
            )},
            { title: '承运商', dataIndex: 'carrierName', key: 'carrierName', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Badge status={v} /> },
            { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
            { title: '操作', key: 'actions', render: (_, t) => (
              <Space>
                {t.status === 'PENDING' && (
                  <>
                    <button onClick={() => setActionState({ id: t.id, action: 'dispatch' })}
                      className="rounded-lg bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700">
                      发货
                    </button>
                    <button disabled={cancellingId === t.id} onClick={() => handleCancel(t.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                      {cancellingId === t.id ? '取消中...' : '取消'}
                    </button>
                  </>
                )}
                {t.status === 'DISPATCHED' && (
                  <button onClick={() => setActionState({ id: t.id, action: 'sign' })}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white transition hover:bg-emerald-700">
                    签收
                  </button>
                )}
              </Space>
            )},
          ]}
          dataSource={pagedRows}
          rowKey="id"
          size="middle"
          pagination={false}
          loading={loading}
          locale={{ emptyText: '暂无调拨记录' }}
        />

        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </section>

      {/* Modals */}
      {showCreate && (
        <CreateTransferModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh(); toast.success('调拨单已创建'); }}
        />
      )}
      {actionState && (
        <ActionModal
          transferId={actionState.id}
          action={actionState.action}
          onClose={() => setActionState(null)}
          onSuccess={() => {
            setActionState(null);
            refresh();
            toast.success(actionState.action === 'dispatch' ? '已确认发货' : '已确认签收');
          }}
        />
      )}
    </div>
  );
}
