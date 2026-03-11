import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  fetchDashboardOverview,
  fetchLowStockAlerts,
  fetchNearExpiryAlerts,
  streamAIChat,
} from '../api/pharmacy';

// ── 页面名称映射 ──────────────────────────────────────────────────────────────
const PAGE_NAMES = {
  '/': '仪表盘',
  '/drug-master': '药品档案',
  '/procurement': '采购管理',
  '/inventory': '库存管理',
  '/inventory/alerts': '库存预警',
  '/inventory/locations': '库位管理',
  '/warehouse': '仓库操作',
  '/allocation': '调拨管理',
  '/dispensing': '审方发药',
  '/sales': '销售管理',
  '/stocktake': '盘点管理',
  '/quality': '质量管理',
  '/analytics': '数据报表',
  '/system': '系统管理',
  '/system/users': '用户管理',
  '/system/roles': '角色管理',
  '/system/audit': '审计日志',
};

// ── 数据型快捷按钮（拉取实时数据后发给 AI）────────────────────────────────────
const DATA_BUTTONS = [
  {
    key: 'stock_alert',
    icon: '📦',
    label: '库存预警',
    getPrompt: async () => {
      const alerts = await fetchLowStockAlerts().catch(() => []);
      if (!alerts?.length) return '当前药房没有低库存预警，库存状态良好，请给出维持建议。';
      const items = alerts
        .map((a) => `- ${a.drugName}：库存 ${a.currentQty}，阈值 ${a.threshold}，缺口 ${Math.max(0, a.threshold - a.currentQty)}`)
        .join('\n');
      return `请分析以下药房低库存预警（共 ${alerts.length} 条），按🔴紧急/🟡关注/🟢暂缓分级，并给出补货优先级建议：\n\n${items}`;
    },
  },
  {
    key: 'expiry',
    icon: '⏰',
    label: '有效期风险',
    getPrompt: async () => {
      const alerts = await fetchNearExpiryAlerts().catch(() => []);
      if (!alerts?.length) return '当前药房没有近效期预警，效期管理状态良好。';
      const today = new Date();
      const items = alerts
        .map((a) => {
          const daysLeft = Math.ceil((new Date(a.expiryDate) - today) / (1000 * 60 * 60 * 24));
          return `- ${a.drugName}（批号 ${a.batchNo}）：可售 ${a.availableQty}，距到期 ${daysLeft} 天`;
        })
        .join('\n');
      return `请分析以下近效期药品批次（共 ${alerts.length} 批），评估🔴高/🟡中/🟢低风险，并给出调拨/退货/报损等处置建议：\n\n${items}`;
    },
  },
  {
    key: 'overview',
    icon: '📊',
    label: '今日概况',
    getPrompt: async () => {
      const d = await fetchDashboardOverview().catch(() => ({}));
      const lines = Object.entries(d)
        .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n');
      return `请根据以下药房今日运营数据，给出简洁的运营分析（关键指标解读、异常提示、建议关注点）：\n\n${lines || JSON.stringify(d, null, 2)}`;
    },
  },
  {
    key: 'restock',
    icon: '🛒',
    label: '补货建议',
    getPrompt: async () => {
      const alerts = await fetchLowStockAlerts().catch(() => []);
      if (!alerts?.length) return '当前没有需要补货的药品，库存状态良好。';
      const items = alerts
        .map((a) => `- ${a.drugName}：缺口 ${Math.max(0, a.threshold - a.currentQty)}，建议补货量（阈值150%）：${Math.ceil(a.threshold * 1.5 - a.currentQty)}`)
        .join('\n');
      return `请根据以下低库存情况，给出补货建议（优先级排序 + 具体补货量 + 注意事项）：\n\n${items}`;
    },
  },
];

// ── 通用快捷提问 ──────────────────────────────────────────────────────────────
const BASE_PROMPTS = [
  { icon: '💊', label: '药物相互作用', prompt: '阿司匹林和华法林联用有什么风险？如何处理？' },
  { icon: '👴', label: '特殊人群用药', prompt: '老年患者（>65岁）用药需要特别注意哪些方面？' },
  { icon: '🌡️', label: '冷链管理要点', prompt: '冷链药品的储存和运输有哪些关键注意事项？' },
  { icon: '⚠️', label: '高警示药品管理', prompt: '药房常见的高警示药品有哪些？管理要点是什么？' },
];

// ── 页面特定快捷提问 ──────────────────────────────────────────────────────────
const PAGE_PROMPTS = {
  '/': [
    { icon: '📊', label: '如何解读 KPI', prompt: '仪表盘上哪些 KPI 指标最能反映药房运营健康状况？' },
    { icon: '🔔', label: '处理库存预警', prompt: '收到药品低库存预警后，应该如何快速处理？' },
  ],
  '/dispensing': [
    { icon: '🔍', label: '审方核心要点', prompt: '处方审核时需要重点关注哪些方面？列出最重要的检查项' },
    { icon: '⚗️', label: '配伍禁忌速查', prompt: '如何快速判断处方中是否存在配伍禁忌？' },
    { icon: '📏', label: '特殊剂量核查', prompt: '如何核查儿童和老年患者的用药剂量是否合适？' },
  ],
  '/inventory': [
    { icon: '📦', label: '预警阈值设置', prompt: '如何为不同药品合理设置库存预警阈值？有什么方法论？' },
    { icon: '📊', label: '周转率优化', prompt: '库存周转率偏低说明什么问题？如何改善？' },
  ],
  '/procurement': [
    { icon: '📋', label: '采购计划制定', prompt: '如何根据历史销量和季节性因素制定合理的采购计划？' },
    { icon: '🏭', label: '供应商评估', prompt: '评估药品供应商时需要重点考察哪些方面？' },
  ],
  '/warehouse': [
    { icon: '📥', label: '入库验收要点', prompt: '药品入库验收时需要逐项检查哪些内容？' },
    { icon: '📤', label: '先进先出执行', prompt: '药品出库时"先进先出"原则怎么落实？有哪些操作要点？' },
  ],
  '/allocation': [
    { icon: '🔄', label: '调拨差异处理', prompt: '药品调拨时发现实收数量与发货数量不符，如何处理？' },
    { icon: '🚀', label: '紧急调拨流程', prompt: '临床科室紧急申请药品调拨时，应如何快速处理？' },
  ],
  '/sales': [
    { icon: '🔍', label: '追溯码查询', prompt: '如何利用药品追溯码进行来源查询和真伪验证？' },
    { icon: '↩️', label: '退货处理规范', prompt: '患者申请退药时，应遵循什么流程？哪些情况不能退？' },
  ],
  '/stocktake': [
    { icon: '📋', label: '盘点流程规范', prompt: '药房库存盘点时应按什么流程进行？如何减少差异？' },
    { icon: '⚖️', label: '差异原因分析', prompt: '盘点发现账实不符时，常见的原因有哪些？如何排查？' },
  ],
  '/quality': [
    { icon: '🚨', label: '召回处置流程', prompt: '收到药品召回通知后，规范的处置流程是什么？' },
    { icon: '❄️', label: '冷链异常处理', prompt: '发现冷链药品运输/储存中温度异常，应如何处理？' },
  ],
  '/analytics': [
    { icon: '📈', label: '关键报表指标', prompt: '药房数据报表中，哪些指标最能反映运营健康状况？' },
    { icon: '🔮', label: '需求预测方法', prompt: '如何通过历史销量数据预测药品需求，避免断货或积压？' },
  ],
};

// ── 内联 Markdown 渲染（粗体、斜体、内联代码） ────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-rose-600">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ── Markdown 渲染器（支持代码块、标题、列表、分割线） ─────────────────────────
function RenderMd({ text }) {
  if (!text) return null;

  // 先按代码块分割
  const segments = [];
  const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIdx = 0;
  let match;
  while ((match = codeBlockRe.exec(text)) !== null) {
    if (match.index > lastIdx) segments.push({ type: 'text', content: text.slice(lastIdx, match.index) });
    segments.push({ type: 'code', lang: match[1], content: match[2] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) segments.push({ type: 'text', content: text.slice(lastIdx) });
  if (segments.length === 0) segments.push({ type: 'text', content: text });

  return (
    <div className="space-y-1 leading-relaxed text-[13px]">
      {segments.map((seg, si) => {
        if (seg.type === 'code') {
          return (
            <pre key={si} className="my-1.5 overflow-x-auto rounded-lg bg-slate-800 p-3 font-mono text-[11px] leading-5 text-slate-100">
              {seg.lang && <div className="mb-1.5 text-[10px] text-slate-400">{seg.lang}</div>}
              <code>{seg.content.trim()}</code>
            </pre>
          );
        }

        // 按行处理文本段
        const lines = seg.content.split('\n');
        const elements = [];
        let listItems = [];
        let orderedItems = [];

        const flushList = () => {
          if (listItems.length > 0) {
            elements.push(
              <ul key={`ul-${elements.length}`} className="my-0.5 space-y-0.5 pl-1">
                {listItems.map((item, j) => (
                  <li key={j} className="flex gap-1.5">
                    <span className="mt-[4px] shrink-0 h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>,
            );
            listItems = [];
          }
          if (orderedItems.length > 0) {
            elements.push(
              <ol key={`ol-${elements.length}`} className="my-0.5 space-y-0.5 pl-4 list-decimal">
                {orderedItems.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>,
            );
            orderedItems = [];
          }
        };

        lines.forEach((line, li) => {
          if (!line.trim()) { flushList(); elements.push(<div key={`br-${li}`} className="h-1" />); return; }

          const orderedMatch = line.match(/^\d+\.\s+(.*)/);
          if (orderedMatch) { if (listItems.length > 0) flushList(); orderedItems.push(orderedMatch[1]); return; }

          if (/^[-•*]\s/.test(line.trim())) { if (orderedItems.length > 0) flushList(); listItems.push(line.trim().slice(2)); return; }

          flushList();

          if (/^---+$/.test(line.trim())) { elements.push(<hr key={li} className="my-1.5 border-slate-200" />); return; }
          if (line.startsWith('### ')) { elements.push(<p key={li} className="mt-2 text-[12px] font-semibold text-slate-700">{renderInline(line.slice(4))}</p>); return; }
          if (line.startsWith('## ')) { elements.push(<p key={li} className="mt-2 font-semibold text-slate-800">{renderInline(line.slice(3))}</p>); return; }
          if (line.startsWith('# ')) { elements.push(<p key={li} className="mt-2 font-bold text-slate-900">{renderInline(line.slice(2))}</p>); return; }

          elements.push(<p key={li}>{renderInline(line)}</p>);
        });

        flushList();
        return <div key={si}>{elements}</div>;
      })}
    </div>
  );
}

// ── 消息气泡 ──────────────────────────────────────────────────────────────────
function ChatBubble({ role, content, streaming, time }) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard?.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const timeStr = time
    ? new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`group flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white shadow-sm">
          智
        </div>
      )}
      <div className={`flex min-w-0 max-w-[82%] flex-col gap-0.5 ${isUser ? 'items-end' : ''}`}>
        <div
          className={`break-words rounded-2xl px-3.5 py-2.5 text-[13px] shadow-sm ${
            isUser
              ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
              : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'
          }`}
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
          {isUser ? content : <RenderMd text={content} />}
          {streaming && (
            <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
              <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '0ms' }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 animate-bounce rounded-full bg-indigo-400" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 px-0.5 ${isUser ? 'flex-row-reverse' : ''}`}>
          {timeStr && <span className="text-[10px] text-slate-300">{timeStr}</span>}
          {!streaming && !isUser && (
            <button
              type="button"
              onClick={copyText}
              className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
            >
              {copied ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  已复制
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  复制
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 思考中动画（未开始输出时） ────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white shadow-sm">
        智
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const currentPage = location.pathname;
  const currentPageName = PAGE_NAMES[currentPage] || '系统';

  // 动态快捷提问：当前页面相关（最多3条）+ 通用补足到5条
  const quickPrompts = useMemo(() => {
    const pageSpecific = PAGE_PROMPTS[currentPage] || [];
    return [...pageSpecific.slice(0, 3), ...BASE_PROMPTS].slice(0, 5);
  }, [currentPage]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  function stopStreaming() {
    abortRef.current?.abort();
    if (streamText) {
      setMessages((prev) => [...prev, { role: 'assistant', content: streamText, time: Date.now() }]);
      setStreamText('');
    }
    setStreaming(false);
  }

  // 数据型按钮：先拉取实时数据，再构建 prompt 发送
  const [loadingDataKey, setLoadingDataKey] = useState(null);

  async function sendDataQuery(btn) {
    if (streaming || loadingDataKey) return;
    setLoadingDataKey(btn.key);
    let prompt;
    try {
      prompt = await btn.getPrompt();
    } catch {
      prompt = `请帮我分析药房的${btn.label}情况。`;
    } finally {
      setLoadingDataKey(null);
    }
    // 显示给用户看的文字 vs 实际发给 AI 的 prompt 分离
    await sendMessage(prompt, `${btn.icon} ${btn.label}`);
  }

  async function sendMessage(text, displayText) {
    const userMsg = (displayText || text).trim();
    const aiContent = (text || displayText).trim();
    if (!aiContent || streaming) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg, time: Date.now() }];
    setMessages(newMessages);
    setStreamText('');
    setStreaming(true);

    abortRef.current = new AbortController();
    // 最后一条用户消息用实际 AI 内容（可能包含数据），历史消息保持显示内容
    const apiMessages = [
      ...newMessages.slice(0, -1).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: aiContent },
    ];

    let accumulated = '';
    try {
      await streamAIChat(
        apiMessages,
        {
          onChunk: (chunk) => {
            accumulated += chunk;
            setStreamText(accumulated);
          },
          onDone: () => {
            setMessages((prev) => [...prev, { role: 'assistant', content: accumulated, time: Date.now() }]);
            setStreamText('');
            setStreaming(false);
          },
          onError: (msg) => {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: `⚠️ ${msg || 'AI 服务暂时不可用，请稍后重试'}`, time: Date.now() },
            ]);
            setStreamText('');
            setStreaming(false);
          },
        },
        { page: currentPageName },
        abortRef.current.signal,
      );
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${e.message || '请求失败，请检查网络'}`, time: Date.now() },
        ]);
      }
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
    if (streaming) stopStreaming();
    setMessages([]);
    setStreamText('');
  }

  const isEmpty = messages.length === 0 && !streamText;

  return (
    <>
      {/* ── 悬浮按钮 ────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="药师小智 AI 助手"
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-2xl shadow-lg transition-all duration-200 ${
          open
            ? 'scale-95 bg-indigo-700 text-white shadow-indigo-300/40'
            : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-300/50 hover:scale-105 hover:shadow-xl hover:shadow-indigo-300/60'
        }`}
        style={{ width: 52, height: 52 }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.03 2 11c0 2.55 1.12 4.84 2.93 6.47L4 22l4.72-1.63A10.3 10.3 0 0012 21c5.52 0 10-4.03 10-9S17.52 2 12 2z" />
            <circle cx="8.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="11" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        )}
        {!open && messages.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
      </button>

      {/* ── 对话面板 ─────────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-[72px] right-6 z-50 flex w-[480px] flex-col overflow-hidden rounded-2xl border border-white/60 bg-[#f5f6ff] shadow-[0_12px_48px_rgba(99,102,241,0.2),0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ${
          open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-5 opacity-0'
        }`}
        style={{ maxHeight: 'min(680px, calc(100vh - 100px))' }}
      >
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white ring-1 ring-white/30">
              智
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-1 ring-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">药师小智</p>
              <p className="text-[10px] text-indigo-200">当前：{currentPageName} · Claude AI</p>
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
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-indigo-200 transition hover:bg-white/15 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 消息区 */}
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3" style={{ minHeight: 380 }}>
          {isEmpty ? (
            /* 欢迎页 */
            <div className="flex h-full flex-col items-center justify-center gap-5 py-2">
              <div className="flex flex-col items-center gap-2.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-3xl shadow-sm">
                  💊
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">你好，我是药师小智</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {currentPage === '/'
                      ? '专业药学问题、系统操作、数据分析'
                      : `正在 ${currentPageName} · 问我任何问题`}
                  </p>
                </div>
              </div>

              {/* 快捷提问列表 */}
              <div className="w-full space-y-1.5">
                {quickPrompts.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(q.prompt)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-sm"
                  >
                    <span className="shrink-0 text-base">{q.icon}</span>
                    <span className="flex-1">{q.label}</span>
                    <svg className="shrink-0 opacity-30" width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 消息列表 */
            <>
              {messages.map((msg, i) => (
                <ChatBubble key={i} role={msg.role} content={msg.content} time={msg.time} />
              ))}
              {streaming && streamText
                ? <ChatBubble role="assistant" content={streamText} streaming />
                : streaming
                  ? <ThinkingDots />
                  : null}
              <div ref={msgEndRef} />
            </>
          )}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5">
          {/* 数据型快捷按钮 */}
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {DATA_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                disabled={streaming || loadingDataKey !== null}
                onClick={() => sendDataQuery(btn)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingDataKey === btn.key ? (
                  <svg className="animate-spin" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                  </svg>
                ) : (
                  <span>{btn.icon}</span>
                )}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题… Enter 发送 / Shift+Enter 换行"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 placeholder:text-slate-300"
              style={{ maxHeight: 96, overflowY: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
              }}
            />
            {streaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                title="停止生成"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm transition hover:bg-rose-600"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-slate-300">
            AI 建议仅供参考，临床决策以药师判断为准
          </p>
        </div>
      </div>
    </>
  );
}
