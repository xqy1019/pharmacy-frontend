import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Popconfirm, Table } from 'antd';
import {
  dispensePrescription,
  fetchPrescriptionDetail,
  fetchPrescriptions,
  reviewPrescription,
  streamAIPrescriptionReview,
} from '../api/pharmacy';
import Pager from '../components/Pager';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime, formatNumber } from '../utils/formatters';

// ── 常量 ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  PENDING:   { label: '待审核',  cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  APPROVED:  { label: '待发药',  cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  DISPENSED: { label: '已发药',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  REJECTED:  { label: '已驳回',  cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

const RISK_MAP = {
  LOW:    { label: '低风险', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  MEDIUM: { label: '中风险', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  HIGH:   { label: '高风险', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

const RX_TYPE_MAP = {
  OUTPATIENT: { label: '门诊', cls: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  INPATIENT:  { label: '住院', cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
};

// 问题类型图标和标签
const ISSUE_TYPE_MAP = {
  ALLERGY:     { icon: '⚠', label: '过敏风险', cls: 'border-l-rose-600 bg-rose-50' },
  INTERACTION: { icon: '⚡', label: '配伍禁忌', cls: 'border-l-rose-500 bg-rose-50' },
  DUPLICATE:   { icon: '↕', label: '重复用药', cls: 'border-l-amber-500 bg-amber-50' },
  DOSE:        { icon: '⚖', label: '剂量风险', cls: 'border-l-orange-400 bg-orange-50' },
};

const ISSUE_LEVEL_CLS = {
  HIGH:   'border-l-rose-500 bg-rose-50',
  MEDIUM: 'border-l-amber-500 bg-amber-50',
  LOW:    'border-l-slate-300 bg-slate-50',
};

function badge(map, key) {
  const item = map[key] || { label: key, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${item.cls}`}>
      {item.label}
    </span>
  );
}

// ── 简单 Markdown 渲染 ─────────────────────────────────────────────
function RenderMd({ text }) {
  const lines = (text || '').split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed text-slate-700">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith('## ')) return <p key={i} className="font-semibold text-slate-800 mt-2">{line.slice(3)}</p>;
        if (line.startsWith('# '))  return <p key={i} className="font-bold text-slate-900 mt-2">{line.slice(2)}</p>;
        const isList = line.trim().startsWith('- ') || line.trim().startsWith('• ');
        const content = isList ? line.trim().slice(2) : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>
            : p
        );
        return isList
          ? <div key={i} className="flex gap-2"><span className="mt-1 text-slate-400">·</span><p>{rendered}</p></div>
          : <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

// ── 审方 Modal ─────────────────────────────────────────────────────
function ReviewModal({ prescriptionId, onClose, onDone }) {
  const [aiText, setAiText]       = useState('');
  const [aiDone, setAiDone]       = useState(false);
  const [aiError, setAiError]     = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewNote, setReviewNote]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [dispensing, setDispensing]   = useState(false);
  const aiBoxRef = useRef(null);
  const toast = useToast();

  const { data: rx, loading } = useAsyncData(
    () => fetchPrescriptionDetail(prescriptionId),
    [prescriptionId]
  );

  async function handleAnalyze() {
    setAiText(''); setAiDone(false); setAiError(''); setAnalyzing(true);
    try {
      await streamAIPrescriptionReview(prescriptionId, {
        onChunk: (chunk) => {
          setAiText((prev) => {
            const next = prev + chunk;
            setTimeout(() => {
              if (aiBoxRef.current) aiBoxRef.current.scrollTop = aiBoxRef.current.scrollHeight;
            }, 0);
            return next;
          });
        },
        onDone:  () => { setAiDone(true); setAnalyzing(false); },
        onError: (msg) => { setAiError(msg); setAnalyzing(false); },
      });
    } catch (e) {
      setAiError(e.message || 'AI 分析失败');
      setAnalyzing(false);
    }
  }

  async function doReview(pass) {
    setSubmitting(true); setReviewError('');
    try {
      await reviewPrescription(prescriptionId, { pass, reviewNote, reviewerName: 'admin' });
      toast.success(pass ? '处方已通过审核，等待发药' : '处方已驳回');
      onDone();
    } catch (e) {
      setReviewError(e?.response?.data?.message || e.message || '审核提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReview(pass) {
    if (!pass || rx?.riskLevel !== 'HIGH') {
      doReview(pass);
    }
    // HIGH 风险时由 Popconfirm 拦截，onConfirm 回调中执行 doReview(true)
  }

  async function handleDispense() {
    setDispensing(true); setReviewError('');
    try {
      await dispensePrescription(prescriptionId, { dispenserName: 'admin' });
      toast.success('发药确认成功');
      onDone();
    } catch (e) {
      setReviewError(e?.response?.data?.message || e.message || '发药操作失败');
    } finally {
      setDispensing(false);
    }
  }

  const isPending    = rx?.status === 'PENDING';
  const isApproved   = rx?.status === 'APPROVED';
  const issues = rx?.analysisSnapshot?.issues || [];

  // 按类型分组显示问题
  const issuesByType = useMemo(() => {
    const groups = {};
    for (const issue of issues) {
      const t = issue.type || 'OTHER';
      if (!groups[t]) groups[t] = [];
      groups[t].push(issue);
    }
    return groups;
  }, [issues]);

  const drugColumns = [
    { title: '药品名称', dataIndex: 'drugName', key: 'drugName', render: (v) => <span className="font-medium">{v}</span> },
    { title: '剂量', dataIndex: 'dose', key: 'dose', render: (v) => v || '--' },
    { title: '频次', dataIndex: 'frequency', key: 'frequency', render: (v) => v || '--' },
    { title: '途径', dataIndex: 'route', key: 'route', render: (v) => v || '--' },
    { title: '天数', dataIndex: 'days', key: 'days', render: (v) => `${v}天` },
    { title: '数量', dataIndex: 'qty', key: 'qty' },
  ];

  const btnBase = 'inline-flex items-center justify-center rounded-xl px-5 h-10 text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  const btnGhost = `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 min-w-[88px]`;
  const btnDanger = `${btnBase} border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 min-w-[88px]`;
  const btnGreen = `${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 min-w-[104px]`;
  const btnBlue = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 min-w-[104px]`;

  const footer = (
    <div className="flex items-center justify-end gap-3 pt-1">
      <button type="button" className={btnGhost} onClick={onClose}>关闭</button>
      {isPending && (
        <>
          <button type="button" className={btnDanger}
            disabled={submitting}
            onClick={() => handleReview(false)}>
            驳回
          </button>
          {rx?.riskLevel === 'HIGH' ? (
            <Popconfirm
              title="确认强制通过高风险处方？"
              description={
                <div style={{ maxWidth: 220 }} className="text-sm leading-relaxed text-slate-600">
                  该处方存在 <strong className="text-rose-600">高风险</strong> 问题项，系统建议驳回。
                  强制通过后将直接允许发药，请确认已知晓。
                </div>
              }
              icon={<span style={{ color: '#ef4444', marginRight: 4 }}>⚠</span>}
              okText="确认强制通过"
              cancelText="取消"
              okButtonProps={{ danger: true, style: { marginLeft: 8 } }}
              onConfirm={() => doReview(true)}
            >
              <button type="button" className={btnGreen} disabled={submitting}>审核通过</button>
            </Popconfirm>
          ) : (
            <button type="button" className={btnGreen}
              disabled={submitting}
              onClick={() => doReview(true)}>
              审核通过
            </button>
          )}
        </>
      )}
      {isApproved && (
        <button type="button" className={btnBlue}
          disabled={dispensing}
          onClick={handleDispense}>
          确认发药
        </button>
      )}
    </div>
  );

  return (
    <Modal
      open
      centered
      onCancel={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-slate-800">审方工作台</span>
          {rx && <span className="font-mono text-sm text-slate-400">{rx.rxNo}</span>}
          {rx && badge(RX_TYPE_MAP, rx.rxType)}
        </div>
      }
      width={1024}
      footer={footer}
      destroyOnClose
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">加载中...</div>
      ) : rx ? (
        <div>
          {/* 患者基本信息 */}
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-4 sm:grid-cols-4">
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

          {/* 过敏史提醒 */}
          {rx.allergyNotes ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <span className="mt-0.5 text-base text-rose-500">⚠</span>
              <div>
                <p className="text-sm font-semibold text-rose-700">过敏史记录</p>
                <p className="mt-0.5 text-sm text-rose-600">{rx.allergyNotes}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="text-slate-400 text-sm">✓</span>
              <p className="text-sm text-slate-500">暂无过敏史记录</p>
            </div>
          )}

          {/* 状态与风险 */}
          <div className="flex items-center gap-3 border-b border-slate-100 py-3 mt-3">
            {badge(STATUS_MAP, rx.status)}
            {badge(RISK_MAP, rx.riskLevel)}
            {issues.length > 0 && (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
                {issues.length} 项风险
              </span>
            )}
          </div>

          {/* 规则检测结果（有历史分析时展示） */}
          {issues.length > 0 && (
            <div className="border-b border-slate-100 py-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">规则检测结果</p>
              <div className="space-y-2">
                {Object.entries(issuesByType).map(([type, list]) => {
                  const meta = ISSUE_TYPE_MAP[type] || { icon: '·', label: type, cls: 'border-l-slate-300 bg-slate-50' };
                  return list.map((issue, i) => (
                    <div key={`${type}-${i}`}
                      className={`flex items-start gap-3 rounded-xl border-l-4 px-4 py-2.5 ${ISSUE_LEVEL_CLS[issue.level] || meta.cls}`}>
                      <span className="mt-0.5 text-base">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            issue.level === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                            issue.level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {meta.label}
                          </span>
                          {issue.drugName && (
                            <span className="text-xs text-slate-500">{issue.drugName}</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{issue.message}</p>
                      </div>
                    </div>
                  ));
                })}
              </div>
            </div>
          )}

          {/* 药品明细 */}
          <div className="py-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">药品明细（{rx.items?.length || 0} 项）</p>
            <Table
              columns={drugColumns}
              dataSource={rx.items || []}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </div>

          {/* AI 分析区 */}
          <div className="border-t border-slate-100 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">AI</div>
                <p className="text-sm font-semibold text-slate-700">智能审方分析</p>
                {analyzing && (
                  <span className="flex items-center gap-1 text-xs text-indigo-500">
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '300ms' }} />
                    分析中
                  </span>
                )}
              </div>
              {isPending && (
                <button type="button" onClick={handleAnalyze} disabled={analyzing}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50">
                  {analyzing ? '分析中...' : (aiText ? '重新分析' : '▶ AI 审方')}
                </button>
              )}
            </div>

            {(aiText || analyzing) ? (
              <div ref={aiBoxRef}
                className="max-h-56 overflow-y-auto rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 px-4 py-3">
                <RenderMd text={aiText} />
                {analyzing && !aiText && <p className="text-sm text-slate-400">正在读取处方并分析...</p>}
                {analyzing && aiText && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-500 align-middle" />}
              </div>
            ) : aiError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">⚠ {aiError}</div>
            ) : rx.analysisSnapshot ? (
              <div className="space-y-2">
                <div className={`rounded-xl border-l-4 p-3 ${issues.length === 0 ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-amber-500 bg-amber-50'}`}>
                  <p className="text-sm font-medium text-slate-700">{rx.analysisSnapshot.summary}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm text-slate-400">
                  {isPending ? '点击「AI 审方」获取智能分析建议' : '暂无分析记录'}
                </p>
              </div>
            )}
          </div>

          {/* 审方备注 */}
          {isPending && (
            <div className="border-t border-slate-100 py-4">
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

          {/* 已审结信息 */}
          {!isPending && rx.reviewNote && (
            <div className="border-t border-slate-100 py-4">
              <p className="mb-1 text-xs text-slate-400">审方备注</p>
              <p className="text-sm text-slate-600">{rx.reviewNote}</p>
              <p className="mt-1 text-xs text-slate-400">
                审方人：{rx.reviewedBy || '--'} · {rx.reviewedAt ? formatDateTime(rx.reviewedAt) : ''}
              </p>
            </div>
          )}

          {/* 发药记录 */}
          {rx.status === 'DISPENSED' && rx.dispensedAt && (
            <div className="border-t border-slate-100 py-4">
              <p className="mb-1 text-xs text-slate-400">发药记录</p>
              <p className="text-xs text-slate-400">
                发药人：{rx.dispensedBy || '--'} · {formatDateTime(rx.dispensedAt)}
              </p>
            </div>
          )}

          {reviewError && (
            <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{reviewError}</div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

// ── 主页面 ─────────────────────────────────────────────────────────
export default function DispensingPage() {
  const [rxTypeTab, setRxTypeTab]   = useState('');          // '' | 'OUTPATIENT' | 'INPATIENT'
  const [filters, setFilters]       = useState({ status: '', riskLevel: '', keyword: '' });
  const [appliedFilters, setAppliedFilters] = useState({ status: '', riskLevel: '', keyword: '' });
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewId, setReviewId]     = useState(null);

  const { data: prescriptions, loading, error } = useAsyncData(
    () => fetchPrescriptions(),
    [refreshKey]
  );

  const filtered = useMemo(() => {
    if (!prescriptions) return [];
    const kw = appliedFilters.keyword.trim().toLowerCase();
    return prescriptions.filter((rx) => {
      if (rxTypeTab && rx.rxType !== rxTypeTab) return false;
      if (appliedFilters.status && rx.status !== appliedFilters.status) return false;
      if (appliedFilters.riskLevel && rx.riskLevel !== appliedFilters.riskLevel) return false;
      if (kw && ![rx.rxNo, rx.patientName, rx.doctorName, rx.departmentName].some(
        (v) => String(v || '').toLowerCase().includes(kw)
      )) return false;
      return true;
    });
  }, [prescriptions, appliedFilters, rxTypeTab]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const stats = useMemo(() => {
    if (!prescriptions) return { total: 0, pending: 0, approved: 0, dispensed: 0, highRisk: 0 };
    return {
      total:     prescriptions.length,
      pending:   prescriptions.filter((rx) => rx.status === 'PENDING').length,
      approved:  prescriptions.filter((rx) => rx.status === 'APPROVED').length,
      dispensed: prescriptions.filter((rx) => rx.status === 'DISPENSED').length,
      highRisk:  prescriptions.filter((rx) => rx.riskLevel === 'HIGH').length,
    };
  }, [prescriptions]);

  const applyFilters = useCallback(() => { setAppliedFilters({ ...filters }); setPage(1); }, [filters]);
  const resetFilters = useCallback(() => {
    const empty = { status: '', riskLevel: '', keyword: '' };
    setFilters(empty); setAppliedFilters(empty); setPage(1);
  }, []);

  if (loading || !prescriptions) {
    return <div className="rounded-2xl border border-white bg-white p-10 text-slate-700 shadow-sm">正在加载处方数据...</div>;
  }
  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-rose-700">处方数据加载失败：{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: '待审核',  value: formatNumber(stats.pending),   sub: '需尽快处理',   accent: 'from-amber-500 to-orange-500',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></svg> },
          { label: '待发药',  value: formatNumber(stats.approved),  sub: '已通过审核',   accent: 'from-sky-500 to-cyan-500',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> },
          { label: '今日已发药', value: formatNumber(stats.dispensed), sub: '已完成发药', accent: 'from-emerald-500 to-teal-500',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: '高风险处方', value: formatNumber(stats.highRisk), sub: '需重点关注',  accent: 'from-rose-500 to-red-500',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
        ].map((item) => (
          <article key={item.label}
            className="relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                <strong className="mt-3 block text-[22px] font-bold text-slate-900">{item.value}</strong>
                <p className="mt-1.5 text-sm text-slate-500">{item.sub}</p>
              </div>
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-lg`}>{item.icon}</div>
            </div>
            <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r ${item.accent} opacity-60`} />
          </article>
        ))}
      </section>

      {/* 工作台主区 */}
      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        {/* 处方类型 Tab */}
        <div className="mb-4 flex gap-1 border-b border-slate-100 pb-0">
          {[
            { key: '',           label: `全部（${prescriptions.length}）` },
            { key: 'OUTPATIENT', label: `门诊（${prescriptions.filter(r => r.rxType === 'OUTPATIENT').length}）` },
            { key: 'INPATIENT',  label: `住院（${prescriptions.filter(r => r.rxType === 'INPATIENT').length}）` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setRxTypeTab(tab.key); setPage(1); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                rxTypeTab === tab.key
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 筛选栏 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pt-2">
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
              <option value="APPROVED">待发药</option>
              <option value="DISPENSED">已发药</option>
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
          <Table
            columns={[
              { title: '处方号', dataIndex: 'rxNo', key: 'rxNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
              { title: '类型', dataIndex: 'rxType', key: 'rxType', render: (v) => badge(RX_TYPE_MAP, v) },
              { title: '患者', dataIndex: 'patientName', key: 'patientName', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
              {
                title: '过敏史', dataIndex: 'allergyNotes', key: 'allergyNotes',
                render: (v) => v
                  ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600 border border-rose-200">
                      <span>⚠</span> 有过敏史
                    </span>
                  : <span className="text-xs text-slate-400">--</span>,
              },
              { title: '医生', dataIndex: 'doctorName', key: 'doctorName' },
              { title: '科室', dataIndex: 'departmentName', key: 'departmentName', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
              { title: '药品数', dataIndex: 'itemCount', key: 'itemCount', align: 'center' },
              { title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', render: (v) => badge(RISK_MAP, v) },
              { title: '状态', dataIndex: 'status', key: 'status', render: (v) => badge(STATUS_MAP, v) },
              { title: '开方时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
              {
                title: '操作', key: 'actions',
                render: (_, rx) => (
                  <button
                    type="button"
                    onClick={() => setReviewId(rx.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      rx.status === 'PENDING'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : rx.status === 'APPROVED'
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {rx.status === 'PENDING' ? '审方' : rx.status === 'APPROVED' ? '发药' : '查看'}
                  </button>
                ),
              },
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
            locale={{ emptyText: '暂无处方数据' }}
          />
          <Pager
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </section>

      {/* 审方/发药 Modal */}
      {reviewId !== null && (
        <ReviewModal
          prescriptionId={reviewId}
          onClose={() => setReviewId(null)}
          onDone={() => { setReviewId(null); setRefreshKey((v) => v + 1); }}
        />
      )}
    </div>
  );
}
