import { useMemo, useState } from 'react';
import { createDrug, fetchDrugs, updateDrug } from '../api/pharmacy';
import Modal from '../components/Modal';
import Pager from '../components/Pager';
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
      const body = {
        ...form,
        lowStockThreshold: form.lowStockThreshold,
        nearExpiryDays: Number(form.nearExpiryDays),
      };
      if (isEdit) {
        await updateDrug(drug.id, body);
      } else {
        await createDrug(body);
      }
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || (Array.isArray(e?.response?.data?.message) ? e.response.data.message.join('；') : null) || e.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  const Field = ({ label, children, required }) => (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}{required && ' *'}</label>
      {children}
    </div>
  );

  const input = (field, { type = 'text', placeholder = '', ...rest } = {}) => (
    <input type={type} value={form[field]} onChange={f(field)} placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
      {...rest} />
  );

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">{isEdit ? '编辑药品档案' : '新增药品'}</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* 基本信息 */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">基本信息</p>
        <div className="mb-5 grid grid-cols-3 gap-4">
          <Field label="药品编码" required><input value={form.drugCode} onChange={f('drugCode')} disabled={isEdit}
            placeholder="唯一编码"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300 disabled:opacity-60" /></Field>
          <Field label="药品名称" required>{input('name', { placeholder: '通用名' })}</Field>
          <Field label="通用名/别名">{input('genericName', { placeholder: '可选' })}</Field>
          <Field label="规格" required>{input('spec', { placeholder: '如 10mg×10片' })}</Field>
          <Field label="剂型" required>{input('dosageForm', { placeholder: '如 片剂、注射液' })}</Field>
          <Field label="分类" required>{input('category', { placeholder: '如 抗生素' })}</Field>
          <Field label="药品类型">
            <select value={form.drugType} onChange={f('drugType')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300">
              <option value="RX">处方药(RX)</option>
              <option value="OTC">非处方药(OTC)</option>
              <option value="TCM">中药</option>
            </select>
          </Field>
          <Field label="生产厂家">{input('manufacturer')}</Field>
          <Field label="批准文号">{input('approvalNumber')}</Field>
        </div>

        {/* 管理设置 */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">管理设置</p>
        <div className="mb-5 grid grid-cols-3 gap-4">
          <Field label="医保编码">{input('insuranceCode')}</Field>
          <Field label="储存条件">{input('storageCondition', { placeholder: '如 阴凉干燥保存' })}</Field>
          <Field label="低库存预警阈值">{input('lowStockThreshold', { type: 'number', placeholder: '100' })}</Field>
          <Field label="近效期提醒天数">{input('nearExpiryDays', { type: 'number', placeholder: '30' })}</Field>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="isHighAlert" checked={form.isHighAlert} onChange={f('isHighAlert')}
              className="h-4 w-4 cursor-pointer accent-rose-500" />
            <label htmlFor="isHighAlert" className="cursor-pointer text-sm text-slate-700">高警示药品</label>
          </div>
        </div>

        {/* 临床信息 */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">临床信息（可选）</p>
        <div className="grid grid-cols-1 gap-4">
          <Field label="用法用量">
            <textarea value={form.usageDosage} onChange={f('usageDosage')} rows={2}
              placeholder="用法用量说明"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </Field>
          <Field label="适应症">
            <textarea value={form.indications} onChange={f('indications')} rows={2}
              placeholder="适应症说明"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </Field>
          <Field label="禁忌症">
            <textarea value={form.contraindications} onChange={f('contraindications')} rows={2}
              placeholder="禁忌症说明"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className="rounded-xl bg-cyan-600 px-5 py-2 text-sm text-white transition hover:bg-cyan-700 disabled:opacity-50">
          {submitting ? '保存中...' : (isEdit ? '保存修改' : '新增药品')}
        </button>
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
          <article key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <strong className={`mt-3 block text-2xl ${item.cls}`}>{item.value}</strong>
            <p className="mt-1 text-xs text-slate-400">{item.sub}</p>
          </article>
        ))}
      </section>

      {/* 主工作区 */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
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

        {loading ? (
          <div className="py-16 text-center text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium pl-6">药品编码</th>
                  <th className="px-5 py-3 font-medium">药品名称</th>
                  <th className="px-5 py-3 font-medium">规格</th>
                  <th className="px-5 py-3 font-medium">剂型</th>
                  <th className="px-5 py-3 font-medium">分类</th>
                  <th className="px-5 py-3 font-medium">类型</th>
                  <th className="px-5 py-3 font-medium">厂家</th>
                  <th className="px-5 py-3 font-medium">预警阈值</th>
                  <th className="px-5 py-3 font-medium pr-6">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((drug) => (
                  <tr key={drug.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-5 py-3 pl-6 font-mono text-xs text-slate-500">{drug.drugCode}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{drug.name}</span>
                        {drug.isHighAlert && (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">高警示</span>
                        )}
                      </div>
                      {drug.genericName && <p className="text-xs text-slate-400">{drug.genericName}</p>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{drug.spec}</td>
                    <td className="px-5 py-3 text-slate-500">{drug.dosageForm}</td>
                    <td className="px-5 py-3 text-slate-500">{drug.category}</td>
                    <td className="px-5 py-3"><TypeBadge type={drug.drugType} /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{drug.manufacturer || '--'}</td>
                    <td className="px-5 py-3 text-slate-500">{formatNumber(drug.lowStockThreshold)}</td>
                    <td className="px-5 py-3 pr-6">
                      <button onClick={() => setFormDrug(drug)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50">
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr className="border-t border-slate-100">
                    <td colSpan={9} className="px-5 py-10 text-center text-slate-500">暂无药品数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}
