import { useEffect, useRef, useState } from 'react';
import { streamAIChat } from '../api/pharmacy';

// ── 简单 Markdown 渲染 ────────────────────────────────────────────────────────
function RenderMd({ text }) {
  const lines = (text || '').split('\n');
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-0.5" />;
        if (line.startsWith('## ')) return <p key={i} className="mt-1.5 font-semibold text-slate-800">{line.slice(3)}</p>;
        if (line.startsWith('# ')) return <p key={i} className="mt-1.5 font-bold text-slate-900">{line.slice(2)}</p>;
        const isList = /^[-•*]\s/.test(line.trim());
        const content = isList ? line.trim().slice(2) : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
            : p
        );
        return isList
          ? <div key={i} className="flex gap-1.5"><span className="mt-1 shrink-0 text-slate-400">·</span><span>{rendered}</span></div>
          : <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

// ── 快捷提问列表 ──────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: '💊', label: '药物相互作用', prompt: '阿司匹林和华法林联用有什么风险？如何处理？' },
  { icon: '📋', label: '审方要点', prompt: '处方审核时需要重点关注哪些内容？' },
  { icon: '🌡️', label: '冷链药品', prompt: '冷链药品的储存和运输有哪些关键注意事项？' },
  { icon: '⚠️', label: '高警示药品', prompt: '药房常见的高警示药品有哪些？管理要点是什么？' },
];

// ── 单条消息 ──────────────────────────────────────────────────────────────────
function ChatBubble({ role, content, streaming }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white shadow-sm">
          智
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          isUser
            ? 'rounded-tr-sm bg-indigo-600 text-white'
            : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'
        }`}
      >
        {isUser ? content : <RenderMd text={content} />}
        {streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-400 align-middle" />
        )}
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);        // [{role, content}]
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');    // 正在生成的文字
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);

  // 滚动到最新消息
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // 打开时自动聚焦输入框
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function sendMessage(text) {
    const userMsg = text.trim();
    if (!userMsg || streaming) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setStreamText('');
    setStreaming(true);

    let accumulated = '';
    try {
      await streamAIChat(newMessages, {
        onChunk: (chunk) => {
          accumulated += chunk;
          setStreamText(accumulated);
        },
        onDone: () => {
          setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
          setStreamText('');
          setStreaming(false);
        },
        onError: (msg) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `⚠ ${msg || 'AI 服务暂时不可用，请稍后重试'}` },
          ]);
          setStreamText('');
          setStreaming(false);
        },
      });
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠ ${e.message || '请求失败，请检查网络'}` },
      ]);
      setStreamText('');
      setStreaming(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setStreamText('');
  }

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="药师小智 AI 助手"
        className={`fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-2xl shadow-lg shadow-indigo-300/50 transition-all duration-200 ${
          open
            ? 'bg-indigo-700 text-white scale-95'
            : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:scale-105 hover:shadow-xl hover:shadow-indigo-300/60'
        }`}
        style={{ width: 52, height: 52 }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.03 2 11c0 2.55 1.12 4.84 2.93 6.47L4 22l4.72-1.63A10.3 10.3 0 0012 21c5.52 0 10-4.03 10-9S17.52 2 12 2z"/>
            <circle cx="8.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="11" r="1.2" fill="currentColor" stroke="none"/>
            <circle cx="15.5" cy="11" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
        )}
        {/* 未读小红点（有对话时显示） */}
        {!open && messages.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
      </button>

      {/* 对话面板 */}
      <div
        className={`fixed bottom-[72px] right-6 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-white bg-[#f8f9ff] shadow-[0_8px_40px_rgba(99,102,241,0.18)] transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ maxHeight: 'min(580px, calc(100vh - 100px))' }}
      >
        {/* 面板头部 */}
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white">
              智
            </div>
            <div>
              <p className="text-sm font-semibold text-white">药师小智</p>
              <p className="text-[10px] text-indigo-200">AI 智能助手 · 专业药学顾问</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                title="清空对话"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 transition hover:bg-white/15 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 transition hover:bg-white/15 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 消息区 */}
        <div className="flex-1 overflow-y-auto px-3 py-3" style={{ minHeight: 280 }}>
          {isEmpty ? (
            /* 空状态：欢迎语 + 快捷提问 */
            <div className="flex h-full flex-col items-center justify-center gap-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-2xl">
                💊
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">你好，我是药师小智</p>
                <p className="mt-1 text-xs text-slate-400">专业药学问题、审方建议、系统操作</p>
              </div>
              <div className="w-full space-y-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => sendMessage(q.prompt)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <span>{q.icon}</span>
                    <span>{q.label}</span>
                    <svg className="ml-auto opacity-40" width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 消息列表 */
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} />
              ))}
              {/* 流式生成中的消息 */}
              {streaming && (
                <ChatBubble role="assistant" content={streamText} streaming />
              )}
              <div ref={msgEndRef} />
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-slate-200 bg-white px-3 py-2.5">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，Enter 发送，Shift+Enter 换行"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white disabled:opacity-60 placeholder:text-slate-300"
              style={{ maxHeight: 96, overflowY: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {streaming ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-center text-[10px] text-slate-300">AI 建议仅供参考，临床决策以药师判断为准</p>
        </div>
      </div>
    </>
  );
}
