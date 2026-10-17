import crypto from 'node:crypto';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Kredensial Google Drive + cache token untuk runtime serverless.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Sengaja TIDAK memakai paket `googleapis` (besar, ~10 MB).JWT service
 *  account dibuat manual dengan crypto bawaan Node — cukup beberapa baris
 *  dan tidak menambah bobot bundel.
 *
 *  CATATAN KEAMANAN: nilai kredensial ini HANYA boleh dibaca di server
 *  (api/*.ts). Jangan pernah menandainya VITE_* karena itu akan
 *  ikut ter-bundle ke browser.
 */

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

type TokenCache = { token: string; exp: number };
let cache: TokenCache | null = null;

function b64url(input: Buffer | string): string {
  return Buffer.from(input as never)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function readServiceAccount(): { email: string; key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON belum diatur. Tambahkan di Vercel Dashboard ' +
      '(Environment Variables) agar galeri dapat memuat foto.',
    );
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid.');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON tidak memuat client_email / private_key.');
  }
  return { email: parsed.client_email, key: parsed.private_key };
}

/** Ambil access token OAuth2, di-cache sampai mendekati kedaluwarsa. */
export async function getDriveToken(): Promise<string> {
  if (cache && cache.exp > Date.now() + 60_000) return cache.token;

  const { email, key } = readServiceAccount();
  const now = Math.floor(Date.now() / 1000);

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: email,
    scope: DRIVE_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const assertion = header + '.' + claims + '.' + b64url(signer.sign(key));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error('Gagal autentikasi Google Drive: ' + (json?.error_description || res.status));
  }

  cache = { token: json.access_token, exp: now + Number(json.expires_in || 3600) };
  return cache.token;
}

export function driveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.FOLDER_UTAMA_ID);
}
