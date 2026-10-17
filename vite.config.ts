import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment configuration to process.env at config/dev-server startup.
// Variabel yang sudah ada di environment (shell, CI, Vercel Dashboard) TIDAK
// ditimpa — sehingga konfigurasi produksi selalu menang atas nilai lokal.
function loadEnv() {
  const envFiles = ['.env', '.env.local'];
  envFiles.forEach(file => {
    const envPath = path.join(__dirname, file);
    if (!fs.existsSync(envPath)) return;
    let added = 0;
    let skipped = 0;
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx > -1) {
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (process.env[key] !== undefined) { skipped += 1; return; }
        process.env[key] = val;
        added += 1;
      }
    });
    console.log(`[ENV] Loaded ${file}: ${added} variabel baru${skipped ? `, ${skipped} tetap dari environment` : ''}.`);
  });
}

loadEnv();

// Normalisasi URL situs (tanpa garis miring di akhir) agar index.html,
// robots.txt, dan sitemap.xml memakai bentuk yang sama.
process.env.VITE_SITE_URL = (process.env.VITE_SITE_URL || 'http://localhost:3001').replace(/\/+$/, '');

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

/** Selalu balas JSON — termasuk saat ada error, supaya frontend tidak pernah
 *  tersandung "Unexpected token '<'" / "A server error occurred". */
function json(res: any, status: number, payload: any) {
  if (res.writableEnded || res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Vercel-style Request/Response helpers di atas objek Node http bawaan */
function decorate(req: any, res: any) {
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    json(res, res.statusCode || 200, data);
    return res;
  };
  res.send = (data: any) => {
    if (!res.writableEnded) res.end(data);
    return res;
  };
  res.redirect = (statusOrUrl: number | string, targetUrl?: string) => {
    const code = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    const location = typeof statusOrUrl === 'string' ? statusOrUrl : targetUrl;
    res.writeHead(code, { Location: location });
    res.end();
    return res;
  };
}

function readBody(req: any, limitBytes = 12 * 1024 * 1024): Promise<{ body: any; error?: string }> {
  return new Promise(resolve => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        resolve({ body: {}, error: 'Payload terlalu besar.' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({ body: {} });
      try {
        resolve({ body: JSON.parse(raw) });
      } catch {
        resolve({ body: {}, error: 'Format JSON tidak valid.' });
      }
    });
    req.on('error', () => resolve({ body: {}, error: 'Gagal membaca body request.' }));
  });
}

/**
 * Jalankan api/*.ts sebagai middleware dev/preview server.
 *
 * Handler dimuat lewat `ssrLoadModule` (dev server) sehingga TypeScript ikut
 * ditranspile Vite. Import() langsung ke file .ts akan ditolak Node dengan
 * "Unknown file extension \".ts\"" — itu penyebab Aduan gagal secara lokal.
 *
 * `vite preview` tidak menyediakan ssrLoadModule, jadi di sana modul
 * di-bundle dengan esbuild ke folder cache lalu diimpor sebagai .mjs.
 */
function localApiPlugin(): Plugin {
  const CACHE_DIR = path.join(__dirname, 'node_modules', '.cache', 'api-runtime');

  async function loadHandler(server: any, endpoint: string): Promise<(req: any, res: any) => Promise<any>> {
    const rel = `/api/${endpoint}.ts`;

    if (typeof server.ssrLoadModule === 'function') {
      const mod = await server.ssrLoadModule(rel);
      return mod?.default;
    }

    // Fallback untuk vite preview.
    const { build } = await import('esbuild');
    const entry = path.join(__dirname, 'api', `${endpoint}.ts`);
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node18',
      packages: 'external',
      write: false,
      logLevel: 'silent',
    });

    const code = result.outputFiles?.[0]?.text;
    if (!code) throw new Error(`Gagal membundle api/${endpoint}.ts`);

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const outFile = path.join(CACHE_DIR, `${endpoint}.mjs`);
    // Tulis hanya bila isi berubah.
    let changed = false;
    if (!fs.existsSync(outFile) || fs.readFileSync(outFile, 'utf8') !== code) {
      fs.writeFileSync(outFile, code, 'utf8');
      changed = true;
    }

    // Cache-busting memakai mtime, BUKAN Date.now().
    // Kalau memakai Date.now(), setiap request mengimpor instance modul BARU,
    // sehingga cache di memori (mis. cache foto galeri) selalu kosong dan
    // perilaku lokal berbeda dari produksi. Dengan mtime, modul baru hanya
    // dibuat bila kodenya benar-benar berubah.
    const version = fs.statSync(outFile).mtimeMs;
    void changed;
    const mod = await import(`${outFile}?v=${version}`);
    return mod?.default;
  }

  const makeMiddleware = (server: any) => {
    return async (req: any, res: any, next: () => void) => {
      let pathname = '';
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        pathname = parsedUrl.pathname;
      } catch {
        return next();
      }

      if (!pathname.startsWith('/api/')) return next();

      decorate(req, res);

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
      }

      const endpoint = pathname.replace(/^\/api\//, '').split('/')[0].replace(/\.ts$/, '');
      if (!/^[A-Za-z0-9_-]+$/.test(endpoint)) {
        return json(res, 404, { error: `Endpoint tidak dikenal: ${endpoint}` });
      }
      if (!fs.existsSync(path.join(__dirname, 'api', `${endpoint}.ts`))) {
        return json(res, 404, { error: `Endpoint /api/${endpoint} tidak ditemukan.` });
      }

      try {
        const handler = await loadHandler(server, endpoint);
        if (typeof handler !== 'function') {
          return json(res, 404, { error: `Endpoint /api/${endpoint} tidak ditemukan.` });
        }

        req.query = Object.fromEntries(parsedUrl.searchParams.entries());

        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const { body, error } = await readBody(req);
          if (error) return json(res, 400, { error });
          req.body = body;
          await handler(req, res);
        } else {
          await handler(req, res);
        }

        if (!res.writableEnded) {
          json(res, 500, { error: `Endpoint /api/${endpoint} tidak mengirim balasan.` });
        }
      } catch (err: any) {
        console.error(`[API] ${req.method} ${pathname} gagal:`, err?.stack || err);
        json(res, 500, { error: 'Terjadi kesalahan pada server API.', detail: err?.message });
      }
    };
  };

  return {
    name: 'local-api-middleware',
    configureServer(server) {
      server.middlewares.use(makeMiddleware(server));
    },
    configurePreviewServer(server) {
      server.middlewares.use(makeMiddleware(server));
    },
  };
}

/**
 * Tulis robots.txt & sitemap.xml saat build memakai VITE_SITE_URL.
 *
 * Tanpa ini kedua file tersebut berisi "http://localhost:3001" — mesin pencari
 * akan mengindeks alamat yang tidak pernah ada di internet.
 */
function siteMetaPlugin(): Plugin {
  const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:3001';
  const lastmod = new Date().toISOString().slice(0, 10);

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Halaman ini adalah aplikasi web (client-side routing).',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');

  const paths: Array<[string, string, string]> = [
    ['/', '1.0', 'weekly'],
    ['/cctv', '0.9', 'weekly'],
    ['/mymaps', '0.9', 'weekly'],
    ['/survey', '0.5', 'monthly'],
  ];

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(
      ([p, priority, freq]) =>
        `  <url>\n    <loc>${siteUrl}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');

  const files = { 'robots.txt': robots, 'sitemap.xml': sitemap };

  const write = (dir: string) => {
    for (const [name, content] of Object.entries(files)) {
      try {
        fs.writeFileSync(path.join(dir, name), content, 'utf8');
      } catch (e) {
        console.warn(`[meta] gagal menulis ${name}:`, e);
      }
    }
  };

  return {
    name: 'site-meta',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => next());
      write(path.join(__dirname, 'public'));
    },
    closeBundle() {
      write(path.join(__dirname, 'dist'));
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin(), siteMetaPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3001,
    strictPort: false,
  },
  preview: {
    port: 3001,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/]firebase|@firebase/.test(id)) return 'vendor-firebase';
          if (/[\\/]node_modules[\\/]lucide-react/.test(id)) return 'vendor-icons';
          /* `motion`/framer-motion ±87 KB gzip, dan HANYA dipakai oleh tumpukan
           * kartu galeri — yang dimuat lewat `lazy()` saat section mendekati
           * layar. Tanpa baris ini semua `node_modules` lain jatuh ke
           * `vendor`, dan karena `vendor` ikut terimpor entry, `motion` pun
           * ikut terunduh di critical path — percuma. Chunk-nya sendiri
           * yang membuat `lazy()` benar-benar menundanya. */
          /* `framer-motion?motion[a-z-]*` juga menutupi `motion-dom` dan
           * `motion-utils` — polanya harus menyertakan garis miring di
           * belakang, jadi hanya nama paket yang benar-benar tersentuh. */
          if (/[\\/]node_modules[\\/](framer-)?motion[a-z-]*[\\/]/.test(id)) return 'vendor-motion';
          return 'vendor';
        },
      },
    },
  },
});