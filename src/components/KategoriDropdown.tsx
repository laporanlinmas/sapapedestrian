'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Scale, Trash2, Wrench, Car, Store, ShieldAlert, Ellipsis,
  Check, ChevronDown,
} from 'lucide-react';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  DROPDOWN KATEGORI — pengganti <select> bawaan browser
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Alasan: <select> native mengikuti gaya sistem operasi, tampil berbeda di
 *  tiap perangkat, dan hampir mustahil diberi gaya. Dropdown ini memakai
 *  <button> sehingga seragam di mana saja, tiap opsi bisa punya ikon, dan
 *  tetap ringan: panel-nya hanya dirender ketika benar-benar dibuka.
 *
 *  Sifat: muncul tepat di bawah kolomnya (tanpa overlay), tutup saat klik di
 *  luar atau tekan ESC, dan mendukung navigasi panah keyboard.
 */

export interface Kategori {
  value: string;
  label: string;
  desc: string;
  Icon: typeof Scale;
}

export const KATEGORI: Kategori[] = [
  { value: 'Ketertiban Umum', label: 'Ketertiban Umum', desc: 'Pengamen, pengemis, ODGJ, dan keributan', Icon: Scale },
  { value: 'Kebersihan', label: 'Kebersihan', desc: 'Sampah, genangan air, dan saluran air kotor', Icon: Trash2 },
  { value: 'Kerusakan Fasilitas', label: 'Kerusakan Fasilitas', desc: 'Trotoar pecah, lampu jalan mati, atau drainase tersumbat', Icon: Wrench },
  { value: 'Parkir Liar', label: 'Parkir Liar', desc: 'Kendaraan parkir di trotoar atau area pedestrian', Icon: Car },
  { value: 'PKL Melanggar', label: 'PKL Melanggar', desc: 'Berjualan di lokasi yang tidak diperbolehkan', Icon: Store },
  { value: 'Keamanan', label: 'Keamanan', desc: 'Tindak kriminalitas, kebisingan, dan gangguan ketenteraman', Icon: ShieldAlert },
  { value: 'Lainnya', label: 'Lainnya', desc: 'Laporan yang tidak termasuk kategori di atas', Icon: Ellipsis },
];

interface KategoriDropdownProps {
  value: string;
  onSelect: (value: string) => void;
  invalid?: boolean;
}

export default function KategoriDropdown({ value, onSelect, invalid }: KategoriDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const viaKeyboard = useRef(false);

  const selected = KATEGORI.find((k) => k.value === value);

  // Saat dibuka lewat keyboard, langsung fokuskan ke opsi terpilih/pertama.
  useEffect(() => {
    if (!open || !viaKeyboard.current) return;
    const t = setTimeout(() => {
      const opts = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      if (!opts?.length) return;
      const chosen = [...opts].find((o) => o.getAttribute('aria-selected') === 'true');
      (chosen ?? opts[0]).focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // Tutup saat klik di luar atau tekan ESC
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      // Panel Aduan juga mendengarkan Escape di window. Hentikan perambannya
      // agar satu tekan hanya menutup dropdown ini, bukan seluruh panel.
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    // Ditunda satu tick agar klik pada tombol pembuka tidak langsung menutup
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Buka lewat keyboard: panah/Enter/Spasi
  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      viaKeyboard.current = true;
      setOpen(true);
    }
  };

  // Navigasi panah di dalam daftar opsi
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const opts = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    if (!opts.length) return;
    const at = opts.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown'
      ? Math.min(opts.length - 1, at + 1)
      : Math.max(0, at - 1);
    opts[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Kolom pemicu */}
      <button
        type="button"
        id="aduan-kategori"
        onClick={() => { viaKeyboard.current = false; setOpen((o) => !o); }}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? 'kategori-listbox' : undefined}
        aria-label={selected ? `Kategori laporan: ${selected.label}. Klik untuk mengubah` : 'Pilih kategori laporan'}
        className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm rounded-xl
          bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900
          ${invalid
            ? 'border border-red-400 dark:border-red-700 focus:ring-red-400/30'
            : 'border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:ring-orange-400/30 focus:border-orange-400'}`}
      >
        {selected ? (
          <>
            <selected.Icon className="w-4 h-4 shrink-0 text-orange-500" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-semibold">{selected.label}</span>
          </>
        ) : (
          <span className="flex-1 text-slate-400">Pilih kategori...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Panel pilihan */}
      {open && (
        <div
          id="kategori-listbox"
          role="listbox"
          aria-label="Kategori laporan"
          onKeyDown={onListKey}
          className="absolute z-50 left-0 right-0 mt-1.5
                     bg-white dark:bg-slate-900
                     border border-slate-300 dark:border-slate-700
                     rounded-xl shadow-lg shadow-slate-900/10 dark:shadow-black/40
                     p-1"
        >
          {KATEGORI.map((k) => {
            const isSelected = k.value === value;
            return (
              <button
                key={k.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onSelect(k.value); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors
                  ${isSelected
                    ? 'bg-orange-50 dark:bg-orange-950/40'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800'}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
              >
                <k.Icon
                  className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                  {k.label}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 shrink-0 text-orange-500" strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
