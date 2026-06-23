'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSatgasLinmasText,
  prefetchSatgasLinmasText,
  askChatbot,
  resetMemory,
} from '@/lib/satgaslinmas-knowledge';
import {
  Send, X, Camera, Image as ImageIcon, User, Bot,
  MessageCircle, Clock, ExternalLink, AlertCircle,
  CheckCircle2, Trash2, Phone, Globe, MonitorPlay, Map, Megaphone, Star, Play,
} from 'lucide-react';
import { FacebookIcon, XIcon, InstagramIcon, WhatsAppIcon, TikTokIcon } from './BrandIcons';

// ── Types ─────────────────────────────────────────────────────────────────────

type MsgRole = 'user' | 'bot';

interface ChatPhoto {
  file: File;
  preview: string;
}

interface ChatAction {
  label: string;
  payload: string;
  type: 'text' | 'link';
  icon?: React.ReactNode;
}

interface TicketInfo {
  ticket: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  status: string;
  catatan: string;
  updatedAt: string;
}

interface ChatMsg {
  role: MsgRole;
  text: string;
  photos?: ChatPhoto[];
  actions?: ChatAction[];
  ticketCard?: TicketInfo;
  waCard?: WaCardProps;
  waUrl?: string;
  waLabel?: string;
  ts?: string;
}

type ComplaintStep = 'nama' | 'kategori' | 'lokasi' | 'deskripsi' | 'foto';

interface ComplaintDraft {
  step: ComplaintStep;
  nama?: string;
  kategori?: string;
  lokasi?: string;
  deskripsi?: string;
  photos: ChatPhoto[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV_GRADIENT = 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)';

const QUICK_ACTIONS: ChatAction[] = [
  { label: 'Lapor Gangguan', payload: 'lapor', type: 'text', icon: <AlertCircle size={13} /> },
  { label: 'Cek Status Tiket', payload: 'cek tiket', type: 'text', icon: <Clock size={13} /> },
  { label: 'Jadwal Patroli', payload: 'kapan satgas bertugas?', type: 'text', icon: <Clock size={13} /> },
  { label: 'Info CCTV', payload: 'bagaimana cara lihat cctv?', type: 'text', icon: <Camera size={13} /> },
  { label: 'Hubungi Petugas', payload: 'hubungi petugas', type: 'text', icon: <Phone size={13} /> },
];

const KATEGORI_LIST = [
  'Fasilitas Publik Rusak',
  'Gangguan Pengamen/Pengemis',
  'Pelanggaran Ketertiban',
  'Parkir Liar di Trotoar',
  'PKL Melanggar Aturan',
  'Indikasi Tindak Kejahatan',
  'Lainnya',
];

const LOKASI_LIST = [
  'Jl. HOS Cokroaminoto',
  'Jl. Jenderal Sudirman',
  'Jl. Urip Sumoharjo',
  'Jl. Diponegoro',
  'Jl. Gajah Mada',
  'Alun-alun Ponorogo',
  'Lokasi Lainnya',
];

const STATUS_STYLE: Record<string, { color: string; bg: string; Icon: React.ElementType }> = {
  'Baru':     { color: '#3b82f6', bg: '#eff6ff', Icon: AlertCircle },
  'Diproses': { color: '#f59e0b', bg: '#fffbeb', Icon: Clock },
  'Selesai':  { color: '#10b981', bg: '#ecfdf5', Icon: CheckCircle2 },
  'Ditolak':  { color: '#ef4444', bg: '#fef2f2', Icon: X },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeNow(): string {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload  = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
  });
}

interface WaInfo { number: string; name: string; day: string; jadwal: string; }

/** Simulasi delay "mengetik" bot — proporsional dengan panjang jawaban */
function typingDelay(text: string): Promise<void> {
  const ms = Math.min(400 + text.length * 12, 2200);
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWa(): Promise<WaInfo | null> {
  try {
    const res = await fetch('/api/wa-number');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d?.number) throw new Error('no number in response');
    return {
      number: d.number,
      name:   d.name   || 'Piket Satlinmas',
      day:    d.day    || '',
      jadwal: d.jadwal || '',
    };
  } catch (err) {
    console.error('[fetchWa]', err);
    return null;
  }
}

async function fetchTicket(ticket: string): Promise<TicketInfo | null> {
  try {
    const r  = await fetch(`/api/complaint-status?ticket=${encodeURIComponent(ticket)}`);
    const d  = await r.json();
    return d.found ? d : null;
  } catch { return null; }
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function BubbleText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              const b = part.match(/^\*\*(.+)\*\*$/);
              if (b) return <strong key={j} className="font-bold">{b[1]}</strong>;
              const it = part.match(/^\*(.+)\*$/);
              if (it) return <em key={j}>{it[1]}</em>;
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

function TicketCard({ info }: { info: TicketInfo }) {
  const cfg = STATUS_STYLE[info.status] ?? STATUS_STYLE['Baru'];
  const Icon = cfg.Icon;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="font-mono text-[11px] font-bold text-slate-500">{info.ticket}</span>
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}>
          <Icon size={11} />{info.status}
        </span>
      </div>
      <div className="p-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex gap-2"><span className="text-slate-400 w-14 shrink-0">Pelapor</span><span className="font-medium">{info.nama}</span></div>
        <div className="flex gap-2"><span className="text-slate-400 w-14 shrink-0">Lokasi</span><span className="font-medium">{info.lokasi}</span></div>
        <div className="flex gap-2"><span className="text-slate-400 w-14 shrink-0">Hal</span><span className="font-medium italic">"{info.deskripsi}"</span></div>
        {info.catatan && (
          <div className="mt-1.5 p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[11px]">
            <span className="font-bold">Respons petugas:</span> {info.catatan}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButtons({ actions, onAction }: { actions: ChatAction[]; onAction: (a: ChatAction) => void }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {actions.map((act, i) => (
        <button key={i} onClick={() => onAction(act)}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600 active:scale-95">
          {act.icon}{act.label}
          {act.type === 'link' && <ExternalLink size={10} />}
        </button>
      ))}
    </div>
  );
}

interface WaCardProps { name: string; day: string; jadwal: string; waUrl: string; label: string; }
function WaCard({ name, waUrl }: WaCardProps) {
  return (
    <div className="mt-3 rounded-xl border border-green-200 bg-green-50 overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-green-100 flex items-center gap-2">
        <Phone size={13} className="text-green-600 shrink-0" />
        <span className="text-[11px] font-bold text-green-800">Petugas Piket Hari Ini</span>
      </div>
      <div className="p-3 text-xs text-slate-700">
        <div className="flex gap-2"><span className="text-slate-400 w-14 shrink-0">Nama</span><span className="font-semibold">{name}</span></div>
      </div>
      <div className="px-3 pb-3">
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2 text-xs font-bold text-white hover:bg-[#1ebe5d] transition-colors">
          <Phone size={13} />Chat via WhatsApp
        </a>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Bot size={15} />
      </div>
      <div className="rounded-2xl rounded-tl-none bg-white border border-slate-100 px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}


// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatbotUnified({
  opened,
  onToggle,
}: {
  opened?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const [messages, setMessages]         = useState<ChatMsg[]>([]);
  const [input, setInput]               = useState('');
  const [isBusy, setIsBusy]             = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<ChatPhoto[]>([]);
  const [activeStep, setActiveStep]     = useState<ComplaintStep | null>(null);

  const listRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const draftRef   = useRef<ComplaintDraft | null>(null);
  const prevOpened = useRef(false);

  const isOpen = opened === true;

  // ── helpers ──────────────────────────────────────────────────────────────
  const addMsg = useCallback((role: MsgRole, text: string, extra?: Partial<ChatMsg>) => {
    setMessages(prev => [...prev, { role, text, ts: timeNow(), ...extra }]);
  }, []);

  const clearPhotos = useCallback(() => {
    setPendingPhotos(prev => { prev.forEach(p => URL.revokeObjectURL(p.preview)); return []; });
  }, []);

  // ── open / close lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !prevOpened.current) {
      setMessages([{
        role: 'bot',
        text: 'Selamat datang di **SIPEDAS Assistant** — asisten resmi Satgas Linmas Pedestrian Ponorogo.\n\nAda yang bisa saya bantu hari ini?',
        actions: QUICK_ACTIONS,
        ts: timeNow(),
      }]);
      prefetchSatgasLinmasText();
      resetMemory();
    }
    if (!isOpen && prevOpened.current) {
      draftRef.current = null;
      setActiveStep(null);
      clearPhotos();
      resetMemory();
    }
    prevOpened.current = isOpen;
  }, [isOpen, clearPhotos]);

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isBusy]);

  // ── photo handler ─────────────────────────────────────────────────────────
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files).slice(0, 3 - pendingPhotos.length).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setPendingPhotos(prev => [...prev, ...added].slice(0, 3));
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(pendingPhotos[idx].preview);
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx));
  };


  // ── complaint flow ────────────────────────────────────────────────────────
  const processComplaint = async (text: string, photos: ChatPhoto[]): Promise<boolean> => {
    const draft = draftRef.current;
    if (!draft) return false;

    if (draft.step === 'nama') {
      if (text.length < 3) { addMsg('bot', 'Mohon masukkan nama lengkap Anda.'); return true; }
      draft.nama = text; draft.step = 'kategori'; setActiveStep('kategori');
      addMsg('bot', `Salam, **${text}**. Pilih kategori gangguan yang ingin dilaporkan:`);
      return true;
    }

    if (draft.step === 'kategori') {
      draft.kategori = text; draft.step = 'lokasi'; setActiveStep('lokasi');
      addMsg('bot', `Kategori: **${text}**.\n\nDi mana lokasi spesifik kejadiannya?`);
      return true;
    }

    if (draft.step === 'lokasi') {
      draft.lokasi = text; draft.step = 'deskripsi'; setActiveStep('deskripsi');
      addMsg('bot', 'Deskripsikan kejadian tersebut secara singkat (minimal 10 karakter):');
      return true;
    }

    if (draft.step === 'deskripsi') {
      if (text.length < 10) { addMsg('bot', 'Deskripsi terlalu singkat. Mohon berikan informasi lebih detail.'); return true; }
      draft.deskripsi = text; draft.step = 'foto'; setActiveStep('foto');
      addMsg('bot', 'Informasi tercatat. Apakah ada **foto bukti**?\n\nGunakan tombol kamera di bawah, atau ketik *lanjut* untuk kirim tanpa foto.');
      return true;
    }

    if (draft.step === 'foto') {
      const skip = /lanjut|skip|lewati|tidak|ga|gak/i.test(text);
      const finalPhotos = [...draft.photos, ...photos];
      if (!skip && finalPhotos.length === 0) {
        addMsg('bot', 'Lampirkan foto atau ketik *lanjut* untuk melewati.');
        return true;
      }
      setIsBusy(true);
      try {
        const base64Photos = await Promise.all(
          finalPhotos.map(async p => ({ name: p.file.name, type: p.file.type, base64: await fileToBase64(p.file) }))
        );
        const res = await fetch('/api/submit-complaint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: draft.nama, kategori: draft.kategori,
            lokasi: draft.lokasi, deskripsi: draft.deskripsi,
            source: 'Chatbot SIPEDAS v6', photos: base64Photos,
          }),
        }).then(r => r.json());

        if (res.ticketNumber) {
          addMsg('bot', `Laporan berhasil dikirim!\n\nNomor tiket Anda: **${res.ticketNumber}**\n\nPetugas Satgas Linmas akan segera menindaklanjuti. Simpan nomor tiket ini untuk memantau status.`);
          const wa = await fetchWa();
          if (wa) {
            const msg = encodeURIComponent(`Halo, saya ingin meneruskan laporan SIPEDAS.\nTiket: ${res.ticketNumber}\nOleh: ${draft.nama}\nLokasi: ${draft.lokasi}\nHal: ${draft.deskripsi}`);
            addMsg('bot',
              wa.day
                ? `Anda juga dapat meneruskan laporan ke petugas piket hari **${wa.day}** ini:`
                : 'Anda juga dapat meneruskan laporan ini ke petugas via WhatsApp:',
              {
                waCard: {
                  name: wa.name, day: wa.day, jadwal: wa.jadwal,
                  waUrl: `https://wa.me/${wa.number}?text=${msg}`,
                  label: `Teruskan via WhatsApp`,
                },
              }
            );
          }
        } else {
          addMsg('bot', 'Terjadi kendala saat menyimpan laporan. Silakan coba sesaat lagi.');
        }
      } catch {
        addMsg('bot', 'Terjadi kesalahan koneksi. Laporan gagal dikirim.');
      } finally {
        setIsBusy(false);
        draftRef.current = null;
        setActiveStep(null);
        clearPhotos();
      }
      return true;
    }
    return false;
  };

  // ── send ──────────────────────────────────────────────────────────────────
  const onSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && pendingPhotos.length === 0) return;
    if (isBusy) return;

    if (!overrideText) {
      addMsg('user', text, pendingPhotos.length > 0 ? { photos: [...pendingPhotos] } : undefined);
      setInput('');
    }

    setIsBusy(true);
    try {
      // Batal
      if (draftRef.current && /^(batal|cancel|stop|keluar)$/i.test(text)) {
        draftRef.current = null; setActiveStep(null); clearPhotos();
        addMsg('bot', 'Proses laporan dibatalkan. Ada yang lain bisa saya bantu?');
        return;
      }

      // Complaint flow
      if (draftRef.current) {
        const handled = await processComplaint(text, pendingPhotos);
        if (handled) {
          if (draftRef.current?.step !== 'foto') clearPhotos();
          return;
        }
      }

      // Mulai laporan
      if (/^(lapor|buat aduan|adu|aduan|pengaduan)$/i.test(text)) {
        draftRef.current = { step: 'nama', photos: [] };
        setActiveStep('nama');
        addMsg('bot', 'Baik, saya akan memandu Anda membuat laporan resmi.\n\nSebutkan **nama lengkap** Anda terlebih dahulu:');
        return;
      }

      // Cek tiket via regex
      const ticketMatch = text.match(/ADU-\d{6}-\d{4}/i);
      if (ticketMatch) {
        const info = await fetchTicket(ticketMatch[0].toUpperCase());
        if (info) addMsg('bot', `Data tiket **${info.ticket}** ditemukan:`, { ticketCard: info });
        else addMsg('bot', `Tiket **${ticketMatch[0]}** tidak ditemukan dalam sistem.`);
        return;
      }

      if (/cek tiket|status laporan|lacak/i.test(text)) {
        addMsg('bot', 'Masukkan nomor tiket aduan Anda (contoh: ADU-260517-0001) untuk melihat status terkini.');
        return;
      }

      // WA handoff
      if (/hubungi petugas|bicara.*(orang|manusia|admin)|operator/i.test(text)) {
        const wa = await fetchWa();
        if (wa) {
          const waMsg = encodeURIComponent('Halo, saya butuh bantuan terkait layanan SIPEDAS Pedestrian Ponorogo.');
          addMsg('bot',
            wa.day
              ? `Berikut informasi petugas piket yang bertugas hari **${wa.day}** ini:`
              : 'Berikut kontak petugas Satlinmas Pedestrian:',
            {
              waCard: {
                name: wa.name, day: wa.day, jadwal: wa.jadwal,
                waUrl: `https://wa.me/${wa.number}?text=${waMsg}`,
                label: `Chat via WhatsApp`,
              },
            }
          );
        } else {
          addMsg('bot', 'Gagal mengambil data petugas dari server. Pastikan koneksi internet Anda aktif, lalu coba lagi.');
        }
        return;
      }

      // ── Smart routing ───────────────────────────────────────────────────

      // CCTV
      if (/cctv|kamera|pantau|live|camera|monitor/i.test(text)) {
        addMsg('bot', 'Pantauan CCTV live tersedia di halaman ini. Klik tombol di bawah untuk langsung ke sana:', {
          actions: [{ label: 'Buka Live CCTV', payload: '__scroll:cctv', type: 'text', icon: <MonitorPlay size={13} /> }],
        });
        return;
      }

      // Peta
      if (/peta|kerawanan|rawan|map|lokasi bahaya|titik rawan/i.test(text)) {
        addMsg('bot', 'Peta kerawanan pedestrian Ponorogo bisa dilihat di sini:', {
          actions: [{ label: 'Buka Peta Kerawanan', payload: '__scroll:peta', type: 'text', icon: <Map size={13} /> }],
        });
        return;
      }

      // Pengaduan/laporan — arahkan ke section sekaligus tawari flow
      if (/pengaduan|aduan|laporan|laporkan|komplain/i.test(text)) {
        addMsg('bot', 'Anda bisa membuat laporan langsung lewat form di halaman ini, atau saya bantu proses sekarang:', {
          actions: [
            { label: 'Buka Form Pengaduan', payload: '__scroll:pengaduan', type: 'text', icon: <Megaphone size={13} /> },
            { label: 'Lapor via Chatbot', payload: 'lapor', type: 'text', icon: <AlertCircle size={13} /> },
          ],
        });
        return;
      }

      // Info program / profil
      if (/program|info|informasi|profil|kegiatan|tentang|sipedas/i.test(text)) {
        addMsg('bot', 'Informasi lengkap program Satlinmas Pedestrian Ponorogo ada di sini:', {
          actions: [{ label: 'Lihat Info Program', payload: '__scroll:informasi', type: 'text', icon: <AlertCircle size={13} /> }],
        });
        return;
      }

      // Video profil
      if (/video|profil|galeri|youtube|dokumentasi/i.test(text)) {
        addMsg('bot', 'Video profil dan dokumentasi kegiatan bisa dilihat di sini:', {
          actions: [{ label: 'Tonton Video Profil', payload: '__scroll:video', type: 'text', icon: <Play size={13} /> }],
        });
        return;
      }

      // Survei / evaluasi
      if (/survei|survey|evaluasi|penilaian|kepuasan/i.test(text)) {
        addMsg('bot', 'Isi survei kepuasan layanan Satlinmas Pedestrian Ponorogo di sini:', {
          actions: [{ label: 'Isi Survei Evaluasi', payload: '__scroll:survei', type: 'text', icon: <Star size={13} /> }],
        });
        return;
      }

      // Instagram
      if (/instagram|ig\b/i.test(text)) {
        addMsg('bot', 'Ikuti Instagram resmi Satlinmas Ponorogo:', {
          actions: [{ label: 'Instagram @satlinmas_ponorogo', payload: 'https://instagram.com/satlinmas_ponorogo', type: 'link', icon: <InstagramIcon size={13} /> }],
        });
        return;
      }

      // Facebook
      if (/facebook|fb\b/i.test(text)) {
        addMsg('bot', 'Ikuti Facebook resmi Satpol PP Ponorogo:', {
          actions: [{ label: 'Facebook Satpol PP Ponorogo', payload: 'https://www.facebook.com/people/Satpol-PP-Kabupaten-Ponorogo/100067181276904/#', type: 'link', icon: <FacebookIcon size={13} /> }],
        });
        return;
      }

      // TikTok
      if (/tiktok|tik tok/i.test(text)) {
        addMsg('bot', 'Ikuti TikTok resmi Satpol PP Ponorogo:', {
          actions: [{ label: 'TikTok @satpol.pp.ponorogo', payload: 'https://www.tiktok.com/@satpol.pp.ponorogo', type: 'link', icon: <TikTokIcon size={13} /> }],
        });
        return;
      }

      // X / Twitter
      if (/twitter|x\.com|\btweet/i.test(text)) {
        addMsg('bot', 'Ikuti X (Twitter) resmi Satpol PP Ponorogo:', {
          actions: [{ label: '@SatpolppPonoro1', payload: 'https://x.com/SatpolppPonoro1', type: 'link', icon: <XIcon size={13} /> }],
        });
        return;
      }

      // WhatsApp umum (bukan hubungi petugas)
      if (/whatsapp|wa\b|nomor wa|kontak wa/i.test(text)) {
        addMsg('bot', 'Hubungi Satpol PP Ponorogo via WhatsApp:', {
          actions: [{ label: 'WhatsApp Satpol PP', payload: 'https://wa.me/6282337017307', type: 'link', icon: <WhatsAppIcon size={13} /> }],
        });
        return;
      }

      // Sosmed (semua)
      if (/sosmed|sosial media|media sosial|socmed/i.test(text)) {
        addMsg('bot', 'Temukan kami di media sosial resmi:', {
          actions: [
            { label: 'Instagram', payload: 'https://instagram.com/satlinmas_ponorogo', type: 'link', icon: <InstagramIcon size={13} /> },
            { label: 'Facebook', payload: 'https://www.facebook.com/people/Satpol-PP-Kabupaten-Ponorogo/100067181276904/#', type: 'link', icon: <FacebookIcon size={13} /> },
            { label: 'TikTok', payload: 'https://www.tiktok.com/@satpol.pp.ponorogo', type: 'link', icon: <TikTokIcon size={13} /> },
            { label: 'X / Twitter', payload: 'https://x.com/SatpolppPonoro1', type: 'link', icon: <XIcon size={13} /> },
          ],
        });
        return;
      }

      // Website satpol PP
      if (/satpol|satpolpp|satpol pp|website resmi|web resmi/i.test(text)) {
        addMsg('bot', 'Website resmi Satpol PP Kabupaten Ponorogo:', {
          actions: [{ label: 'satpolpp.ponorogo.go.id', payload: 'https://satpolpp.ponorogo.go.id', type: 'link', icon: <Globe size={13} /> }],
        });
        return;
      }

      // Knowledge base
      const doc = await getSatgasLinmasText();
      const answer = askChatbot(text, doc);
      await typingDelay(answer);
      addMsg('bot', answer);

    } finally {
      setIsBusy(false);
      if (!draftRef.current) clearPhotos();
    }
  };

  const handleAction = (act: ChatAction) => {
    if (act.type === 'link') { window.open(act.payload, '_blank'); return; }
    if (act.payload.startsWith('__scroll:')) {
      const id = act.payload.replace('__scroll:', '');
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      // Tutup chatbot agar pengguna bisa melihat konten yang di-scroll
      setTimeout(() => onToggle?.(false), 300);
      return;
    }
    addMsg('user', act.label, { ts: timeNow() });
    onSend(act.payload);
  };


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Trigger button — lebih kecil ── */}
      <button
        onClick={() => onToggle?.(true)}
        aria-label="Buka Chatbot SIPEDAS"
        className={`fixed bottom-5 right-5 z-[1000] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl transition-all duration-500 hover:scale-110 active:scale-95 ${
          isOpen ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ background: NAV_GRADIENT }}
      >
        <MessageCircle size={22} />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold shadow-sm">1</span>
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20 pointer-events-none" />
      </button>

      {/* ── Chat window ── */}
      <div
        className={`fixed bottom-0 right-0 z-[1001] flex flex-col overflow-hidden bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          w-full max-h-[85dvh] sm:bottom-5 sm:right-5 sm:h-[680px] sm:max-h-[92vh] sm:w-[400px] sm:rounded-3xl
          ${isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-10 opacity-0'}`}
      >

        {/* Header */}
        <header className="relative flex shrink-0 items-center gap-3 px-5 py-4 text-white shadow-md" style={{ background: NAV_GRADIENT }}>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <Bot size={22} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1e3a8a] bg-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold leading-tight tracking-tight">SIPEDAS Assistant</h2>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-200 mt-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shrink-0" />
              Sistem Pelayanan Digital Terpadu
            </p>
          </div>
          <button
            onClick={() => onToggle?.(false)}
            className="rounded-lg bg-white/10 p-1.5 transition-colors hover:bg-white/20"
            aria-label="Tutup chatbot"
          >
            <X size={18} />
          </button>
        </header>

        {/* Message area */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 space-y-5 custom-scrollbar"
          style={{ backgroundImage: 'radial-gradient(#e2e8f0 0.5px, transparent 0.5px)', backgroundSize: '14px 14px' }}
        >
          {messages.map((m, i) => (
            <div key={i}
              className={`flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>

              {/* Avatar */}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                m.role === 'user' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-blue-600'
              }`}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[84%] space-y-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-tr-none bg-blue-600 text-white'
                    : 'rounded-tl-none bg-white border border-slate-100 text-slate-800'
                }`}>

                  {m.photos && m.photos.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.photos.map((p, pi) => (
                        <img key={pi} src={p.preview} alt="" className="h-20 w-20 rounded-lg object-cover border border-black/5" />
                      ))}
                    </div>
                  )}

                  <BubbleText text={m.text} />

                  {m.ticketCard && <TicketCard info={m.ticketCard} />}

                  {m.waCard && (
                    <WaCard
                      name={m.waCard.name}
                      day={m.waCard.day}
                      jadwal={m.waCard.jadwal}
                      waUrl={m.waCard.waUrl}
                      label={m.waCard.label}
                    />
                  )}
                </div>

                {m.actions && !isBusy && <ActionButtons actions={m.actions} onAction={handleAction} />}

                <span className="px-1 text-[10px] text-slate-400">{m.ts}</span>
              </div>
            </div>
          ))}

          {/* Kategori chips */}
          {!isBusy && activeStep === 'kategori' && (
            <div className="ml-9 flex flex-wrap gap-1.5">
              {KATEGORI_LIST.map(k => (
                <button key={k} onClick={() => onSend(k)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600">
                  {k}
                </button>
              ))}
            </div>
          )}

          {/* Lokasi chips */}
          {!isBusy && activeStep === 'lokasi' && (
            <div className="ml-9 flex flex-wrap gap-1.5">
              {LOKASI_LIST.map(l => (
                <button key={l} onClick={() => onSend(l)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600">
                  📍 {l}
                </button>
              ))}
            </div>
          )}

          {isBusy && <TypingIndicator />}
        </div>


        {/* Input area — tanpa FAQ/Syarat */}
        <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 pb-5 sm:pb-3">

          {/* Preview foto pending */}
          {pendingPhotos.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5">
              {pendingPhotos.map((p, i) => (
                <div key={i} className="relative group shrink-0">
                  <img src={p.preview} alt="" className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                  <button onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow transition-transform group-hover:scale-110">
                    <Trash2 size={9} />
                  </button>
                </div>
              ))}
              {pendingPhotos.length < 3 && (
                <button onClick={() => cameraRef.current?.click()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                  <Camera size={18} />
                </button>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Attachment */}
            <div className="flex gap-1 pb-0.5">
              <button title="Pilih gambar" disabled={isBusy || pendingPhotos.length >= 3}
                onClick={() => galleryRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
                <ImageIcon size={18} />
              </button>
              <button title="Ambil foto" disabled={isBusy || pendingPhotos.length >= 3}
                onClick={() => cameraRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
                <Camera size={18} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder={activeStep === 'foto' ? 'Ketik "lanjut" atau kirim foto…' : 'Tulis pesan…'}
              className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              style={{ maxHeight: '100px' }}
            />

            {/* Send */}
            <button onClick={() => onSend()}
              disabled={isBusy || (!input.trim() && pendingPhotos.length === 0)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100"
              style={{ background: NAV_GRADIENT }}>
              <Send size={16} />
            </button>
          </div>
        </footer>

        {/* Hidden file inputs */}
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => handleFiles(e.target.files)} />

      </div>
    </>
  );
}
