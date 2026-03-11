import { useMemo, useState } from 'react';
import {
  fetchInventoryBatches,
  fetchInventoryLocations,
  fetchInventoryOverview,
  fetchLowStockAlerts,
  fetchNearExpiryAlerts,
  freezeBatch,
  moveBatch,
  unfreezeBatch,
} from '../api/pharmacy';
import { Button, Modal, Space, Table } from 'antd';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatNumber } from '../utils/formatters';

const initialFilters = {
  keyword: '',
  location: '',
  stockStatus: '',
  qualityStatus: '',
};

function toneClass(type = 'neutral') {
  const toneMap = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger:  'bg-rose-50 text-rose-700 border border-rose-100',
    info:    'bg-cyan-50 text-cyan-700 border border-cyan-100',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return toneMap[type] || toneMap.neutral;
}

function statusTone(value) {
  const text = String(value || '').toUpperCase();
  if (text.includes('MISSING') || text.includes('异常') || text.includes('冻结')) return 'danger';
  if (text.includes('SELLABLE') || text.includes('CAPTURED') || text.includes('QUALIFIED') || text.includes('正常')) return 'success';
  if (text.includes('LOW') || text.includes('近效期') || text.includes('待')) return 'warning';
  return 'neutral';
}

// ── 冻结 Modal ────────────────────────────────────────────────────────────────
function FreezeModal({ batch, onClose, onDone }) {
  const [qty, setQty] = useState(String(batch.availableQty || ''));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { setError('请输入有效数量'); return; }
    if (!reason.trim()) { setError('请填写冻结原因'); return; }
    setSubmitting(true); setError('');
    try {
      await freezeBatch(batch.id, { qty: qtyNum, reason: reason.trim(), freezeType: 'MANUAL' });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || '操作失败');
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open onCancel={onClose} title="冻结批次" width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}
          style={{ backgroundColor: '#f59e0b' }}>确认冻结</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="rounded-[14px] bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800">{batch.drugName}</p>
          <p className="mt-1 text-amber-600">批号：{batch.batchNo} · 可售：{formatNumber(batch.availableQty)}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">冻结数量</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0.0001" max={batch.availableQty}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">冻结原因 *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="请填写冻结原因"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 解冻 Modal ────────────────────────────────────────────────────────────────
function UnfreezeModal({ batch, onClose, onDone }) {
  const [qty, setQty] = useState(String(batch.frozenQty || ''));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { setError('请输入有效数量'); return; }
    if (!reason.trim()) { setError('请填写解冻原因'); return; }
    setSubmitting(true); setError('');
    try {
      await unfreezeBatch(batch.id, { qty: qtyNum, reason: reason.trim() });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || '操作失败');
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open onCancel={onClose} title="解冻批次" width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>确认解冻</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="rounded-[14px] bg-cyan-50 border border-cyan-200 px-4 py-3 text-sm">
          <p className="font-medium text-cyan-800">{batch.drugName}</p>
          <p className="mt-1 text-cyan-600">批号：{batch.batchNo} · 冻结量：{formatNumber(batch.frozenQty)}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">解冻数量</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0.0001" max={batch.frozenQty}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">解冻原因 *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="请填写解冻原因"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 移库 Modal ────────────────────────────────────────────────────────────────
function MoveModal({ batch, locationOptions, onClose, onDone }) {
  const [targetLocation, setTargetLocation] = useState('');
  const [qty, setQty] = useState(String(batch.availableQty || ''));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!targetLocation.trim()) { setError('请选择或填写目标货位'); return; }
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { setError('请输入有效数量'); return; }
    setSubmitting(true); setError('');
    try {
      await moveBatch(batch.id, { targetLocationCode: targetLocation.trim(), qty: qtyNum });
      onDone();
    } catch (e) {
      setError(e?.response?.data?.message || '操作失败');
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open onCancel={onClose} title="批次移库" width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>确认移库</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="rounded-[14px] bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
          <p className="font-medium text-slate-800">{batch.drugName}</p>
          <p className="mt-1 text-slate-500">批号：{batch.batchNo} · 当前货位：{batch.locationCode || '--'}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">目标货位 *</label>
          <input list="location-list" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)}
            placeholder="输入或选择货位编码"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
          <datalist id="location-list">
            {locationOptions.filter((l) => l !== batch.locationCode).map((l) => <option key={l} value={l} />)}
          </datalist>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">移库数量</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0.0001" max={batch.availableQty}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-300" />
          <p className="mt-1 text-xs text-slate-400">可用库存 {formatNumber(batch.availableQty)}</p>
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 主页面 ─────────────────────────────────────────────────────────────────────
function InventoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [freezeTarget, setFreezeTarget] = useState(null);
  const [unfreezeTarget, setUnfreezeTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const toast = useToast();

  const { data, loading, error } = useAsyncData(
    async () => {
      const [overview, batches, locations, lowStockAlerts, nearExpiryAlerts] = await Promise.all([
        fetchInventoryOverview(),
        fetchInventoryBatches(),
        fetchInventoryLocations(),
        fetchLowStockAlerts(),
        fetchNearExpiryAlerts(),
      ]);
      return { overview, batches, locations, lowStockAlerts, nearExpiryAlerts };
    },
    [refreshKey],
  );

  const locationOptions = useMemo(
    () => [...new Set((data?.locations || []).map((item) => item.locationCode).filter(Boolean))],
    [data],
  );
  const stockStatusOptions = useMemo(
    () => [...new Set((data?.batches || []).map((item) => item.stockStatusLabel || item.stockStatus).filter(Boolean))],
    [data],
  );
  const qualityStatusOptions = useMemo(
    () => [...new Set((data?.batches || []).map((item) => item.qualityStatusLabel || item.qualityStatus).filter(Boolean))],
    [data],
  );

  const metrics = useMemo(() => {
    if (!data) return [];
    return [
      { label: '总批次数', value: formatNumber(data.overview.totalBatchCount), detail: `货位 ${formatNumber(data.overview.locationCount)}`, tone: 'info',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
      { label: '可售库存', value: formatNumber(data.overview.availableQty), detail: `总量 ${formatNumber(data.overview.totalQty)}`, tone: 'success',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> },
      { label: '冻结/占用', value: `${formatNumber(data.overview.frozenQty)} / ${formatNumber(data.overview.reservedQty)}`, detail: '冻结 / 占用', tone: 'warning',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
      {
        label: '异常预警',
        value: formatNumber((data.overview.lowStockCount || 0) + (data.overview.nearExpiryCount || 0) + (data.overview.abnormalBatchCount || 0)),
        detail: `低库存 ${formatNumber(data.overview.lowStockCount)}`,
        tone: 'danger',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
      },
    ];
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const kw = appliedFilters.keyword.trim().toLowerCase();
    return data.batches.filter((item) => {
      const stockStatus  = item.stockStatusLabel  || item.stockStatus  || '';
      const qualityStatus = item.qualityStatusLabel || item.qualityStatus || '';
      const matchesKeyword = !kw
        || String(item.drugName || '').toLowerCase().includes(kw)
        || String(item.drugCode || '').toLowerCase().includes(kw)
        || String(item.batchNo  || '').toLowerCase().includes(kw);
      return (
        matchesKeyword
        && (!appliedFilters.location      || item.locationCode === appliedFilters.location)
        && (!appliedFilters.stockStatus   || stockStatus        === appliedFilters.stockStatus)
        && (!appliedFilters.qualityStatus || qualityStatus      === appliedFilters.qualityStatus)
      );
    });
  }, [appliedFilters, data]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  if (loading || !data) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">正在加载批次数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">批次数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} detail={item.detail} tone={item.tone} />
        ))}
      </section>

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        {/* 工具栏 */}
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <span className="text-sm font-semibold text-slate-700">
            批次台账
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">{formatNumber(rows.length)}</span>
          </span>
          <button
            type="button"
            onClick={() => setRefreshKey((v) => v + 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            刷新
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.95fr_0.95fr_0.95fr_auto]">
            <input
              value={draftFilters.keyword}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedFilters(draftFilters); setPage(1); } }}
              placeholder="药品名/编码/批号"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
            <select
              value={draftFilters.location}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, location: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            >
              <option value="">全部货位</option>
              {locationOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select
              value={draftFilters.stockStatus}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, stockStatus: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            >
              <option value="">全部库存状态</option>
              {stockStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select
              value={draftFilters.qualityStatus}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, qualityStatus: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            >
              <option value="">全部质检状态</option>
              {qualityStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setAppliedFilters(draftFilters); setPage(1); }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                查询
              </button>
              <button
                type="button"
                onClick={() => { setDraftFilters(initialFilters); setAppliedFilters(initialFilters); setPage(1); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        {/* 批次表格 */}
        <div className="rounded-[22px] border border-slate-200 bg-white overflow-hidden">
          <Table
            columns={[
              {
                title: '药品', dataIndex: 'drugName', key: 'drugName',
                render: (_, item) => (
                  <div>
                    <div className="font-medium text-slate-800">{item.drugName}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{item.drugCode}</div>
                  </div>
                ),
              },
              { title: '批号', dataIndex: 'batchNo', key: 'batchNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
              { title: '货位', dataIndex: 'locationCode', key: 'locationCode', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
              { title: '效期', dataIndex: 'expiryDate', key: 'expiryDate', render: (v) => <span className="text-slate-500">{formatDate(v)}</span> },
              {
                title: '剩余天数', dataIndex: 'daysToExpiry', key: 'daysToExpiry',
                render: (v) => (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${(v ?? 999) <= 30 ? toneClass('danger') : toneClass('neutral')}`}>
                    {v != null ? `${formatNumber(v)}天` : '--'}
                  </span>
                ),
              },
              {
                title: '可售 / 冻结 / 占用', key: 'qty',
                render: (_, item) => (
                  <span className="font-semibold text-slate-700">
                    {formatNumber(item.availableQty)} / {formatNumber(item.frozenQty)} / {formatNumber(item.reservedQty)}
                  </span>
                ),
              },
              {
                title: '库存状态', key: 'stockStatus',
                render: (_, item) => {
                  const s = item.stockStatusLabel || item.stockStatus || '--';
                  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(s))}`}>{s}</span>;
                },
              },
              {
                title: '追溯码', key: 'traceStatus',
                render: (_, item) => {
                  const s = item.traceCodeStatusLabel || item.traceCodeStatus || '--';
                  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(s))}`}>{s}</span>;
                },
              },
              {
                title: '质检状态', key: 'qualityStatus',
                render: (_, item) => {
                  const s = item.qualityStatusLabel || item.qualityStatus || '--';
                  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(s))}`}>{s}</span>;
                },
              },
              {
                title: '操作', key: 'actions',
                render: (_, item) => (
                  <Space size={4}>
                    {Number(item.availableQty) > 0 && (
                      <button type="button" onClick={() => setFreezeTarget(item)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">
                        冻结
                      </button>
                    )}
                    {Number(item.frozenQty) > 0 && (
                      <button type="button" onClick={() => setUnfreezeTarget(item)}
                        className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs text-cyan-700 hover:bg-cyan-100">
                        解冻
                      </button>
                    )}
                    <button type="button" onClick={() => setMoveTarget(item)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
                      移库
                    </button>
                  </Space>
                ),
              },
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
          />
          <Pager total={rows.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} pageSizeOptions={[5, 10, 20]} />
        </div>
      </section>

      {/* 操作 Modals */}
      {freezeTarget && (
        <FreezeModal
          batch={freezeTarget}
          onClose={() => setFreezeTarget(null)}
          onDone={() => { setFreezeTarget(null); setRefreshKey((v) => v + 1); toast.success('冻结成功'); }}
        />
      )}
      {unfreezeTarget && (
        <UnfreezeModal
          batch={unfreezeTarget}
          onClose={() => setUnfreezeTarget(null)}
          onDone={() => { setUnfreezeTarget(null); setRefreshKey((v) => v + 1); toast.success('解冻成功'); }}
        />
      )}
      {moveTarget && (
        <MoveModal
          batch={moveTarget}
          locationOptions={locationOptions}
          onClose={() => setMoveTarget(null)}
          onDone={() => { setMoveTarget(null); setRefreshKey((v) => v + 1); toast.success('移库成功'); }}
        />
      )}
    </div>
  );
}

export default InventoryPage;
