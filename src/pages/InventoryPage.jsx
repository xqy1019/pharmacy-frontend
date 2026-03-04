import { useMemo, useState } from 'react';
import {
  fetchInventoryBatches,
  fetchInventoryLocations,
  fetchInventoryOverview,
  fetchInventoryTransactions,
  fetchLowStockAlerts,
  fetchNearExpiryAlerts
} from '../api/pharmacy';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDate, formatDateTime, formatNumber } from '../utils/formatters';

const tabs = [
  { key: 'batches', label: '批次台账' },
  { key: 'transactions', label: '库存流水' },
  { key: 'alerts', label: '预警中心' },
  { key: 'locations', label: '货位视图' }
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

function SummaryCard({ label, value, detail, tone = 'info' }) {
  const accentMap = {
    info: 'from-cyan-500 to-teal-500',
    success: 'from-emerald-500 to-green-500',
    warning: 'from-amber-500 to-orange-500',
    danger: 'from-rose-500 to-red-500'
  };

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="mt-4 block text-[18px] font-semibold text-slate-800 md:text-[20px]">{value}</strong>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${accentMap[tone]} text-sm font-semibold text-white`}>
          ·
        </div>
      </div>
    </article>
  );
}

function Pager({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span>共 {total} 条</span>
        <label className="flex items-center gap-2">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none"
          >
            {[5, 10, 20].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          上一页
        </button>
        <span className="min-w-[88px] text-center text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function InventoryTable({ activeTab, rows, page, pageSize, setPage, setPageSize }) {
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);

  const columns = {
    batches: ['药品', '批号', '货位', '效期', '剩余天数', '可售/冻结/占用', '库存状态', '追溯码', '质检状态'],
    transactions: ['流水类型', '药品', '批号', '数量', '货位', '发生时间'],
    alerts: ['预警类型', '药品', '当前值/批号', '阈值/效期', '货位', '备注'],
    locations: ['货位编码', '货位名称', '分区', '货架', '仓库', '状态']
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
      <Pager total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
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

      return {
        overview,
        batches,
        transactions,
        locations,
        lowStockAlerts,
        nearExpiryAlerts
      };
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
    if (!data) {
      return [];
    }

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
    if (!data) {
      return {};
    }

    return {
      batches: data.batches.length,
      transactions: data.transactions.length,
      alerts: data.lowStockAlerts.length + data.nearExpiryAlerts.length,
      locations: data.locations.length
    };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) {
      return [];
    }

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

    if (activeTab === 'transactions') {
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
    }

    if (activeTab === 'alerts') {
      return [
        ...data.lowStockAlerts.map((item) => ({
          key: `low-${item.drugId}`,
          cells: [
            <span key="low" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass('danger')}`}>
              低库存
            </span>,
            item.drugName,
            formatNumber(item.currentQty),
            formatNumber(item.threshold),
            '--',
            `${formatNumber(item.frozenQty)} / ${formatNumber(item.reservedQty)}`
          ]
        })),
        ...data.nearExpiryAlerts.map((item) => ({
          key: `expiry-${item.batchId}`,
          cells: [
            <span key="expiry" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass('warning')}`}>
              近效期
            </span>,
            item.drugName,
            item.batchNo,
            formatDate(item.expiryDate),
            item.locationCode,
            `${formatNumber(item.availableQty)} 可售`
          ]
        }))
      ];
    }

    return data.locations
      .filter((item) => !appliedFilters.location || item.locationCode === appliedFilters.location)
      .map((item) => ({
        key: item.id,
        cells: [
          item.locationCode,
          item.locationName,
          item.zoneName,
          item.shelfName,
          item.storeName,
          <span key="status" className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(statusTone(item.statusLabel))}`}>
            {item.statusLabel}
          </span>
        ]
      }));
  }, [activeTab, appliedFilters, data]);

  const highlights = useMemo(() => {
    if (!data) {
      return [];
    }

    const urgentBatch = [...data.nearExpiryAlerts].sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
    const lowStockDrug = [...data.lowStockAlerts].sort((a, b) => a.currentQty - b.currentQty)[0];
    const latestTransaction = data.transactions[0];

    return [
      {
        label: '近效期批次',
        value: formatNumber(data.overview.nearExpiryCount),
        detail: urgentBatch ? `${urgentBatch.drugName} · ${urgentBatch.batchNo}` : '暂无近效期批次'
      },
      {
        label: '缺失追溯码',
        value: formatNumber(data.overview.missingTraceCount),
        detail: `${formatNumber(data.overview.abnormalBatchCount)} 个异常批次`
      },
      {
        label: '低库存药品',
        value: formatNumber(data.overview.lowStockCount),
        detail: lowStockDrug ? `${lowStockDrug.drugName} · 当前 ${formatNumber(lowStockDrug.currentQty)}` : '暂无低库存'
      },
      {
        label: '最新流水',
        value: latestTransaction?.txTypeLabel || '--',
        detail: latestTransaction ? `${latestTransaction.drugName} · ${formatDateTime(latestTransaction.occurredAt)}` : '暂无流水'
      }
    ];
  }, [data]);

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
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium tracking-[0.24em] text-cyan-700">库存管理</p>
              <h3 className="mt-2 text-[30px] font-semibold tracking-tight text-slate-800">库存批次管理工作台</h3>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-slate-500">
              统一查看批次、流水、预警与货位数据，支持按药品、批号、效期和状态快速定位问题批次。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              刷新
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              新增货位
            </button>
            <button
              type="button"
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              批次入库
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">{item.label}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">摘要</span>
              </div>
              <div className="mt-4 text-2xl font-semibold text-slate-800">{item.value}</div>
              <div className="mt-2 text-sm text-slate-500">{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-8 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`relative border-b-2 px-1 pb-4 text-sm font-medium transition ${
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

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.95fr_0.95fr_0.95fr_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">关键字</span>
              <input
                value={draftFilters.keyword}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, keyword: event.target.value }))}
                placeholder="药品名/编码/批号"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-300"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">货位</span>
              <select
                value={draftFilters.location}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, location: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-300"
              >
                <option value="">全部货位</option>
                {locationOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">库存状态</span>
              <select
                value={draftFilters.stockStatus}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, stockStatus: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-300"
              >
                <option value="">全部状态</option>
                {stockStatusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">质检状态</span>
              <select
                value={draftFilters.qualityStatus}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, qualityStatus: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-300"
              >
                <option value="">全部状态</option>
                {qualityStatusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAppliedFilters(draftFilters);
                  setPage(1);
                }}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                查询
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(initialFilters);
                  setAppliedFilters(initialFilters);
                  setPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                重置
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <InventoryTable
            activeTab={activeTab}
            rows={rows}
            page={page}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      </section>
    </div>
  );
}

export default InventoryPage;
