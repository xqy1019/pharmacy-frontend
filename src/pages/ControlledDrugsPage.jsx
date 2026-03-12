import { useState } from 'react';
import { Button, Modal } from 'antd';
import SummaryCard from '../components/SummaryCard';
import Pager from '../components/Pager';
import { useToast } from '../context/ToastContext';

// ── Mock 数据 ──────────────────────────────────────────────────────────────────
const MOCK_LEDGER = [
  { id: 1, date: '2026-03-11', drugName: '盐酸哌替啶注射液', batchNo: 'B20260101', inQty: 0, outQty: 2, balanceQty: 18, operator: '张药师', cosigner: '李药师', verified: true },
  { id: 2, date: '2026-03-10', drugName: '盐酸吗啡注射液', batchNo: 'B20260102', inQty: 10, outQty: 0, balanceQty: 10, operator: '张药师', cosigner: '王药师', verified: true },
  { id: 3, date: '2026-03-09', drugName: '地西泮注射液', batchNo: 'B20260103', inQty: 0, outQty: 5, balanceQty: 25, operator: '李药师', cosigner: '张药师', verified: false },
];

const MOCK_AMPOULE = [
  { id: 1, date: '2026-03-11', drugName: '盐酸哌替啶注射液', spec: '1ml:50mg', qty: 2, op1: '张药师', op2: '李药师', disposition: '销毁', remark: '已登记销毁台账' },
  { id: 2, date: '2026-03-10', drugName: '盐酸吗啡注射液', spec: '1ml:10mg', qty: 3, op1: '张药师', op2: '王药师', disposition: '转交', remark: '转交医务科统一处置' },
];

const MOCK_VERIFY = [
  { id: 1, date: '2026-03-11', verifier: '张药师', drugCount: 8, accountMatch: true, physicalMatch: true, diff: '', signed: true },
  { id: 2, date: '2026-03-08', verifier: '李药师', drugCount: 8, accountMatch: true, physicalMatch: false, diff: '地西泮注射液库存差异2支', signed: false },
];

const TABS = [
  { key: 'ledger', label: '台账记录' },
  { key: 'ampoule', label: '空安瓿回收' },
  { key: 'verify', label: '账物核查' },
];

const INPUT_CLS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';

function Badge({ ok, yesLabel = '已签字', noLabel = '未签字' }) {
  return ok
    ? <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">{yesLabel}</span>
    : <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">{noLabel}</span>;
}

// ── 新建领用记录 Modal ─────────────────────────────────────────────────────────
function DispenseModal({ onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    drugName: '', batchNo: '', qty: '', department: '', cosigner1: '', cosigner2: '', remark: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit() {
    if (!form.drugName.trim() || !form.batchNo.trim()) { toast.error('请填写药品名称和批号'); return; }
    if (!form.qty || Number(form.qty) <= 0) { toast.error('请填写有效的领用数量'); return; }
    if (!form.cosigner1.trim() || !form.cosigner2.trim()) { toast.error('麻精药品须双人核对，请填写两位核对人员'); return; }
    setSubmitting(true);
    setTimeout(() => {
      toast.success('领用记录已创建（模拟）');
      setSubmitting(false);
      onClose();
    }, 600);
  }

  return (
    <Modal open onCancel={onClose} title="新建领用记录" width={640} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>提交</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          麻精药品领用须双人核对签字，请如实填写。
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">药品名称 *</label>
            <input className={INPUT_CLS} value={form.drugName} onChange={e => set('drugName', e.target.value)} placeholder="如：盐酸哌替啶注射液" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">批号 *</label>
            <input className={INPUT_CLS} value={form.batchNo} onChange={e => set('batchNo', e.target.value)} placeholder="如：B20260101" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">领用数量 *</label>
            <input className={INPUT_CLS} type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">领用科室</label>
            <input className={INPUT_CLS} value={form.department} onChange={e => set('department', e.target.value)} placeholder="如：手术室" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">核对人员1 *</label>
            <input className={INPUT_CLS} value={form.cosigner1} onChange={e => set('cosigner1', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">核对人员2 *</label>
            <input className={INPUT_CLS} value={form.cosigner2} onChange={e => set('cosigner2', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">用途备注</label>
          <textarea className={INPUT_CLS} rows={2} value={form.remark} onChange={e => set('remark', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── 登记回收 Modal ──────────────────────────────────────────────────────────────
function AmpouleModal({ onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    drugName: '', spec: '', batchNo: '', qty: '', op1: '', op2: '', disposition: '销毁',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit() {
    if (!form.drugName.trim()) { toast.error('请填写药品名称'); return; }
    if (!form.qty || Number(form.qty) <= 0) { toast.error('请填写有效的回收数量'); return; }
    if (!form.op1.trim() || !form.op2.trim()) { toast.error('空安瓿回收须双人操作'); return; }
    setSubmitting(true);
    setTimeout(() => {
      toast.success('回收记录已登记（模拟）');
      setSubmitting(false);
      onClose();
    }, 600);
  }

  return (
    <Modal open onCancel={onClose} title="登记空安瓿回收" width={640} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>提交</Button>,
      ]}>
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">药品名称 *</label>
            <input className={INPUT_CLS} value={form.drugName} onChange={e => set('drugName', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">规格</label>
            <input className={INPUT_CLS} value={form.spec} onChange={e => set('spec', e.target.value)} placeholder="如：1ml:50mg" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">批号</label>
            <input className={INPUT_CLS} value={form.batchNo} onChange={e => set('batchNo', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">回收数量 *</label>
            <input className={INPUT_CLS} type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">操作人员1 *</label>
            <input className={INPUT_CLS} value={form.op1} onChange={e => set('op1', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">操作人员2 *</label>
            <input className={INPUT_CLS} value={form.op2} onChange={e => set('op2', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">处置方式</label>
          <select className={INPUT_CLS} value={form.disposition} onChange={e => set('disposition', e.target.value)}>
            <option value="销毁">销毁</option>
            <option value="转交">转交</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ── 主页面 ──────────────────────────────────────────────────────────────────────
export default function ControlledDrugsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('ledger');
  const [showDispense, setShowDispense] = useState(false);
  const [showAmpoule, setShowAmpoule] = useState(false);

  // 分页状态
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ampoulePage, setAmpoulePage] = useState(1);
  const [verifyPage, setVerifyPage] = useState(1);
  const pageSize = 10;

  // 统计数据（mock）
  const totalDrugs = 53;
  const todayDispense = 7;
  const pendingAmpoule = 4;
  const monthVerify = 12;

  function handleExport() {
    toast.success('报表导出已开始（模拟）');
  }

  return (
    <div className="space-y-6">
      {/* 醒目提示条 */}
      <div className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-medium text-white shadow">
        麻醉药品和精神药品须双人核对，实行专人负责、专柜加锁、专用账册管理
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="在库麻精药品" value={totalDrugs} detail="含麻醉药品和精神药品" tone="danger" />
        <SummaryCard label="今日领用数量" value={todayDispense} detail="双人核对后发出" tone="warning" />
        <SummaryCard label="待回收空安瓿" value={pendingAmpoule} detail="需及时回收销毁" tone="info" />
        <SummaryCard label="本月账物核查" value={monthVerify} detail="账物相符核查次数" tone="success" />
      </div>

      {/* 主工作区 */}
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
        {/* Tab 栏 + 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tab === 'ledger' && (
              <button onClick={() => setShowDispense(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition">
                + 新建领用记录
              </button>
            )}
            {tab === 'ampoule' && (
              <button onClick={() => setShowAmpoule(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition">
                + 登记回收
              </button>
            )}
            {tab === 'verify' && (
              <button onClick={() => toast.success('新建核查记录（模拟）')}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition">
                + 新建核查
              </button>
            )}
            <button onClick={handleExport}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition">
              导出报表
            </button>
          </div>
        </div>

        {/* Tab1: 台账记录 */}
        {tab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">日期</th>
                  <th className="px-6 py-3 font-medium">药品名称</th>
                  <th className="px-6 py-3 font-medium">批号</th>
                  <th className="px-6 py-3 font-medium text-right">收入</th>
                  <th className="px-6 py-3 font-medium text-right">发出</th>
                  <th className="px-6 py-3 font-medium text-right">结存</th>
                  <th className="px-6 py-3 font-medium">操作人员</th>
                  <th className="px-6 py-3 font-medium">双人核对</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LEDGER.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-6 py-3">{r.date}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{r.drugName}</td>
                    <td className="px-6 py-3 font-mono text-xs">{r.batchNo}</td>
                    <td className="px-6 py-3 text-right">{r.inQty > 0 ? <span className="text-emerald-600">+{r.inQty}</span> : '-'}</td>
                    <td className="px-6 py-3 text-right">{r.outQty > 0 ? <span className="text-rose-600">-{r.outQty}</span> : '-'}</td>
                    <td className="px-6 py-3 text-right font-semibold">{r.balanceQty}</td>
                    <td className="px-6 py-3">{r.operator} / {r.cosigner}</td>
                    <td className="px-6 py-3"><Badge ok={r.verified} yesLabel="已核对" noLabel="未核对" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4">
              <Pager page={ledgerPage} pageSize={pageSize} total={MOCK_LEDGER.length} onPageChange={setLedgerPage} />
            </div>
          </div>
        )}

        {/* Tab2: 空安瓿回收 */}
        {tab === 'ampoule' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">回收日期</th>
                  <th className="px-6 py-3 font-medium">药品名称</th>
                  <th className="px-6 py-3 font-medium">规格</th>
                  <th className="px-6 py-3 font-medium text-right">回收数量</th>
                  <th className="px-6 py-3 font-medium">操作人员1</th>
                  <th className="px-6 py-3 font-medium">操作人员2</th>
                  <th className="px-6 py-3 font-medium">处置方式</th>
                  <th className="px-6 py-3 font-medium">备注</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_AMPOULE.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-6 py-3">{r.date}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{r.drugName}</td>
                    <td className="px-6 py-3">{r.spec}</td>
                    <td className="px-6 py-3 text-right font-semibold">{r.qty}</td>
                    <td className="px-6 py-3">{r.op1}</td>
                    <td className="px-6 py-3">{r.op2}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.disposition === '销毁' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.disposition}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{r.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4">
              <Pager page={ampoulePage} pageSize={pageSize} total={MOCK_AMPOULE.length} onPageChange={setAmpoulePage} />
            </div>
          </div>
        )}

        {/* Tab3: 账物核查 */}
        {tab === 'verify' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">核查日期</th>
                  <th className="px-6 py-3 font-medium">核查人员</th>
                  <th className="px-6 py-3 font-medium text-right">药品数量</th>
                  <th className="px-6 py-3 font-medium">账账相符</th>
                  <th className="px-6 py-3 font-medium">账物相符</th>
                  <th className="px-6 py-3 font-medium">差异说明</th>
                  <th className="px-6 py-3 font-medium">签字状态</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_VERIFY.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/70">
                    <td className="px-6 py-3">{r.date}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{r.verifier}</td>
                    <td className="px-6 py-3 text-right">{r.drugCount}</td>
                    <td className="px-6 py-3"><Badge ok={r.accountMatch} yesLabel="相符" noLabel="不符" /></td>
                    <td className="px-6 py-3"><Badge ok={r.physicalMatch} yesLabel="相符" noLabel="不符" /></td>
                    <td className="px-6 py-3 text-slate-500">{r.diff || '-'}</td>
                    <td className="px-6 py-3"><Badge ok={r.signed} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4">
              <Pager page={verifyPage} pageSize={pageSize} total={MOCK_VERIFY.length} onPageChange={setVerifyPage} />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDispense && <DispenseModal onClose={() => setShowDispense(false)} />}
      {showAmpoule && <AmpouleModal onClose={() => setShowAmpoule(false)} />}
    </div>
  );
}
