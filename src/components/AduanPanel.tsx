'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Upload, Trash2, Search, CheckCircle2, Clock, AlertCircle, ImageIcon } from 'lucide-react';

interface AduanPanelProps {
  opened: boolean;
  onClose: () => void;
}

const KATEGORI = ['Ketertiban Umum', 'Kebersihan', 'Kerusakan Fasilitas', 'Parkir Liar', 'PKL Melanggar', 'Keamanan', 'Lainnya'];

const STATUS_CFG: Record<string, { color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  Baru:     { color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',     Icon: Clock },
  Diproses: { color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', Icon: AlertCircle },
  Selesai:  { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', Icon: CheckCircle2 },
  Ditolak:  { color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',         Icon: X },
};

type View = 'form' | 'track' | 'success';

export default function AduanPanel({ opened, onClose }: AduanPanelProps) {
  const [view, setView] = useState<View>('form');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [photos, setPhotos] = useState<{ name: string; type: string; base64: string; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketResult, setTicketResult] = useState('');
  const [trackInput, setTrackInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Scroll lock on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    if (opened && isMobile) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [opened]);

  const reset = () => {
    setView('form');
    setNama(''); setKategori(''); setLokasi(''); setDeskripsi('');
    setPhotos([]); setError(''); setTicketResult('');
    setTrackInput(''); setTrackResult(null); setTrackError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const addPhotos = (files: FileList) => {
    Array.from(files).slice(0, 5 - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPhotos(prev => [...prev, { name: file.name, type: file.type, base64: dataUrl.split(',')[1], preview: dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !kategori || !lokasi.trim() || !deskripsi.trim()) { setError('Semua field wajib diisi.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/submit-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, kategori, lokasi, deskripsi, source: 'Form Web', photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim.');
      setTicketResult(data.ticketNumber);
      setView('success');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    setTrackLoading(true); setTrackResult(null); setTrackError('');
    try {
      const res = await fetch(`/api/complaint-status?ticket=${encodeURIComponent(trackInput.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.found) throw new Error(data.message || 'Tiket tidak ditemukan.');
      setTrackResult(data);
    } catch (err: any) { setTrackError(err.message); }
    finally { setTrackLoading(false); }
  };

  const inputCls = "w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all";
  const spinnerSvg = <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;

  return (
    <>
      {/* Mobile backdrop */}
      {opened && <div className="fixed inset-0 z-[999] sm:hidden bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />}

      {/* Panel — bottom-right like chatbot */}
      <div className={`fixed z-[1000] flex flex-col overflow-hidden shadow-2xl transition-all duration-300
        bottom-0 right-0 w-full max-w-[420px] max-h-[85dvh] min-h-[480px]
        sm:bottom-6 sm:right-6 sm:max-h-[min(640px,92vh)] sm:min-h-[520px] sm:rounded-2xl
        rounded-t-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
        ${opened ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        role="dialog" aria-modal="true"
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex gap-1.5">
            <button onClick={() => setView('form')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${view === 'form' || view === 'success' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Send className="w-3 h-3" />
              Buat Laporan
            </button>
            <button onClick={() => setView('track')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${view === 'track' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <Search className="w-3 h-3" />
              Lacak Tiket
            </button>
          </div>
          <button onClick={handleClose} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar min-h-[320px]">

          {/* Success */}
          {view === 'success' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Laporan Terkirim!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Simpan nomor tiket untuk melacak status laporan.</p>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-6">
                <p className="text-xs text-slate-500 mb-1">Nomor Tiket</p>
                <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-wider">{ticketResult}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setView('track'); setTrackInput(ticketResult); }} className="flex-1 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  Lacak Tiket
                </button>
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {view === 'form' && (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Nama <span className="text-red-500">*</span></label>
                <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama lengkap Anda" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Kategori <span className="text-red-500">*</span></label>
                <select value={kategori} onChange={e => setKategori(e.target.value)} className={inputCls}>
                  <option value="">Pilih kategori...</option>
                  {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Lokasi <span className="text-red-500">*</span></label>
                <input value={lokasi} onChange={e => setLokasi(e.target.value)} placeholder="Contoh: Depan toko ABC, Jl. Sudirman" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Deskripsi <span className="text-red-500">*</span></label>
                <textarea value={deskripsi} onChange={e => setDeskripsi(e.target.value)} rows={3} placeholder="Jelaskan kejadian yang ingin dilaporkan..." className={inputCls + ' resize-none'} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Foto <span className="text-slate-400 font-normal">(maks. 5)</span></label>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && addPhotos(e.target.files)} />
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length < 5 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 hover:border-orange-400 hover:text-orange-500 transition-colors">
                    <Upload className="w-4 h-4" /> Tambah Foto
                  </button>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:pointer-events-none">
                {loading ? <>{spinnerSvg} Mengirim...</> : <><Send className="w-4 h-4" /> Kirim Laporan</>}
              </button>
            </form>
          )}

          {/* Track */}
          {view === 'track' && (
            <div className="p-5">
              <form onSubmit={handleTrack} className="flex gap-2 mb-5">
                <input value={trackInput} onChange={e => setTrackInput(e.target.value)} placeholder="Nomor tiket (ADU-...)"
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all" />
                <button type="submit" disabled={trackLoading}
                  className="px-4 py-2.5 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50">
                  {trackLoading ? spinnerSvg : <Search className="w-4 h-4" />}
                </button>
              </form>
              {trackError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-xs font-semibold text-center">{trackError}</div>}
              {trackResult && (() => {
                const cfg = STATUS_CFG[trackResult.status] ?? STATUS_CFG['Baru'];
                return (
                  <div className={`rounded-2xl border p-4 space-y-3 ${cfg.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-white text-sm">{trackResult.ticket}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 dark:bg-black/30 ${cfg.color}`}>
                        <cfg.Icon className="w-3.5 h-3.5" /> {trackResult.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <p><span className="font-semibold">Pelapor:</span> {trackResult.nama}</p>
                      <p><span className="font-semibold">Kategori:</span> {trackResult.kategori}</p>
                      <p><span className="font-semibold">Lokasi:</span> {trackResult.lokasi}</p>
                      <p><span className="font-semibold">Deskripsi:</span> {trackResult.deskripsi}</p>
                      {trackResult.catatan && <p><span className="font-semibold">Catatan Admin:</span> {trackResult.catatan}</p>}
                      {trackResult.fotos?.length > 0 && (
                        <div>
                          <p className="font-semibold flex items-center gap-1 mb-1.5"><ImageIcon className="w-3.5 h-3.5" /> Foto ({trackResult.fotos.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {trackResult.fotos.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-slate-400 text-[10px] pt-1">{trackResult.timestamp}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
