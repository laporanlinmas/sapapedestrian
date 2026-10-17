import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Utilitas bersama untuk seluruh handler di api/.
 * Tujuan utama: apa pun yang terjadi, frontend HANYA PERNAH menerima JSON.
 * Tidak ada lagi halaman HTML/"A server error occurred" yang membuat
 * `res.json()` melempar "Unexpected token 'A'".
 */

export function applyCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

/** Bungkus handler: METHOD check, OPTIONS, dan jaring pengaman error. */
export function withApi<Req extends VercelRequest>(
  handler: (req: Req, res: VercelResponse) => Promise<unknown>,
  options: { methods?: string[]; name?: string } = {},
) {
  const methods = options.methods ?? ['GET', 'POST'];
  const label = options.name ?? 'api';

  return async function wrapped(req: Req, res: VercelResponse): Promise<void> {
    applyCors(res);

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (!req.method || !methods.includes(req.method)) {
      res.status(405).json({ error: 'Method not allowed', allowed: methods });
      return;
    }

    try {
      const result = await handler(req, res);
      if (result !== undefined && !res.writableEnded) {
        res.status(200).json(result);
      }
      if (!res.writableEnded) {
        res.status(204).end();
      }
    } catch (err: any) {
      console.error(`[${label}]`, err?.stack || err?.message || err);
      if (!res.writableEnded) {
        res.status(500).json({
          error: `Gagal memproses permintaan: ${err?.message || 'kesalahan tidak diketahui'}`,
        });
      }
    }
  };
}

/** Bersihkan req.body yang mungkin berupa string (JSON) atau object. */
export function parseBody(req: VercelRequest): any {
  const raw: any = (req as any).body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

export function getQuery(req: VercelRequest): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query || {})) {
    q[k] = Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
  }
  return q;
}

export function clientKey(req: VercelRequest): string {
  const headers = (req.headers || {}) as Record<string, any>;
  return String(
    headers['x-forwarded-for']?.split(',')[0] ||
    headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown',
  ).trim();
}

/**
 * Rate limiter sederhana in-memory (cukup untuk Hobby plan / satu instance).
 * Melindungi endpoint publik dari spam & pembebanan.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  req: VercelRequest,
  options: { limit?: number; windowMs?: number; scope?: string } = {},
): { allowed: boolean; retryAfter: number; remaining: number } {
  const limit = options.limit ?? 10;
  const windowMs = options.windowMs ?? 60_000;
  const scope = options.scope ?? 'default';
  const key = `${scope}:${clientKey(req)}`;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  // Pembersihan berkala agar Map tidak tumbuh tanpa batas.
  if (buckets.size > 500) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }

  return { allowed: true, retryAfter: 0, remaining: limit - bucket.count };
}