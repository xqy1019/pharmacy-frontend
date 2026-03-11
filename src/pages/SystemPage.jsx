import { useMemo, useState } from 'react';
import {
  assignRolePerms,
  assignUserRoles,
  createRole,
  createUser,
  fetchAuditLogs,
  fetchPermissions,
  fetchRoles,
  fetchUsers,
} from '../api/pharmacy';
import { Button, Modal, Space, Table } from 'antd';
import Pager from '../components/Pager';
import PermGuard from '../components/PermGuard';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePermission } from '../hooks/usePermission';
import { formatDateTime, formatNumber } from '../utils/formatters';

const TABS = [
  { key: 'users', label: '用户管理', perm: 'iam.user.view' },
  { key: 'roles', label: '角色管理', perm: 'iam.role.view' },
  { key: 'audit', label: '审计日志', perm: 'iam.audit.view' },
];

const PERM_GROUPS = {
  dashboard: '仪表盘',
  inventory: '库存管理',
  procurement: '采购管理',
  prescription: '处方管理',
  transfer: '调拨管理',
  stocktake: '盘点管理',
  quality: '质量召回',
  report: '统计报表',
  integration: '系统集成',
  sales: '销售管理',
  iam: '系统权限',
};

const PERM_LABEL = {
  'dashboard.view': '查看仪表盘',
  'iam.user.view': '查看用户', 'iam.user.create': '创建用户', 'iam.user.assignRole': '分配角色',
  'iam.role.view': '查看角色', 'iam.permission.view': '查看权限', 'iam.role.assignPerm': '分配权限',
  'iam.audit.view': '查看审计日志', 'iam.audit.export': '导出审计日志',
  'inventory.drug.manage': '药品档案管理', 'inventory.batch.manage': '批次库存管理',
  'procurement.supplier.view': '查看供应商', 'procurement.supplier.create': '管理供应商',
  'procurement.order.view': '查看采购单', 'procurement.order.create': '创建采购单', 'procurement.order.approve': '审批采购单',
  'prescription.view': '查看处方', 'prescription.create': '创建处方', 'prescription.review': '审方发药',
  'transfer.view': '查看调拨', 'transfer.create': '创建调拨', 'transfer.sign': '签收调拨',
  'stocktake.view': '查看盘点', 'stocktake.create': '创建盘点',
  'quality.recall.view': '查看召回', 'quality.recall.create': '发起召回', 'quality.batch.freeze': '冻结批次',
  'report.kpi.view': '查看KPI报表', 'report.supplier.view': '查看供应商报表',
  'integration.job.view': '查看集成任务', 'integration.push': '推送集成',
  'sales.order.view': '查看销售订单', 'sales.order.create': '创建销售订单', 'sales.trace.view': '追溯查询',
};

// ── 角色权限详情 Modal ────────────────────────────────────────────────────────
function RolePermDetailModal({ role, permissions, onClose, onSuccess }) {
  const [selected, setSelected] = useState(() => {
    // 优先用 permissionIds (number[])，其次从 permissions 对象数组中提取
    if (role.permissionIds?.length) return role.permissionIds;
    const rp = role.permissions || [];
    return rp.filter((p) => typeof p === 'object').map((p) => p.id);
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const permGroups = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc, p) => {
      const group = (p.permCode || '').split('.')[0] || 'other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(p);
      return acc;
    }, {});
  }, [permissions]);

  function togglePerm(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await assignRolePerms(role.id, selected);
      toast.success('权限保存成功');
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="编辑角色权限" width={896} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={saving}>保存权限</Button>,
      ]}>
      <p className="mb-4 text-sm text-slate-500">{role.roleName}（{role.roleCode}）· 已选 {selected.length} 项</p>
      <div className="max-h-[60vh] overflow-y-auto space-y-4">
        {Object.entries(permGroups).map(([group, perms]) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-400 tracking-wide">
              {PERM_GROUPS[group] || group}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {perms.map((p) => {
                const id = p.id;
                const code = p.permCode || '';
                const isOn = selected.includes(id);
                return (
                  <button key={id} type="button"
                    onClick={() => togglePerm(id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      isOn
                        ? 'border-cyan-400 bg-cyan-50 text-cyan-700 font-medium'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}>
                    {PERM_LABEL[code] || p.permName || code}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!permissions?.length && <p className="py-4 text-center text-xs text-slate-400">暂无权限数据</p>}
      </div>
    </Modal>
  );
}

// ── 分配用户角色 Modal ────────────────────────────────────────────────────────
function AssignRoleModal({ user: targetUser, roles, onClose, onSuccess }) {
  const [selected, setSelected] = useState(() => {
    // 优先使用 roleIds（后端直接返回的数字数组）
    if (targetUser.roleIds?.length) return targetUser.roleIds;
    return (targetUser.roles || []).map((r) => (typeof r === 'object' ? r.id : r)).filter(Boolean);
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function toggleRole(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await assignUserRoles(targetUser.id, selected);
      toast.success('角色分配成功');
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="分配角色" width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={saving}>保存</Button>,
      ]}>
      <p className="mb-3 text-sm text-slate-500">{targetUser.fullName || targetUser.username}</p>
      <div className="flex flex-wrap gap-2">
        {(roles || []).map((role) => (
          <button key={role.id} type="button"
            onClick={() => toggleRole(role.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs transition ${
              selected.includes(role.id)
                ? 'border-cyan-400 bg-cyan-50 font-medium text-cyan-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {role.roleName}
          </button>
        ))}
        {(!roles || roles.length === 0) && <p className="text-xs text-slate-400">暂无角色</p>}
      </div>
    </Modal>
  );
}

// ── 新建用户 Modal ────────────────────────────────────────────────────────────
function CreateUserModal({ roles, onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', fullName: '' });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleRole(id) {
    setSelectedRoles((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!form.username.trim() || !form.password.trim() || !form.fullName.trim()) {
      setError('用户名、密码、姓名为必填项'); return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await createUser({ ...form, orgId: 1 });
      if (selectedRoles.length > 0) {
        await assignUserRoles(user.id, selectedRoles);
      }
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="新建用户" width={640} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>创建用户</Button>,
      ]}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">用户名 *</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="登录用户名"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">密码 *</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="初始密码"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-slate-500">真实姓名 *</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="真实姓名"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-500">分配角色</label>
          <div className="flex flex-wrap gap-2">
            {(roles || []).map((role) => (
              <button key={role.id} type="button"
                onClick={() => toggleRole(role.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                  selectedRoles.includes(role.id)
                    ? 'border-cyan-400 bg-cyan-50 font-medium text-cyan-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {role.roleName}
              </button>
            ))}
            {(!roles || roles.length === 0) && <p className="text-xs text-slate-400">暂无角色</p>}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 新建角色 Modal ────────────────────────────────────────────────────────────
function CreateRoleModal({ permissions, onClose, onSuccess }) {
  const [form, setForm] = useState({ roleCode: '', roleName: '' });
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function togglePerm(id) {
    setSelectedPerms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!form.roleCode.trim() || !form.roleName.trim()) {
      setError('角色编码和角色名称为必填项'); return;
    }
    setError('');
    setSubmitting(true);
    try {
      const role = await createRole({ ...form, status: 'ACTIVE' });
      if (selectedPerms.length > 0) {
        await assignRolePerms(role.id, selectedPerms);
      }
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  const permGroups = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc, p) => {
      const group = (p.permCode || '').split('.')[0] || 'other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(p);
      return acc;
    }, {});
  }, [permissions]);

  return (
    <Modal open onCancel={onClose} title="新建角色" width={896} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>创建角色</Button>,
      ]}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">角色编码 *</label>
            <input value={form.roleCode} onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value }))}
              placeholder="如 PHARMACIST"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">角色名称 *</label>
            <input value={form.roleName} onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}
              placeholder="如 药师"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-500">权限分配（已选 {selectedPerms.length} 项）</label>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-3 space-y-3">
            {Object.entries(permGroups).map(([group, perms]) => (
              <div key={group}>
                <p className="mb-1.5 text-xs font-semibold uppercase text-slate-400">{PERM_GROUPS[group] || group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => {
                    const code = p.permCode || '';
                    return (
                      <button key={p.id} type="button"
                        onClick={() => togglePerm(p.id)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                          selectedPerms.includes(p.id)
                            ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}>
                        {PERM_LABEL[code] || p.permName || code}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!permissions?.length && <p className="py-4 text-center text-xs text-slate-400">暂无权限数据</p>}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function SystemPage() {
  const [tab, setTab] = useState('users');
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editRolePerms, setEditRolePerms] = useState(null);  // 当前编辑权限的角色
  const [assignRoleUser, setAssignRoleUser] = useState(null); // 当前分配角色的用户
  const toast = useToast();
  const { hasPerm } = usePermission();

  const { data: users, loading: usersLoading } = useAsyncData(fetchUsers, [refreshKey]);
  const { data: roles, loading: rolesLoading } = useAsyncData(fetchRoles, [refreshKey]);
  const { data: permissions } = useAsyncData(fetchPermissions, []);
  const { data: auditLogs, loading: auditLoading } = useAsyncData(
    () => tab === 'audit' ? fetchAuditLogs() : Promise.resolve(null),
    [tab, refreshKey]
  );

  const refresh = () => { setRefreshKey((v) => v + 1); setPage(1); };

  // 初始 tab 应选择用户有权限的第一个
  const availableTabs = TABS.filter((t) => hasPerm(t.perm));
  const activeTab = availableTabs.some((t) => t.key === tab) ? tab : (availableTabs[0]?.key || 'users');

  const stats = useMemo(() => ({
    users: (users || []).length,
    roles: (roles || []).length,
    permissions: (permissions || []).length,
  }), [users, roles, permissions]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const kw = appliedKeyword.trim().toLowerCase();
    if (!kw) return users;
    return users.filter((u) =>
      [u.username, u.fullName, u.email].some((v) => String(v || '').toLowerCase().includes(kw))
    );
  }, [users, appliedKeyword]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    const kw = appliedKeyword.trim().toLowerCase();
    if (!kw) return roles;
    return roles.filter((r) =>
      [r.roleCode, r.roleName].some((v) => String(v || '').toLowerCase().includes(kw))
    );
  }, [roles, appliedKeyword]);

  const filteredAudit = useMemo(() => {
    if (!auditLogs) return [];
    const kw = appliedKeyword.trim().toLowerCase();
    if (!kw) return auditLogs;
    return auditLogs.filter((l) =>
      [l.operatorName, l.module, l.action, l.targetId].some((v) => String(v || '').toLowerCase().includes(kw))
    );
  }, [auditLogs, appliedKeyword]);

  const currentList = activeTab === 'users' ? filteredUsers : activeTab === 'roles' ? filteredRoles : filteredAudit;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, page, pageSize]);

  const loading = activeTab === 'users' ? usersLoading : activeTab === 'roles' ? rolesLoading : auditLoading;

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: '系统用户', value: formatNumber(stats.users), detail: '全部账户', accent: 'from-cyan-500 to-teal-500' },
          { label: '角色数量', value: formatNumber(stats.roles), detail: '权限分组', accent: 'from-emerald-500 to-green-500' },
          { label: '权限项目', value: formatNumber(stats.permissions), detail: '细粒度控制', accent: 'from-amber-500 to-orange-500' },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <strong className="mt-4 block text-[20px] font-semibold text-slate-800">{item.value}</strong>
                <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
              </div>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${item.accent} text-sm font-semibold text-white`}>·</div>
            </div>
          </article>
        ))}
      </section>

      {/* 主工作区 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {availableTabs.map((t) => (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1); setAppliedKeyword(''); setKeyword(''); }}
                className={`px-4 py-2 text-sm transition ${activeTab === t.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setAppliedKeyword(keyword); setPage(1); } }}
            placeholder="关键字搜索..."
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300" />
          <button onClick={() => { setAppliedKeyword(keyword); setPage(1); }}
            className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white transition hover:bg-slate-800">查询</button>
          <button onClick={() => { setKeyword(''); setAppliedKeyword(''); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">重置</button>

          <div className="ml-auto flex gap-2">
            <button onClick={refresh}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">刷新</button>
            <PermGuard perm="iam.user.create">
              {activeTab === 'users' && (
                <button onClick={() => setShowCreateUser(true)}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新建用户</button>
              )}
            </PermGuard>
            <PermGuard perm="iam.role.assignPerm">
              {activeTab === 'roles' && (
                <button onClick={() => setShowCreateRole(true)}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-700">+ 新建角色</button>
              )}
            </PermGuard>
          </div>
        </div>

        {activeTab === 'users' && (
          <Table
            columns={[
              { title: '用户名', dataIndex: 'username', key: 'username', render: (v) => <span className="font-medium">{v}</span> },
              { title: '真实姓名', dataIndex: 'fullName', key: 'fullName', render: (v) => v || '--' },
              { title: '邮箱', dataIndex: 'email', key: 'email', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
              { title: '角色', key: 'roles', render: (_, u) => (
                <div className="flex flex-wrap gap-1">
                  {(u.roles || u.roleNames || []).map((r) => (
                    <span key={r.id || r} className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">{r.roleName || r}</span>
                  ))}
                  {(!(u.roles?.length) && !(u.roleNames?.length)) && <span className="text-xs text-slate-400">未分配</span>}
                </div>
              )},
              { title: '状态', dataIndex: 'status', key: 'status', render: (v) => (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {v === 'ACTIVE' ? '启用' : '禁用'}
                </span>
              )},
              { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
              ...(hasPerm('iam.user.assignRole') ? [{ title: '操作', key: 'actions', render: (_, u) => (
                <button onClick={() => setAssignRoleUser(u)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition">
                  分配角色
                </button>
              )}] : []),
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
          />
        )}

        {activeTab === 'roles' && (
          <Table
            columns={[
              { title: '角色编码', dataIndex: 'roleCode', key: 'roleCode', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
              { title: '角色名称', dataIndex: 'roleName', key: 'roleName', render: (v) => <span className="font-medium">{v}</span> },
              { title: '权限数', key: 'permCount', render: (_, r) => <span className="text-slate-500">{r.permissionCount ?? (r.permissions || []).length}</span> },
              { title: '状态', dataIndex: 'status', key: 'status', render: (v) => (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {v === 'ACTIVE' ? '启用' : '禁用'}
                </span>
              )},
              { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
              ...(hasPerm('iam.role.assignPerm') ? [{ title: '操作', key: 'actions', render: (_, r) => (
                <button onClick={() => setEditRolePerms(r)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition">
                  编辑权限
                </button>
              )}] : []),
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
          />
        )}

        {activeTab === 'audit' && (
          <Table
            columns={[
              { title: '操作人', key: 'operator', render: (_, l) => <span className="font-medium">{l.operatorName || l.username || '--'}</span> },
              { title: '模块', dataIndex: 'module', key: 'module', render: (v) => <span className="text-slate-500">{v || '--'}</span> },
              { title: '操作', dataIndex: 'action', key: 'action', render: (v) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{v || '--'}</span> },
              { title: '目标', key: 'target', render: (_, l) => <span className="text-xs text-slate-500">{l.targetId || l.resourceId || '--'}</span> },
              { title: 'IP 地址', key: 'ip', render: (_, l) => <span className="font-mono text-xs text-slate-400">{l.ipAddress || l.ip || '--'}</span> },
              { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
            ]}
            dataSource={pagedRows}
            rowKey="id"
            size="middle"
            pagination={false}
            loading={loading}
          />
        )}

        <Pager total={currentList.length} page={page} pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </section>

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => { setShowCreateUser(false); refresh(); toast.success('用户创建成功'); }}
        />
      )}
      {showCreateRole && (
        <CreateRoleModal
          permissions={permissions}
          onClose={() => setShowCreateRole(false)}
          onSuccess={() => { setShowCreateRole(false); refresh(); toast.success('角色创建成功'); }}
        />
      )}
      {editRolePerms && (
        <RolePermDetailModal
          role={editRolePerms}
          permissions={permissions}
          onClose={() => setEditRolePerms(null)}
          onSuccess={() => { setEditRolePerms(null); refresh(); }}
        />
      )}
      {assignRoleUser && (
        <AssignRoleModal
          user={assignRoleUser}
          roles={roles}
          onClose={() => setAssignRoleUser(null)}
          onSuccess={() => { setAssignRoleUser(null); refresh(); toast.success('角色分配成功'); }}
        />
      )}
    </div>
  );
}
