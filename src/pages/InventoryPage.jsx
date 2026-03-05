import { useMemo, useState } from 'react';
import {
  fetchInventoryBatches,
  fetchInventoryLocations,
  fetchInventoryOverview,
  fetchInventoryTransactions,
  fetchLowStockAlerts,
  fetchNearExpiryAlerts,
  inboundBulk
} from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatDateTime, formatNumber } from '../utils/formatters';

const tabs = [
  { key: 'batches', label: '批次台账' },
  { key: 'transactions', label: '库存流水' }
];

const initialFilters = {
  keyword: '',
  location: '',
  stockStatus: '',
  qualityStatus: ''
};

function toneClass(type = 'neutral') {
  const toneMap = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    info: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200'
  };

  return toneMap[type] || toneMap.neutral;
}

function statusTone(value) {
  const text = String(value || '').toUpperCase();

  if (text.includes('MISSING') || text.includes('异常') || text.includes('冻结')) {
    return 'danger';
  }

  if (text.includes('SELLABLE') || text.includes('CAPTURED') || text.includes('QUALIFIED') || text.includes('正常')) {
    return 'success';
  }

  if (text.includes('LOW') || text.includes('近效期') || text.includes('待')) {
    return 'warning';
  }

  return 'neutral';
}


// ── 批次入库 Modal ────────────────────────────────────────────────────────────
const EMPTY_LINE = () => ({ drugName: '', batchNo: '', expiryDate: '', locationCode: '', qty: '1', unitCost: '0.00' });

function InboundModal({ onClose, onSuccess }) {
  const [lines, setLines] = useState([EMPTY_LINE()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function handleSubmit() {
    if (lines.some((l) => !l.drugName.trim())) { setError('请填写所有药品名称'); return; }
    if (lines.some((l) => !l.batchNo.trim())) { setError('请填写所有批号'); return; }
    if (lines.some((l) => Number(l.qty) <= 0)) { setError('数量必须大于 0'); return; }
    setError('');
    setSubmitting(true);
    try {
      await inboundBulk({
        warehouseId: 1,
        lines: lines.map((l) => ({
          drugName: l.drugName,
          batchNo: l.batchNo,
          expiryDate: l.expiryDate || undefined,
          locationCode: l.locationCode || undefined,
          qty: Number(l.qty),
          unitCost: Number(l.unitCost) || undefined
        }))
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '入库失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">批次入库</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">入库明细</span>
          <button onClick={() => setLines((p) => [...p, EMPTY_LINE()])}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100">
            + 添加行
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">药品名称 *</th>
                <th className="px-3 py-2 text-left font-medium w-28">批号 *</th>
                <th className="px-3 py-2 text-left font-medium w-32">效期</th>
                <th className="px-3 py-2 text-left font-medium w-24">货位</th>
                <th className="px-3 py-2 text-left font-medium w-20">数量 *</th>
                <th className="px-3 py-2 text-left font-medium w-24">单价(元)</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <input value={line.drugName} onChange={(e) => updateLine(idx, 'drugName', e.target.value)}
                      placeholder="药品名称"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.batchNo} onChange={(e) => updateLine(idx, 'batchNo', e.target.value)}
                      placeholder="批号"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="date" value={line.expiryDate} onChange={(e) => updateLine(idx, 'expiryDate', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.locationCode} onChange={(e) => updateLine(idx, 'locationCode', e.target.value)}
                      placeholder="货位"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="1" value={line.qty} onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(idx, 'unitCost', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-300" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {lines.length > 1 && (
                      <button onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-600">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function InventoryTable({ activeTab, rows, page, pageSize, setPage, setPageSize }) {
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);

  const columns = {
    batches: ['药品', '批号', '货位', '效期', '剩余天数', '可售/冻结/占用', '库存状态', '追溯码', '质检状态'],
    transactions: ['流水类型', '药品', '批号', '数量', '货位', '发生时间']
  }[activeTab];

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-medium first:pl-6 last:pr-6">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.key} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${index}`} className="px-5 py-4 align-top first:pl-6 last:pr-6">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td colSpan={columns.length} className="px-5 py-10 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pager total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizeOptions={[5, 10, 20]} />
    </div>
  );
}

function InventoryPage() {
  const [activeTab, setActiveTab] = useState('batches');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInbound, setShowInbound] = useState(false);
  const toast = useToast();

  const { data, loading, error } = useAsyncData(
    async () => {
      const [overview, batches, transactions, locations, lowStockAlerts, nearExpiryAlerts] = await Promise.all([
        fetchInventoryOverview(),
        fetchInventoryBatches(),
        fetchInventoryTransactions(),
        fetchInventoryLocations(),
        fetchLowStockAlerts(),
        fetchNearExpiryAlerts()
      ]);

      return { overview, batches, transactions, locations, lowStockAlerts, nearExpiryAlerts };
    },
    [refreshKey]
  );

  const locationOptions = useMemo(
    () => [...new Set((data?.locations || []).map((item) => item.locationCode).filter(Boolean))],
    [data]
  );
  const stockStatusOptions = useMemo(
    () => [...new Set((data?.batches || []).map((item) => item.stockStatusLabel || item.stockStatus).filter(Boolean))],
    [data]
  );
  const qualityStatusOptions = useMemo(
    () => [...new Set((data?.batches || []).map((item) => item.qualityStatusLabel || item.qualityStatus).filter(Boolean))],
    [data]
  );

  const metrics = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: '总批次数',
        value: formatNumber(data.overview.totalBatchCount),
        detail: `货位 ${formatNumber(data.overview.locationCount)}`,
        tone: 'info'
      },
      {
        label: '可售库存',
        value: formatNumber(data.overview.availableQty),
        detail: `总量 ${formatNumber(data.overview.totalQty)}`,
        tone: 'success'
      },
      {
        label: '冻结/占用',
        value: `${formatNumber(data.overview.frozenQty)} / ${formatNumber(data.overview.reservedQty)}`,
        detail: '冻结 / 占用',
        tone: 'warning'
      },
      {
        label: '异常预警',
        value: formatNumber(
          data.overview.lowStockCount + data.overview.nearExpiryCount + data.overview.abnormalBatchCount
        ),
        detail: `低库存 ${formatNumber(data.overview.lowStockCount)}`,
        tone: 'danger'
      }
    ];
  }, [data]);

  const tabCounts = useMemo(() => {
    if (!data) return {};

    return {
      batches: data.batches.length,
      transactions: data.transactions.length
    };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];

    if (activeTab === 'batches') {
      return data.batches
        .filter((item) => {
          const keyword = appliedFilters.keyword.trim().toLowerCase();
          const stockStatus = item.stockStatusLabel || item.stockStatus || '';
          const qualityStatus = item.qualityStatusLabel || item.qualityStatus || '';

          const matchesKeyword = !keyword
            || String(item.drugName || '').toLowerCase().includes(keyword)
            || String(item.drugCode || '').toLowerCase().includes(keyword)
            || String(item.batchNo || '').toLowerCase().includes(keyword);
          const matchesLocation = !appliedFilters.location || item.locationCode === appliedFilters.location;
          const matchesStockStatus = !appliedFilters.stockStatus || stockStatus === appliedFilters.stockStatus;
          const matchesQualityStatus = !appliedFilters.qualityStatus || qualityStatus === appliedFilters.qualityStatus;

          return matchesKeyword && matchesLocation && matchesStockStatus && matchesQualityStatus;
        })
        .map((item) => {
          const stockStatus = item.stockStatusLabel || item.stockStatus || '--';
          const traceStatus = item.traceCodeStatusLabel || item.traceCodeStatus || '--';
          const qualityStatus = item.qualityStatusLabel || item.qualityStatus || '--';

          return {
            key: item.id,
            cells: [
              <div key="drug">
                <div className="font-medium text-slate-800">{item.drugName}</div>
                <div className="mt-1 text-xs text-slate-400">{item.drugCode}</div>
              </div>,
              item.batchNo,
              item.locationCode,
              formatDate(item.expiryDate),
              <span key="days" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.daysToExpiry <= 10 ? toneClass('danger') : toneClass('warning')}`}>
                {formatNumber(item.daysToExpiry)}天
              </span>,
              `${formatNumber(item.availableQty)} / ${formatNumber(item.frozenQty)} / ${formatNumber(item.reservedQty)}`,
              <span key="stock" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(stockStatus))}`}>
                {stockStatus}
              </span>,
              <span key="trace" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(traceStatus))}`}>
                {traceStatus}
              </span>,
              <span key="quality" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(qualityStatus))}`}>
                {qualityStatus}
              </span>
            ]
          };
        });
    }

    return data.transactions
      .filter((item) => {
        const keyword = appliedFilters.keyword.trim().toLowerCase();
        return !keyword
          || String(item.drugName || '').toLowerCase().includes(keyword)
          || String(item.drugCode || '').toLowerCase().includes(keyword)
          || String(item.batchNo || '').toLowerCase().includes(keyword);
      })
      .map((item) => ({
        key: item.id,
        cells: [
          <span key="tx" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(item.qty > 0 ? 'success' : 'warning')}`}>
            {item.txTypeLabel}
          </span>,
          item.drugName,
          item.batchNo,
          formatNumber(item.qty),
          item.locationCode || '--',
          formatDateTime(item.occurredAt)
        ]
      }));
  }, [activeTab, appliedFilters, data]);

  if (loading || !data) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">正在加载库存批次管理数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">库存批次管理加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <SummaryCard key={item.label} label={item.label} value={item.value} detail={item.detail} tone={item.tone} />
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`relative border-b-2 pb-3 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{formatNumber(tabCounts[tab.key] || 0)}</span>
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              刷新
            </button>
            <button
              type="button"
              onClick={() => setShowInbound(true)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white transition hover:bg-emerald-700"
            >
              批次入库
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.95fr_0.95fr_0.95fr_auto]">
            <input
              value={draftFilters.keyword}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, keyword: event.target.value }))}
              placeholder="药品名/编码/批号"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
            <select
              value={draftFilters.location}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, location: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            >
              <option value="">全部货位</option>
              {locationOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={draftFilters.stockStatus}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, stockStatus: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            >
              <option value="">全部库存状态</option>
              {stockStatusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={draftFilters.qualityStatus}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, qualityStatus: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            >
              <option value="">全部质检状态</option>
              {qualityStatusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
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

        <InventoryTable
          activeTab={activeTab}
          rows={rows}
          page={page}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </section>

      {showInbound && (
        <InboundModal
          onClose={() => setShowInbound(false)}
          onSuccess={() => {
            setShowInbound(false);
            toast.success('入库成功');
            setRefreshKey((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

export default InventoryPage;
