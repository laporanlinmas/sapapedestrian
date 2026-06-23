import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';

interface FullscreenViewerProps {
  open: boolean;
  onClose: () => void;
  src: string;
  title: string;
}

export default function FullscreenViewer({ open, onClose, src, title }: FullscreenViewerProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const hasMoved = useRef(false);
  // Track if viewer has ever been opened — only then render the portal
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (open) setEverOpened(true);
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Reset button position when opened
  useEffect(() => {
    if (open) setPos({ x: 16, y: 16 });
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!btnRef.current) return;
    dragging.current = true;
    hasMoved.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    btnRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    hasMoved.current = true;
    const btn = btnRef.current!;
    const nx = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, e.clientX - offset.current.x));
    const ny = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, e.clientY - offset.current.y));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!hasMoved.current) onClose();
  };

  if (!everOpened) return null;

  return createPortal(
    // visibility:hidden keeps iframe in DOM (no reload), display:none would also work
    // but visibility preserves layout; we use pointer-events:none when hidden
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Iframe — always mounted, never reloads */}
      <iframe
        src={src}
        title={title}
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
      />

      {/* Draggable floating back button */}
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title="Kembali"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 10px 6px 8px',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'grab',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          userSelect: 'none',
          touchAction: 'none',
          boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
        }}
      >
        <ChevronLeft style={{ width: 14, height: 14, flexShrink: 0 }} />
        <span>Kembali</span>
      </button>
    </div>,
    document.body
  );
}
