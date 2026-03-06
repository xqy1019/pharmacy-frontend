import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { allModules } from '../config/modules';
import { ROLE_LABEL } from '../config/permissions';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

const menuIcons = ['◫', '⌂', '▣', '◪', '◩', '◨', '◎', '◌', '◍', '◳', '◰', '◱'];

function findCurrentPage(pathname) {
  for (const module of allModules) {
    if (module.children) {
      const child = module.children.find((c) => c.path === pathname);
      if (child) return { ...child, parentLabel: module.label };
    } else if (module.path === pathname) {
      return module;
    }
  }
  return allModules[0];
}


function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { hasPerm } = usePermission();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState(() => {
    const initial = {};
    for (const m of allModules) {
      if (m.children && m.children.some((c) => location.pathname.startsWith(m.path))) {
        initial[m.key] = true;
      }
    }
    return initial;
  });

  const currentPage = findCurrentPage(location.pathname);

  function toggleExpand(key) {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isParentActive(module) {
    if (!module.children) return false;
    return module.children.some((c) => location.pathname === c.path);
  }

  // 当前用户角色显示名
  const roleLabels = (user?.roles || []).map((r) => ROLE_LABEL[r] || r);

  return (
    <div
      className="relative min-h-screen bg-[#edf3f7] lg:grid"
      style={{ gridTemplateColumns: collapsed ? '88px minmax(0,1fr)' : '220px minmax(0,1fr)' }}
    >
      <aside className="sticky top-0 z-20 flex h-screen flex-col border-r border-slate-200 bg-gradient-to-b from-[#0b2842] to-[#082137]">
        <div className={`shrink-0 border-b border-white/10 ${collapsed ? 'px-4 py-5' : 'px-5 py-5'}`}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              药
            </div>
            {!collapsed ? <h1 className="text-[15px] font-semibold text-white">智能药房管理系统</h1> : null}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-3 py-5' : 'px-3 py-5'}`}>
          <div className="space-y-1">
            {allModules.map((item, index) => {
              // 权限过滤：支持 requiredPerm（单个）和 requiredPerms（数组，任一满足）
              const parentPerms = item.requiredPerms ?? (item.requiredPerm ? [item.requiredPerm] : []);
              const childPerms = (item.children || []).flatMap((c) => c.requiredPerms ?? (c.requiredPerm ? [c.requiredPerm] : []));
              const allPerms = [...parentPerms, ...childPerms];
              const hasAccess = allPerms.length === 0 || allPerms.some((p) => hasPerm(p));
              if (!hasAccess) return null;

              const icon = menuIcons[index % menuIcons.length];
              const hasChildren = item.children && item.children.length > 0;
              const isActive = isParentActive(item) || (!hasChildren && location.pathname === item.path);
              const isExpanded = expandedKeys[item.key];

              if (hasChildren) {
                // 过滤掉无权限的子菜单
                const visibleChildren = item.children.filter((c) => !c.requiredPerm || hasPerm(c.requiredPerm));
                if (visibleChildren.length === 0) return null;

                return (
                  <div key={item.key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!collapsed) toggleExpand(item.key);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl transition ${
                        isActive
                          ? 'bg-emerald-500/35 text-white shadow-[inset_0_0_0_1px_rgba(94,234,212,0.14)]'
                          : 'text-slate-300 hover:bg-white/6 hover:text-white'
                      }`}
                      title={collapsed ? item.shortLabel : undefined}
                    >
                      <div className={`grid shrink-0 place-items-center rounded-xl bg-white/5 ${collapsed ? 'h-12 w-12' : 'h-10 w-10'}`}>
                        <span className="text-sm">{icon}</span>
                      </div>
                      {!collapsed ? (
                        <div className="flex flex-1 items-center justify-between py-3 pr-3">
                          <span className="truncate text-sm font-medium">{item.shortLabel}</span>
                          <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                        </div>
                      ) : null}
                    </button>

                    {!collapsed && isExpanded && (
                      <div className="mt-1 ml-3 space-y-1 border-l border-white/10 pl-3">
                        {visibleChildren.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive: active }) =>
                              `block rounded-xl px-3 py-2 text-sm transition ${
                                active
                                  ? 'bg-white/10 font-medium text-white'
                                  : 'text-slate-400 hover:bg-white/6 hover:text-white'
                              }`
                            }
                          >
                            {child.shortLabel}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive: active }) =>
                    `flex items-center gap-3 rounded-2xl transition ${
                      active
                        ? 'bg-emerald-500/35 text-white shadow-[inset_0_0_0_1px_rgba(94,234,212,0.14)]'
                        : 'text-slate-300 hover:bg-white/6 hover:text-white'
                    }`
                  }
                  title={collapsed ? item.shortLabel : undefined}
                >
                  <div className={`grid shrink-0 place-items-center rounded-xl bg-white/5 ${collapsed ? 'h-12 w-12' : 'h-10 w-10'}`}>
                    <span className="text-sm">{icon}</span>
                  </div>
                  {!collapsed ? (
                    <div className="min-w-0 py-3">
                      <div className="truncate text-sm font-medium">{item.shortLabel}</div>
                    </div>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={`flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm text-slate-200 transition hover:bg-white/10 ${
              collapsed ? 'h-12' : 'gap-2 px-4 py-3'
            }`}
          >
            <span>{collapsed ? '»' : '≡'}</span>
            {!collapsed ? <span>收起菜单</span> : null}
          </button>
        </div>
      </aside>

      <main
        className="min-h-screen min-w-0"
        style={{
          background: 'linear-gradient(180deg, rgba(232,239,244,0.92), rgba(237,243,247,0.96)), radial-gradient(circle at 20% 0%, rgba(14,165,164,0.06), transparent 24%)'
        }}
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
          <div>
            {currentPage.parentLabel ? (
              <p className="text-xs text-slate-400">{currentPage.parentLabel} / {currentPage.label}</p>
            ) : (
              <p className="text-xs text-slate-400">欢迎，{user?.fullName || user?.username || '系统管理员'}</p>
            )}
            <h2 className="mt-0.5 text-xl font-semibold text-slate-800">{currentPage.label}</h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">角色：</span>
            <div className="flex gap-1">
              {roleLabels.length > 0 ? (
                roleLabels.map((label) => (
                  <span key={label} className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">未分配角色</span>
              )}
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              退出登录
            </button>
          </div>
        </header>

        <div className="px-5 py-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
