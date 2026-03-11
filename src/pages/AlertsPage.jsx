import { useMemo, useState } from 'react';
import { Modal, Button, Table } from 'antd';
import { acknowledgeStockAlert, fetchLowStockAlerts, fetchNearExpiryAlerts, freezeBatch } from '../api/pharmacy';
import AiAnalysisPanel from '../components/AiAnalysisPanel';
import Pager from '../components/Pager';
import SummaryCard from '../components/SummaryCard';
import { useToast } from '../context/ToastContext';
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
    <Modal
      open
      onCancel={onClose}
      title="冻结批次 · 近效期处置"
      width={560}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>确认冻结</Button>,
      ]}
    >
        <div className="space-y-4 py-2">
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
  // 正在提交知晓的 drugId 集合
  const [acknowledgingIds, setAcknowledgingIds] = useState(new Set());
  // 已冻结批次集合（近效期用，key = batchId）
  const [frozenBatchIds, setFrozenBatchIds] = useState(new Set());
  // 冻结 Modal
  const [freezeTarget, setFreezeTarget] = useState(null);
  // 是否只显示待处理
  const [onlyPending, setOnlyPending] = useState(true);
  const toast = useToast();

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

  // ── AI 分析 actions（必须在条件 return 之前定义，遵守 Hooks 规则）─────────
  const aiActions = useMemo(() => [
    {
      key: 'stock',
      icon: '📦',
      label: '分析库存风险',
      getPrompt: () => {
        if (!data?.low?.length) return '当前暂无低库存预警数据。';
        const items = data.low
          .map((item) => `- 药品：${item.drugName}，当前库存 ${formatNumber(item.currentQty)}，安全阈值 ${formatNumber(item.threshold)}，缺口 ${formatNumber(Math.max(0, item.threshold - item.currentQty))}，冻结 ${formatNumber(item.frozenQty)}，占用 ${formatNumber(item.reservedQty)}`)
          .join('\n');
        return `你是专业药房库存管理药师。以下是当前药房低库存预警清单（共 ${data.low.length} 条）：

${items}

请：
1. 按缺货紧急程度分级：🔴 紧急（库存低于阈值50%）/ 🟡 关注（50%~80%）/ 🟢 暂缓（80%~100%）
2. 分析哪些药品临床用量较大、断货影响最严重，需要优先处理
3. 给出每个药品的建议补货量（参考：补充至阈值的 150%~200%）
4. 最后给出整体库存风险总结（1~2句话）

回答结构清晰，使用 Markdown 格式。`;
      },
    },
    {
      key: 'expiry',
      icon: '⏰',
      label: '分析有效期风险',
      getPrompt: () => {
        if (!data?.expiry?.length) return '当前暂无近效期预警数据。';
        const today = new Date();
        const items = data.expiry
          .map((item) => {
            const daysLeft = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
            return `- 药品：${item.drugName}，批号 ${item.batchNo}，可售 ${formatNumber(item.availableQty)}，距到期 **${daysLeft} 天**（${formatDate(item.expiryDate)}）${item.locationCode ? `，库位 ${item.locationCode}` : ''}`;
          })
          .join('\n');
        return `你是专业药房质量管理药师。以下是当前近效期药品批次清单（共 ${data.expiry.length} 批）：

${items}

请：
1. 按过期风险分级：🔴 高风险（距到期 ≤30天）/ 🟡 中风险（31~60天）/ 🟢 低风险（>60天）
2. 结合可售数量，判断哪些批次在效期内较难消耗完
3. 对高/中风险批次逐条给出具体处置建议：
   - 优先发放使用（FIFO 执行）
   - 申请科室间调拨（调往消耗快的科室）
   - 联系供应商协商退货（效期内）
   - 申请报损冻结（接近到期，无法消耗）
4. 最后给出整体有效期风险概况（1~2句话）

回答结构清晰，使用 Markdown 格式。`;
      },
    },
  ], [data]);

  if (loading || !data) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">正在加载预警数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">预警数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="全部预警" value={formatNumber(counts.all)} detail={`待处理 ${counts.all - handledCount} 条`} accent="from-rose-500 to-red-500"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="12" y1="2" x2="12" y2="3"/></svg>} />
        <SummaryCard label="低库存" value={formatNumber(counts.low)} detail={`已知晓 ${acknowledgedIds.size} 条`} accent="from-amber-500 to-orange-400"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>} />
        <SummaryCard label="近效期批次" value={formatNumber(counts.expiry)} detail={`已冻结 ${frozenBatchIds.size} 批`} accent="from-purple-500 to-violet-500"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
      </section>

      {/* AI 智能分析 */}
      <AiAnalysisPanel
        actions={aiActions}
        context={{ page: '库存预警' }}
      />

      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
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
          <Table
            columns={[
              { title: '预警类型', key: 'type', render: (_, row) => row._type === 'low'
                ? <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">低库存</span>
                : <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">近效期</span>
              },
              { title: '药品', dataIndex: 'drugName', key: 'drugName', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
              { title: '当前值 / 批号', key: 'currentVal', render: (_, row) => row._type === 'low'
                ? <span className="font-semibold text-rose-600">{formatNumber(row.currentQty)}</span>
                : <span className="font-mono text-xs text-slate-600">{row.batchNo}</span>
              },
              { title: '阈值 / 效期', key: 'thresholdExpiry', render: (_, row) => row._type === 'low'
                ? `阈值 ${formatNumber(row.threshold)}`
                : <span className="text-amber-600">{formatDate(row.expiryDate)}</span>
              },
              { title: '货位', key: 'location', render: (_, row) => <span className="text-slate-400">{row._type === 'low' ? '--' : (row.locationCode || '--')}</span> },
              { title: '说明', key: 'desc', render: (_, row) => <span className="text-xs">{row._type === 'low'
                ? `冻结 ${formatNumber(row.frozenQty)} / 占用 ${formatNumber(row.reservedQty)}`
                : `可售 ${formatNumber(row.availableQty)}`}</span>
              },
              { title: '处置操作', key: 'actions', render: (_, row) => {
                if (row._handled) return <span className="text-xs text-slate-400">已处置</span>;
                if (row._type === 'low') return (
                  <button type="button"
                    disabled={acknowledgingIds.has(row.drugId)}
                    onClick={async () => {
                      setAcknowledgingIds((prev) => new Set([...prev, row.drugId]));
                      try {
                        await acknowledgeStockAlert(row.drugId);
                        setAcknowledgedIds((prev) => new Set([...prev, row.drugId]));
                        toast.success('已标记知晓');
                      } catch (e) {
                        toast.error(e?.response?.data?.message || '标记失败，请重试');
                      } finally {
                        setAcknowledgingIds((prev) => { const s = new Set(prev); s.delete(row.drugId); return s; });
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                    {acknowledgingIds.has(row.drugId) ? '处理中...' : '标记已知晓'}
                  </button>
                );
                return (
                  <button type="button"
                    onClick={() => setFreezeTarget(row)}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600">
                    冻结处置
                  </button>
                );
              }},
            ]}
            dataSource={pagedRows}
            rowKey="_key"
            size="middle"
            pagination={false}
            rowClassName={(row) => row._handled ? 'opacity-50' : ''}
            locale={{ emptyText: onlyPending ? '全部预警已处置完毕' : '暂无预警数据' }}
          />
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
