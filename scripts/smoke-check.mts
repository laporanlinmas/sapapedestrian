#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';
const ROUTES = ['/', '/rating', '/survey', '/cctv', '/mymaps', '/galeri', '/gallery'];

function readBaseUrl(args: string[]): URL {
  const optionIndex = args.indexOf('--base-url');
  const value = optionIndex >= 0 ? args[optionIndex + 1] : process.env.CHECK_BASE_URL;
  const url = new URL(value || DEFAULT_BASE_URL);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Base URL harus menggunakan http atau https.');
  }

  return url;
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(15_000), redirect: 'follow' });
}

async function main() {
  const baseUrl = readBaseUrl(process.argv.slice(2));
  const failures: string[] = [];
  let checks = 0;

  const check = async (
    label: string,
    url: URL,
    validate: (response: Response, body: string) => void | Promise<void>,
    init?: RequestInit,
  ) => {
    checks += 1;
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
      const body = await response.text();
      await validate(response, body);
      console.log(`PASS ${label} (${response.status})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${label}: ${message}`);
      console.error(`FAIL ${label}: ${message}`);
    }
  };

  const htmlResponse = await fetchWithTimeout(new URL('/', baseUrl));
  const html = await htmlResponse.text();
  checks += 1;
  if (!htmlResponse.ok || !htmlResponse.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Beranda gagal dimuat: HTTP ${htmlResponse.status}.`);
  }
  console.log('PASS beranda menghasilkan HTML (200)');

  checks += 1;
  if (!html.includes('id="root"')) {
    failures.push('HTML beranda tidak memiliki elemen #root.');
    console.error('FAIL elemen React #root tidak ditemukan');
  } else {
    console.log('PASS elemen React #root tersedia');
  }

  const assetPaths = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:m?js|ts|tsx|jsx|css)(?:\?[^"']*)?)["']/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/') && !path.startsWith('//'));
  for (const assetPath of [...new Set(assetPaths)]) {
    await check(`aset ${assetPath}`, new URL(assetPath, baseUrl), (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    });
  }

  for (const route of ROUTES) {
    await check(`route ${route}`, new URL(route, baseUrl), (response, body) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!body.includes('id="root"')) throw new Error('respons bukan halaman SPA');
    });
  }

  await check('API aduan menolak metode GET', new URL('/api/submit-complaint', baseUrl), async (response, body) => {
    const payload = JSON.parse(body);
    if (response.status !== 405 || !payload.error) {
      throw new Error(`mengharapkan JSON HTTP 405, menerima HTTP ${response.status}`);
    }
  });

  await check('API aduan memvalidasi input kosong', new URL('/api/submit-complaint', baseUrl), (response, body) => {
    const payload = JSON.parse(body);
    if (response.status !== 400 || payload.error !== 'Nama wajib diisi.') {
      throw new Error(`respons validasi tidak sesuai (HTTP ${response.status})`);
    }
  }, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

  await check('API rating menolak nilai di luar rentang', new URL('/api/submit-survey', baseUrl), (response, body) => {
    const payload = JSON.parse(body);
    if (response.status !== 400 || !payload.error) {
      throw new Error(`mengharapkan JSON HTTP 400, menerima HTTP ${response.status}`);
    }
  }, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 0 }) });

  if (failures.length) {
    console.error(`\n${failures.length} dari ${checks} pemeriksaan gagal.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nSemua ${checks} pemeriksaan smoke lulus untuk ${baseUrl.origin}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Smoke check gagal: ${message}`);
  process.exitCode = 1;
});
