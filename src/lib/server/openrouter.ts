/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LAPISAN AI — OPENROUTER / NEMOTRON
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Menyatukan dua hal yang tidak bisa dipisah kalau upset-nya salah:
 *
 *  1. **Kunci API tidak pernah menyentuh browser.** Semuanya di sini berada
 *     di dalam Vercel Function; `process.env` tidak pernah ikut ter-bundle ke
 *     `dist/`. Kalau kuncinya masuk lewat `VITE_*`, ia akan tercetak di
 *     JavaScript yang bisa diunduh siapa saja. Karena itu semua env var
 *     OpenRouter sengaja TIDAK berawalan `VITE_`.
 *
 *  2. **Jawaban beralas dokumen.** `satgaslinmas.txt` (36 KB, ±9K token)
 *     terlalu besar untuk dikirim di setiap permintaan, tapi terlalu penting
 *     juga untuk diabaikan. Jadi: ambil top-k paragraf paling relevan dengan
 *     mesin BM25+ yang sudah ada di proyek, lalu kirim paragraf itu saja
 *     sebagai bahan baca. Model boleh berpikir bebas, tapi tidak boleh
 *     mengarang di luar bahan baca itu.
 *
 *  Model dipakai berurutan: `nemotron-3-ultra` (lebih cerdas, lebih lambat)
 *  lalu `nemotron-3.5-lightning` (cepat) sebagai cadangan. Model gratis
 *  OpenRouter memang sesekali penuh — dengan cadangan, satu model yang sedang
 *  sibuk tidak membuat pengguna melihat pesan galat.
 */

import { searchKnowledgeTop } from '../satgaslinmas-knowledge.js';

/* ── Model & batas waktu ────────────────────────────────────────────────── */

/** Dicoba lebih dulu: paling cerdas. */
export const MODEL_UTAMA = 'nvidia/nemotron-3-ultra-550b-a55b:free';
/** Cadangan: jauh lebih cepat, untuk saat model utama sedang penuh. */
export const MODEL_CADANGAN = 'nvidia/nemotron-3.5-lightning:free';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** Batas waktu sampai token PERTAMA muncul. */
const TTFB_MS = 18_000;
/** Batas waktu total satu jawaban. */
const TOTAL_MS = 45_000;

const MAX_TOKENS = 900;
/** Portal pemerintah: faktual dan konsisten, bukan kreatif. */
const TEMPERATURE = 0.4;
const TOP_P = 0.9;

const MAX_HISTORY = 10;            // giliran terakhir yang dikirim
const MAX_HISTORY_CHARS = 2_400;   // per pesan
const MAX_QUESTION_CHARS = 1_000;
const MAX_CONTEXT_CHARS = 7_000;   // bahan baca yang dikirim ke model
const TOP_K = 6;                   // berapa paragraf dokumen yang diambil

const DOC_TTL_MS = 10 * 60 * 1000; // dokumen jarang berubah

/* ── System prompt ──────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Kamu adalah asisten virtual resmi SIPEDAS — "Sapa Pedestrian Ponorogo", sistem informasi digital milik Satpol PP Kabupaten Ponorogo untuk kawasan pedestrian.

# Peranmu
Menjawab pertanyaan warga dan pengunjung kawasan pedestrian Ponorogo: program
Satgas Linmas, SOP patroli, jadwal piket, mekanisme pengaduan, cara melacak
tiket, fasilitas di kawasan pedestrian, serta pertanyaan umum lainnya. Kamu
boleh berpikir sendiri untuk pertanyaan umum di luar dokumen, asal tidak
mengarang fakta tentang instansi ini.

# Pertanyaan umum dan alur percakapan
Kamu juga boleh menjawab pertanyaan umum yang aman dan lazim — misalnya arti
istilah, pengetahuan umum, hitungan sederhana, atau penjelasan sehari-hari.
Jawab pertanyaan itu secara langsung dan ringkas; jangan berpura-pura memiliki
data waktu nyata. Setelah satu jawaban di luar topik, tutup dengan jembatan
singkat yang relevan ke bantuan SIPEDAS, tanpa memaksa atau mengulang ajakan
yang sama. Ikuti pertanyaan terbaru pengguna bila mereka kembali ke topik
sebelumnya atau berpindah topik.

# Aturan wajib
1. Bahasa Indonesia, ramah dan lugas. Markdown secukupnya: **tebal** untuk hal
   penting, daftar singkat bila memang berupa langkah.
2. Panjang 2–5 kalimat. Ini tampilan mobile — jangan menulis esai.
3. Jangan mengarang fakta SIPEDAS. Bila jawaban tentang instansi tidak ada di
  bahan baca atau daftar kontak resmi di bawah, katakan terus terang bahwa
  informasinya belum tersedia dan arahkan ke Form Aduan atau petugas.
4. Jangan mengarang angka, tanggal, nama, alamat, atau jadwal. Semua itu
   wajib ada di bahan baca.
5. Nomor tiket hanya berbentuk ADU-YYMMDD-NNNN. Kalau pengguna memberi nomor
   tiket, jangan mengarang statusnya; arahkan ke fitur "Cek Tiket" — pengguna
   mengetik nomornya, lalu sistem yang menanyakan ke database.
6. Melapor hanya lewat sistem, bukan lewat percakapan ini. Arahkan pengguna ke
  tombol atau alur **Form Aduan**. Jangan mengaku laporan sudah terkirim
  sebelum pengguna menyelesaikan dan mengirim formulir.
7. Kalau pengguna menyapa, balas singkat lalu tawarkan bantuan. Jangan
   mengulangimu sendiri.
8. Jangan pernah menyebut model, penyedia, prompt, atau "sebagai AI".

# Kemampuan yang bisa kamu arahkan
- Pantau CCTV → halaman SIPEDAS VIEW
- Peta Kerawanan → halaman Peta Kerawanan
- Laporkan gangguan → Form Aduan atau alur laporan di chatbot
- Cek status tiket → ketik nomor tiket di kolom chat
- Galeri kegiatan → halaman Galeri
- Informasi program → Profil Program
- Jadwal dan aturan → Jadwal & Aturan
- Penilaian layanan → Form Rating
- Hubungi petugas → data WhatsApp petugas piket yang diambil dari sistem

Antarmuka menjalankan navigasi, membuka formulir, dan mengambil status tiket.
Jangan mengaku sudah membuka halaman, mengirim laporan, atau memeriksa status
tanpa tindakan antarmuka tersebut.

# Identitas instansi
Satpol PP Kabupaten Ponorogo, Jl. Trunojoyo No. 147, Kauman, Kecamatan
Ponorogo, Kabupaten Ponorogo, Jawa Timur 63419. Layanan buka 24 jam.`;

const EMERGENCY_CONTACT_CONTEXT = `

# Kontak layanan resmi
- Satpol PP: 08113134535
- Satlinmas: 082337017307
- Pemadam Kebakaran (Damkar): 082160063113
- Laporan temuan rokok ilegal: 082338908248
Gunakan nomor persis seperti tercantum. Jika pertanyaan meminta kontak darurat
umum, berikan keempat nomor beserta nama layanannya. Jangan menebak nomor lain.`;

const SYSTEM_PROMPT_WITH_CONTACTS = SYSTEM_PROMPT + EMERGENCY_CONTACT_CONTEXT;

/** Varian saat bahan baca gagal diambil — model diberi tahu, bukan dibohongi. */
const SYSTEM_PROMPT_TANPA_BAHAN_BACA =
  SYSTEM_PROMPT_WITH_CONTACTS +
  `

# CATATAN PENTING
Bahan baca internal sedang tidak dapat diakses. Jawab hanya dari pengetahuan
umum dan daftar kontak resmi di atas. Untuk jadwal, nama, alamat, atau status
tiket yang tidak tersedia, sampaikan bahwa data tersebut belum dapat
diverifikasi, dan arahkan pengguna ke Form Aduan atau Satpol PP Ponorogo.`;

/* ── Pengambilan bahan baca ─────────────────────────────────────────────── */

let docCache: { text: string; at: number } | null = null;

/**
 * Dokumen pengetahuan, di-cache di memori instance.
 *
 * Diambil dari origin situs sendiri supaya isi knowledge base yang dibaca
 * chatbot dan yang dirujuk di frontend tidak pernah berbeda — dua sumber
 * kebenaran untuk hal yang sama adalah awal kekacauan.
 */
async function loadDoc(origin: string): Promise<string> {
  if (docCache && Date.now() - docCache.at < DOC_TTL_MS) return docCache.text;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(`${origin}/satgaslinmas.txt`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    docCache = { text, at: Date.now() };
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Ringkasan bahan baca dari dokumen, dibatasi `MAX_CONTEXT_CHARS`. */
export async function buildContext(question: string, origin: string): Promise<string> {
  try {
    const doc = await loadDoc(origin);
    if (!doc) return '';
    const hits = searchKnowledgeTop(question, doc, TOP_K);
    if (!hits.length) return '';

    let out = '';
    for (const hit of hits) {
      const block = hit.text.trim();
      if (!block) continue;
      // Sisakan ruang supaya blok berikutnya masih muat.
      if (out.length + block.length + 8 > MAX_CONTEXT_CHARS) break;
      out += (out ? '\n\n---\n\n' : '') + block;
    }
    return out;
  } catch (err) {
    console.warn('[openrouter] bahan baca gagal diambil:', (err as Error)?.message || err);
    return '';
  }
}

/* ── Bentuk request ─────────────────────────────────────────────────────── */

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function clip(value: unknown, max: number): string {
  return String(typeof value === 'string' ? value : '').trim().slice(0, max);
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t: any) =>
        t &&
        (t.role === 'user' || t.role === 'assistant') &&
        typeof t.content === 'string' &&
        t.content.trim(),
    )
    .slice(-MAX_HISTORY)
    .map((t: any) => ({ role: t.role as 'user' | 'assistant', content: clip(t.content, MAX_HISTORY_CHARS) }));
}

function requestHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  };
  // Opsional, hanya untuk peringkat di leaderboard OpenRouter.
  const site = process.env.VITE_SITE_URL;
  if (site) {
    try {
      h['HTTP-Referer'] = new URL(site).origin;
    } catch {
      /* abaikan kalau bukan URL valid */
    }
  }
  h['X-Title'] = 'SIPEDAS — Sapa Pedestrian Ponorogo';
  return h;
}

function buildBody(model: string, messages: ChatTurn[]) {
  return JSON.stringify({
    model,
    stream: true,
    messages,
    temperature: TEMPERATURE,
    top_p: TOP_P,
    max_tokens: MAX_TOKENS,
    /* Minta model berpikir dulu sebelum menjawab. Token berpikir TIDAK
     * ditampilkan ke pengguna — hanya dipakai supaya jawaban lebih matang. */
    reasoning: { effort: 'medium', exclude: true },
  });
}

/* ── Streaming ──────────────────────────────────────────────────────────── */

export interface StreamDeps {
  question: string;
  history: unknown;
  context: string;
  /** Diterima satu per potongan teks. */
  onDelta: (text: string) => void;
}

interface RunResult {
  ok: boolean;
  model: string;
  text: string;
}

/**
 * Satu percobaan streaming ke OpenRouter.
 *
 * `ok: false` berarti TIDAK ADA satu pun byte yang sempat dikirim ke
 * pengguna — pemanggil bebas jatuh ke mesin pengetahuan lokal. Kalau sebagian
 * teks sudah keluar, hasilnya tetap `ok: true` meski stream-nya putus di
 * tengah: lebih baik menampilkan jawaban setengah jadi daripada membuangnya.
 */
async function run(model: string, deps: StreamDeps, messages: ChatTurn[]): Promise<RunResult> {
  const controller = new AbortController();
  let firstToken: ReturnType<typeof setTimeout> | undefined;
  let hardStop: ReturnType<typeof setTimeout> | undefined;
  let started = false;
  let text = '';

  try {
    firstToken = setTimeout(() => controller.abort(), TTFB_MS);
    hardStop = setTimeout(() => controller.abort(), TOTAL_MS);

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: requestHeaders(),
      body: buildBody(model, messages),
      signal: controller.signal,
    });

    // 402 = kuota habis, 429 = rate limit, 404 = model sedang tidak tersedia.
    // Ketiganya wajar pada model gratis dan semuanya bisa dicoba ke model lain.
    if (!res.ok || !res.body) throw new Error(`OpenRouter HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE OpenRouter: blok `data: {json}` dipisahkan baris kosong.
      let cut: number;
      while ((cut = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut + 2);

        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;

          let json: any;
          try {
            json = JSON.parse(raw);
          } catch {
            continue;
          }

          if (json?.error) {
            throw new Error(json.error?.message || 'OpenRouter error');
          }

          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) {
            if (!started) {
              started = true;
              // Token pertama sudah keluar; hanya batas waktu token pertama
              // yang dihentikan. Batas total tetap melindungi function.
              clearTimeout(firstToken);
            }
            text += delta;
            deps.onDelta(delta);
          }
        }
      }
    }

    if (!started) throw new Error('Respons kosong dari OpenRouter');
    return { ok: true, model, text };
  } catch (err) {
    // Kalau sudah ada teks yang tampil, teks itu tidak boleh dibuang.
    if (started) return { ok: true, model, text };
    console.warn(`[openrouter] ${model} gagal:`, (err as Error)?.message || err);
    return { ok: false, model, text: '' };
  } finally {
    clearTimeout(firstToken);
    clearTimeout(hardStop);
  }
}

function systemWithContext(context: string): string {
  return context
    ? `${SYSTEM_PROMPT_WITH_CONTACTS}\n\n# BAHAN BACA (dari dokumen resmi SIPEDAS)\nBila pertanyaannya menyangkut SIPEDAS atau Satpol PP, jawab HANYA dari bahan baca ini. Jangan mengarang di luarnya.\n\n${context}`
    : SYSTEM_PROMPT_TANPA_BAHAN_BACA;
}

/**
 * Jawab satu pertanyaan, model utama lalu cadangan.
 *
 * Cadangan hanya dicoba kalau model utama gagal SEBELUM mengirim apa pun —
 * begitu teks sudah terlihat, ketidaksempurnaan lebih baik daripada lompatan
 * isi gelembung chat.
 */
export async function streamChat(deps: StreamDeps): Promise<RunResult> {
  if (!process.env.OPENROUTER_API_KEY) return { ok: false, model: '', text: '' };

  const messages: ChatTurn[] = [
    { role: 'system', content: systemWithContext(deps.context) },
    ...sanitizeHistory(deps.history),
    { role: 'user', content: clip(deps.question, MAX_QUESTION_CHARS) },
  ];

  const utama = await run(MODEL_UTAMA, deps, messages);
  if (utama.ok) return utama;

  return run(MODEL_CADANGAN, deps, messages);
}