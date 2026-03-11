import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form);
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#eef2ff] p-6" style={{backgroundImage: 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.1) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(6,182,212,0.07) 0%, transparent 50%)'}}>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-[0_8px_32px_rgba(99,102,241,0.12),0_32px_80px_rgba(99,102,241,0.08)] lg:grid-cols-[1fr_1fr]">
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 lg:p-12">
          {/* 背景装饰 */}
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-violet-500/20" />
          <div className="absolute top-1/2 right-8 h-32 w-32 -translate-y-1/2 rounded-full bg-indigo-400/10" />

          <div className="relative flex h-full flex-col justify-center gap-10">
            {/* 图标 + 标题 */}
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-9 w-9" fill="none">
                    <rect x="4" y="14" width="40" height="28" rx="5" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
                    <path d="M16 6h16v10H16z" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
                    <circle cx="24" cy="30" r="7" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
                    <path d="M24 25v10M19 30h10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h1 className="text-[1.75rem] font-bold leading-snug text-white whitespace-nowrap tracking-tight">
                  智能药房管理系统
                </h1>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                统一管理采购、库存、处方、配送全流程
              </p>
            </div>

            {/* 特性标签 */}
            <div className="flex flex-col gap-3">
              {[
                { icon: '🔒', label: '安全加密', desc: '全链路数据加密传输' },
                { icon: '🛡️', label: '权限管控', desc: '细粒度角色权限体系' },
                { icon: '🔍', label: '全程追溯', desc: '药品全生命周期记录' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/50">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-10 lg:p-12">
          <div className="mx-auto max-w-sm">
            <h2 className="text-2xl font-bold text-slate-900">欢迎登录</h2>
            <p className="mt-2 text-sm text-slate-400">请输入您的账号信息</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-600">用户名</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-600">密码</span>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>

              {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 font-semibold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? '登录中...' : '登录系统'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
