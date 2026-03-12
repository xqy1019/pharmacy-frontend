import { useMemo, useState } from 'react';
import { Button, Modal, Space, Table } from 'antd';
import Pager from '../components/Pager';
import { useToast } from '../context/ToastContext';
import { formatNumber } from '../utils/formatters';

// ── Mock 数据 ─────────────────────────────────────────────────────────────────
const MOCK_ADR = [
  { id: 1, reportNo: 'ADR-2026031101', patient: '王某某', age: 65, gender: 'M', drugName: '阿莫西林胶囊', batchNo: 'B20260101', reaction: '皮疹、荨麻疹', severity: 'GENERAL', occurDate: '2026-03-10', pharmacist: '李药师', status: 'REPORTED', remark: '停药后恢复' },
  { id: 2, reportNo: 'ADR-2026031102', patient: '张某', age: 45, gender: 'F', drugName: '盐酸利多卡因注射液', batchNo: 'B20260201', reaction: '心律失常、血压下降', severity: 'SERIOUS', occurDate: '2026-03-09', pharmacist: '张药师', status: 'PENDING', remark: '已转ICU处置' },
  { id: 3, reportNo: 'ADR-2026031103', patient: '李某某', age: 72, gender: 'M', drugName: '氯化钾注射液', batchNo: 'B20260103', reaction: '局部疼痛、静脉炎', severity: 'GENERAL', occurDate: '2026-03-08', pharmacist: '王药师', status: 'DRAFT', remark: '' },
];

const SEVERITY_MAP = {
  GENERAL: { label: '一般', color: 'bg-amber-100 text-amber-700' },
  SERIOUS: { label: '严重', color: 'bg-rose-100 text-rose-700' },
  DEATH:   { label: '死亡', color: 'bg-slate-900 text-white' },
};

const STATUS_MAP = {
  DRAFT:    { label: '草稿', color: 'bg-slate-100 text-slate-600' },
  PENDING:  { label: '待审核', color: 'bg-amber-100 text-amber-700' },
  REPORTED: { label: '已上报', color: 'bg-emerald-100 text-emerald-700' },
};

const GENDER_MAP = { M: '男', F: '女' };

function Badge({ value, map }) {
  const cfg = map[value] || { label: value, color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

// ── 新建 ADR 报告 Modal ───────────────────────────────────────────────────────
function CreateADRModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    patient: '', age: '', gender: 'M',
    drugName: '', batchNo: '',
    reactionType: '', reactionDetail: '',
    severity: 'GENERAL', prescriptionNo: '',
    occurDate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!form.patient.trim()) { setError('请填写患者姓名'); return; }
    if (!form.drugName.trim()) { setError('请填写怀疑药品名称'); return; }
    if (!form.reactionType.trim()) { setError('请填写不良反应名称/类型'); return; }
    if (!form.reactionDetail.trim()) { setError('请填写不良反应经过'); return; }
    setError('');
    onSuccess({
      ...form,
      age: Number(form.age) || 0,
    });
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

  return (
    <Modal open onCancel={onClose} title="新建ADR报告" width={720} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit}>保存草稿</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
          请如实填写药品不良反应信息，保存后可在草稿中继续编辑或直接提交上报。
        </div>

        {/* 患者信息 */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">患者信息</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">患者姓名 *</label>
            <input value={form.patient} onChange={set('patient')} placeholder="患者姓名" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">年龄</label>
            <input type="number" value={form.age} onChange={set('age')} placeholder="年龄" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">性别</label>
            <select value={form.gender} onChange={set('gender')} className={inputCls}>
              <option value="M">男</option>
              <option value="F">女</option>
            </select>
          </div>
        </div>

        {/* 药品信息 */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">怀疑药品</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">药品名称 *</label>
            <input value={form.drugName} onChange={set('drugName')} placeholder="怀疑药品名称" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">批号</label>
            <input value={form.batchNo} onChange={set('batchNo')} placeholder="药品批号" className={inputCls} />
          </div>
        </div>

        {/* 不良反应信息 */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">不良反应信息</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">不良反应名称/类型 *</label>
            <input value={form.reactionType} onChange={set('reactionType')} placeholder="如：皮疹、过敏性休克" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">严重程度</label>
            <select value={form.severity} onChange={set('severity')} className={inputCls}>
              <option value="GENERAL">一般</option>
              <option value="SERIOUS">严重</option>
              <option value="DEATH">死亡</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">不良反应经过 *</label>
          <textarea value={form.reactionDetail} onChange={set('reactionDetail')} rows={3}
            placeholder="详细描述不良反应发生的时间、症状、处置过程等"
            className={`${inputCls} resize-none`} />
        </div>

        {/* 其他 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">关联处方号</label>
            <input value={form.prescriptionNo} onChange={set('prescriptionNo')} placeholder="可选" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">发生日期</label>
            <input type="date" value={form.occurDate} onChange={set('occurDate')} className={inputCls} />
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 详情查看 Modal ────────────────────────────────────────────────────────────
function DetailModal({ report, onClose }) {
  const row = (label, value) => (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value || '--'}</span>
    </div>
  );

  return (
    <Modal open onCancel={onClose} title="ADR报告详情" width={640} destroyOnClose
      footer={[<Button key="close" onClick={onClose}>关闭</Button>]}>
      <div className="space-y-4 py-2">
        <div className="rounded-xl bg-slate-50 p-4 space-y-1 divide-y divide-slate-100">
          {row('报告编号', report.reportNo)}
          {row('患者', `${report.patient}（${GENDER_MAP[report.gender] || report.gender}，${report.age}岁）`)}
          {row('怀疑药品', report.drugName)}
          {row('批号', report.batchNo)}
          {row('不良反应', report.reaction)}
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-500">严重程度</span>
            <Badge value={report.severity} map={SEVERITY_MAP} />
          </div>
          {row('发生日期', report.occurDate)}
          {row('上报药师', report.pharmacist)}
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-500">状态</span>
            <Badge value={report.status} map={STATUS_MAP} />
          </div>
        </div>

        {/* 处置情况 */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">处置情况</p>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {report.remark || '暂无处置记录'}
          </div>
        </div>

        {/* 后续跟踪 */}
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">后续跟踪记录</p>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400 italic">
            暂无跟踪记录
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function ADRPage() {
  const [reports, setReports] = useState(MOCK_ADR);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [detailReport, setDetailReport] = useState(null);
  const toast = useToast();

  const stats = useMemo(() => {
    const total = reports.length;
    const serious = reports.filter((r) => r.severity === 'SERIOUS' || r.severity === 'DEATH').length;
    const thisMonth = reports.filter((r) => r.occurDate?.startsWith('2026-03')).length;
    const draft = reports.filter((r) => r.status === 'DRAFT').length;
    return { total, serious, thisMonth, draft };
  }, [reports]);

  const filtered = useMemo(() => {
    let list = reports;
    if (severityFilter) list = list.filter((r) => r.severity === severityFilter);
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [reports, severityFilter, statusFilter]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function handleCreate(formData) {
    const newReport = {
      id: Date.now(),
      reportNo: `ADR-${Date.now()}`,
      patient: formData.patient,
      age: formData.age,
      gender: formData.gender,
      drugName: formData.drugName,
      batchNo: formData.batchNo,
      reaction: formData.reactionType,
      severity: formData.severity,
      occurDate: formData.occurDate,
      pharmacist: '当前药师',
      status: 'DRAFT',
      remark: formData.reactionDetail,
    };
    setReports((prev) => [newReport, ...prev]);
    setShowCreate(false);
    toast.success('ADR报告已保存为草稿');
  }

  function handleSubmit(report) {
    setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: 'PENDING' } : r));
    toast.success('报告已提交待审核');
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: '上报总数', value: formatNumber(stats.total), sub: '全部ADR报告', cls: 'text-slate-800' },
          { label: '严重不良反应', value: formatNumber(stats.serious), sub: '严重+死亡', cls: 'text-rose-700' },
          { label: '本月新增', value: formatNumber(stats.thisMonth), sub: '本月报告数', cls: 'text-slate-800' },
          { label: '待上报', value: formatNumber(stats.draft), sub: '草稿状态', cls: 'text-amber-700' },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
            <p className="text-sm text-slate-500">{item.label}</p>
            <strong className={`mt-3 block text-2xl ${item.cls}`}>{item.value}</strong>
            <p className="mt-1 text-xs text-slate-400">{item.sub}</p>
          </article>
        ))}
      </section>

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部严重程度</option>
            <option value="GENERAL">一般</option>
            <option value="SERIOUS">严重</option>
            <option value="DEATH">死亡</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="PENDING">待审核</option>
            <option value="REPORTED">已上报</option>
          </select>
          <button onClick={() => { setSeverityFilter(''); setStatusFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>
          <div className="ml-auto">
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white transition hover:bg-indigo-700">+ 新建ADR报告</button>
          </div>
        </div>

        <Table
          columns={[
            { title: '报告编号', dataIndex: 'reportNo', key: 'reportNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
            { title: '患者', dataIndex: 'patient', key: 'patient', render: (v) => <span className="font-medium">{v}</span> },
            { title: '药品名称', dataIndex: 'drugName', key: 'drugName' },
            { title: '批号', dataIndex: 'batchNo', key: 'batchNo', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
            { title: '不良反应描述', dataIndex: 'reaction', key: 'reaction', ellipsis: true, width: 160 },
            { title: '严重程度', dataIndex: 'severity', key: 'severity', render: (v) => <Badge value={v} map={SEVERITY_MAP} /> },
            { title: '发生日期', dataIndex: 'occurDate', key: 'occurDate', render: (v) => <span className="text-xs text-slate-400">{v}</span> },
            { title: '上报药师', dataIndex: 'pharmacist', key: 'pharmacist', render: (v) => <span className="text-sm text-slate-500">{v}</span> },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Badge value={v} map={STATUS_MAP} /> },
            {
              title: '操作', key: 'actions',
              render: (_, r) => (
                <Space>
                  <button onClick={() => setDetailReport(r)}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-200">详情</button>
                  {r.status === 'DRAFT' && (
                    <button onClick={() => handleSubmit(r)}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white transition hover:bg-indigo-700">提交上报</button>
                  )}
                </Space>
              ),
            },
          ]}
          dataSource={pagedRows}
          rowKey="id"
          size="middle"
          pagination={false}
          locale={{ emptyText: '暂无ADR报告' }}
        />

        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </section>

      {/* Modals */}
      {showCreate && (
        <CreateADRModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreate}
        />
      )}
      {detailReport && (
        <DetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
        />
      )}
    </div>
  );
}
