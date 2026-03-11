/**
 * AiMarkdown — 轻量 Markdown 渲染器
 * 支持：代码块、内联代码、标题、粗体/斜体、有序/无序列表、分割线
 */

function renderInline(text) {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return <code key={i} className="mx-0.5 rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-rose-600">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function AiMarkdown({ text, className = '' }) {
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
    <div className={`space-y-1 leading-relaxed text-[13px] text-slate-700 ${className}`}>
      {segments.map((seg, si) => {
        if (seg.type === 'code') {
          return (
            <pre key={si} className="my-1.5 overflow-x-auto rounded-lg bg-slate-800 p-3 font-mono text-[11px] leading-5 text-slate-100">
              {seg.lang && <div className="mb-1.5 text-[10px] text-slate-400">{seg.lang}</div>}
              <code>{seg.content.trim()}</code>
            </pre>
          );
        }

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
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>,
            );
            listItems = [];
          }
          if (orderedItems.length > 0) {
            elements.push(
              <ol key={`ol-${elements.length}`} className="my-0.5 space-y-0.5 pl-5 list-decimal">
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

          const om = line.match(/^\d+\.\s+(.*)/);
          if (om) { if (listItems.length > 0) flushList(); orderedItems.push(om[1]); return; }
          if (/^[-•*]\s/.test(line.trim())) { if (orderedItems.length > 0) flushList(); listItems.push(line.trim().slice(2)); return; }

          flushList();

          if (/^---+$/.test(line.trim())) { elements.push(<hr key={li} className="my-2 border-slate-200" />); return; }
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
