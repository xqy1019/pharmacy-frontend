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
    <div className="grid min-h-screen place-items-center p-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(22,48,71,0.08)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#f7fcfd_0%,#eef7fa_100%)] p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,164,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(47,128,237,0.1),transparent_28%)]" />
          <div className="relative">
            <p className="text-sm uppercase tracking-[0.45em] text-cyan-700">Pharmacy Control Tower</p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight text-slate-800">
              智能药房系统
            </h1>
          </div>
        </section>

        <section className="p-8 lg:p-12">
          <div className="mx-auto max-w-md">
            <h2 className="text-3xl font-semibold text-slate-800">登录系统</h2>
            <p className="mt-3 text-sm text-slate-500">使用后端真实账号登录，前端会自动注入 JWT 与 `x-user-id` 请求头。</p>

            <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">用户名</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-400/60 focus:bg-white"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">密码</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-400/60 focus:bg-white"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>

              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? '登录中...' : '进入智能药房系统'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
