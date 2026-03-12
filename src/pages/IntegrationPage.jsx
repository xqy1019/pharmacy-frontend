import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal } from 'antd';
import Pager from '../components/Pager';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/formatters';
import {
  fetchHisConfig,
  saveHisConfig,
  fetchHisDrugMappings,
  createHisDrugMapping,
  updateHisDrugMapping,
  deleteHisDrugMapping,
  fetchHisIntegrationLogs,
} from '../api/pharmacy';

// ── Mock 数据 ────────────────────────────────────────────────────────────────
const MOCK_CONFIG = {
  platformLabel: '未配置',
  pushToken: 'sk-pharmacy-2026',
  hisBaseUrl: '',
  isEnabled: false,
  autoCreateRx: true,
  notifyOnReceive: true,
  remark: '',
};

const MOCK_MAPPINGS = [
  { id: 1, hisDrugCode: 'HIS001', hisDrugName: '阿莫西林胶囊', hisSpec: '0.5g', sysDrugCode: 'DR001', sysDrugName: '阿莫西林胶囊', hisPlatform: 'DEFAULT', isActive: true },
  { id: 2, hisDrugCode: 'HIS002', hisDrugName: '布洛芬片', hisSpec: '0.2g', sysDrugCode: 'DR002', sysDrugName: '布洛芬缓释胶囊', hisPlatform: 'DEFAULT', isActive: true },
  { id: 3, hisDrugCode: 'HIS003', hisDrugName: '盐酸利多卡因注射液', hisSpec: '5ml:0.1g', sysDrugCode: 'DR003', sysDrugName: '盐酸利多卡因注射液', hisPlatform: 'DEFAULT', isActive: false },
];

const MOCK_LOGS = [
  { id: 1, logNo: 'LOG202603110001', hisPlatform: 'DEFAULT', direction: 'INBOUND', bizType: 'RX_INBOUND', hisRxNo: 'HIS-RX-20260311001', sysRxNo: 'RX1741622400001', patientName: '王某某', itemCount: 3, mappedCount: 3, unmappedCount: 0, status: 'SUCCESS', createdAt: '2026-03-11T08:30:00Z' },
  { id: 2, logNo: 'LOG202603110002', hisPlatform: 'DEFAULT', direction: 'INBOUND', bizType: 'RX_INBOUND', hisRxNo: 'HIS-RX-20260311002', sysRxNo: 'RX1741622500001', patientName: '张某', itemCount: 2, mappedCount: 1, unmappedCount: 1, status: 'PARTIAL', createdAt: '2026-03-11T09:15:00Z' },
  { id: 3, logNo: 'LOG202603110003', hisPlatform: 'DEFAULT', direction: 'INBOUND', bizType: 'RX_INBOUND', hisRxNo: 'HIS-RX-20260311003', sysRxNo: null, patientName: '李某某', itemCount: 1, mappedCount: 0, unmappedCount: 1, status: 'FAILED', errorMessage: 'Token验证失败', createdAt: '2026-03-11T10:00:00Z' },
];

const TABS = [
  { key: 'config', label: 'HIS 对接配置' },
  { key: 'mapping', label: '药品编码映射' },
  { key: 'logs', label: '集成日志' },
];

const STATUS_BADGE = {
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-rose-100 text-rose-700',
};

const BIZ_LABEL = { RX_INBOUND: '处方接收', RX_OUTBOUND: '处方推送' };
const DIR_LABEL = { INBOUND: '入站', OUTBOUND: '出站' };

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function generateToken(len = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab1: HIS 对接配置
// ═══════════════════════════════════════════════════════════════════════════════
function HisConfigTab() {
  const toast = useToast();
  const [config, setConfig] = useState(MOCK_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchHisConfig()
      .then((res) => { setConfig(res.data || res); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  }, []);

  function update(field, value) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveHisConfig(config);
      toast.success('配置已保存');
    } catch (e) {
      toast.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
      () => toast.success('已复制到剪贴板'),
      () => toast.error('复制失败'),
    );
  }

  const pushUrl = `${window.location.origin}/api/v1/his/push-prescription`;

  const stats = [
    { label: '已接收处方数', value: '128' },
    { label: '今日推送次数', value: '12' },
    { label: '映射覆盖率', value: '94.5%' },
    { label: '最近推送时间', value: '2026-03-11 10:00' },
  ];

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

  return (
    <div className="space-y-6">
      {/* 提示条 */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        将下方"推送接口地址"和"安全Token"提供给HIS厂商，HIS在医生开方后调用此接口将处方推送到药房系统。
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 配置表单 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        {/* 对接状态 */}
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={config.isEnabled} onChange={(e) => update('isEnabled', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="font-medium">启用HIS处方推送接收</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {config.isEnabled ? '已启用' : '未启用'}
          </span>
        </label>

        {/* HIS平台名称 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">HIS平台名称</label>
          <input className={inputCls} value={config.platformLabel} onChange={(e) => update('platformLabel', e.target.value)}
            placeholder="例如：某医院HIS" />
        </div>

        {/* 安全Token */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">安全Token</label>
          <div className="flex gap-2">
            <input className={inputCls} value={config.pushToken} onChange={(e) => update('pushToken', e.target.value)} />
            <button type="button" onClick={() => update('pushToken', generateToken())}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50">
              重新生成
            </button>
          </div>
        </div>

        {/* 推送接口地址(只读) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">推送接口地址</label>
          <div className="flex gap-2">
            <input className={inputCls + ' bg-slate-50'} value={pushUrl} readOnly />
            <button type="button" onClick={() => copyToClipboard(pushUrl)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50">
              复制
            </button>
          </div>
        </div>

        {/* HIS回调地址 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">HIS系统回调地址（可选）</label>
          <input className={inputCls} value={config.hisBaseUrl} onChange={(e) => update('hisBaseUrl', e.target.value)}
            placeholder="例如：https://his.example.com/api/callback" />
        </div>

        {/* checkbox 行 */}
        <div className="flex gap-8">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={config.autoCreateRx} onChange={(e) => update('autoCreateRx', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            自动创建处方
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={config.notifyOnReceive} onChange={(e) => update('notifyOnReceive', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            接收时通知审方台
          </label>
        </div>

        {/* 备注 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">备注</label>
          <textarea className={inputCls + ' min-h-[72px] resize-y'} value={config.remark}
            onChange={(e) => update('remark', e.target.value)} placeholder="可记录对接说明、联系方式等" />
        </div>

        {/* 保存 */}
        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab2: 药品编码映射
// ═══════════════════════════════════════════════════════════════════════════════
const MAPPING_INIT = { hisDrugCode: '', hisDrugName: '', hisSpec: '', sysDrugCode: '', sysDrugName: '', hisPlatform: 'DEFAULT', remark: '' };

function MappingFormModal({ record, onClose, onSuccess }) {
  const isEdit = !!record?.id;
  const [form, setForm] = useState(isEdit ? { ...record } : { ...MAPPING_INIT });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function update(field, value) { setForm((prev) => ({ ...prev, [field]: value })); }

  async function handleSave() {
    if (!form.hisDrugCode || !form.hisDrugName || !form.sysDrugCode || !form.sysDrugName) {
      toast.error('请填写必填字段'); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateHisDrugMapping(record.id, form);
      } else {
        await createHisDrugMapping(form);
      }
      toast.success(isEdit ? '映射已更新' : '映射已创建');
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

  return (
    <Modal open onCancel={onClose} title={isEdit ? '编辑映射' : '新建映射'} width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={saving}>保存</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">HIS药品编码 *</label>
          <input className={inputCls} value={form.hisDrugCode} onChange={(e) => update('hisDrugCode', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">HIS药品名称 *</label>
          <input className={inputCls} value={form.hisDrugName} onChange={(e) => update('hisDrugName', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">HIS规格</label>
          <input className={inputCls} value={form.hisSpec} onChange={(e) => update('hisSpec', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">本系统药品编码 *</label>
          <input className={inputCls} value={form.sysDrugCode} onChange={(e) => update('sysDrugCode', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">本系统药品名称 *</label>
          <input className={inputCls} value={form.sysDrugName} onChange={(e) => update('sysDrugName', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">平台</label>
          <input className={inputCls} value={form.hisPlatform} onChange={(e) => update('hisPlatform', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">备注</label>
          <textarea className={inputCls + ' min-h-[60px] resize-y'} value={form.remark || ''}
            onChange={(e) => update('remark', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function DrugMappingTab() {
  const toast = useToast();
  const [keyword, setKeyword] = useState('');
  const [mappings, setMappings] = useState(MOCK_MAPPINGS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editRecord, setEditRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadMappings = useCallback(() => {
    fetchHisDrugMappings({ keyword, page, pageSize })
      .then((res) => { const d = res.data || res; setMappings(d.items || d.rows || d); })
      .catch(() => { /* fallback to mock */ });
  }, [keyword, page, pageSize]);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  function handleEdit(record) { setEditRecord(record); setShowForm(true); }
  function handleCreate() { setEditRecord(null); setShowForm(true); }
  function handleFormSuccess() { setShowForm(false); setEditRecord(null); loadMappings(); }

  async function handleDelete(record) {
    try {
      await deleteHisDrugMapping(record.id);
      toast.success('映射已删除');
      loadMappings();
    } catch (e) {
      toast.error(e?.response?.data?.message || '删除失败');
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

  const filtered = useMemo(() => {
    if (!keyword) return mappings;
    const kw = keyword.toLowerCase();
    return mappings.filter((m) =>
      m.hisDrugCode?.toLowerCase().includes(kw) ||
      m.hisDrugName?.toLowerCase().includes(kw) ||
      m.sysDrugCode?.toLowerCase().includes(kw) ||
      m.sysDrugName?.toLowerCase().includes(kw)
    );
  }, [mappings, keyword]);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <input className={inputCls + ' max-w-xs'} placeholder="搜索编码/名称..."
          value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <div className="flex-1" />
        <button type="button" onClick={handleCreate}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
          新建映射
        </button>
        <button type="button" onClick={() => toast.info('请先下载Excel模板，填写HIS编码与本系统编码映射关系后上传')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50">
          批量导入
        </button>
      </div>

      {/* 表格 */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">HIS药品编码</th>
              <th className="px-4 py-3">HIS药品名称</th>
              <th className="px-4 py-3">HIS规格</th>
              <th className="px-4 py-3">本系统编码</th>
              <th className="px-4 py-3">本系统名称</th>
              <th className="px-4 py-3">平台</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-xs">{m.hisDrugCode}</td>
                <td className="px-4 py-3">{m.hisDrugName}</td>
                <td className="px-4 py-3 text-slate-500">{m.hisSpec || '-'}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.sysDrugCode}</td>
                <td className="px-4 py-3">{m.sysDrugName}</td>
                <td className="px-4 py-3 text-slate-500">{m.hisPlatform}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.isActive ? '启用' : '停用'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleEdit(m)} className="text-indigo-600 hover:text-indigo-800 text-xs">编辑</button>
                    <button type="button" onClick={() => handleDelete(m)} className="text-rose-500 hover:text-rose-700 text-xs">删除</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">暂无映射数据</td></tr>
            )}
          </tbody>
        </table>
        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>

      {showForm && <MappingFormModal record={editRecord} onClose={() => setShowForm(false)} onSuccess={handleFormSuccess} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab3: 集成日志
// ═══════════════════════════════════════════════════════════════════════════════
function LogDetailModal({ log, onClose }) {
  const rawPayload = JSON.stringify(
    { hisRxNo: log.hisRxNo, patientName: log.patientName, items: log.itemCount, errorMessage: log.errorMessage || null },
    null, 2,
  );

  return (
    <Modal open onCancel={onClose} title="日志详情" width={640} destroyOnClose footer={null}>
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-400">日志编号：</span><span className="text-slate-700">{log.logNo}</span></div>
          <div><span className="text-slate-400">状态：</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[log.status]}`}>{log.status}</span>
          </div>
          <div><span className="text-slate-400">HIS处方号：</span><span className="text-slate-700">{log.hisRxNo}</span></div>
          <div><span className="text-slate-400">本系统处方号：</span><span className="text-slate-700">{log.sysRxNo || '-'}</span></div>
          <div><span className="text-slate-400">患者：</span><span className="text-slate-700">{log.patientName}</span></div>
          <div><span className="text-slate-400">时间：</span><span className="text-slate-700">{formatDateTime(log.createdAt)}</span></div>
        </div>

        {log.errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {log.errorMessage}
          </div>
        )}

        {log.unmappedCount > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-600">未匹配药品 ({log.unmappedCount} 项)</p>
            <p className="text-xs text-slate-400">请在"药品编码映射"中补充对应映射关系</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-sm font-medium text-slate-600">原始载荷</p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-400">{rawPayload}</pre>
        </div>
      </div>
    </Modal>
  );
}

function IntegrationLogsTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const [bizFilter, setBizFilter] = useState('');
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailLog, setDetailLog] = useState(null);

  useEffect(() => {
    fetchHisIntegrationLogs({ status: statusFilter || undefined, bizType: bizFilter || undefined, page, pageSize })
      .then((res) => { const d = res.data || res; setLogs(d.items || d.rows || d); })
      .catch(() => { /* fallback to mock */ });
  }, [statusFilter, bizFilter, page, pageSize]);

  const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

  const filtered = useMemo(() => {
    let result = logs;
    if (statusFilter) result = result.filter((l) => l.status === statusFilter);
    if (bizFilter) result = result.filter((l) => l.bizType === bizFilter);
    return result;
  }, [logs, statusFilter, bizFilter]);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex items-center gap-3">
        <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">全部状态</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select className={selectCls} value={bizFilter} onChange={(e) => { setBizFilter(e.target.value); setPage(1); }}>
          <option value="">全部业务类型</option>
          <option value="RX_INBOUND">RX_INBOUND</option>
          <option value="RX_OUTBOUND">RX_OUTBOUND</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">日志编号</th>
              <th className="px-4 py-3">平台</th>
              <th className="px-4 py-3">方向</th>
              <th className="px-4 py-3">业务类型</th>
              <th className="px-4 py-3">HIS处方号</th>
              <th className="px-4 py-3">本系统处方号</th>
              <th className="px-4 py-3">患者</th>
              <th className="px-4 py-3">药品/匹配</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-xs">{l.logNo}</td>
                <td className="px-4 py-3 text-slate-500">{l.hisPlatform}</td>
                <td className="px-4 py-3">{DIR_LABEL[l.direction] || l.direction}</td>
                <td className="px-4 py-3">{BIZ_LABEL[l.bizType] || l.bizType}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.hisRxNo}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.sysRxNo || '-'}</td>
                <td className="px-4 py-3">{l.patientName}</td>
                <td className="px-4 py-3">{l.mappedCount}/{l.itemCount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[l.status] || 'bg-slate-100 text-slate-500'}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(l.createdAt)}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setDetailLog(l)} className="text-indigo-600 hover:text-indigo-800 text-xs">详情</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">暂无日志数据</td></tr>
            )}
          </tbody>
        </table>
        <Pager total={filtered.length} page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>

      {detailLog && <LogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 主页面
// ═══════════════════════════════════════════════════════════════════════════════
export default function IntegrationPage() {
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">系统集成管理</h1>

      <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        {/* Tab 栏 */}
        <div className="flex gap-1 border-b border-slate-100 px-6 pt-4">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === t.key
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="p-6">
          {activeTab === 'config' && <HisConfigTab />}
          {activeTab === 'mapping' && <DrugMappingTab />}
          {activeTab === 'logs' && <IntegrationLogsTab />}
        </div>
      </div>
    </div>
  );
}
