import { useEffect } from 'react';

// 通用 Modal 容器：支持 ESC 关闭 + 点击遮罩关闭
function Modal({ onClose, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full ${maxWidth} flex flex-col max-h-[92vh] rounded-2xl bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)]`}>
        {children}
      </div>
    </div>
  );
}

export default Modal;
