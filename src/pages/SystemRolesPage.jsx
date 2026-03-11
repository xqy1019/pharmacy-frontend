import { useMemo, useState } from 'react';
import { Button, Modal, Space, Table } from 'antd';
import { assignRolePerms, createRole, deleteRole, fetchPermissions, fetchRoles } from '../api/pharmacy';
import Pager from '../components/Pager';
import PermGuard from '../components/PermGuard';
import { PERM_GROUPS, PERM_LABEL, ROLE_LABEL } from '../config/permissions';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatDateTime } from '../utils/formatters';

// ── 权限编辑 Modal ────────────────────────────────────────────────────────────
function EditPermModal({ role, permissions, onClose, onSuccess }) {
  const [selected, setSelected] = useState(() => role.permissionIds || []);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const grouped = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc, p) => {
      const g = (p.permCode || '').split('.')[0] || 'other';
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
      return acc;
    }, {});
  }, [permissions]);

  function toggle(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  function toggleGroup(perms) {
    const ids = perms.map((p) => p.id);
    const allOn = ids.every((id) => selected.includes(id));
    setSelected((prev) => allOn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
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
    <Modal open onCancel={onClose} title="编辑权限配置" width={896} destroyOnClose
      footer={[
        <Button key="clear" onClick={() => setSelected([])} style={{ float: 'left' }}>清空全部</Button>,
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSave} loading={saving}>保存权限</Button>,
      ]}>
      <p className="mb-4 text-sm text-slate-400">
        {ROLE_LABEL[role.roleCode] || role.roleName}
        <span className="ml-2 font-mono text-xs">{role.roleCode}</span>
        <span className="ml-2">· 已选 {selected.length} 项</span>
      </p>
      <div className="max-h-[60vh] overflow-y-auto space-y-3">
        {Object.entries(grouped).map(([group, perms]) => {
          const ids = perms.map((p) => p.id);
          const allOn = ids.every((id) => selected.includes(id));
          const someOn = ids.some((id) => selected.includes(id));
          return (
            <div key={group} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <button type="button" onClick={() => toggleGroup(perms)}
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                    allOn  ? 'border-cyan-300 bg-cyan-50 text-cyan-700' :
                    someOn ? 'border-amber-300 bg-amber-50 text-amber-600' :
                             'border-slate-200 bg-white text-slate-400 hover:bg-slate-100'
                  }`}>
                  {allOn ? '全选' : someOn ? '部分' : '全选'}
                </button>
                <span className="text-sm font-medium text-slate-600">{PERM_GROUPS[group] || group}</span>
                <span className="text-xs text-slate-400">{perms.length} 项</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {perms.map((p) => {
                  const isOn = selected.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggle(p.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        isOn ? 'border-cyan-300 bg-cyan-50 text-cyan-700 font-medium'
                             : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}>
                      {PERM_LABEL[p.permCode] || p.permName || p.permCode}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!permissions?.length && <p className="py-8 text-center text-sm text-slate-400">暂无权限数据</p>}
      </div>
    </Modal>
  );
}

// ── 新建角色 Modal ────────────────────────────────────────────────────────────
function CreateRoleModal({ permissions, onClose, onSuccess }) {
  const [form, setForm] = useState({ roleCode: '', roleName: '', description: '' });
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const grouped = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc, p) => {
      const g = (p.permCode || '').split('.')[0] || 'other';
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
      return acc;
    }, {});
  }, [permissions]);

  function toggle(id) {
    setSelectedPerms((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!form.roleCode.trim() || !form.roleName.trim()) { setError('角色编码和名称为必填项'); return; }
    setError(''); setSubmitting(true);
    try {
      const role = await createRole({ roleCode: form.roleCode.trim(), roleName: form.roleName.trim(), status: 'ACTIVE' });
      if (selectedPerms.length > 0) await assignRolePerms(role.id, selectedPerms);
      toast.success('角色创建成功');
      onSuccess();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onCancel={onClose} title="新增角色" width={896} destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="ok" type="primary" onClick={handleSubmit} loading={submitting}>确认创建</Button>,
      ]}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">角色名称 *</label>
            <input value={form.roleName} onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))}
              placeholder="如 护士长"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">角色编码 *</label>
            <input value={form.roleCode} onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value }))}
              placeholder="如 HEAD_NURSE"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-cyan-300" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-slate-500">权限分配（已选 {selectedPerms.length} 项）</label>
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 p-3 space-y-3">
            {Object.entries(grouped).map(([group, perms]) => (
              <div key={group}>
                <p className="mb-1.5 text-xs font-semibold text-slate-400">{PERM_GROUPS[group] || group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((p) => (
                    <button key={p.id} type="button" onClick={() => toggle(p.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        selectedPerms.includes(p.id)
                          ? 'border-cyan-300 bg-cyan-50 text-cyan-700 font-medium'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}>
                      {PERM_LABEL[p.permCode] || p.permName || p.permCode}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    </Modal>
  );
}

// ── 权限标签（行内显示前4个，其余显示+N）────────────────────────────────────
function PermTags({ perms }) {
  const preview = perms.slice(0, 4);
  const rest = perms.length - preview.length;
  if (perms.length === 0) return <span className="text-xs text-slate-300">未分配</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {preview.map((p) => (
        <span key={p.id}
          className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
          {PERM_LABEL[p.permCode] || p.permName || p.permCode}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-400">
          +{rest}
        </span>
      )}
    </div>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function SystemRolesPage() {
  const [refresh, setRefresh] = useState(0);
  const [editRole, setEditRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const toast = useToast();

  const { data: roles, loading } = useAsyncData(fetchRoles, [refresh]);
  const { data: permissions } = useAsyncData(fetchPermissions, []);

  const doRefresh = () => setRefresh((v) => v + 1);

  const SORT_ORDER = ['admin', 'supervisor', 'outpatient_pharmacist', 'inpatient_pharmacist',
    'warehouse_pharmacist', 'anesthesia_pharmacist', 'anesthesiologist', 'dispense_clerk'];

  const BUILT_IN_ROLES = new Set([
    'admin', 'supervisor', 'outpatient_pharmacist', 'inpatient_pharmacist',
    'warehouse_pharmacist', 'anesthesia_pharmacist', 'anesthesiologist',
    'dispense_clerk', 'pharmacist', 'purchaser', 'finance', 'viewer',
  ]);

  const filtered = useMemo(() => {
    if (!roles) return [];
    const kw = applied.trim().toLowerCase();
    const list = kw
      ? roles.filter((r) => [r.roleCode, r.roleName, ROLE_LABEL[r.roleCode]]
          .some((v) => String(v || '').toLowerCase().includes(kw)))
      : roles;
    return [...list].sort((a, b) => {
      const ia = SORT_ORDER.indexOf(a.roleCode);
      const ib = SORT_ORDER.indexOf(b.roleCode);
      if (ia === -1 && ib === -1) return a.id - b.id;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [roles, applied]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  async function handleDelete() {
    if (!deleteTarget) return;
    if (BUILT_IN_ROLES.has(deleteTarget.roleCode)) {
      toast.error('系统内置角色不可删除');
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      toast.success('角色已删除');
      setDeleteTarget(null);
      doRefresh();
    } catch (e) {
      toast.error(e?.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 统计卡 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: '角色总数', value: (roles || []).length, sub: '已配置角色', color: 'from-violet-500 to-purple-500' },
          { label: '启用角色', value: (roles || []).filter((r) => r.status === 'ACTIVE').length, sub: '当前可用', color: 'from-emerald-500 to-teal-500' },
          { label: '权限条目', value: (permissions || []).length, sub: '系统权限总数', color: 'from-cyan-500 to-blue-500' },
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
          <h3 className="text-sm font-semibold text-slate-700">角色列表</h3>
          <div className="ml-4 flex items-center gap-2">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setApplied(keyword); setPage(1); } }}
              placeholder="搜索角色名称或编码..."
              className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-300" />
            <button onClick={() => { setApplied(keyword); setPage(1); }}
              className="rounded-xl bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800 transition">查询</button>
            <button onClick={() => { setKeyword(''); setApplied(''); setPage(1); }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">重置</button>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={doRefresh}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition">刷新</button>
            <PermGuard perm="iam.role.assignPerm">
              <button onClick={() => setShowCreate(true)}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs text-white hover:bg-cyan-700 transition">+ 新增角色</button>
            </PermGuard>
          </div>
        </div>

        <Table
          columns={[
            { title: '角色名称', key: 'roleName', render: (_, role) => <span className="font-medium text-slate-800">{ROLE_LABEL[role.roleCode] || role.roleName}</span> },
            { title: '角色编码', dataIndex: 'roleCode', key: 'roleCode', render: (v) => <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">{v}</span> },
            { title: '已分配权限', key: 'permissions', render: (_, role) => <PermTags perms={role.permissions || []} /> },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {v === 'ACTIVE' ? '启用' : '停用'}
              </span>
            )},
            { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v) => <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(v)}</span> },
            { title: '操作', key: 'actions', render: (_, role) => (
              <PermGuard perm="iam.role.assignPerm">
                <Space size={4}>
                  <button onClick={() => setEditRole(role)} title="编辑权限"
                    className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {BUILT_IN_ROLES.has(role.roleCode) ? (
                    <span title="系统内置角色不可删除"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-slate-100 text-slate-200 cursor-not-allowed">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75Zm-7.5 4.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.25-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z" fill="currentColor"/>
                      </svg>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteTarget(role)} title="删除角色"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75Zm-7.5 4.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.25-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z" fill="currentColor"/>
                      </svg>
                    </button>
                  )}
                </Space>
              </PermGuard>
            )},
          ]}
          dataSource={paged}
          rowKey="id"
          size="middle"
          pagination={false}
          loading={loading}
          locale={{ emptyText: applied ? `未找到匹配"${applied}"的角色` : '暂无角色数据' }}
        />
        <Pager total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </section>

      {/* Modals */}
      {editRole && (
        <EditPermModal role={editRole} permissions={permissions}
          onClose={() => setEditRole(null)}
          onSuccess={() => { setEditRole(null); doRefresh(); }} />
      )}
      {showCreate && (
        <CreateRoleModal permissions={permissions}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); doRefresh(); }} />
      )}

      {/* 删除确认 Modal */}
      {deleteTarget && (
        <Modal open onCancel={() => setDeleteTarget(null)} title="确认删除角色" width={480} destroyOnClose
          footer={[
            <Button key="cancel" onClick={() => setDeleteTarget(null)}>取消</Button>,
            <Button key="ok" type="primary" danger onClick={handleDelete} loading={deleting}>确认删除</Button>,
          ]}>
          <p className="text-sm text-slate-500">
            即将删除角色 <span className="font-medium text-slate-700">「{ROLE_LABEL[deleteTarget.roleCode] || deleteTarget.roleName}」</span>，
            同时移除所有用户与该角色的绑定关系。此操作不可撤销。
          </p>
        </Modal>
      )}
    </div>
  );
}
