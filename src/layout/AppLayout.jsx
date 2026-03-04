import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { allModules } from '../config/modules';
import { useAuth } from '../context/AuthContext';

const Shell = styled.div`
  min-height: 100vh;
  position: relative;
  background: #edf3f7;
`;

const Sidebar = styled.aside`
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: linear-gradient(180deg, #0b2842 0%, #082137 100%);
`;

const Content = styled.main`
  background:
    linear-gradient(180deg, rgba(232, 239, 244, 0.92), rgba(237, 243, 247, 0.96)),
    radial-gradient(circle at 20% 0%, rgba(14, 165, 164, 0.06), transparent 24%);
`;

const menuIcons = ['◫', '⌂', '▣', '◪', '◩', '◨', '◎', '◌', '◍', '◳'];

function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const currentModule = allModules.find((item) => item.path === location.pathname) ?? allModules[0];

  return (
    <Shell
      className="lg:grid"
      style={{
        gridTemplateColumns: collapsed ? '88px minmax(0,1fr)' : '220px minmax(0,1fr)'
      }}
    >
      <Sidebar className="sticky top-0 z-20 flex h-screen flex-col">
        <div className={`shrink-0 border-b border-white/10 ${collapsed ? 'px-4 py-5' : 'px-5 py-5'}`}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              药
            </div>
            {!collapsed ? <h1 className="text-[15px] font-semibold text-white">智能药房管理系统</h1> : null}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-3 py-5' : 'px-3 py-5'}`}>
          <div className="space-y-2">
            {allModules.map((item, index) => {
              const icon = menuIcons[index % menuIcons.length];

              return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl transition ${
                        isActive
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
      </Sidebar>

      <Content className="min-w-0 min-h-screen px-4 py-4 md:px-6 md:py-6 lg:px-8">
        <header className="mb-4 flex min-h-[68px] items-center justify-between rounded-[20px] border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm text-slate-400">欢迎，{user?.fullName || user?.username || '系统管理员'}</p>
            <h2 className="mt-1 text-[28px] font-semibold text-slate-800">{currentModule.label}</h2>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">角色：</span>
            <span className="font-medium text-slate-700">{user?.username || 'admin'}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              退出登录
            </button>
          </div>
        </header>

        <Outlet />
      </Content>
    </Shell>
  );
}

export default AppLayout;
