import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, withApi, parseBody } from '../src/lib/server/http.js';
import { buildContext, streamChat } from '../src/lib/server/openrouter.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  POST /api/chat
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Jawab dari OpenRouter (NVIDIA Nemotron) dengan bahan baca yang diambil dari
 *  dokumen resmi SIPEDAS.
 *
 *  ── Bentuk respons ────────────────────────────────────────────────────────
 *  Dua bentuk, dan frontend harus memperlakukannya berbeda:
 *
 *   · **SSE** (`Content-Type: text/event-stream`) — jawaban mengalir:
 *     `data: {"t":"…"}` per potongan, ditutup `data: [DONE]`.
 *     Dipakai kalau OpenRouter berhasil dan mengirim minimal satu token.
 *
 *   · **JSON** `{ ok: false, reason }` — kalau kunci belum di-set, rate limit
 *     habis, atau OpenRouter gagal SEBELUM ada satu pun byte yang keluar.
 *     Inilah yang membuat frontend bisa jatuh ke mesin pengetahuan lokal dengan
 *     aman: jawaban tidak pernah hilang total.
 *
 *  ── Catatan ───────────────────────────────────────────────────────────────
 *  Kunci API dibaca dari `process.env.OPENROUTER_API_KEY` — TIDAK BERAWALAN
 *  `VITE_`, supaya tidak pernah ikut ter-*bundle* ke JavaScript browser.
 */

const ORIGIN_FALLBACK = 'https://sipedasview.vercel.app';

function originOf(req: VercelRequest): string {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return ORIGIN_FALLBACK;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return `${proto}://${host}`;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const limit = rateLimit(req, { limit: 20, windowMs: 60_000, scope: 'chat' });
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      reason: 'rate',
      error: `Terlalu banyak pertanyaan. Mohon coba lagi dalam ${limit.retryAfter} detik.`,
      retryAfter: limit.retryAfter,
    });
  }

  /* Tanpa kunci: endpoint ini memang opsional — frontend sudah punya mesin
   * pengetahuan lokal sebagai cadangan, jadi kondisi ini dilaporkan normal
   * dengan HTTP 200 supaya tidak terbaca sebagai kegagalan. */
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(200).json({
      ok: false,
      reason: 'no_key',
      error: 'Layanan AI belum dikonfigurasi.',
    });
  }

  const body = parseBody(req);
  const question = String(body?.question ?? '').trim();
  if (question.length < 2) {
    return res.status(400).json({ ok: false, reason: 'empty', error: 'Pertanyaan kosong.' });
  }

  const history = Array.isArray(body?.history) ? body.history : [];
  const context = await buildContext(question, originOf(req));

  /* Tunda header SSE sampai delta pertama agar fallback JSON tetap mungkin
     bila kedua model gagal sebelum menghasilkan jawaban. */
  let streamStarted = false;
  const startStream = () => {
    if (streamStarted) return;
    streamStarted = true;
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Cegah proxy(Vercel/nginx) menahan stream di buffer.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  };
  const write = (payload: object) => {
    startStream();
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const result = await streamChat({
    question,
    history,
    context,
    onDelta: (t) => write({ t }),
  });

  if (!result.ok) {
    // Belum ada satu pun byte jawaban yang keluar — mundur ke JSON supaya
    // frontend bisa memakai mesin lokal.
    return res.status(200).json({
      ok: false,
      reason: 'upstream',
      error: 'Layanan AI sedang tidak dapat dihubungi.',
    });
  }

  // Tutup stream dengan rapi.
  write({ done: true, model: result.model });
  res.write('data: [DONE]\n\n');
  res.end();
}

export default withApi(handler, { methods: ['POST'], name: 'chat' });