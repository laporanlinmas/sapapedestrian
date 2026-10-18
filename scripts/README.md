# System checks and debugging

Node.js 22.6 or newer is required.

## Checks

```bash
npm run check          # TypeScript lint, unit tests, and unused-code audit
npm run build          # Typecheck and production bundle
npm run check:all      # All of the above in sequence
```

The unit tests (`npm test`) run offline: no browser, no credentials, no network
requests to production. They cover the pure helper modules under `scripts/`.

## Smoke-test a running deployment

Start `npm run dev` or `npm run preview` in another terminal, then run:

```bash
npm run check:smoke
npm run check:smoke -- --base-url https://your-deployment.example
```

The smoke check verifies SPA routes, JavaScript/CSS entry assets, and safe API
validation responses. It does not create data or read credentials. Set
`CHECK_BASE_URL` instead of passing `--base-url` to use a different server.

## Maintainer scripts

```bash
npm run build:gallery-index   # butuh akses Google Sheets, Drive, dan Firebase
npm run build:hero-anim -- ./pedestrian.lottie  # butuh unzip dan ffmpeg
npm run verify:dates           # cek tanggal laporan pada API + kredensial Sheets
```

Semua skrip memakai TypeScript `.mts` dan dijalankan lewat Node.js
(`node --experimental-strip-types`). Folder `scripts/` tidak ikut ter-deploy ke
Vercel (lihat `.vercelignore`).
