'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSatgasLinmasText,
  prefetchSatgasLinmasText,
  askChatbot,
  resetMemory,
} from '@/lib/satgaslinmas-knowledge';
import {
  Send, X, Camera, Image as ImageIcon, Images, User, Bot,
  MessageCircle, Clock, ExternalLink, AlertCircle,
  CheckCircle2, Trash2, Phone, Globe, MonitorPlay, Map, Megaphone, Star, Play,
} from 'lucide-react';
import { FacebookIcon, XIcon, InstagramIcon, WhatsAppIcon, TikTokIcon } from './BrandIcons';
import { submitComplaint, getComplaintStatus, getWaNumber } from '@/lib/apiClient';
import { useAiChat, toAiHistory } from '@/lib/aiChat';
import { preparePhotos } from '@/lib/image';

// ── Types ─────────────────────────────────────────────────────────────────────

type MsgRole = 'user' | 'bot';

interface ChatPhoto {
  file: File;
  preview: string;
}

type ChatResource = 'cctv' | 'mymaps' | 'galeri' | 'rating';
type ChatInfoModal = 'programModal' | 'jadwalModal';

type ChatAction =
  | { label: string; payload: string; type: 'text' | 'link'; icon?: React.ReactNode }
  | { label: string; payload: string; type: 'phone'; icon?: React.ReactNode }
  | { label: string; payload: ChatResource; type: 'route'; icon?: React.ReactNode }
  | { label: string; payload: ChatInfoModal; type: 'modal'; icon?: React.ReactNode }
  | { label: string; payload: 'aduan'; type: 'panel'; icon?: React.ReactNode };

interface TicketInfo {
  ticket: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  status: string;
  catatan: string;
  updatedAt: string;
  fotoTindakLanjut?: string;
}

interface ChatMsg {
  role: MsgRole;
  text: string;
  /** Penanda pesan yang sedang ditulis AI; dipakai untuk menimpa teksnya. */
  streamId?: number;
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

/**
 * Biru, bukan hitam-navy. Sebelumnya `#0f172a → #1e3a8a` membaca hampir hitam
 * di layar, jadi tombol mengambang chatbot terlihat seperti grey/neutral —
 * tidak punya tint biru seperti kartu chatbot di section
 * Layanan Pengaduan. Sekarang keduanya satu warna.
 */
const NAV_GRADIENT = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';

const QUICK_ACTIONS: ChatAction[] = [
  { label: 'Lapor Gangguan', payload: 'lapor', type: 'text', icon: <AlertCircle size={13} /> },
  { label: 'Cek Status Tiket', payload: 'cek tiket', type: 'text', icon: <Clock size={13} /> },
  { label: 'Jadwal Patroli', payload: 'kapan satgas bertugas?', type: 'text', icon: <Clock size={13} /> },
  { label: 'SIPEDAS VIEW', payload: 'bagaimana cara lihat cctv?', type: 'text', icon: <Camera size={13} /> },
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

const EMERGENCY_CONTACTS = [
  { name: 'Satpol PP', number: '08113134535', pattern: /\bsatpol\s*pp\b|\bsatpol\b/i },
  { name: 'Satlinmas', number: '082337017307', pattern: /\bsatlinmas\b|\blinmas\b/i },
  { name: 'Damkar', number: '082160063113', pattern: /\bdamkar\b|\bpemadam\b|\bkebakaran\b/i },
  { name: 'Temuan rokok ilegal', number: '082338908248', pattern: /rokok\s+ilegal|rokok\s+tanpa\s+cukai|\bcukai\b/i },
];

const STATUS_STYLE: Record<string, { color: string; badge: string; Icon: React.ElementType }> = {
  'Baru':     { color: '#3b82f6', badge: 'bg-blue-50 dark:bg-blue-950/50', Icon: AlertCircle },
  'Diproses': { color: '#f59e0b', badge: 'bg-amber-50 dark:bg-amber-950/40', Icon: Clock },
  'Selesai':  { color: '#10b981', badge: 'bg-emerald-50 dark:bg-emerald-950/40', Icon: CheckCircle2 },
  'Ditolak':  { color: '#ef4444', badge: 'bg-red-50 dark:bg-red-950/40', Icon: X },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeNow(): string {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

type WaInfo = import('@/lib/apiClient').WaInfo;

/** Simulasi delay "mengetik" bot — proporsional dengan panjang jawaban */
function typingDelay(text: string): Promise<void> {
  const ms = Math.min(400 + text.length * 12, 2200);
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWa(): Promise<WaInfo | null> {
  try {
    return await getWaNumber();
  } catch (err) {
    console.error('[fetchWa]', err);
    return null;
  }
}

async function fetchTicket(ticket: string): Promise<TicketInfo | null> {
  try {
    const d = await getComplaintStatus(ticket);
    return d.found ? d : null;
  } catch (err) {
    console.error('[fetchTicket]', err);
    return null;
  }
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
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
        <span className="font-mono text-[11px] font-bold text-slate-500">{info.ticket}</span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}
          style={{ color: cfg.color }}>
          <Icon size={11} />{info.status}
        </span>
      </div>
      <div className="space-y-1.5 p-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex gap-2"><span className="w-14 shrink-0 text-slate-400 dark:text-slate-500">Pelapor</span><span className="font-medium">{info.nama}</span></div>
        <div className="flex gap-2"><span className="w-14 shrink-0 text-slate-400 dark:text-slate-500">Lokasi</span><span className="font-medium">{info.lokasi}</span></div>
        <div className="flex gap-2"><span className="w-14 shrink-0 text-slate-400 dark:text-slate-500">Hal</span><span className="font-medium italic">"{info.deskripsi}"</span></div>
        {info.catatan && (
          <div className="mt-1.5 rounded-lg border border-blue-100 bg-blue-50 p-2 text-[11px] text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <span className="font-bold">Respons petugas:</span> {info.catatan}
            {info.fotoTindakLanjut && (
              <a href={info.fotoTindakLanjut} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
                <img
                  src={info.fotoTindakLanjut}
                  alt="Foto tindak lanjut"
                  loading="lazy"
                  className="h-14 w-14 rounded-md border border-blue-100 object-cover dark:border-blue-900"
                />
              </a>
            )}
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
          className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-400 hover:text-blue-600 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-300">
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
    <div className="mt-3 overflow-hidden rounded-xl border border-green-200 bg-green-50 shadow-sm dark:border-green-900 dark:bg-green-950/30">
      <div className="flex items-center gap-2 border-b border-green-100 px-3 py-2 dark:border-green-900">
        <Phone size={13} className="text-green-600 shrink-0" />
        <span className="text-[11px] font-bold text-green-800 dark:text-green-200">Petugas Piket Hari Ini</span>
      </div>
      <div className="p-3 text-xs text-slate-700 dark:text-slate-200">
        <div className="flex gap-2"><span className="w-14 shrink-0 text-slate-400 dark:text-slate-500">Nama</span><span className="font-semibold">{name}</span></div>
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
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Bot size={15} />
      </div>
      <div className="rounded-2xl rounded-tl-none border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}


// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatbotUnified({
  opened,
  onToggle,
  onOpenResource,
  onOpenModal,
  onOpenAduan,
  launcherHidden,
}: {
  opened?: boolean;
  onToggle?: (v: boolean) => void;
  onOpenResource: (resource: ChatResource) => void;
  onOpenModal: (modal: ChatInfoModal) => void;
  onOpenAduan: () => void;
  launcherHidden?: boolean;
}) {
  const [messages, setMessages]         = useState<ChatMsg[]>([]);
  const [input, setInput]               = useState('');
  const [isBusy, setIsBusy]             = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<ChatPhoto[]>([]);
  const [activeStep, setActiveStep]     = useState<ComplaintStep | null>(null);
  const { ask: askAi, cancel: cancelAi } = useAiChat();

  const listRef    = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const draftRef   = useRef<ComplaintDraft | null>(null);
  const photoPreviewsRef = useRef(new Set<string>());
  const prevOpened = useRef(false);

  const isOpen = opened === true;
  const isOpenRef = useRef(isOpen);

  // ── helpers ──────────────────────────────────────────────────────────────
  const addMsg = useCallback((role: MsgRole, text: string, extra?: Partial<ChatMsg>) => {
    setMessages(prev => [...prev, { role, text, ts: timeNow(), ...extra }]);
  }, []);

  const clearPhotos = useCallback(() => setPendingPhotos([]), []);

  const releasePhotoPreviews = useCallback(() => {
    photoPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoPreviewsRef.current.clear();
    setPendingPhotos([]);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  //  GELOMBUNG STREAMING
  // ═══════════════════════════════════════════════════════════════════
  //  Satu pesan bot dibuat SEKALI lalu teksnya ditimpa setiap potongan dari AI.
  // 金刚玻璃 bukan membuat pesan baru tiap potongan — kalau begitu riwayat
  //  chat akan berisi puluhan pesan kosong dan penggulir akan melompat-lompat.
  //
  //  `streamId` adalah penanda pesan yang sedang ditulis, jadi potongan yang
  //  tiba terlambat (setelah pengguna sudah pindah topiknya) tidak menimpa
  //  jawaban yang salah.
  const streamSeq = useRef(0);
  const streamIdRef = useRef(0);

  const beginStream = useCallback(() => {
    const id = ++streamSeq.current;
    streamIdRef.current = id;
    setMessages(prev => [
      ...prev,
      { role: 'bot', text: '', ts: timeNow(), streamId: id },
    ]);
    // Scroll ke bawah supaya potongan pertama terlihat.
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-chat-end]');
      el?.scrollIntoView({ block: 'end' });
    });
  }, []);

  const appendToStream = useCallback((chunk: string) => {
    const id = streamIdRef.current;
    if (!id) return;
    setMessages(prev =>
      prev.map((m) => (m.streamId === id ? { ...m, text: m.text + chunk } : m)),
    );
  }, []);

  /** Tutup gelembung streaming: whatever yang terkirim tetap dipertahankan. */
  const finishStream = useCallback(() => {
    streamIdRef.current = 0;
  }, []);

  /* ═══════════════════════════════════════════════════════════════════
     Jika stream gagal dan belum ada satu pun teks yang tampil, gelembung
     kosongnya dibuang — jangan sampai pengguna melihat kotak kosong. */
  const discardStream = useCallback(() => {
    const id = streamIdRef.current;
    streamIdRef.current = 0;
    if (!id) return;
    setMessages(prev => prev.filter(m => !(m.streamId === id && !m.text.trim())));
  }, []);

  // ── open / close lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && !prevOpened.current) {
      setMessages([{
        role: 'bot',
        text: 'Selamat datang di **Chatbot Cerdas** — asisten Satgas Linmas Pedestrian Ponorogo.\n\nAda yang bisa saya bantu hari ini?',
        actions: QUICK_ACTIONS,
        ts: timeNow(),
      }]);
      prefetchSatgasLinmasText();
      resetMemory();
    }
    if (!isOpen && prevOpened.current) {
      cancelAi();
      draftRef.current = null;
      setActiveStep(null);
      releasePhotoPreviews();
      resetMemory();
    }
    prevOpened.current = isOpen;
  }, [isOpen, releasePhotoPreviews, cancelAi]);

  useEffect(() => () => {
    cancelAi();
    photoPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoPreviewsRef.current.clear();
  }, [cancelAi]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }));
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      launcherRef.current?.focus({ preventScroll: true });
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia('(max-width: 639px)');
    const syncPanel = () => {
      if (!panel) return;
      if (mobile.matches) {
        panel.style.top = `${viewport?.offsetTop ?? 0}px`;
        panel.style.bottom = 'auto';
        panel.style.height = `${viewport?.height ?? window.innerHeight}px`;
      } else {
        panel.style.removeProperty('top');
        panel.style.removeProperty('bottom');
        panel.style.removeProperty('height');
      }
    };

    syncPanel();
    viewport?.addEventListener('resize', syncPanel);
    viewport?.addEventListener('scroll', syncPanel);
    window.addEventListener('resize', syncPanel);
    mobile.addEventListener('change', syncPanel);
    return () => {
      viewport?.removeEventListener('resize', syncPanel);
      viewport?.removeEventListener('scroll', syncPanel);
      window.removeEventListener('resize', syncPanel);
      mobile.removeEventListener('change', syncPanel);
      panel?.style.removeProperty('top');
      panel?.style.removeProperty('bottom');
      panel?.style.removeProperty('height');
    };
  }, [isOpen]);

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isBusy]);

  // ── photo handler ─────────────────────────────────────────────────────────
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const alreadyAttached = draftRef.current?.photos.length ?? 0;
    const available = Math.max(0, 3 - alreadyAttached - pendingPhotos.length);
    const added = Array.from(files).slice(0, available).map((file) => {
      const preview = URL.createObjectURL(file);
      photoPreviewsRef.current.add(preview);
      return { file, preview };
    });
    setPendingPhotos(prev => [...prev, ...added].slice(0, 3));
  };

  const removePhoto = (idx: number) => {
    const preview = pendingPhotos[idx].preview;
    URL.revokeObjectURL(preview);
    photoPreviewsRef.current.delete(preview);
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const askForNextComplaintField = (draft: ComplaintDraft) => {
    if (!draft.nama) {
      draft.step = 'nama'; setActiveStep('nama');
      addMsg('bot', 'Sebutkan **nama lengkap** pelapor:');
    } else if (!draft.kategori) {
      draft.step = 'kategori'; setActiveStep('kategori');
      addMsg('bot', 'Pilih kategori gangguan yang paling sesuai:');
    } else if (!draft.lokasi) {
      draft.step = 'lokasi'; setActiveStep('lokasi');
      addMsg('bot', 'Di mana lokasi spesifik kejadiannya?');
    } else if (!draft.deskripsi) {
      draft.step = 'deskripsi'; setActiveStep('deskripsi');
      addMsg('bot', 'Jelaskan secara singkat apa yang terjadi (minimal 10 karakter):');
    } else {
      draft.step = 'foto'; setActiveStep('foto');
      addMsg('bot', draft.photos.length
        ? 'Informasi dan foto sudah siap. Periksa kembali, lalu ketik **kirim** untuk mengirim laporan.'
        : 'Informasi sudah siap. Tambahkan foto bila ada, lalu ketik **kirim**. Ketik **lanjut** untuk mengirim tanpa foto.');
    }
  };

  // ── complaint flow ────────────────────────────────────────────────────────
  const processComplaint = async (text: string, photos: ChatPhoto[]): Promise<boolean> => {
    const draft = draftRef.current;
    if (!draft) return false;
    if (photos.length) {
      const existingFiles = new Set(draft.photos.map((photo) => photo.file));
      draft.photos = [...draft.photos, ...photos.filter((photo) => !existingFiles.has(photo.file))].slice(0, 3);
    }

    if (draft.step === 'nama') {
      if (text.length < 3) { addMsg('bot', 'Mohon masukkan nama lengkap Anda.'); return true; }
      draft.nama = text;
      askForNextComplaintField(draft);
      return true;
    }

    if (draft.step === 'kategori') {
      draft.kategori = text;
      askForNextComplaintField(draft);
      return true;
    }

    if (draft.step === 'lokasi') {
      draft.lokasi = text;
      askForNextComplaintField(draft);
      return true;
    }

    if (draft.step === 'deskripsi') {
      if (text.length < 10) { addMsg('bot', 'Deskripsi terlalu singkat. Mohon berikan informasi lebih detail.'); return true; }
      draft.deskripsi = text;
      askForNextComplaintField(draft);
      return true;
    }

    if (draft.step === 'foto') {
      const sendConfirmed = /^(kirim|kirim laporan|lanjut|ya|iya|setuju)$/i.test(text);
      const skipPhoto = /^(tanpa foto|lewati foto|skip foto|tidak ada foto)$/i.test(text);
      const finalPhotos = draft.photos;
      if (finalPhotos.length && !sendConfirmed) {
        addMsg('bot', 'Foto sudah terlampir. Ketik **kirim** jika data sudah benar dan Anda ingin mengirim laporan.');
        return true;
      }
      if (!finalPhotos.length && !sendConfirmed && !skipPhoto) {
        addMsg('bot', 'Tambahkan foto bila ada, lalu ketik **kirim**. Ketik **lanjut** untuk mengirim tanpa foto.');
        return true;
      }
      setIsBusy(true);
      try {
        // Foto dikompres di browser agar cepat dan tidak melebihi batas server.
        const prepared = await preparePhotos(finalPhotos.map(p => p.file));
        const result = await submitComplaint({
          nama: draft.nama || '',
          kategori: draft.kategori || '',
          lokasi: draft.lokasi || '',
          deskripsi: draft.deskripsi || '',
          source: 'Chatbot SIPEDAS',
          photos: prepared,
        });

        if (result.ticketNumber) {
          addMsg('bot', `Laporan berhasil dikirim!\n\nNomor tiket Anda: **${result.ticketNumber}**\n\nPetugas Satgas Linmas akan segera menindaklanjuti. Simpan nomor tiket ini untuk memantau status.`);
          const wa = await fetchWa();
          if (wa) {
            const msg = encodeURIComponent(`Halo, saya ingin meneruskan laporan SIPEDAS.\nTiket: ${result.ticketNumber}\nOleh: ${draft.nama}\nLokasi: ${draft.lokasi}\nHal: ${draft.deskripsi}`);
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
      } catch (err: any) {
        console.error('[processComplaint]', err);
        addMsg('bot', `Laporan belum berhasil dikirim: ${err?.message || 'terjadi kendala teknis'}.\n\nSilakan coba lagi, atau teruskan laporan lewat Form Aduan di halaman ini.`);

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
        if (text) {
          requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
        }
    }

    setIsBusy(true);
    try {
      // Batal
      if (draftRef.current && /^(batal|cancel|stop|keluar)$/i.test(text)) {
        draftRef.current = null; setActiveStep(null); clearPhotos();
        addMsg('bot', 'Proses laporan dibatalkan. Ada yang lain bisa saya bantu?');
        return;
      }

      const matchedContacts = EMERGENCY_CONTACTS.filter((contact) => contact.pattern.test(text));
      const asksAllEmergency = /nomor\s+darurat|kontak\s+darurat|nomor\s+layanan\s+darurat/i.test(text);
      const asksContact = /\b(?:nomor|kontak|telepon|telp|hubungi|darurat)\b/i.test(text);
      if (asksAllEmergency || (asksContact && matchedContacts.length > 0)) {
        const contacts = matchedContacts.length ? matchedContacts : EMERGENCY_CONTACTS;
        addMsg('bot', `Nomor kontak layanan resmi:\n${contacts.map((contact) => `**${contact.name}:** ${contact.number}`).join('\n')}\n\nJika situasinya mendesak, telepon layanan terkait secara langsung.`, {
          actions: contacts.map((contact) => ({
            label: `Telepon ${contact.name}`,
            payload: `tel:${contact.number}`,
            type: 'phone' as const,
            icon: <Phone size={13} />,
          })),
        });
        return;
      }

      // Complaint flow
      if (draftRef.current) {
        const handled = await processComplaint(text, pendingPhotos);
        if (handled) {
          clearPhotos();
          return;
        }
      }

      // Nomor resmi dijawab dari daftar ini, bukan ditebak AI.
      // Foto atau perintah lapor langsung membuat draft; detail dikumpulkan bertahap.
      const startsComplaint = /^(lapor|buat aduan|adu|aduan|pengaduan)$/i.test(text);
      if (startsComplaint || pendingPhotos.length > 0) {
        const hasDescription = pendingPhotos.length > 0 && text.length >= 10 && !startsComplaint;
        draftRef.current = {
          step: hasDescription ? 'nama' : pendingPhotos.length ? 'deskripsi' : 'nama',
          nama: undefined,
          kategori: undefined,
          lokasi: undefined,
          deskripsi: hasDescription ? text : undefined,
          photos: [...pendingPhotos],
        };
        clearPhotos();
        if (hasDescription) {
          addMsg('bot', 'Foto dan keterangan awal sudah saya catat.');
          askForNextComplaintField(draftRef.current);
        } else if (pendingPhotos.length) {
          setActiveStep('deskripsi');
          addMsg('bot', 'Foto sudah diterima dan disimpan untuk laporan. Ceritakan **apa yang terjadi**; saya akan meminta data lain yang masih kurang setelahnya.');
        } else {
          askForNextComplaintField(draftRef.current);
        }
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
              : 'Berikut kontak petugas Satgas Linmas Pedestrian:',
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
      if (
        /^(?:cctv|sipedas view|pantau cctv|lihat cctv)$/i.test(text) ||
        /\b(?:buka|lihat|melihat|tonton|akses|link|cara melihat|cara lihat)\b.{0,32}\b(?:cctv|kamera|sipedas view)\b|\b(?:cctv|kamera|sipedas view)\b.{0,32}\b(?:buka|lihat|tonton|akses|link)\b/i.test(text)
      ) {
        addMsg('bot', 'Pantauan CCTV live tersedia di **SIPEDAS VIEW**:', {
          actions: [{ label: 'Buka SIPEDAS VIEW', payload: 'cctv', type: 'route', icon: <MonitorPlay size={13} /> }],
        });
        return;
      }

      // Peta
      if (
        /^(?:peta|peta kerawanan|mymaps|titik rawan)$/i.test(text) ||
        /\b(?:buka|lihat|tampilkan|akses|link|lokasi)\b.{0,32}\b(?:peta|kerawanan|titik rawan)\b|\b(?:peta|kerawanan|titik rawan)\b.{0,32}\b(?:buka|lihat|tampilkan|akses|link)\b/i.test(text)
      ) {
        addMsg('bot', 'Peta kerawanan pedestrian Ponorogo tersedia di **Peta Kerawanan**:', {
          actions: [{ label: 'Buka Peta Kerawanan', payload: 'mymaps', type: 'route', icon: <Map size={13} /> }],
        });
        return;
      }

      // Pengaduan/laporan — arahkan ke section sekaligus tawari flow
      if (/\b(?:pengaduan|aduan|laporkan|komplain|buat laporan|kirim laporan)\b/i.test(text)) {
        addMsg('bot', 'Anda bisa membuat laporan langsung lewat form di halaman ini, atau saya bantu proses sekarang:', {
          actions: [
            { label: 'Buka Form Aduan', payload: 'aduan', type: 'panel', icon: <Megaphone size={13} /> },
            { label: 'Lapor via Chatbot', payload: 'lapor', type: 'text', icon: <AlertCircle size={13} /> },
          ],
        });
        return;
      }

      // Galeri foto
      if (
        /^(?:galeri|gallery|foto kegiatan|dokumentasi)$/i.test(text) ||
        /\b(?:buka|lihat|melihat|tampilkan|akses|link)\b.{0,32}\b(?:galeri|gallery|foto kegiatan|dokumentasi)\b/i.test(text)
      ) {
        addMsg('bot', 'Dokumentasi kegiatan dapat dibuka di halaman galeri:', {
          actions: [{ label: 'Buka Galeri', payload: 'galeri', type: 'route', icon: <Images size={13} /> }],
        });
        return;
      }

      // Jadwal dan aturan
      if (/\b(?:jadwal|piket|jam bertugas|jam operasional|aturan kawasan)\b/i.test(text)) {
        addMsg('bot', 'Berikut jadwal dan aturan program Satgas Linmas:', {
          actions: [{ label: 'Buka Jadwal & Aturan', payload: 'jadwalModal', type: 'modal', icon: <Clock size={13} /> }],
        });
        return;
      }

      // Info program / profil
      if (
        /\b(?:profil|program)\b.{0,32}\b(?:sipedas|satgas|pedestrian)\b|\b(?:tentang|mengenal)\b.{0,32}\b(?:sipedas|satgas|pedestrian)\b|\bapa itu\s+sipedas\b/i.test(text) &&
        !/video|youtube|survei|survey|evaluasi|penilaian|kepuasan|rating|bintang/i.test(text)
      ) {
        addMsg('bot', 'Pilih informasi SIPEDAS yang ingin Anda lihat:', {
          actions: [
            { label: 'Profil Program', payload: 'programModal', type: 'modal', icon: <AlertCircle size={13} /> },
            { label: 'Jadwal & Aturan', payload: 'jadwalModal', type: 'modal', icon: <Clock size={13} /> },
          ],
        });
        return;
      }

      // Video profil
      if (/video|youtube/i.test(text)) {
        addMsg('bot', 'Video profil tersedia di bagian dokumentasi:', {
          actions: [{ label: 'Tonton Video Profil', payload: '__scroll:video', type: 'text', icon: <Play size={13} /> }],
        });
        return;
      }

      // Rating / evaluasi
      if (/survei|survey|evaluasi|penilaian|kepuasan|rating|bintang/i.test(text)) {
        addMsg('bot', 'Form penilaian layanan Sapa Pedestrian dapat dibuka di sini:', {
          actions: [{ label: 'Buka Form Rating', payload: 'rating', type: 'route', icon: <Star size={13} /> }],
        });
        return;
      }

      // Instagram
      if (/instagram|ig\b/i.test(text)) {
        addMsg('bot', 'Ikuti Instagram resmi Satgas Linmas Ponorogo:', {
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

      // ═══════════════════════════════════════════════════════════════════
      //  JAWAB — AI dulu, mesin pengetahuan lokal sebagai cadangan
      // ═══════════════════════════════════════════════════════════════════
      //  Jalur AI (OpenRouter/Nemotron) diungguli di atas semua
      //  regex: ia menjawab pertanyaan bebas dengan penalaran sendiri, dan
      //  turunannya bisa langsung menampilkan kata "__SCROLL:pengaduan__"
      //  supaya tombol Form Aduan ikut menyala di bawah jawabannya.
        //  Jalur AI menjawab pertanyaan bebas. Navigasi dan tindakan operasional
        //  ditangani oleh route di atas agar selalu menjalankan resource nyata.
      //
      //  Kalau AI tidak bisa dilayani — kunci belum di-set, rate limit, atau
      //  jaringan putus sebelum ada satu pun teks — mesin lokal di bawah
      //  yang menjawab. Tepat satu dari keduanya yang tampil, tidak pernah keduanya.
      beginStream();
      const ai = await askAi(
        text,
        toAiHistory(messages),
        (chunk) => appendToStream(chunk),
      );

      if (!isOpenRef.current) {
        discardStream();
        return;
      }

      if (ai.ok && ai.text.trim()) {
        finishStream();
        return;
      }

      // Fallback: mesin pengetahuan lokal (BM25+ atas dokumen resmi).
      discardStream();
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
    if (act.type === 'phone') { window.location.href = act.payload; return; }
    if (act.type === 'link') { window.open(act.payload, '_blank'); return; }
    if (act.type === 'route') {
      onToggle?.(false);
      onOpenResource(act.payload);
      return;
    }
    if (act.type === 'modal') {
      onToggle?.(false);
      onOpenModal(act.payload);
      return;
    }
    if (act.type === 'panel') {
      onOpenAduan();
      return;
    }
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
        ref={launcherRef}
        onClick={() => onToggle?.(true)}
        disabled={isOpen || launcherHidden}
        aria-hidden={isOpen || launcherHidden}
        aria-label="Buka Chatbot Cerdas"
        className={`fixed bottom-5 right-5 z-[1000] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl transition-all duration-500 hover:scale-110 active:scale-95 ${
          isOpen || launcherHidden ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ background: NAV_GRADIENT }}
      >
        <MessageCircle size={22} />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold shadow-sm">1</span>
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20 pointer-events-none" />
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Tutup chatbot dan kembali ke halaman"
          onClick={() => onToggle?.(false)}
          className="fixed inset-0 z-[1000] cursor-default bg-slate-950/35 backdrop-blur-[2px] sm:bg-slate-950/20"
        />
      )}

      {/* ── Chat window ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-labelledby="chatbot-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onToggle?.(false);
            return;
          }
          if (event.key !== 'Tab' || !panelRef.current) return;

          const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), textarea:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
          )).filter((element) => element.getClientRects().length > 0);
          if (!focusable.length) {
            event.preventDefault();
            panelRef.current.focus();
          } else if (event.shiftKey && document.activeElement === focusable[0]) {
            event.preventDefault();
            focusable[focusable.length - 1].focus();
          } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
            event.preventDefault();
            focusable[0].focus();
          }
        }}
        className={`fixed inset-x-0 bottom-0 z-[1001] flex h-[100dvh] flex-col overflow-hidden bg-white shadow-2xl transition-[opacity,transform,visibility] duration-300 ease-out dark:bg-slate-950 sm:bottom-5 sm:left-auto sm:right-5 sm:h-[min(680px,92vh)] sm:w-[400px] sm:rounded-2xl
          ${isOpen ? 'visible translate-y-0 opacity-100' : 'invisible pointer-events-none translate-y-4 opacity-0'}`}
      >

        {/* Header */}
        <header className="relative flex shrink-0 items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white shadow-md sm:px-5 sm:py-4" style={{ background: NAV_GRADIENT }}>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <Bot size={22} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-blue-700 bg-blue-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="chatbot-title" className="text-sm font-bold leading-tight tracking-tight">Chatbot Cerdas</h2>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-100 mt-0.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-200 shrink-0" />
              Sistem Pelayanan Digital Terpadu
            </p>
          </div>
          <button
            ref={closeButtonRef}
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
          className="chatbot-message-surface min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 custom-scrollbar"
        >
          {messages.map((m, i) => (
            <div key={i}
              className={`flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>

              {/* Avatar */}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                m.role === 'user' ? 'bg-slate-800 text-white' : 'border border-slate-300 bg-white text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400'
              }`}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[84%] space-y-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-tr-none bg-blue-600 text-white'
                    : 'rounded-tl-none border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                }`}>

                  {m.photos && m.photos.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.photos.map((p, pi) => (
                        <img key={pi} src={p.preview} alt="" className="h-20 w-20 rounded-lg border border-black/5 object-cover dark:border-white/10" />
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

                <span className="px-1 text-[10px] text-slate-400 dark:text-slate-500">{m.ts}</span>
              </div>
            </div>
          ))}

          {/* Kategori chips */}
          {!isBusy && activeStep === 'kategori' && (
            <div className="ml-9 flex flex-wrap gap-1.5">
              {KATEGORI_LIST.map(k => (
                <button key={k} onClick={() => onSend(k)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-300">
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
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-300">
                  📍 {l}
                </button>
              ))}
            </div>
          )}

          {isBusy && <TypingIndicator />}
        </div>


        {/* Input area — tanpa FAQ/Syarat */}
          <footer className="shrink-0 border-t border-slate-300 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 dark:border-slate-800 dark:bg-slate-950 sm:px-4 sm:py-3">

          {/* Preview foto pending */}
          {pendingPhotos.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5">
              {pendingPhotos.map((p, i) => (
                <div key={i} className="relative group shrink-0">
                  <img src={p.preview} alt="" className="h-14 w-14 rounded-xl border border-slate-300 object-cover dark:border-slate-700" />
                  <button onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow transition-transform group-hover:scale-110">
                    <Trash2 size={9} />
                  </button>
                </div>
              ))}
              {pendingPhotos.length < 3 && (
                <button onClick={() => cameraRef.current?.click()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-500 dark:border-slate-700 dark:text-slate-500">
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
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">
                <ImageIcon size={18} />
              </button>
              <button title="Ambil foto" disabled={isBusy || pendingPhotos.length >= 3}
                onClick={() => cameraRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">
                <Camera size={18} />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              enterKeyHint="send"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder={activeStep === 'foto' ? 'Ketik "lanjut" atau kirim foto…' : 'Tulis pesan…'}
              className="flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 dark:focus:ring-blue-950/50"
              style={{ maxHeight: '100px' }}
            />

            {/* Send */}
            <button type="button" onClick={() => onSend()}
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
