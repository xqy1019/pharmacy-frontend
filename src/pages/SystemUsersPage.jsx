import { useMemo, useState } from 'react';
import { Button, Modal, Space, Table } from 'antd';
import { assignUserRoles, createUser, deleteUser, fetchRoles, fetchUsers, updateUser } from '../api/pharmacy';
import Pager from '../components/Pager';
import PermGuard from '../components/PermGuard';
import { ROLE_COLOR, ROLE_LABEL } from '../config/permissions';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../utils/formatters';

// ── 删除确认 Modal ─────────────────────────────────────────────────────────────
function DeleteUserModal({ targetUser, onClose, onSuccess }) {
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteUser(targetUser.id);
      toast.success('用户已删除');
      onSuccess();
    } catch (e) {
      toast.error(e?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="确认删除用户" width={480} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" danger onClick={handleDelete} loading={deleting}>确认删除</Button>,
      ]}>
      <p className="text-sm text-slate-500">
        即将删除用户 <span className="font-medium text-slate-700">「{targetUser.fullName || targetUser.username}」</span>，
        同时移除该用户的所有角色绑定。此操作不可撤销。
      </p>
    </Modal>
  );
}

// ── 分配角色 Modal ────────────────────────────────────────────────────────────
function AssignRoleModal({ targetUser, roles, onClose, onSuccess }) {
  const [selected, setSelected] = useState(() => targetUser.roleIds || []);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function toggle(id) {
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
    <Modal open onCancel={onClose} title="分配角色" width={640} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={saving}>保存</Button>,
      ]}>
      <p className="mb-3 text-sm text-slate-500">{targetUser.fullName || targetUser.username}</p>
      <p className="mb-3 text-xs text-slate-400">已选 {selected.length} 个角色</p>
      <div className="grid grid-cols-2 gap-2">
        {(roles || []).map((role) => {
          const isOn = selected.includes(role.id);
          const color = ROLE_COLOR[role.roleCode] || 'from-slate-400 to-slate-500';
          return (
            <button key={role.id} type="button" onClick={() => toggle(role.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                isOn ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}>
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color} text-xs font-bold text-white`}>
                {(ROLE_LABEL[role.roleCode] || role.roleName).slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${isOn ? 'text-cyan-700' : 'text-slate-700'}`}>
                  {ROLE_LABEL[role.roleCode] || role.roleName}
                </p>
                <p className="truncate font-mono text-xs text-slate-400">{role.roleCode}</p>
              </div>
              {isOn && <span className="ml-auto text-cyan-500">✓</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ── 新建用户 Modal ────────────────────────────────────────────────────────────
function CreateUserModal({ roles, onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', fullName: '', department: '' });
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  function toggleRole(id) {
    setSelectedRoles((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!form.username.trim() || !form.password.trim() || !form.fullName.trim()) {
      setError('用户名、密码、姓名为必填项'); return;
    }
    setError(''); setSubmitting(true);
    try {
      const u = await createUser({ ...form, orgId: 1 });
      if (selectedRoles.length > 0) await assignUserRoles(u.id, selectedRoles);
      toast.success('用户创建成功');
      onSuccess();
    } catch (e) {
      setError(e?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="新建用户" width={800} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>创建用户</Button>,
      ]}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: '用户名 *', key: 'username', placeholder: '登录账号', type: 'text' },
            { label: '密码 *', key: 'password', placeholder: '初始密码', type: 'password' },
            { label: '真实姓名 *', key: 'fullName', placeholder: '姓名', type: 'text' },
            { label: '所属科室', key: 'department', placeholder: '如 门诊药房', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-slate-500">{label}</label>
              <input type={type} value={form[key]} placeholder={placeholder}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
            </div>
          ))}
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-500">分配角色（可多选）</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {(roles || []).map((role) => {
              const isOn = selectedRoles.includes(role.id);
              return (
                <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                    isOn ? 'border-cyan-300 bg-cyan-50 text-cyan-700 font-medium' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}>
                  <span>{isOn ? '✓' : '○'}</span>
                  {ROLE_LABEL[role.roleCode] || role.roleName}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 编辑用户 Modal ────────────────────────────────────────────────────────────
function EditUserModal({ targetUser, onClose, onSuccess }) {
  const [form, setForm] = useState({ fullName: targetUser.fullName || '', department: targetUser.department || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function handleSave() {
    if (!form.fullName.trim()) { setError('姓名不能为空'); return; }
    setSaving(true); setError('');
    try {
      await updateUser(targetUser.id, { fullName: form.fullName.trim(), department: form.department.trim() || undefined });
      toast.success('用户信息已更新');
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="编辑用户" width={560} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={saving}>保存</Button>,
      ]}>
      <p className="mb-4 text-sm text-slate-400 font-mono">{targetUser.username}</p>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">真实姓名 *</label>
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="姓名"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">所属科室</label>
          <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            placeholder="如：门诊药房"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function SystemUsersPage() {
  const [refresh, setRefresh] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const toast = useToast();

  const { data: users, loading } = useAsyncData(fetchUsers, [refresh]);
  const { data: roles } = useAsyncData(fetchRoles, [refresh]);

  async function handleToggleStatus(u) {
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setTogglingId(u.id);
    try {
      await updateUser(u.id, { status: newStatus });
      toast.success(newStatus === 'ACTIVE' ? '已启用用户' : '已停用用户');
      doRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || '操作失败');
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!users) return [];
    const kw = applied.trim().toLowerCase();
    if (!kw) return users;
    return users.filter((u) =>
      [u.username, u.fullName, u.email].some((v) => String(v || '').toLowerCase().includes(kw))
    );
  }, [users, applied]);

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const stats = useMemo(() => ({
    total: (users || []).length,
    active: (users || []).filter((u) => u.status === 'ACTIVE').length,
    roles: (roles || []).length,
  }), [users, roles]);

  const doRefresh = () => { setRefresh((v) => v + 1); setPage(1); };

  return (
    <div className="space-y-5">
      {/* 统计 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '全部用户', value: stats.total, sub: '含停用账号', color: 'from-cyan-500 to-blue-500' },
          { label: '在用账号', value: stats.active, sub: '状态启用', color: 'from-emerald-500 to-teal-500' },
          { label: '角色总数', value: stats.roles, sub: '已配置角色', color: 'from-violet-500 to-purple-500' },
        ].map((s) => (
          <article key={s.label} className="rounded-2xl border border-white bg-white p-5 shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{s.label}</p>
                <strong className="mt-3 block text-3xl font-semibold text-slate-800">{s.value}</strong>
                <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
              </div>
              <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${s.color} opacity-80`} />
            </div>
          </article>
        ))}
      </section>

      {/* 表格区 */}
      <section className="rounded-2xl border border-white bg-white shadow-[0_2px_8px_rgba(99,102,241,0.06),0_12px_32px_rgba(99,102,241,0.08)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">用户列表</h3>
          <div className="ml-4 flex items-center gap-2">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setApplied(keyword); setPage(1); } }}
              placeholder="搜索用户名/姓名..."
              className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
            <button onClick={() => { setApplied(keyword); setPage(1); }}
              className="rounded-xl bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800 transition">查询</button>
            <button onClick={() => { setKeyword(''); setApplied(''); setPage(1); }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">重置</button>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={doRefresh}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">刷新</button>
            <PermGuard perm="iam.user.create">
              <button onClick={() => setShowCreate(true)}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs text-white hover:bg-cyan-700 transition">+ 新建用户</button>
            </PermGuard>
          </div>
        </div>

        <Table
          columns={[
            { title: '账号', dataIndex: 'username', key: 'username', render: (v) => <span className="font-mono text-sm text-slate-700">{v}</span> },
            { title: '姓名', dataIndex: 'fullName', key: 'fullName', render: (v) => <span className="font-medium text-slate-800">{v || '--'}</span> },
            { title: '所属科室', dataIndex: 'department', key: 'department', render: (v) => v || <span className="text-slate-300">--</span> },
            { title: '角色', key: 'roles', render: (_, u) => (
              <div className="flex flex-wrap gap-1">
                {(u.roles || []).map((r) => (
                  <span key={r.id} className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                    {ROLE_LABEL[r.roleCode] || r.roleName}
                  </span>
                ))}
                {!(u.roles?.length) && <span className="text-xs text-slate-400">未分配</span>}
              </div>
            )},
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {v === 'ACTIVE' ? '启用' : '停用'}
              </span>
            )},
            { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400">{formatDateTime(v)}</span> },
            { title: '操作', key: 'actions', render: (_, u) => (
              <Space size={4}>
                <PermGuard perm="iam.user.assignRole">
                  <button onClick={() => setAssignTarget(u)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition">
                    分配角色
                  </button>
                </PermGuard>
                <PermGuard perm="iam.user.create">
                  <button onClick={() => setEditTarget(u)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 transition">
                    编辑
                  </button>
                  <button
                    onClick={() => handleToggleStatus(u)}
                    disabled={togglingId === u.id}
                    className={`rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
                      u.status === 'ACTIVE'
                        ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}>
                    {togglingId === u.id ? '...' : (u.status === 'ACTIVE' ? '停用' : '启用')}
                  </button>
                  <button onClick={() => setDeleteTarget(u)} title="删除用户"
                    className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75Zm-7.5 4.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.25-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z" fill="currentColor"/>
                    </svg>
                  </button>
                </PermGuard>
              </Space>
            )},
          ]}
          dataSource={paged}
          rowKey="id"
          size="middle"
          pagination={false}
          loading={loading}
        />

        <Pager total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} />
      </section>

      {showCreate && (
        <CreateUserModal roles={roles} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); doRefresh(); }} />
      )}
      {assignTarget && (
        <AssignRoleModal targetUser={assignTarget} roles={roles}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => { setAssignTarget(null); doRefresh(); }} />
      )}
      {editTarget && (
        <EditUserModal targetUser={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); doRefresh(); }} />
      )}
      {deleteTarget && (
        <DeleteUserModal targetUser={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { setDeleteTarget(null); doRefresh(); }} />
      )}
    </div>
  );
}
