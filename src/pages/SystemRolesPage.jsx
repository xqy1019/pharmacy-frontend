import { useMemo, useState } from 'react';
import { assignRolePerms, createRole, deleteRole, fetchPermissions, fetchRoles } from '../api/pharmacy';
import Modal from '../components/Modal';
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
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">编辑权限配置</h2>
          <p className="text-sm text-slate-400">
            {ROLE_LABEL[role.roleCode] || role.roleName}
            <span className="ml-2 font-mono text-xs">{role.roleCode}</span>
            <span className="ml-2">· 已选 {selected.length} 项</span>
          </p>
        </div>
        <button onClick={onClose} className="text-xl leading-none text-slate-300 hover:text-slate-500">✕</button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
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

      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <button type="button" onClick={() => setSelected([])}
          className="text-xs text-slate-400 hover:text-slate-600 transition">清空全部</button>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">取消</button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-xl bg-cyan-600 px-5 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50 transition">
            {saving ? '保存中...' : '保存权限'}
          </button>
        </div>
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
    <Modal onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-800">新增角色</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-300 hover:text-slate-500">✕</button>
      </div>
      <div className="space-y-4 px-6 py-5">
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
      <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <button onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">取消</button>
        <button onClick={handleSubmit} disabled={submitting}
          className="rounded-xl bg-cyan-600 px-5 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50 transition">
          {submitting ? '创建中...' : '确认创建'}
        </button>
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
          <article key={s.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
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
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
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

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">角色名称</th>
                  <th className="px-4 py-3 font-medium">角色编码</th>
                  <th className="px-4 py-3 font-medium">已分配权限</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 font-medium pr-6">操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((role) => (
                  <tr key={role.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                    <td className="px-6 py-3">
                      <span className="font-medium text-slate-800">
                        {ROLE_LABEL[role.roleCode] || role.roleName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">
                        {role.roleCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PermTags perms={role.permissions || []} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        role.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {role.status === 'ACTIVE' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDateTime(role.createdAt)}
                    </td>
                    <td className="px-4 py-3 pr-6">
                      <PermGuard perm="iam.role.assignPerm">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditRole(role)} title="编辑权限"
                            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(role)} title="删除角色"
                            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75Zm-7.5 4.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.25-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z" fill="currentColor"/>
                            </svg>
                          </button>
                        </div>
                      </PermGuard>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {loading ? '加载中...' : (applied ? `未找到匹配"${applied}"的角色` : '暂无角色数据')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
        <Modal onClose={() => setDeleteTarget(null)} maxWidth="max-w-sm">
          <div className="px-6 py-5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" className="text-rose-500">
                <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75Zm-7.5 4.5a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Zm3.25-.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm3.25.75a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-1.5 0v-6Z" fill="currentColor"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800">确认删除角色</h3>
            <p className="mt-2 text-sm text-slate-500">
              即将删除角色 <span className="font-medium text-slate-700">「{ROLE_LABEL[deleteTarget.roleCode] || deleteTarget.roleName}」</span>，
              同时移除所有用户与该角色的绑定关系。此操作不可撤销。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">取消</button>
              <button onClick={handleDelete} disabled={deleting}
                className="rounded-xl bg-rose-500 px-5 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-50 transition">
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
