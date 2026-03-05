import { useCallback, useMemo, useState } from 'react';
import { analyzePrescription, fetchPrescriptionDetail, fetchPrescriptions, reviewPrescription } from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime, formatNumber } from '../utils/formatters';

// ── 常量 ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  PENDING:  { label: '待审核', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  APPROVED: { label: '已通过', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  REJECTED: { label: '已驳回', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};
const RISK_MAP = {
  LOW:    { label: '低风险', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  MEDIUM: { label: '中风险', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  HIGH:   { label: '高风险', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};
const ISSUE_LEVEL_CLS = {
  HIGH:   'border-l-rose-500 bg-rose-50',
  MEDIUM: 'border-l-amber-500 bg-amber-50',
  LOW:    'border-l-slate-300 bg-slate-50',
};

function badge(map, key) {
  const item = map[key] || { label: key, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${item.cls}`}>{item.label}</span>;
}

// ── 审方 Modal ────────────────────────────────────────────────────────
function ReviewModal({ prescriptionId, onClose, onDone }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: rx, loading } = useAsyncData(
    () => fetchPrescriptionDetail(prescriptionId),
    [prescriptionId]
  );

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const result = await analyzePrescription(prescriptionId);
      setAnalysis(result);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleReview(pass) {
    setSubmitting(true);
    try {
      await reviewPrescription(prescriptionId, { pass, reviewNote, reviewerName: 'admin' });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  const isPending = rx?.status === 'PENDING';

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-800">审方工作台</h3>
            {rx && <span className="font-mono text-sm text-slate-400">{rx.rxNo}</span>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-slate-500">加载中...</div>
        ) : rx ? (
          <div className="flex-1 overflow-y-auto">
            {/* 患者 & 处方基本信息 */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 px-6 py-4 sm:grid-cols-4">
              {[
                { label: '患者', value: `${rx.patientName}${rx.patientGender ? `（${rx.patientGender}）` : ''}${rx.patientAge ? ` ${rx.patientAge}岁` : ''}` },
                { label: '医生', value: rx.doctorName },
                { label: '科室', value: rx.departmentName || '--' },
                { label: '诊断', value: rx.diagnosis || '--' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{item.value}</p>
                </div>
              ))}
            </div>

            {/* 状态与风险 */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3">
              {badge(STATUS_MAP, rx.status)}
              {badge(RISK_MAP, rx.riskLevel)}
              {rx.issueCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
                  {rx.issueCount} 项风险
                </span>
              )}
            </div>

            {/* 药品明细 */}
            <div className="px-6 py-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">药品明细（{rx.items?.length || 0} 项）</p>
              <div className="overflow-hidden rounded-[14px] border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      {['药品名称', '剂量', '频次', '途径', '天数', '数量'].map((col) => (
                        <th key={col} className="px-4 py-2.5 font-medium first:pl-5 last:pr-5">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rx.items || []).map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-4 py-2.5 pl-5 font-medium">{item.drugName}</td>
                        <td className="px-4 py-2.5">{item.dose || '--'}</td>
                        <td className="px-4 py-2.5">{item.frequency || '--'}</td>
                        <td className="px-4 py-2.5">{item.route || '--'}</td>
                        <td className="px-4 py-2.5">{item.days}天</td>
                        <td className="px-4 py-2.5 pr-5">{item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI 分析区 */}
            <div className="border-t border-slate-100 px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">智能审方分析</p>
                {isPending && (
                  <button type="button" onClick={handleAnalyze} disabled={analyzing}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
                    {analyzing ? '分析中...' : '▶ 运行分析'}
                  </button>
                )}
              </div>

              {analysis ? (
                <div className="space-y-3">
                  <div className={`rounded-[14px] border-l-4 p-4 ${analysis.issues?.length === 0 ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-amber-500 bg-amber-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{analysis.issues?.length === 0 ? '✓' : '⚠'}</span>
                      <p className="text-sm font-medium text-slate-700">{analysis.summary}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {badge(RISK_MAP, analysis.riskLevel)}
                      <span className="text-xs text-slate-500">建议：{analysis.passSuggestion ? '可通过' : '建议驳回'}</span>
                    </div>
                  </div>

                  {(analysis.issues || []).map((issue, i) => (
                    <div key={i} className={`rounded-[14px] border-l-4 p-3 ${ISSUE_LEVEL_CLS[issue.level] || ISSUE_LEVEL_CLS.LOW}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          issue.level === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                          issue.level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>{issue.level === 'HIGH' ? '高' : issue.level === 'MEDIUM' ? '中' : '低'}</span>
                        <div>
                          <p className="text-sm text-slate-700">{issue.message}</p>
                          {issue.drugName && <p className="mt-0.5 text-xs text-slate-500">涉及药品：{issue.drugName}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : rx.analysisSnapshot ? (
                <div className="space-y-3">
                  <div className={`rounded-[14px] border-l-4 p-4 ${rx.analysisSnapshot.issues?.length === 0 ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-amber-500 bg-amber-50'}`}>
                    <p className="text-sm font-medium text-slate-700">{rx.analysisSnapshot.summary}</p>
                  </div>
                  {(rx.analysisSnapshot.issues || []).map((issue, i) => (
                    <div key={i} className={`rounded-[14px] border-l-4 p-3 ${ISSUE_LEVEL_CLS[issue.level] || ISSUE_LEVEL_CLS.LOW}`}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          issue.level === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                          issue.level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>{issue.level === 'HIGH' ? '高' : issue.level === 'MEDIUM' ? '中' : '低'}</span>
                        <p className="text-sm text-slate-700">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-[14px] bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                  {isPending ? '点击「运行分析」进行智能审方检测' : '暂无分析记录'}
                </p>
              )}
            </div>

            {/* 审方备注 & 操作 */}
            {isPending && (
              <div className="border-t border-slate-100 px-6 py-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">审方备注</p>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="可填写审方意见或驳回原因（选填）"
                  rows={3}
                  className="w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
                />
              </div>
            )}

            {/* 已审结的备注展示 */}
            {!isPending && rx.reviewNote && (
              <div className="border-t border-slate-100 px-6 py-4">
                <p className="mb-1 text-xs text-slate-400">审方备注</p>
                <p className="text-sm text-slate-600">{rx.reviewNote}</p>
                <p className="mt-1 text-xs text-slate-400">
                  审方人：{rx.reviewedBy || '--'} · {rx.reviewedAt ? formatDateTime(rx.reviewedAt) : ''}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            关闭
          </button>
          {rx?.status === 'PENDING' && (
            <>
              <button type="button" disabled={submitting} onClick={() => handleReview(false)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
                {submitting ? '提交中...' : '驳回'}
              </button>
              <button type="button" disabled={submitting} onClick={() => handleReview(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? '提交中...' : '通过'}
              </button>
            </>
          )}
        </div>
    </Modal>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────
export default function DispensingPage() {
  const [filters, setFilters] = useState({ status: '', riskLevel: '', keyword: '' });
  const [appliedFilters, setAppliedFilters] = useState({ status: '', riskLevel: '', keyword: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewId, setReviewId] = useState(null);

  const { data: prescriptions, loading, error } = useAsyncData(
    () => fetchPrescriptions(),
    [refreshKey]
  );

  const filtered = useMemo(() => {
    if (!prescriptions) return [];
    const kw = appliedFilters.keyword.trim().toLowerCase();
    return prescriptions.filter((rx) => {
      if (appliedFilters.status && rx.status !== appliedFilters.status) return false;
      if (appliedFilters.riskLevel && rx.riskLevel !== appliedFilters.riskLevel) return false;
      if (kw && ![rx.rxNo, rx.patientName, rx.doctorName, rx.departmentName].some(
        (v) => String(v || '').toLowerCase().includes(kw)
      )) return false;
      return true;
    });
  }, [prescriptions, appliedFilters]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(() => {
    if (!prescriptions) return { total: 0, pending: 0, highRisk: 0 };
    return {
      total: prescriptions.length,
      pending: prescriptions.filter((rx) => rx.status === 'PENDING').length,
      highRisk: prescriptions.filter((rx) => rx.riskLevel === 'HIGH').length,
    };
  }, [prescriptions]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(1);
  }, [filters]);

  const resetFilters = useCallback(() => {
    const empty = { status: '', riskLevel: '', keyword: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }, []);

  if (loading || !prescriptions) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-700 shadow-sm">正在加载处方数据...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">处方数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: '处方总数', value: formatNumber(stats.total), sub: '全部状态', accent: 'from-cyan-500 to-teal-500' },
          { label: '待审核', value: formatNumber(stats.pending), sub: '需尽快处理', accent: 'from-amber-500 to-orange-500' },
          { label: '高风险处方', value: formatNumber(stats.highRisk), sub: '来自审方分析', accent: 'from-rose-500 to-red-500' },
        ].map((item) => (
          <article key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <strong className="mt-4 block text-[20px] font-semibold text-slate-800">{item.value}</strong>
                <p className="mt-2 text-sm text-slate-500">{item.sub}</p>
              </div>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${item.accent} text-sm font-semibold text-white`}>·</div>
            </div>
          </article>
        ))}
      </section>

      {/* 工作台主区 */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        {/* 筛选栏 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              placeholder="处方号 / 患者 / 医生"
              className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-300"
            />
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-300">
              <option value="">全部状态</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已驳回</option>
            </select>
            <select value={filters.riskLevel} onChange={(e) => setFilters((f) => ({ ...f, riskLevel: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-300">
              <option value="">全部风险</option>
              <option value="HIGH">高风险</option>
              <option value="MEDIUM">中风险</option>
              <option value="LOW">低风险</option>
            </select>
            <button type="button" onClick={applyFilters}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
              查询
            </button>
            <button type="button" onClick={resetFilters}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
              重置
            </button>
          </div>
          <button type="button" onClick={() => { setRefreshKey((v) => v + 1); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            刷新
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['处方号', '患者', '医生', '科室', '药品数', '风险等级', '状态', '开方时间', '操作'].map((col) => (
                    <th key={col} className="px-5 py-3 font-medium first:pl-6 last:pr-6">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((rx) => (
                  <tr key={rx.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-3 pl-6 font-mono text-xs text-slate-500">{rx.rxNo}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{rx.patientName}</td>
                    <td className="px-5 py-3">{rx.doctorName}</td>
                    <td className="px-5 py-3 text-slate-500">{rx.departmentName || '--'}</td>
                    <td className="px-5 py-3 text-center">{rx.itemCount}</td>
                    <td className="px-5 py-3">{badge(RISK_MAP, rx.riskLevel)}</td>
                    <td className="px-5 py-3">{badge(STATUS_MAP, rx.status)}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{formatDateTime(rx.createdAt)}</td>
                    <td className="px-5 py-3 pr-6">
                      <button
                        type="button"
                        onClick={() => setReviewId(rx.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          rx.status === 'PENDING'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {rx.status === 'PENDING' ? '审方' : '查看'}
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-500">暂无处方数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </section>

      {/* 审方 Modal */}
      {reviewId !== null && (
        <ReviewModal
          prescriptionId={reviewId}
          onClose={() => setReviewId(null)}
          onDone={() => {
            setReviewId(null);
            setRefreshKey((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
