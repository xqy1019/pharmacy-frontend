import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { allModules } from '../config/modules';
import { ROLE_LABEL } from '../config/permissions';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import AIAssistant from '../components/AIAssistant';

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
      className="relative min-h-screen bg-[#eef2ff] lg:grid"
      style={{ gridTemplateColumns: collapsed ? '72px minmax(0,1fr)' : '216px minmax(0,1fr)' }}
    >
      <aside className="sticky top-0 z-20 flex h-screen flex-col border-r border-indigo-900/20 bg-gradient-to-b from-[#1e1b4b] via-[#1e1b4b] to-[#0f172a]">
        <div className={`shrink-0 border-b border-white/8 ${collapsed ? 'px-3 py-4' : 'px-4 py-4'}`}>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-900/40">
              药
            </div>
            {!collapsed ? <h1 className="text-[14px] font-semibold tracking-wide text-white/90">智能药房管理系统</h1> : null}
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
                      className={`flex w-full items-center gap-3 rounded-xl transition ${
                        isActive
                          ? 'bg-indigo-500/30 text-white shadow-[inset_0_0_0_1px_rgba(165,180,252,0.15)]'
                          : 'text-slate-400 hover:bg-white/7 hover:text-white'
                      }`}
                      title={collapsed ? item.shortLabel : undefined}
                    >
                      <div className={`grid shrink-0 place-items-center rounded-lg bg-white/6 ${collapsed ? 'h-11 w-11' : 'h-9 w-9'}`}>
                        <span className="text-sm opacity-80">{icon}</span>
                      </div>
                      {!collapsed ? (
                        <div className="flex flex-1 items-center justify-between py-2.5 pr-3">
                          <span className="truncate text-sm font-medium">{item.shortLabel}</span>
                          <span className={`text-xs opacity-60 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                        </div>
                      ) : null}
                    </button>

                    {!collapsed && isExpanded && (
                      <div className="mt-1 ml-3 space-y-0.5 border-l border-indigo-400/20 pl-3">
                        {visibleChildren.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive: active }) =>
                              `block rounded-lg px-3 py-1.5 text-sm transition ${
                                active
                                  ? 'bg-indigo-400/20 font-medium text-indigo-200'
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
                    `flex items-center gap-3 rounded-xl transition ${
                      active
                        ? 'bg-indigo-500/30 text-white shadow-[inset_0_0_0_1px_rgba(165,180,252,0.15)]'
                        : 'text-slate-400 hover:bg-white/7 hover:text-white'
                    }`
                  }
                  title={collapsed ? item.shortLabel : undefined}
                >
                  <div className={`grid shrink-0 place-items-center rounded-lg bg-white/6 ${collapsed ? 'h-11 w-11' : 'h-9 w-9'}`}>
                    <span className="text-sm opacity-80">{icon}</span>
                  </div>
                  {!collapsed ? (
                    <div className="min-w-0 py-2.5">
                      <div className="truncate text-sm font-medium">{item.shortLabel}</div>
                    </div>
                  ) : null}
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/8 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={`flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white ${
              collapsed ? 'h-10' : 'gap-2 px-4 py-2.5'
            }`}
          >
            <span className="text-base">{collapsed ? '»' : '«'}</span>
            {!collapsed ? <span>收起</span> : null}
          </button>
        </div>
      </aside>

      <main className="min-h-screen min-w-0 bg-[#eef2ff]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-indigo-100 bg-white/80 px-6 py-3 shadow-[0_1px_12px_rgba(99,102,241,0.06)] backdrop-blur-md">
          <div>
            {currentPage.parentLabel ? (
              <p className="text-xs text-slate-400">{currentPage.parentLabel} / {currentPage.label}</p>
            ) : (
              <p className="text-xs text-slate-400">欢迎回来，{user?.fullName || user?.username || '系统管理员'}</p>
            )}
            <h2 className="mt-0.5 text-[18px] font-semibold text-slate-900">{currentPage.label}</h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">角色：</span>
            <div className="flex gap-1">
              {roleLabels.length > 0 ? (
                roleLabels.map((label) => (
                  <span key={label} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-100">
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              退出登录
            </button>
          </div>
        </header>

        <div className="px-5 py-4">
          <Outlet />
        </div>
      </main>

      {/* 全局 AI 助手悬浮入口 */}
      <AIAssistant />
    </div>
  );
}

export default AppLayout;
