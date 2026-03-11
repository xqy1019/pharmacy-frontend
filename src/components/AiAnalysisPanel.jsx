/**
 * AiAnalysisPanel — 通用 AI 分析面板（多结果缓存版）
 *
 * 每个分析按钮的结果独立缓存，切换时直接显示已有结果，无需重新生成。
 * 正在生成时其他按钮仍可点击查看已有缓存结果。
 *
 * Props:
 *   actions  Array<{ key, icon, label, getPrompt: () => string | Promise<string> }>
 *   context  object  传给 AI 的页面上下文，如 { page: '库存预警' }
 *   className string  额外样式
 */
import { useRef, useState } from 'react';
import { streamAIChat } from '../api/pharmacy';
import AiMarkdown from './AiMarkdown';

/** 将接口原始错误信息转换为用户友好的中文提示 */
function friendlyError(raw = '') {
  const s = String(raw);
  // HTTP 状态码匹配
  if (s.includes('503') || s.toLowerCase().includes('no available accounts') || s.toLowerCase().includes('overloaded')) {
    return 'AI 服务当前繁忙，请稍后重试';
  }
  if (s.includes('429') || s.toLowerCase().includes('rate limit') || s.toLowerCase().includes('too many requests')) {
    return 'AI 请求过于频繁，请稍等片刻再试';
  }
  if (s.includes('401') || s.toLowerCase().includes('unauthorized') || s.toLowerCase().includes('invalid api key') || s.toLowerCase().includes('authentication')) {
    return 'AI 服务授权失败，请联系管理员检查配置';
  }
  if (s.includes('400') || s.toLowerCase().includes('bad request')) {
    return 'AI 请求参数有误，请刷新页面后重试';
  }
  if (s.includes('500') || s.includes('502') || s.includes('504')) {
    return 'AI 服务暂时不可用，请稍后重试';
  }
  if (s.toLowerCase().includes('network') || s.toLowerCase().includes('failed to fetch') || s.toLowerCase().includes('连接')) {
    return '网络连接失败，请检查网络后重试';
  }
  if (s.toLowerCase().includes('timeout') || s.toLowerCase().includes('超时')) {
    return 'AI 分析超时，数据量较大时请耐心等待或稍后重试';
  }
  // 已有友好提示则直接返回（不含 JSON 特征）
  if (!s.includes('{') && !s.includes('Error') && s.length < 60) return s;
  // 兜底
  return 'AI 分析服务暂时不可用，请稍后重试';
}

export default function AiAnalysisPanel({ actions = [], context = {}, className = '', renderFooter }) {
  // 每个 key 的结果缓存：{ [key]: { text: string, done: boolean } }
  const [cache, setCache] = useState({});
  // 当前展示的 key
  const [activeKey, setActiveKey] = useState(null);
  // 当前正在流式生成的 key（null 表示空闲）
  const [streamingKey, setStreamingKey] = useState(null);
  // 流式生成中的实时文本（生成完成后并入 cache）
  const [streamText, setStreamText] = useState('');
  const abortRef = useRef(null);

  const activeAction = actions.find((a) => a.key === activeKey);
  const activeCache = cache[activeKey];
  // 当前展示区的内容：若是正在生成的 key 则显示实时流，否则显示缓存
  const displayText = activeKey === streamingKey ? streamText : activeCache?.text ?? '';
  const isDisplayStreaming = activeKey === streamingKey;
  const isDisplayDone = activeCache?.done && activeKey !== streamingKey;

  async function runAnalysis(action) {
    // 如果点击的是已有缓存的按钮，直接切换展示，不重新生成
    if (cache[action.key]?.done) {
      setActiveKey(action.key);
      return;
    }

    // 如果已有另一个分析正在流式生成，先中止它（把已生成的部分存入缓存）
    if (streamingKey && streamingKey !== action.key) {
      abortRef.current?.abort();
      setCache((prev) => ({
        ...prev,
        [streamingKey]: { text: streamText, done: true },
      }));
      setStreamText('');
      setStreamingKey(null);
    }

    // 切换展示并开始新的生成
    setActiveKey(action.key);
    setStreamText('');
    setStreamingKey(action.key);

    // 获取 prompt（支持同步/异步）
    let prompt;
    try {
      prompt = await Promise.resolve(action.getPrompt());
    } catch (e) {
      const errText = `⚠️ 数据获取失败，请稍后重试`;
      setCache((prev) => ({ ...prev, [action.key]: { text: errText, done: true } }));
      setStreamText('');
      setStreamingKey(null);
      return;
    }

    abortRef.current = new AbortController();
    let accumulated = '';

    try {
      await streamAIChat(
        [{ role: 'user', content: prompt }],
        {
          onChunk: (chunk) => {
            accumulated += chunk;
            setStreamText(accumulated);
          },
          onDone: () => {
            setCache((prev) => ({ ...prev, [action.key]: { text: accumulated, done: true } }));
            setStreamText('');
            setStreamingKey(null);
          },
          onError: (msg) => {
            const errText = accumulated || `⚠️ ${friendlyError(msg)}`;
            setCache((prev) => ({ ...prev, [action.key]: { text: errText, done: true } }));
            setStreamText('');
            setStreamingKey(null);
          },
        },
        context,
        abortRef.current.signal,
      );
    } catch (e) {
      if (e?.name !== 'AbortError') {
        const errText = `⚠️ ${friendlyError(e.message)}`;
        setCache((prev) => ({ ...prev, [action.key]: { text: errText, done: true } }));
      }
      setStreamText('');
      setStreamingKey(null);
    }
  }

  function stop() {
    abortRef.current?.abort();
    if (streamText && streamingKey) {
      setCache((prev) => ({ ...prev, [streamingKey]: { text: streamText, done: true } }));
    }
    setStreamText('');
    setStreamingKey(null);
  }

  function rerun() {
    if (!activeAction) return;
    // 清除该 key 的缓存，重新生成
    setCache((prev) => {
      const next = { ...prev };
      delete next[activeKey];
      return next;
    });
    runAnalysis(activeAction);
  }

  return (
    <section className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/40 p-5 ${className}`}>
      {/* 头部 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">AI 智能分析</p>
            <p className="text-[11px] text-slate-400">
              {streamingKey
                ? `正在分析「${actions.find((a) => a.key === streamingKey)?.label}」...`
                : Object.keys(cache).length > 0
                  ? `已完成 ${Object.keys(cache).filter((k) => cache[k]?.done).length} / ${actions.length} 项分析`
                  : '基于实时数据，点击按钮触发 AI 分析'}
            </p>
          </div>
        </div>

        {/* 分析按钮组 */}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const cached = cache[action.key];
            const isStreaming = streamingKey === action.key;
            const isActive = activeKey === action.key;
            const isDone = cached?.done && !isStreaming;

            return (
              <button
                key={action.key}
                type="button"
                onClick={() => isStreaming ? setActiveKey(action.key) : runAnalysis(action)}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300'
                }`}
              >
                {/* 生成中：旋转图标 */}
                {isStreaming ? (
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                  </svg>
                ) : (
                  <span>{action.icon}</span>
                )}
                <span>{action.label}</span>
                {/* 已完成：绿色小圆点 */}
                {isDone && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 分析结果区 */}
      {activeKey && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
          {/* 结果头部 */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeAction?.icon}</span>
              <span className="text-sm font-medium text-slate-700">{activeAction?.label}</span>
              {isDisplayStreaming && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-indigo-500" />
                  分析中...
                </span>
              )}
              {isDisplayDone && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">
                  ✓ 分析完成
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {isDisplayStreaming && (
                <button
                  type="button"
                  onClick={stop}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                  停止
                </button>
              )}
              {isDisplayDone && (
                <button
                  type="button"
                  onClick={rerun}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 transition hover:bg-slate-50"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  重新分析
                </button>
              )}
            </div>
          </div>

          {/* 分析内容 */}
          {displayText ? (
            <>
              <AiMarkdown text={displayText} />
              {isDisplayStreaming && (
                <span className="mt-1 inline-flex items-center gap-0.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
                </span>
              )}
              {isDisplayDone && renderFooter?.({ activeKey, isDone: true })}
            </>
          ) : (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              正在加载数据并分析...
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-400">AI 分析结果仅供参考，具体操作请结合实际情况由药师判断</p>
    </section>
  );
}
