import { useMemo, useState } from 'react';
import {
  approveStocktake,
  createStocktake,
  fetchStocktakes,
  rejectStocktake,
} from '../api/pharmacy';
import { Button, Modal, Space, Table } from 'antd';
import AiAnalysisPanel from '../components/AiAnalysisPanel';
import Pager from '../components/Pager';
import { DEFAULT_WAREHOUSE_ID } from '../config/warehouse';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime, formatNumber } from '../utils/formatters';

const STATUS_MAP = {
  PENDING:  { label: '待审批', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '已审批', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '已驳回', color: 'bg-rose-100 text-rose-700' },
};

const TYPE_MAP = {
  PROFIT: { label: '盘盈', color: 'text-emerald-700 font-semibold' },
  LOSS:   { label: '盘亏', color: 'text-rose-700 font-semibold' },
  NORMAL: { label: '正常', color: 'text-slate-600' },
};

function Badge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── 新建盘点记录 Modal ────────────────────────────────────────────────────────
function CreateStocktakeModal({ onClose, onSuccess, initialData }) {
  const [form, setForm] = useState({
    type: initialData?.type || 'LOSS',
    drugName: initialData?.drugName || '',
    batchNo: initialData?.batchNo || '',
    systemQty: initialData?.systemQty != null ? String(initialData.systemQty) : '',
    actualQty: initialData?.actualQty != null ? String(initialData.actualQty) : '',
    reason: initialData?.reason || '',
    reasonCategory: initialData?.reasonCategory || 'DAMAGE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const diff = Number(form.actualQty || 0) - Number(form.systemQty || 0);

  async function handleSubmit() {
    if (!form.drugName.trim()) { setError('请填写药品名称'); return; }
    if (form.systemQty === '' || form.actualQty === '') { setError('请填写账面数量和实盘数量'); return; }
    setError('');
    setSubmitting(true);
    try {
      await createStocktake({
        type: diff > 0 ? 'PROFIT' : diff < 0 ? 'LOSS' : 'NORMAL',
        drugName: form.drugName,
        batchNo: form.batchNo || undefined,
        systemQty: form.systemQty,
        actualQty: form.actualQty,
        reason: form.reason || undefined,
        reasonCategory: form.reasonCategory || undefined,
        warehouseId: DEFAULT_WAREHOUSE_ID,
      });
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="新建盘点记录" width={640} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>提交盘点</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">药品名称 *</label>
            <input value={form.drugName} onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
              placeholder="药品名称"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">批号</label>
            <input value={form.batchNo} onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))}
              placeholder="可选"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">账面数量 *</label>
            <input type="number" min="0" value={form.systemQty} onChange={(e) => setForm((f) => ({ ...f, systemQty: e.target.value }))}
              placeholder="系统账面"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">实盘数量 *</label>
            <input type="number" min="0" value={form.actualQty} onChange={(e) => setForm((f) => ({ ...f, actualQty: e.target.value }))}
              placeholder="实际清点"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
        </div>

        {form.systemQty !== '' && form.actualQty !== '' && (
          <div className={`rounded-xl p-3 text-sm font-medium ${diff > 0 ? 'bg-emerald-50 text-emerald-700' : diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
            差异数量：{diff > 0 ? '+' : ''}{diff}（{diff > 0 ? '盘盈' : diff < 0 ? '盘亏' : '平衡'}）
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-slate-500">差异原因分类</label>
          <select value={form.reasonCategory} onChange={(e) => setForm((f) => ({ ...f, reasonCategory: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300">
            <option value="DAMAGE">破损</option>
            <option value="EXPIRY">过期</option>
            <option value="THEFT">丢失/盗窃</option>
            <option value="ENTRY_ERROR">录入错误</option>
            <option value="RETURN">退货未录</option>
            <option value="OTHER">其他</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-500">详细说明</label>
          <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2}
            placeholder="可选填写详细原因"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 审批 Modal ───────────────────────────────────────────────────────────────
function ReviewModal({ record, onClose, onSuccess }) {
  const [pass, setPass] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      if (pass) {
        await approveStocktake(record.id, { reviewNote: note });
      } else {
        await rejectStocktake(record.id, { reviewNote: note });
      }
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  const diff = Number(record.actualQty || 0) - Number(record.systemQty || 0);

  return (
    <Modal open onCancel={onClose} title="盘点审批" width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}
          danger={!pass}>
          {pass ? '确认通过' : '确认驳回'}
        </Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
          <div className="flex justify-between text-slate-500"><span>药品</span><span className="font-medium text-slate-800">{record.drugName}</span></div>
          <div className="flex justify-between text-slate-500"><span>账面数量</span><span className="font-medium text-slate-800">{record.systemQty}</span></div>
          <div className="flex justify-between text-slate-500"><span>实盘数量</span><span className="font-medium text-slate-800">{record.actualQty}</span></div>
          <div className="flex justify-between text-slate-500">
            <span>差异</span>
            <span className={`font-semibold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
              {diff > 0 ? '+' : ''}{diff}（{diff > 0 ? '盘盈' : diff < 0 ? '盘亏' : '平衡'}）
            </span>
          </div>
          {record.reason && <div className="flex justify-between text-slate-500"><span>原因</span><span className="text-slate-600">{record.reason}</span></div>}
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
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function StocktakePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [resubmitRecord, setResubmitRecord] = useState(null); // 驳回后重新提交
  const [reviewRecord, setReviewRecord] = useState(null);
  const toast = useToast();

  const { data: records, loading } = useAsyncData(fetchStocktakes, [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  const stats = useMemo(() => {
    if (!records) return { total: 0, pending: 0, profit: 0, loss: 0 };
    return {
      total: records.length,
      pending: records.filter((r) => r.status === 'PENDING').length,
      profit: records.filter((r) => r.type === 'PROFIT').length,
      loss: records.filter((r) => r.type === 'LOSS').length,
    };
  }, [records]);

  const filtered = useMemo(() => {
    if (!records) return [];
    let list = statusFilter ? records.filter((r) => r.status === statusFilter) : records;
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((r) =>
      [r.drugName, r.batchNo, r.reason].some((v) => String(v || '').toLowerCase().includes(kw))
    );
    return list;
  }, [records, statusFilter, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ── AI 盘点分析 actions ────────────────────────────────────────────────
  const aiActions = useMemo(() => {
    if (!records?.length) return [];
    return [
      {
        key: 'diff_analysis',
        icon: '🔍',
        label: '差异原因分析',
        getPrompt: () => {
          const diffItems = records
            .filter((r) => r.type === 'PROFIT' || r.type === 'LOSS')
            .slice(0, 20)
            .map((r) => {
              const diff = (r.actualQty || 0) - (r.bookQty || 0);
              return `- ${r.drugName}（批号 ${r.batchNo || '--'}）：账面 ${r.bookQty}，实盘 ${r.actualQty}，差异 ${diff > 0 ? '+' : ''}${diff}，原因：${r.reason || '未填写'}，状态：${r.status === 'APPROVED' ? '已审批' : r.status === 'REJECTED' ? '已驳回' : '待审批'}`;
            })
            .join('\n');

          const summary = `盘盈 ${stats.profit} 条，盘亏 ${stats.loss} 条，待审 ${stats.pending} 条`;

          return `你是专业药房质量管理药师。以下是近期药房盘点差异记录（共 ${records.length} 条，${summary}）：

${diffItems || '（暂无差异记录）'}

请：
1. 分析差异的整体规律（系统性偏差 or 随机误差）
2. 识别可能的原因类型：
   - 操作失误（出入库未及时记账）
   - 物理损耗（破损/挥发/过期销毁）
   - 盘点误差（计量单位/包装换算错误）
   - 异常风险（需关注的持续性盘亏品种）
3. 对待审批记录给出审批建议（哪些可直接通过，哪些需要复盘核查）
4. 给出改善账实一致性的管理建议

结构清晰，使用 Markdown 格式。`;
        },
      },
      {
        key: 'pending_review',
        icon: '⚖️',
        label: '待审批建议',
        getPrompt: () => {
          const pending = records.filter((r) => r.status === 'PENDING');
          if (!pending.length) return '当前没有待审批的盘点记录，所有盘点差异已处理完毕。';
          const lines = pending
            .map((r) => {
              const diff = (r.actualQty || 0) - (r.bookQty || 0);
              const diffPct = r.bookQty ? ((Math.abs(diff) / r.bookQty) * 100).toFixed(1) : '--';
              return `- ${r.drugName}：差异 ${diff > 0 ? '+' : ''}${diff}（${diffPct}%），原因：${r.reason || '未填写'}`;
            })
            .join('\n');
          return `你是药房盘点审核药师。以下是 ${pending.length} 条待审批盘点差异，请逐条给出审批建议：

${lines}

对每条记录，请给出：
- 建议操作：✅ 建议通过 / ⚠️ 建议驳回重查 / ❓ 需要补充说明
- 判断依据（原因是否充分、差异比例是否合理）

最后给出整体审批风险评估。`;
        },
      },
    ];
  }, [records, stats]);

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: '盘点记录', value: formatNumber(stats.total), sub: '全部', cls: 'text-slate-800' },
          { label: '待审批', value: formatNumber(stats.pending), sub: '需处理', cls: 'text-amber-700' },
          { label: '盘盈', value: formatNumber(stats.profit), sub: '已审批', cls: 'text-emerald-700' },
          { label: '盘亏', value: formatNumber(stats.loss), sub: '已审批', cls: 'text-rose-700' },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
            <p className="text-sm text-slate-500">{item.label}</p>
            <strong className={`mt-3 block text-2xl ${item.cls}`}>{item.value}</strong>
            <p className="mt-1 text-xs text-slate-400">{item.sub}</p>
          </article>
        ))}
      </section>

      {/* AI 盘点差异分析 */}
      {aiActions.length > 0 && (
        <AiAnalysisPanel actions={aiActions} context={{ page: '盘点管理' }} />
      )}

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部状态</option>
            <option value="PENDING">待审批</option>
            <option value="APPROVED">已审批</option>
            <option value="REJECTED">已驳回</option>
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="药品名称 / 批号..."
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setStatusFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>
          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新建盘点</button>
          </div>
        </div>

        <Table
          loading={loading}
          columns={[
            { title: '药品名称', dataIndex: 'drugName', key: 'drugName', render: (v) => <span className="font-medium">{v}</span> },
            { title: '批号', dataIndex: 'batchNo', key: 'batchNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v || '--'}</span> },
            { title: '账面数量', dataIndex: 'systemQty', key: 'systemQty', render: (v) => formatNumber(v) },
            { title: '实盘数量', dataIndex: 'actualQty', key: 'actualQty', render: (v) => formatNumber(v) },
            {
              title: '差异', key: 'diff',
              render: (_, r) => {
                const diff = Number(r.actualQty || 0) - Number(r.systemQty || 0);
                return (
                  <span className={diff > 0 ? 'font-semibold text-emerald-700' : diff < 0 ? 'font-semibold text-rose-700' : 'text-slate-500'}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                );
              },
            },
            {
              title: '类型', dataIndex: 'type', key: 'type',
              render: (v) => {
                const cfg = TYPE_MAP[v] || { label: v, color: 'text-slate-600' };
                return <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>;
              },
            },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Badge status={v} /> },
            { title: '原因', key: 'reason', render: (_, r) => <span className="text-xs text-slate-400">{r.reason || r.reasonCategory || '--'}</span> },
            { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
            {
              title: '操作', key: 'actions',
              render: (_, r) => (
                <Space>
                  {r.status === 'PENDING' && (
                    <button onClick={() => setReviewRecord(r)}
                      className="rounded-lg bg-amber-500 px-3 py-1 text-xs text-white transition hover:bg-amber-600">
                      审批
                    </button>
                  )}
                  {r.status === 'REJECTED' && (
                    <button onClick={() => setResubmitRecord(r)}
                      className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-700 transition hover:bg-cyan-100">
                      重新提交
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
          locale={{ emptyText: '暂无盘点记录' }}
        />

        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </section>

      {/* Modals */}
      {showCreate && (
        <CreateStocktakeModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh(); toast.success('盘点记录已提交'); }}
        />
      )}
      {reviewRecord && (
        <ReviewModal
          record={reviewRecord}
          onClose={() => setReviewRecord(null)}
          onSuccess={() => {
            setReviewRecord(null);
            refresh();
            toast.success('审批操作完成');
          }}
        />
      )}
      {resubmitRecord && (
        <CreateStocktakeModal
          initialData={resubmitRecord}
          onClose={() => setResubmitRecord(null)}
          onSuccess={() => {
            setResubmitRecord(null);
            refresh();
            toast.success('已重新提交盘点记录');
          }}
        />
      )}
    </div>
  );
}
