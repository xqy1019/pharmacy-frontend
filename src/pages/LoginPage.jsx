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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.3),transparent_50%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white shadow-lg">
                药
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-indigo-200">Pharmacy Control Tower</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white">
                智能药房<br />管理系统
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-indigo-200/80">
                统一管理采购、库存、处方、配送全流程
              </p>
            </div>
            <div className="mt-12 flex gap-6 text-indigo-200/60 text-xs">
              <span>安全加密</span>
              <span>·</span>
              <span>权限管控</span>
              <span>·</span>
              <span>全程追溯</span>
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
