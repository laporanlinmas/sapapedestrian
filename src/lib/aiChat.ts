'use client';

import { useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
 *  KLIEN CHAT AI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Menghubungkan UI chat ke `/api/chat` (OpenRouter + Nemotron) dengan dua
 *  jaminan yang dipegang klien:
 *
 *  · **Tidak pernah menggantung.** Ada `AbortController` sendiri yang lebih longgar
 *    dari batas server (75 detik vs 70) — kalau jaringan putus tanpa
 *    memberi jawaban apa pun, fungsi ini menyerah dan mengembalikan
 *    `ok: false`, sehingga pemanggil bisa jatuh ke mesin pengetahuan lokal.
 *
 *  · **Tidak pernah dobel.** Kalau server sudah sempat mengirim potongan teks,
 *    hasilnya `ok: true` walau stream-nya putus di tengah. Pemanggil WAJIB
 *    menghormati itu — kalau tidak, satu pertanyaan bisa tampil dua kali:
 *    separuh dari AI, lalu jawaban penuh dari mesin lokal.
 *
 *  Bentuk respons dari server sengaja dibuat berbeda-beda dan keduanya
 *  ditangani di sini:
 *    · SSE  → `data: {"t":"…"}` per potongan, ditutup `data: [DONE]`
 *    · JSON → `{ ok:false, reason }` saat AI tidak bisa dilayani
 */

export interface AiTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiResult {
  ok: boolean;
  text: string;
  /** Alasan kegagalan, kalau ada — untuk pesan atau log. */
  reason?: string;
  /** Model yang menjawab; informational. */
  model?: string;
}

const CLIENT_TIMEOUT_MS = 75_000;
/** Batas giliran riwayat yang dikirim. */
const MAX_TURNS = 10;

/** Bentuk jawaban untuk mesin lokal, agar riwayat tetap konsisten. */
export function toAiHistory(messages: { role: string; text: string }[]): AiTurn[] {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'bot') && m.text && m.text.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));
}

export function useAiChat() {
  const abortRef = useRef<AbortController | null>(null);

  /** Batalkan permintaan yang sedang berjalan (mis. chat ditutup). */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const ask = useCallback(
    async (
      question: string,
      history: AiTurn[],
      onDelta: (chunk: string) => void,
    ): Promise<AiResult> => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

      let text = '';
      let got = false;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ question, history }),
        });

        /* ── Bentuk JSON: AI tidak bisa dilayani ──────────────────────────
           Kunci belum di-set, rate limit, atau upstream gagal. Ini jalur
           yang NORMAL, bukan error — makanya tidak pernah dilempar. */
        const ctype = res.headers.get('content-type') || '';
        if (!ctype.includes('text/event-stream')) {
          let reason = 'unknown';
          try {
            const json = await res.json();
            if (typeof json?.reason === 'string') reason = json.reason;
          } catch { /* body bukan JSON */ }
          return { ok: false, text: '', reason };
        }

        /* ── Bentuk SSE ─────────────────────────────────────────────────── */
        const reader = res.body?.getReader();
        if (!reader) return { ok: false, text: '', reason: 'no-body' };

        const decoder = new TextDecoder();
        let buffer = '';
        let model = '';

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

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

              if (typeof json?.t === 'string' && json.t) {
                got = true;
                text += json.t;
                onDelta(json.t);
              }
              if (typeof json?.done === 'boolean') model = json.model || '';
            }
          }
        }

        if (!got) return { ok: false, text: '', reason: 'empty' };
        return { ok: true, text, model };
      } catch (err) {
        /* Putus di tengah jalan, tapi teks sudah tampil → tetap sukses, supaya
           pemanggil tidak menggandakan jawaban dengan mesin lokal. */
        if (got) return { ok: true, text };
        const aborted = (err as Error)?.name === 'AbortError';
        return { ok: false, text: '', reason: aborted ? 'timeout' : 'network' };
      } finally {
        clearTimeout(timer);
        abortRef.current = null;
      }
    },
    [],
  );

  return { ask, cancel };
}