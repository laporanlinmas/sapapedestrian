'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react';
import type { GalleryItem } from '@/lib/galleryClient';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Pratinjau foto (lightbox) — HANYA di halaman /galeri
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Dirender lewat portal ke <body>. Itu wajib: section pemanggil berada di
 *  dalam elemen .reveal yang memakai CSS `transform`, dan `transform`
 *  menjadikan elemen itu containing block — sehingga `position: fixed`
 *  merujuk ke .reveal, bukan ke viewport. Akibatnya lightbox tidak menutupi
 *  layar dan navbar tampak menimpanya.
 *
 *  Kalau foto besar gagal dimuat, foto tersebut ditandai dan lightbox
 *  melompat ke foto berikutnya — agar pengguna tidak terjebak di layar kosong.
 */

interface Props {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onError: (id: string) => void;
}

export default function PhotoLightbox({ items, index, onClose, onNavigate, onError }: Props) {
  const aktif = index !== null ? items[index] : null;
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageStatus, setImageStatus] = useState<{ id: string; status: 'loading' | 'loaded' | 'error' }>({
    id: '',
    status: 'loading',
  });
  const imageLoading = aktif ? imageStatus.id !== aktif.id || imageStatus.status === 'loading' : false;
  const imageFailed = aktif && imageStatus.id === aktif.id && imageStatus.status === 'error';

  useEffect(() => {
    if (index === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!items.length) return;
      if (e.key === 'ArrowRight') onNavigate((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onNavigate]);

  useEffect(() => {
    if (!aktif) return;
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      setImageStatus({ id: aktif.id, status: 'loaded' });
    }
  }, [aktif?.id]);

  if (!aktif) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1050] flex flex-col bg-slate-950/[0.98]"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto"
    >
      <div className="flex items-center justify-between gap-3 px-4 h-12 shrink-0 text-white border-b border-white/10">
        <span className="text-xs font-semibold truncate">{aktif.tanggal}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pratinjau"
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center p-3 sm:p-6">
        {index !== null && index > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(index - 1)}
            aria-label="Foto sebelumnya"
            className="absolute left-2 sm:left-4 z-10 h-10 w-10 flex items-center justify-center
                       rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="relative flex h-full w-full items-center justify-center">
          <img
            ref={imageRef}
            key={aktif.id}
            src={aktif.large}
            alt={`Dokumentasi laporan ${aktif.tanggal}`}
            draggable={false}
            data-protected-img=""
            onLoad={() => setImageStatus({ id: aktif.id, status: 'loaded' })}
            onError={() => {
              setImageStatus({ id: aktif.id, status: 'error' });
              onError(aktif.id);
              if (items.length > 1 && index !== null) {
                onNavigate(index === items.length - 1 ? index - 1 : index);
              }
            }}
            className={`block max-h-[calc(100dvh-7.5rem)] max-w-full object-contain rounded-lg select-none transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          />
          {imageLoading && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label="Memuat foto">
              <LoaderCircle className="h-9 w-9 animate-spin text-white/85" aria-hidden="true" />
            </span>
          )}
          {imageFailed && items.length === 1 && (
            <p className="absolute inset-x-4 text-center text-sm text-white/75" role="status">
              Foto tidak dapat dimuat.
            </p>
          )}
        </div>

        {index !== null && index < items.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(index + 1)}
            aria-label="Foto berikutnya"
            className="absolute right-2 sm:right-4 z-10 h-10 w-10 flex items-center justify-center
                       rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-4 py-2.5 text-center text-[11px] text-white/60 border-t border-white/10">
        {(index ?? 0) + 1} dari {items.length} · gunakan ← → untuk navigasi
      </div>
    </div>,
    document.body,
  );
}
