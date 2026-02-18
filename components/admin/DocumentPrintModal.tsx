'use client';

import { useRef, useState, useEffect } from 'react';

interface DocumentPrintModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  ar?: boolean;
}

/** نافذة منبثقة قابلة للسحب لعرض المستند - تبقى داخل حدود الشاشة */
export default function DocumentPrintModal({ children, onClose, title, ar }: DocumentPrintModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select')) return;
    setIsDragging(true);
    dragStart.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.startX;
      const dy = e.clientY - dragStart.current.startY;
      const targetX = dragStart.current.startPosX + dx;
      const targetY = dragStart.current.startPosY + dy;
      const el = modalRef.current;
      if (!el) {
        setPos({ x: targetX, y: targetY });
        return;
      }
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = 24;
      const { x: px, y: py } = posRef.current;
      const minX = padding - rect.left + px;
      const maxX = vw - padding - rect.right + px;
      const minY = padding - rect.top + py;
      const maxY = vh - padding - rect.bottom + py;
      setPos({
        x: Math.max(minX, Math.min(maxX, targetX)),
        y: Math.max(minY, Math.min(maxY, targetY)),
      });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-[min(64rem,95vw)] w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          cursor: isDragging ? 'grabbing' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header قابل للسحب */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <span className="text-sm font-semibold text-gray-600">
            {ar ? 'اسحب لتحريك النافذة' : 'Drag to move'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label={ar ? 'إغلاق' : 'Close'}
          >
            ✕
          </button>
        </div>
        {/* المحتوى - scrollable */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
