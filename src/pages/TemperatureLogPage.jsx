import { useMemo, useState } from 'react';
import { Modal, Table } from 'antd';
import SummaryCard from '../components/SummaryCard';
import Pager from '../components/Pager';
import { formatDateTime, formatNumber } from '../utils/formatters';

// ── Mock 数据 ────────────────────────────────────────────────────────
const TEMP_LOGS = [
  { id: 1, location: '冷藏库A区', deviceNo: 'TH-001', temperature: 4.2, humidity: 52, recordedAt: '2026-03-11T08:00:00', status: 'NORMAL' },
  { id: 2, location: '冷藏库A区', deviceNo: 'TH-001', temperature: 4.5, humidity: 54, recordedAt: '2026-03-11T06:00:00', status: 'NORMAL' },
  { id: 3, location: '冷藏库B区', deviceNo: 'TH-002', temperature: 3.8, humidity: 48, recordedAt: '2026-03-11T08:00:00', status: 'NORMAL' },
  { id: 4, location: '冷冻库', deviceNo: 'TH-003', temperature: -18.5, humidity: 30, recordedAt: '2026-03-11T08:00:00', status: 'NORMAL' },
  { id: 5, location: '冷藏库A区', deviceNo: 'TH-001', temperature: 9.1, humidity: 68, recordedAt: '2026-03-10T14:00:00', status: 'ALARM' },
  { id: 6, location: '冷藏库B区', deviceNo: 'TH-002', temperature: 2.1, humidity: 45, recordedAt: '2026-03-10T12:00:00', status: 'WARNING' },
  { id: 7, location: '冷冻库', deviceNo: 'TH-003', temperature: -15.2, humidity: 32, recordedAt: '2026-03-10T10:00:00', status: 'WARNING' },
  { id: 8, location: '冷藏库A区', deviceNo: 'TH-001', temperature: 5.0, humidity: 55, recordedAt: '2026-03-10T08:00:00', status: 'NORMAL' },
  { id: 9, location: '冷藏运输车', deviceNo: 'TH-004', temperature: 6.8, humidity: 60, recordedAt: '2026-03-10T07:30:00', status: 'NORMAL' },
  { id: 10, location: '冷藏库B区', deviceNo: 'TH-002', temperature: 4.0, humidity: 50, recordedAt: '2026-03-10T06:00:00', status: 'NORMAL' },
  { id: 11, location: '冷冻库', deviceNo: 'TH-003', temperature: -20.1, humidity: 28, recordedAt: '2026-03-10T06:00:00', status: 'NORMAL' },
  { id: 12, location: '冷藏运输车', deviceNo: 'TH-004', temperature: 11.3, humidity: 72, recordedAt: '2026-03-09T16:00:00', status: 'ALARM' },
  { id: 13, location: '冷藏库A区', deviceNo: 'TH-001', temperature: 4.8, humidity: 53, recordedAt: '2026-03-09T08:00:00', status: 'NORMAL' },
  { id: 14, location: '冷藏库B区', deviceNo: 'TH-002', temperature: 3.5, humidity: 47, recordedAt: '2026-03-09T08:00:00', status: 'NORMAL' },
  { id: 15, location: '冷冻库', deviceNo: 'TH-003', temperature: -19.0, humidity: 29, recordedAt: '2026-03-09T08:00:00', status: 'NORMAL' },
];

const ALARM_EVENTS = [
  { id: 1, location: '冷藏库A区', deviceNo: 'TH-001', temperature: 9.1, threshold: '2-8°C', occurredAt: '2026-03-10T14:00:00', resolvedAt: '2026-03-10T14:45:00', handler: '李药师', cause: '制冷设备短暂故障', impact: '影响胰岛素等5种冷藏药品，已启动应急预案' },
  { id: 2, location: '冷藏运输车', deviceNo: 'TH-004', temperature: 11.3, threshold: '2-8°C', occurredAt: '2026-03-09T16:00:00', resolvedAt: '2026-03-09T16:30:00', handler: '王药师', cause: '运输途中车辆熄火', impact: '本批次疫苗已做冷链断裂处理' },
  { id: 3, location: '冷冻库', deviceNo: 'TH-003', temperature: -15.2, threshold: '-20°C以下', occurredAt: '2026-03-10T10:00:00', resolvedAt: null, handler: null, cause: null, impact: null },
];

const STATUS_MAP = {
  NORMAL:  { label: '正常', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  WARNING: { label: '预警', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  ALARM:   { label: '超标', cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.NORMAL;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function TempDisplay({ value, status }) {
  const color = status === 'ALARM' ? 'text-rose-600 font-bold' : status === 'WARNING' ? 'text-amber-600 font-semibold' : 'text-slate-700';
  return <span className={color}>{value.toFixed(1)}°C</span>;
}

// ── 录入 Modal ─────────────────────────────────────────────────────
function RecordModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ location: '', deviceNo: '', temperature: '', humidity: '' });
  const [error, setError] = useState('');

  function f(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!form.location || !form.deviceNo || !form.temperature) {
      setError('库区、设备编号、温度为必填项');
      return;
    }
    const temp = parseFloat(form.temperature);
    if (isNaN(temp)) { setError('温度必须为数字'); return; }
    onSuccess({ ...form, temperature: temp, humidity: form.humidity ? parseFloat(form.humidity) : null });
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 placeholder:text-slate-300';

  return (
    <Modal open onCancel={onClose} title="手动录入温湿度记录" width={480} destroyOnClose
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">取消</button>
          <button type="button" onClick={handleSubmit}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700 transition">保存记录</button>
        </div>
      }>
      <div className="space-y-4 py-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">库区/位置 <span className="text-rose-500">*</span></label>
          <select value={form.location} onChange={f('location')} className={inputCls}>
            <option value="">请选择</option>
            <option value="冷藏库A区">冷藏库A区</option>
            <option value="冷藏库B区">冷藏库B区</option>
            <option value="冷冻库">冷冻库</option>
            <option value="冷藏运输车">冷藏运输车</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">设备编号 <span className="text-rose-500">*</span></label>
          <input value={form.deviceNo} onChange={f('deviceNo')} placeholder="如 TH-001" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">温度(°C) <span className="text-rose-500">*</span></label>
            <input type="number" step="0.1" value={form.temperature} onChange={f('temperature')} placeholder="4.2" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">湿度(%)</label>
            <input type="number" step="1" value={form.humidity} onChange={f('humidity')} placeholder="50" className={inputCls} />
          </div>
        </div>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>}
      </div>
    </Modal>
  );
}

// ── 告警详情 Modal ─────────────────────────────────────────────────
function AlarmDetailModal({ alarm, onClose }) {
  return (
    <Modal open onCancel={onClose} title="温度异常事件详情" width={520} destroyOnClose footer={null}>
      <div className="space-y-4 py-2">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200 text-rose-700 text-xs font-bold">!</span>
            <span className="font-semibold text-rose-800">温度超标报警</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-rose-600">记录温度：</span><strong className="text-rose-800">{alarm.temperature}°C</strong></div>
            <div><span className="text-rose-600">合规范围：</span><span className="text-rose-700">{alarm.threshold}</span></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-slate-400">库区位置</p><p className="mt-1 font-medium text-slate-700">{alarm.location}</p></div>
          <div><p className="text-xs text-slate-400">设备编号</p><p className="mt-1 font-mono text-slate-600">{alarm.deviceNo}</p></div>
          <div><p className="text-xs text-slate-400">发生时间</p><p className="mt-1 text-slate-700">{formatDateTime(alarm.occurredAt)}</p></div>
          <div>
            <p className="text-xs text-slate-400">处理状态</p>
            <p className="mt-1">
              {alarm.resolvedAt
                ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">已处理</span>
                : <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">待处理</span>}
            </p>
          </div>
        </div>
        {alarm.resolvedAt && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm space-y-1.5">
            <p><span className="text-slate-400">处理人：</span><span className="text-slate-700">{alarm.handler}</span></p>
            <p><span className="text-slate-400">处理时间：</span><span className="text-slate-700">{formatDateTime(alarm.resolvedAt)}</span></p>
            <p><span className="text-slate-400">原因分析：</span><span className="text-slate-700">{alarm.cause}</span></p>
            <p><span className="text-slate-400">影响评估：</span><span className="text-slate-700">{alarm.impact}</span></p>
          </div>
        )}
        {!alarm.resolvedAt && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-700">该异常事件尚未处理，请及时排查原因并记录处理结果。</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── 主页面 ─────────────────────────────────────────────────────────
export default function TemperatureLogPage() {
  const [tab, setTab] = useState('logs'); // 'logs' | 'alarms'
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showRecord, setShowRecord] = useState(false);
  const [alarmDetail, setAlarmDetail] = useState(null);
  const [logs, setLogs] = useState(TEMP_LOGS);

  const stats = useMemo(() => ({
    totalDevices: 4,
    normalCount: logs.filter(l => l.status === 'NORMAL').length,
    warningCount: logs.filter(l => l.status === 'WARNING').length,
    alarmCount: logs.filter(l => l.status === 'ALARM').length,
    unresolvedAlarms: ALARM_EVENTS.filter(a => !a.resolvedAt).length,
  }), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (locationFilter && log.location !== locationFilter) return false;
      if (statusFilter && log.status !== statusFilter) return false;
      return true;
    });
  }, [logs, locationFilter, statusFilter]);

  const pagedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  function handleRecordSuccess(record) {
    const newLog = {
      id: logs.length + 1,
      ...record,
      recordedAt: new Date().toISOString(),
      status: record.temperature > 8 || record.temperature < 2 ? 'ALARM' : record.temperature > 7 || record.temperature < 2.5 ? 'WARNING' : 'NORMAL',
    };
    setLogs(prev => [newLog, ...prev]);
    setShowRecord(false);
  }

  const locations = [...new Set(TEMP_LOGS.map(l => l.location))];

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="监测设备" value={formatNumber(stats.totalDevices)} detail="在线运行中" tone="info" />
        <SummaryCard label="正常记录" value={formatNumber(stats.normalCount)} detail="温湿度合规" tone="success" />
        <SummaryCard label="预警记录" value={formatNumber(stats.warningCount)} detail="接近阈值" tone="warning" />
        <SummaryCard label="超标告警" value={formatNumber(stats.alarmCount + stats.unresolvedAlarms)} detail={`${stats.unresolvedAlarms} 条待处理`} tone="danger" />
      </section>

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        {/* Tab 切换 */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-0">
          <div className="flex gap-1">
            {[
              { key: 'logs', label: '温度日志' },
              { key: 'alarms', label: `异常告警（${ALARM_EVENTS.length}）` },
            ].map(t => (
              <button key={t.key} type="button" onClick={() => { setTab(t.key); setPage(1); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  tab === t.key ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowRecord(true)}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">
            + 手动录入
          </button>
        </div>

        {tab === 'logs' && (
          <>
            {/* 筛选 */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select value={locationFilter} onChange={e => { setLocationFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300">
                <option value="">全部库区</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300">
                <option value="">全部状态</option>
                <option value="NORMAL">正常</option>
                <option value="WARNING">预警</option>
                <option value="ALARM">超标</option>
              </select>
              <button type="button" onClick={() => { setLocationFilter(''); setStatusFilter(''); setPage(1); }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                重置
              </button>
              <span className="ml-auto text-xs text-slate-400">共 {filteredLogs.length} 条记录</span>
            </div>

            {/* 温度日志表格 */}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
              <Table
                columns={[
                  { title: '库区/位置', dataIndex: 'location', key: 'location', render: v => <span className="font-medium text-slate-700">{v}</span> },
                  { title: '设备编号', dataIndex: 'deviceNo', key: 'deviceNo', render: v => <span className="font-mono text-xs text-slate-500">{v}</span> },
                  { title: '温度', dataIndex: 'temperature', key: 'temperature', render: (v, row) => <TempDisplay value={v} status={row.status} /> },
                  { title: '湿度', dataIndex: 'humidity', key: 'humidity', render: v => v != null ? <span className="text-slate-600">{v}%</span> : <span className="text-slate-400">--</span> },
                  { title: '记录时间', dataIndex: 'recordedAt', key: 'recordedAt', render: v => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
                  { title: '状态', dataIndex: 'status', key: 'status', render: v => <StatusBadge status={v} /> },
                ]}
                dataSource={pagedLogs}
                rowKey="id"
                size="middle"
                pagination={false}
                locale={{ emptyText: '暂无温度记录' }}
              />
              <Pager total={filteredLogs.length} page={page} pageSize={pageSize}
                onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }} />
            </div>
          </>
        )}

        {tab === 'alarms' && (
          <>
            {/* 未处理提醒 */}
            {stats.unresolvedAlarms > 0 && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                当前有 <strong>{stats.unresolvedAlarms}</strong> 条温度异常事件尚未处理，请及时排查。
              </div>
            )}

            {/* 告警事件表格 */}
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
              <Table
                columns={[
                  { title: '库区/位置', dataIndex: 'location', key: 'location', render: v => <span className="font-medium text-slate-700">{v}</span> },
                  { title: '设备编号', dataIndex: 'deviceNo', key: 'deviceNo', render: v => <span className="font-mono text-xs text-slate-500">{v}</span> },
                  { title: '记录温度', dataIndex: 'temperature', key: 'temperature', render: v => <span className="font-bold text-rose-600">{v}°C</span> },
                  { title: '合规范围', dataIndex: 'threshold', key: 'threshold', render: v => <span className="text-slate-600">{v}</span> },
                  { title: '发生时间', dataIndex: 'occurredAt', key: 'occurredAt', render: v => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
                  { title: '处理状态', key: 'resolved', render: (_, row) => (
                    row.resolvedAt
                      ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">已处理</span>
                      : <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">待处理</span>
                  )},
                  { title: '操作', key: 'actions', render: (_, row) => (
                    <button type="button" onClick={() => setAlarmDetail(row)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50">
                      详情
                    </button>
                  )},
                ]}
                dataSource={ALARM_EVENTS}
                rowKey="id"
                size="middle"
                pagination={false}
              />
            </div>
          </>
        )}
      </section>

      {/* 合规提示 */}
      <section className="rounded-2xl border border-white bg-white p-6 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <h3 className="mb-3 text-base font-semibold text-slate-800">GSP 冷链管理合规要求</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
            <p className="text-sm font-medium text-sky-800">冷藏药品</p>
            <p className="mt-1 text-xs text-sky-600">储存温度 2-8°C，每 2 小时记录一次温湿度</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-sm font-medium text-indigo-800">冷冻药品</p>
            <p className="mt-1 text-xs text-indigo-600">储存温度 -20°C 以下，每 2 小时记录一次温湿度</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">冷链运输</p>
            <p className="mt-1 text-xs text-amber-600">运输全程温度监控，偏差 > 30 分钟需启动应急预案</p>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showRecord && <RecordModal onClose={() => setShowRecord(false)} onSuccess={handleRecordSuccess} />}
      {alarmDetail && <AlarmDetailModal alarm={alarmDetail} onClose={() => setAlarmDetail(null)} />}
    </div>
  );
}
