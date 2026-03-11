import { useMemo, useState } from 'react';
import { Modal, Button, Table, Space } from 'antd';
import { createDrug, deleteDrug, fetchDrugs, updateDrug } from '../api/pharmacy';
import Pager from '../components/Pager';
import PermGuard from '../components/PermGuard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatNumber } from '../utils/formatters';

const DRUG_TYPE_MAP = {
  RX:  { label: '处方药', color: 'bg-rose-100 text-rose-700' },
  OTC: { label: '非处方', color: 'bg-emerald-100 text-emerald-700' },
  TCM: { label: '中药', color: 'bg-amber-100 text-amber-700' },
};

function TypeBadge({ type }) {
  const cfg = DRUG_TYPE_MAP[type] || { label: type || '--', color: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

const EMPTY_FORM = {
  drugCode: '', name: '', genericName: '', spec: '', dosageForm: '',
  category: '', drugType: 'RX', manufacturer: '', approvalNumber: '',
  insuranceCode: '', storageCondition: '', lowStockThreshold: '100',
  nearExpiryDays: '30', isHighAlert: false,
  usageDosage: '', indications: '', contraindications: '',
};

// ── Field 必须定义在组件外部，避免每次渲染重新创建导致输入框失焦 ─────────────
function FormField({ label, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300';
const SELECT_CLS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';
const TEXTAREA_CLS = 'w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300';

// ── 新建 / 编辑药品 Modal ─────────────────────────────────────────────────────
function DrugFormModal({ drug, onClose, onSuccess }) {
  const isEdit = !!drug;
  const [form, setForm] = useState(() => drug ? {
    drugCode: drug.drugCode || '',
    name: drug.name || '',
    genericName: drug.genericName || '',
    spec: drug.spec || '',
    dosageForm: drug.dosageForm || '',
    category: drug.category || '',
    drugType: drug.drugType || 'RX',
    manufacturer: drug.manufacturer || '',
    approvalNumber: drug.approvalNumber || '',
    insuranceCode: drug.insuranceCode || '',
    storageCondition: drug.storageCondition || '',
    lowStockThreshold: String(drug.lowStockThreshold || '100'),
    nearExpiryDays: String(drug.nearExpiryDays || '30'),
    isHighAlert: !!drug.isHighAlert,
    usageDosage: drug.usageDosage || '',
    indications: drug.indications || '',
    contraindications: drug.contraindications || '',
  } : { ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function f(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  async function handleSubmit() {
    if (!form.drugCode.trim() || !form.name.trim()) { setError('药品编码和药品名称为必填项'); return; }
    if (!form.spec.trim() || !form.dosageForm.trim() || !form.category.trim()) {
      setError('规格、剂型、分类为必填项'); return;
    }
    setError('');
    setSubmitting(true);
    try {
      const body = { ...form, nearExpiryDays: Number(form.nearExpiryDays) };
      if (isEdit) { await updateDrug(drug.id, body); } else { await createDrug(body); }
      onSuccess();
    } catch (e) {
      const msg = e?.response?.data?.message;
      setError((Array.isArray(msg) ? msg.join('；') : msg) || e.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onCancel={onClose}
      title={
        <div>
          <div className="text-base font-semibold text-slate-900">{isEdit ? '编辑药品档案' : '新增药品'}</div>
          <p className="mt-0.5 text-xs text-slate-400 font-normal">{isEdit ? `编辑 ${drug.name}` : '填写药品基本信息并保存至档案库'}</p>
        </div>
      }
      width={1024}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>
          {isEdit ? '保存修改' : '新增药品'}
        </Button>,
      ]}
    >
      <div className="py-2">
        {/* 基本信息 */}
        <div className="mb-2 flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-indigo-500" />
          <p className="text-xs font-semibold text-slate-600">基本信息</p>
        </div>
        <div className="mb-5 grid grid-cols-3 gap-x-4 gap-y-3">
          <FormField label="药品编码" required>
            <input value={form.drugCode} onChange={f('drugCode')} disabled={isEdit}
              placeholder="唯一编码" className={`${INPUT_CLS} disabled:bg-slate-50 disabled:opacity-60`} />
          </FormField>
          <FormField label="药品名称" required>
            <input value={form.name} onChange={f('name')} placeholder="通用名" className={INPUT_CLS} />
          </FormField>
          <FormField label="通用名/别名">
            <input value={form.genericName} onChange={f('genericName')} placeholder="可选" className={INPUT_CLS} />
          </FormField>
          <FormField label="规格" required>
            <input value={form.spec} onChange={f('spec')} placeholder="如 10mg×10片" className={INPUT_CLS} />
          </FormField>
          <FormField label="剂型" required>
            <input value={form.dosageForm} onChange={f('dosageForm')} placeholder="如 片剂、注射液" className={INPUT_CLS} />
          </FormField>
          <FormField label="分类" required>
            <input value={form.category} onChange={f('category')} placeholder="如 抗生素" className={INPUT_CLS} />
          </FormField>
          <FormField label="药品类型">
            <select value={form.drugType} onChange={f('drugType')} className={SELECT_CLS}>
              <option value="RX">处方药 (RX)</option>
              <option value="OTC">非处方药 (OTC)</option>
              <option value="TCM">中药</option>
            </select>
          </FormField>
          <FormField label="生产厂家">
            <input value={form.manufacturer} onChange={f('manufacturer')} className={INPUT_CLS} />
          </FormField>
          <FormField label="批准文号">
            <input value={form.approvalNumber} onChange={f('approvalNumber')} className={INPUT_CLS} />
          </FormField>
        </div>

        {/* 管理设置 */}
        <div className="mb-2 flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-amber-500" />
          <p className="text-xs font-semibold text-slate-600">管理设置</p>
        </div>
        <div className="mb-5 grid grid-cols-3 gap-x-4 gap-y-3">
          <FormField label="医保编码">
            <input value={form.insuranceCode} onChange={f('insuranceCode')} className={INPUT_CLS} />
          </FormField>
          <FormField label="储存条件">
            <input value={form.storageCondition} onChange={f('storageCondition')} placeholder="如 阴凉干燥保存" className={INPUT_CLS} />
          </FormField>
          <FormField label="低库存预警阈值">
            <input type="number" value={form.lowStockThreshold} onChange={f('lowStockThreshold')} placeholder="100" className={INPUT_CLS} />
          </FormField>
          <FormField label="近效期提醒天数">
            <input type="number" value={form.nearExpiryDays} onChange={f('nearExpiryDays')} placeholder="30" className={INPUT_CLS} />
          </FormField>
          <div className="flex items-center gap-2.5 pt-6">
            <input type="checkbox" id="isHighAlert" checked={form.isHighAlert} onChange={f('isHighAlert')}
              className="h-4 w-4 cursor-pointer accent-rose-500" />
            <label htmlFor="isHighAlert" className="cursor-pointer text-sm text-slate-700">高警示药品</label>
          </div>
        </div>

        {/* 临床信息 */}
        <div className="mb-2 flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-emerald-500" />
          <p className="text-xs font-semibold text-slate-600">临床信息（可选）</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <FormField label="用法用量">
            <textarea value={form.usageDosage} onChange={f('usageDosage')} rows={2}
              placeholder="用法用量说明" className={TEXTAREA_CLS} />
          </FormField>
          <FormField label="适应症">
            <textarea value={form.indications} onChange={f('indications')} rows={2}
              placeholder="适应症说明" className={TEXTAREA_CLS} />
          </FormField>
          <FormField label="禁忌症">
            <textarea value={form.contraindications} onChange={f('contraindications')} rows={2}
              placeholder="禁忌症说明" className={TEXTAREA_CLS} />
          </FormField>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── 删除确认 Modal ────────────────────────────────────────────────────────────
function DeleteDrugModal({ drug, onClose, onSuccess }) {
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteDrug(drug.id);
      toast.success('药品已删除');
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      onCancel={onClose}
      title="确认删除药品"
      width={480}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" danger onClick={handleDelete} loading={deleting}>确认删除</Button>,
      ]}
    >
      <div className="py-2">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none" className="text-rose-500">
            <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75Zm-7.5 4.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.25-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z" fill="currentColor"/>
          </svg>
        </div>
        <p className="text-sm text-slate-500">
          即将删除药品 <span className="font-medium text-slate-700">{drug.name}</span>（编码：{drug.drugCode}）。
          若该药品已有库存批次或历史记录，建议先清理数据再删除。此操作不可撤销。
        </p>
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function DrugMasterPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formDrug, setFormDrug] = useState(null); // null = closed, false = create new, object = edit
  const [deleteDrugTarget, setDeleteDrugTarget] = useState(null);
  const toast = useToast();

  const { data: drugs, loading } = useAsyncData(fetchDrugs, [refreshKey]);

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  const stats = useMemo(() => {
    if (!drugs) return { total: 0, rx: 0, otc: 0, highAlert: 0 };
    const list = Array.isArray(drugs) ? drugs : (drugs.list || drugs.items || []);
    return {
      total: list.length,
      rx: list.filter((d) => d.drugType === 'RX').length,
      otc: list.filter((d) => d.drugType === 'OTC').length,
      highAlert: list.filter((d) => d.isHighAlert).length,
    };
  }, [drugs]);

  const drugList = useMemo(() => {
    if (!drugs) return [];
    return Array.isArray(drugs) ? drugs : (drugs.list || drugs.items || []);
  }, [drugs]);

  const filtered = useMemo(() => {
    let list = typeFilter ? drugList.filter((d) => d.drugType === typeFilter) : drugList;
    const kw = appliedKeyword.trim().toLowerCase();
    if (kw) list = list.filter((d) =>
      [d.name, d.genericName, d.drugCode, d.spec, d.manufacturer, d.category].some(
        (v) => String(v || '').toLowerCase().includes(kw)
      )
    );
    return list;
  }, [drugList, typeFilter, appliedKeyword]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: '药品总数', value: formatNumber(stats.total), sub: '全部在册', cls: 'text-slate-800' },
          { label: '处方药(RX)', value: formatNumber(stats.rx), sub: '需处方购买', cls: 'text-rose-700' },
          { label: '非处方药(OTC)', value: formatNumber(stats.otc), sub: '自行购买', cls: 'text-emerald-700' },
          { label: '高警示药品', value: formatNumber(stats.highAlert), sub: '特殊管理', cls: 'text-amber-700' },
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
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="">全部类型</option>
            <option value="RX">处方药</option>
            <option value="OTC">非处方药</option>
            <option value="TCM">中药</option>
          </select>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="药品名称 / 编码 / 厂家..."
            className="w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setTypeFilter(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>
          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <button onClick={() => setFormDrug(false)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新增药品</button>
          </div>
        </div>

        <Table
          columns={[
            { title: '药品编码', dataIndex: 'drugCode', key: 'drugCode', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
            { title: '药品名称', dataIndex: 'name', key: 'name', render: (_, drug) => (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{drug.name}</span>
                  {drug.isHighAlert && (
                    <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">高警示</span>
                  )}
                </div>
                {drug.genericName && <p className="text-xs text-slate-400">{drug.genericName}</p>}
              </div>
            )},
            { title: '规格', dataIndex: 'spec', key: 'spec' },
            { title: '剂型', dataIndex: 'dosageForm', key: 'dosageForm' },
            { title: '分类', dataIndex: 'category', key: 'category' },
            { title: '类型', dataIndex: 'drugType', key: 'drugType', render: (v) => <TypeBadge type={v} /> },
            { title: '厂家', dataIndex: 'manufacturer', key: 'manufacturer', render: (v) => <span className="text-xs">{v || '--'}</span> },
            { title: '预警阈值', dataIndex: 'lowStockThreshold', key: 'lowStockThreshold', render: (v) => formatNumber(v) },
            { title: '操作', key: 'actions', render: (_, drug) => (
              <Space>
                <button onClick={() => setFormDrug(drug)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                  编辑
                </button>
                <PermGuard perm="drug.delete">
                  <button onClick={() => setDeleteDrugTarget(drug)}
                    className="rounded-lg border border-rose-100 bg-white px-3 py-1 text-xs text-rose-500 transition hover:bg-rose-50">
                    删除
                  </button>
                </PermGuard>
              </Space>
            )},
          ]}
          dataSource={pagedRows}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无药品数据' }}
        />

        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </section>

      {/* 新建/编辑 Modal */}
      {formDrug !== null && (
        <DrugFormModal
          drug={formDrug || null}
          onClose={() => setFormDrug(null)}
          onSuccess={() => {
            setFormDrug(null);
            refresh();
            toast.success(formDrug ? '药品信息已更新' : '药品已新增');
          }}
        />
      )}
      {/* 删除确认 Modal */}
      {deleteDrugTarget && (
        <DeleteDrugModal
          drug={deleteDrugTarget}
          onClose={() => setDeleteDrugTarget(null)}
          onSuccess={() => { setDeleteDrugTarget(null); refresh(); }}
        />
      )}
    </div>
  );
}
