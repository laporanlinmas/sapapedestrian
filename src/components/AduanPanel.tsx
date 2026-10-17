'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Upload, Trash2, Search, CheckCircle2, Clock, AlertCircle, ImageIcon, Copy, Check, RefreshCw, Phone } from 'lucide-react';
import {
  submitComplaint,
  getComplaintStatus,
  ApiError,
  type AduanStatus,
} from '@/lib/apiClient';
import { preparePhotos, type PreparedPhoto } from '@/lib/image';
import KategoriDropdown from './KategoriDropdown';

interface AduanPanelProps {
  opened: boolean;
  onClose: () => void;
}

const MAX_PHOTOS = 5;

const STATUS_CFG: Record<string, { color: string; bg: string; Icon: typeof CheckCircle2; label: string; hint: string }> = {
  Baru: {
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    Icon: Clock,
    label: 'Sedang diverifikasi',
    hint: 'Laporan Anda sudah kami terima dan menunggu peninjauan petugas.',
  },
  Diproses: {
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    Icon: AlertCircle,
    label: 'Sedang diproses',
    hint: 'Petugas sedang menangani laporan Anda.',
  },
  Selesai: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    Icon: CheckCircle2,
    label: 'Selesai ditangani',
    hint: 'Laporan Anda telah ditindaklanjuti.',
  },
  Ditolak: {
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    Icon: X,
    label: 'Tidak dilanjutkan',
    hint: 'Laporan tidak dapat ditindaklanjuti. Lihat catatan petugas.',
  },
};

const STEPS = ['Baru', 'Diproses', 'Selesai'];

type View = 'form' | 'track' | 'success';

interface PendingPhoto extends PreparedPhoto {
  preview: string;
}

export default function AduanPanel({ opened, onClose }: AduanPanelProps) {
  const [view, setView] = useState<View>('form');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [ticketResult, setTicketResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<AduanStatus | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackTouched, setTrackTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Kunci scroll di layar kecil
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    if (opened && isMobile) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [opened]);

  // Fokus ke panel saat dibuka (aksesibilitas keyboard)
  useEffect(() => {
    if (opened) panelRef.current?.focus();
  }, [opened]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, onClose]);

  const reset = useCallback(() => {
    setView('form');
    setNama(''); setKategori(''); setLokasi(''); setDeskripsi('');
    setPhotos([]); setError(''); setWarning(''); setTicketResult(''); setCopied(false);
    setSubmitted(false);
    setTrackInput(''); setTrackResult(null); setTrackError(''); setTrackTouched(false);
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const addPhotos = async (files: FileList) => {
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    if (!list.length) return;

    setCompressing(true);
    setError('');
    try {
      const prepared = await preparePhotos(list);
      const withPreview: PendingPhoto[] = prepared.map(p => ({
        ...p,
        preview: `data:${p.type};base64,${p.base64}`,
      }));
      setPhotos(prev => [...prev, ...withPreview].slice(0, MAX_PHOTOS));
    } catch {
      setError('Foto tidak dapat diproses. Coba pilih foto lain.');
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const totalKB = useMemo(
    () => photos.reduce((sum, p) => sum + (p.sizeKB || 0), 0),
    [photos],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setWarning('');

    setSubmitted(true);
    if (!nama.trim() || !kategori || !lokasi.trim() || !deskripsi.trim()) {
      setError('Semua field wajib diisi.');
      return;
    }
    if (deskripsi.trim().length < 10) {
      setError('Deskripsi minimal 10 karakter agar mudah ditindaklanjuti.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitComplaint({
        nama, kategori, lokasi, deskripsi,
        source: 'Website',
        photos: photos.map(({ name: n, type, base64, sizeKB }) => ({ name: n, type, base64, sizeKB })),
      });
      setTicketResult(result.ticketNumber);
      setWarning(result.warning || '');
      setView('success');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim laporan. Coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = trackInput.trim();
    if (!code) { setTrackTouched(true); setTrackError('Masukkan nomor tiket Anda.'); return; }

    setTrackLoading(true); setTrackError(''); setTrackResult(null); setTrackTouched(true);
    try {
      setTrackResult(await getComplaintStatus(code));
    } catch (err: any) {
      setTrackError(err instanceof ApiError ? err.message : 'Gagal mengambil status tiket.');
    } finally {
      setTrackLoading(false);
    }
  };

  const goTrack = (code?: string) => {
    if (code) setTrackInput(code);
    setView('track');
    setTrackTouched(false);
    if (code) setTimeout(() => void handleTrack(), 60);
  };

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setWarning('Tidak dapat menyalin otomatis. Catat manual nomor tiket Anda.');
    }
  };

  const inputCls =
    'w-full px-4 py-3 text-sm sm:text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all';

  const spinnerSvg = (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const StatusPill = ({ status }: { status: string }) => {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.Baru;
    const Icon = cfg.Icon;
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/70 dark:bg-black/30 ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {status}
      </span>
    );
  };

  const TrackCard = ({ data }: { data: AduanStatus }) => {
    const cfg = STATUS_CFG[data.status] ?? STATUS_CFG.Baru;
    const activeStep = STEPS.indexOf(data.status);
    return (
      <div className={`rounded-2xl border p-4 space-y-3.5 ${cfg.bg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-black text-slate-900 dark:text-white break-all">{data.ticket}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{cfg.label}</p>
          </div>
          <StatusPill status={data.status} />
        </div>

        {activeStep >= 0 && (
          <ol className="flex items-center gap-1" aria-label="Progres penanganan">
            {STEPS.map((step, i) => (
              <li key={step} className="flex-1 flex items-center gap-1">
                <span className={`h-1.5 flex-1 rounded-full ${i <= activeStep ? cfg.color.replace('text-', 'bg-') : 'bg-slate-300 dark:bg-slate-700'}`} />
              </li>
            ))}
          </ol>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{cfg.hint}</p>

        <dl className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex gap-2"><dt className="font-semibold shrink-0 w-20">Pelapor</dt><dd className="min-w-0 break-words">{data.nama}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold shrink-0 w-20">Kategori</dt><dd>{data.kategori}</dd></div>
          <div className="flex gap-2"><dt className="font-semibold shrink-0 w-20">Lokasi</dt><dd className="min-w-0 break-words">{data.lokasi}</dd></div>
          <div className="flex gap-2 items-start"><dt className="font-semibold shrink-0 w-20">Isi Aduan</dt><dd className="min-w-0 break-words whitespace-pre-wrap">{data.deskripsi}</dd></div>
          {data.timestamp && (
            <div className="flex gap-2"><dt className="font-semibold shrink-0 w-20">Dilaporkan</dt><dd>{data.timestamp}</dd></div>
          )}
        </dl>

        {data.fotos?.length > 0 && (
          <div>
            <p className="font-semibold flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Foto bukti ({data.fotos.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {data.fotos.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={url}
                    alt={`Foto bukti ${i + 1}`}
                    loading="lazy"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-700 hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {data.catatan && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white/70 dark:bg-slate-900/40 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">Tindak lanjut petugas</p>
            <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">{data.catatan}</p>
            {data.fotoTindakLanjut && (
              <a href={data.fotoTindakLanjut} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                <img src={data.fotoTindakLanjut} alt="Foto tindak lanjut" loading="lazy" className="w-16 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-700" />
              </a>
            )}
            {data.updatedAt && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Diperbarui: {data.updatedAt}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleTrack()}
          className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-black/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Perbarui status
        </button>
      </div>
    );
  };

  return (
    <>
      {opened && <div className="fixed inset-0 z-[999] sm:hidden bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />}

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`fixed z-[1000] flex flex-col overflow-hidden shadow-2xl outline-none transition-all duration-300
          bottom-0 right-0 w-full max-w-[440px] max-h-[92dvh] min-h-[480px]
          sm:bottom-6 sm:right-6 sm:max-h-[min(680px,92vh)] sm:min-h-[520px] sm:rounded-2xl
          rounded-t-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700
          ${opened ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Layanan Aduan Masyarakat"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3 border-b border-slate-300 dark:border-slate-800 shrink-0">
          <div className="flex gap-1.5" role="tablist" aria-label="Pilih layanan">
            <button
              role="tab"
              aria-selected={view !== 'track'}
              onClick={() => setView(view === 'success' ? 'success' : 'form')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-colors ${view !== 'track' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" /> Buat Laporan
            </button>
            <button
              role="tab"
              aria-selected={view === 'track'}
              onClick={() => goTrack()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-colors ${view === 'track' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" /> Lacak Tiket
            </button>
          </div>
          <button
            onClick={handleClose}
            aria-label="Tutup panel aduan"
            className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 custom-scrollbar min-h-[320px]">

          {/* ── Sukses ── */}
          {view === 'success' && (
            <div className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Simpan nomor tiket untuk melacak status laporan.
              </p>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-3">
                <p className="text-xs text-slate-500 mb-1">Nomor Tiket</p>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-wider break-all">{ticketResult}</p>
                <button
                  type="button"
                  onClick={copyTicket}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin' : 'Salin nomor tiket'}
                </button>
              </div>

              {warning && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-4">{warning}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button onClick={() => goTrack(ticketResult)} className="flex-1 py-3 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  Lacak Tiket
                </button>
                <button onClick={handleClose} className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                  Tutup
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setView('form'); setNama(''); setKategori(''); setLokasi(''); setDeskripsi(''); setPhotos([]); setTicketResult(''); setWarning(''); }}
                className="mt-3 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Kirim laporan lain
              </button>
            </div>
          )}

          {/* ── Formulir ── */}
          {view === 'form' && (
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4" noValidate>
              {error && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" /> <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="aduan-nama" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Nama <span className="text-red-500">*</span></label>
                <input id="aduan-nama" value={nama} onChange={e => setNama(e.target.value)} maxLength={120} placeholder="Nama lengkap Anda" className={inputCls} autoComplete="name" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Kategori <span className="text-red-500">*</span></label>
                <KategoriDropdown
                  value={kategori}
                  onSelect={setKategori}
                  invalid={submitted && !kategori}
                />
              </div>

              <div>
                <label htmlFor="aduan-lokasi" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Lokasi <span className="text-red-500">*</span></label>
                <input id="aduan-lokasi" value={lokasi} onChange={e => setLokasi(e.target.value)} maxLength={200} placeholder="Contoh: Depan toko ABC, Jl. Sudirman" className={inputCls} />
              </div>

              <div>
                <label htmlFor="aduan-deskripsi" className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Deskripsi <span className="text-red-500">*</span></span>
                  <span className="text-[10px] font-medium text-slate-400">{deskripsi.trim().length}/2000</span>
                </label>
                <textarea
                  id="aduan-deskripsi"
                  value={deskripsi}
                  onChange={e => setDeskripsi(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Jelaskan kejadian yang ingin dilaporkan (minimal 10 karakter)..."
                  className={inputCls + ' resize-y min-h-[88px]'}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Foto <span className="text-slate-400 font-normal">(maks. {MAX_PHOTOS})</span></span>
                  {totalKB > 0 && <span className="text-[10px] font-medium text-slate-400">~{Math.max(1, Math.round(totalKB / 1024))} MB</span>}
                </label>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && void addPhotos(e.target.files)} />

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 group">
                        <img src={p.preview} alt={`Pratinjau foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          aria-label={`Hapus foto ${i + 1}`}
                          className="absolute inset-0 bg-black/50 opacity-0 focus:opacity-100 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={compressing}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-60"
                  >
                    {compressing ? <>{spinnerSvg} Memproses foto...</> : <><Upload className="w-4 h-4" aria-hidden="true" /> Tambah Foto</>}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || compressing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[.99]"
              >
                {loading ? <>{spinnerSvg} Mengirim laporan...</> : <><Send className="w-4 h-4" aria-hidden="true" /> Kirim Laporan</>}
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 px-2">
                Foto otomatis dikompres agar pengiriman tetap cepat.
              </p>
            </form>
          )}

          {/* ── Lacak tiket ── */}
          {view === 'track' && (
            <div className="p-4 sm:p-5">
              <form onSubmit={handleTrack} className="flex gap-2 mb-2">
                <input
                  value={trackInput}
                  onChange={e => setTrackInput(e.target.value.toUpperCase())}
                  placeholder="Nomor tiket (ADU-...)"
                  aria-label="Nomor tiket"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="flex-1 min-w-0 px-4 py-3 text-sm sm:text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all"
                />
                <button type="submit" disabled={trackLoading} aria-label="Cari tiket" className="px-4 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 shrink-0">
                  {trackLoading ? spinnerSvg : <Search className="w-4 h-4" aria-hidden="true" />}
                </button>
              </form>

              {trackTouched && trackError && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-xs font-semibold text-center">
                  {trackError}
                </div>
              )}

              {trackResult && <div className="mt-3"><TrackCard data={trackResult} /></div>}

              {!trackResult && !trackError && (
                <div className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                  <p>Masukkan nomor tiket yang Anda terima setelah mengirim laporan.</p>
                  <p className="flex items-center justify-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Tiket juga bisa dilacak melalui chatbot.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </>
  );
}