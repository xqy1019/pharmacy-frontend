import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let _id = 0;

const TYPE_STYLES = {
  success: 'border-l-emerald-500 bg-white text-emerald-700',
  error:   'border-l-rose-500 bg-white text-rose-700',
  info:    'border-l-cyan-500 bg-white text-slate-700',
  warning: 'border-l-amber-500 bg-white text-amber-700',
};

const TYPE_ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`flex min-w-[260px] max-w-sm items-start gap-3 rounded-2xl border border-l-4 border-slate-200 px-4 py-3 shadow-lg transition-all ${TYPE_STYLES[toast.type]}`}
    >
      <span className="mt-0.5 shrink-0 text-sm font-bold">{TYPE_ICONS[toast.type]}</span>
      <span className="flex-1 text-sm leading-5">{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-600 text-xs leading-none mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const add = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => remove(id), duration);
  }, [remove]);

  const toast = {
    success: (msg, d) => add(msg, 'success', d),
    error:   (msg, d) => add(msg, 'error', d),
    info:    (msg, d) => add(msg, 'info', d),
    warning: (msg, d) => add(msg, 'warning', d),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
