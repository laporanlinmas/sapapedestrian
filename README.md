# SIPEDAS — Sapa Pedestrian Ponorogo

Portal publik terpadu: **Live CCTV · Peta Kerawanan · Pengaduan Masyarakat · Chatbot · Survei**.

Dibangun dengan **Vite + React 18 + Tailwind**, data di **Firebase (Firestore)**, foto di **Cloudinary**,
dijalankan di **Vercel** (static hosting + serverless functions di `api/`).

Project terkait yang memakai sumber data yang sama: **sipedasadmin** (dashboard petugas),
**sipedas-view** (CCTV), **laporsipedas** (aplikasi pelaporan mobile).

---

## 1. Architecture

```
Browser (Pengguna)
   │
   ├─► Jalur utama  ─► Vercel Function  /api/submit-complaint   ─┐
   │                 /api/complaint-status                        │
   │                 /api/wa-number                               │
   │                 /api/submit-survey                           │  backend
   │                 /api/upload-photo                            │
   │                                                             │
   └─► Jalur cadangan ─► Firestore (koleksi `aduan`)              │  ← otomatis
                       Cloudinary unsigned preset                  │
                                                                     │
   Dashboard sipedasadmin ── onSnapshot() ────────────────────────────┘
   (menu Aduan, real-time)
```

**Kenapa ada jalur cadangan?** Serverless function bisa gagal (timeout, limit 4.5 MB,
konfigurasi env belum di-set). Jalur cadangan menulis dokumen dengan **skema yang
persis sama** langsung dari browser, sehingga Aduan tidak pernah hilang.
Skeleton dokumen dibangun oleh satu fungsi yang sama (`buildAduanRecord` di
`src/lib/apiClient.ts`) — dipakai bersama oleh server dan browser, jadi tidak
pernah berbeda.

---

## 2. Endpoint API

Endpoint API membalas JSON saat gagal agar frontend dapat menangani error dengan
aman. `/api/chat` memakai SSE untuk jawaban yang berhasil di-stream, dan JSON
untuk fallback saat layanan AI tidak tersedia.

| Method | Endpoint | Fungsi | Batas |
|---|---|---|---|
| `POST` | `/api/submit-complaint` | Simpan aduan + unggah foto | 8 req / menit |
| `GET`  | `/api/complaint-status?ticket=` | Lacak tiket + respons petugas | 30 req / menit |
| `POST` | `/api/upload-photo` | Unggah 1 foto (opsional, terpisah) | 25 req / menit |
| `GET`  | `/api/wa-number` | Nomor WA petugas piket hari ini | 40 req / menit |
| `POST` | `/api/submit-survey` | Simpan survei kepuasan | 6 req / menit |
| `POST` | `/api/chat` | Jawaban chatbot Nemotron via OpenRouter | 20 req / menit |

Contoh:

```bash
curl -X POST https://<domain>/api/submit-complaint \
  -H 'Content-Type: application/json' \
  -d '{"nama":"Budi","kategori":"Kebersihan","lokasi":"Trotoar Jl. Sudirman",
       "deskripsi":"Sampah menumpuk sejak kemarin","source":"Website"}'
# {"success":true,"ticketNumber":"ADU-261017-8041","jumlahFoto":0}
```

---

## 3. Struktur data Firestore

### Koleksi `aduan` (dibaca dashboard sipedasadmin secara real-time)

| Field | Tipe | Contoh | Catatan |
|---|---|---|---|
| `ticket` | string | `ADU-261017-8041` | = ID dokumen |
| `timestamp` | string | `18/10/2026 00:13:49` | WIB, format lama (tetap dipertahankan) |
| `timestampISO` | string | `2026-10-18T00:13:49+07:00` | untuk sorting kronologis |
| `sortKey` | string | `20261018001349` | `YYYYMMDDHHmmss`, aman untuk sort |
| `nama` | string | `Budi` | |
| `kategori` | string | `Kebersihan` | |
| `lokasi` | string | `Trotoar Jl. Sudirman` | |
| `deskripsi` | string | | maks. 2000 karakter |
| `fotos` | string[] | URL Cloudinary | maks. 5 |
| `jumlahFoto` | number | `3` | |
| `status` | string | `Baru` | `Baru` / `Diproses` / `Selesai` / `Ditolak` |
| `catatan` | string | | diisi petugas dari dashboard |
| `fotoTindakLanjut` | string | URL | diisi petugas dari dashboard |
| `updatedAt` | string | | diisi petugas dari dashboard |
| `source` | string | `Website` / `Chatbot SIPEDAS` | |

> **Penting:** `timestamp` berformat `DD/MM/YYYY`, jadi **perbandingan string biasa
> salah urutan** (`31/01/...` dianggap lebih besar dari `01/02/...`).
> Selalu gunakan `sortKey` / `timestampISO` untuk sorting.

### Koleksi lain

| Koleksi | Isi | Ditulis oleh |
|---|---|---|
| `nowa` | `{ nama, number, jadwal }` petugas piket | sipedasadmin → Pengaturan |
| `survey_kepuasan` | hasil survei | form survei di portal |
| `visitors` | `{ counters: { day_*, month_*, year_* } }` | VisitorCounter (browser) |

---

## 4. Setup

### 4.1 Lokal

```bash
npm install
cp .env.example .env      # lalu isi nilainya
npm run dev               # http://localhost:3001
```

> Endpoint `/api/*` juga aktif di `npm run dev` dan `npm run preview` —
> tidak perlu backend terpisah.

Perintah lain:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # typecheck + unused locals/parameters
npm test            # offline unit tests (Node.js 22.6+)
npm run audit:unused # unused files/dependencies and unresolved imports
npm run check       # lint + tests + unused-code audit
npm run build       # typecheck + bundle produksi
npm run preview     # jalanin hasil build + API
npm run check:smoke # cek route, aset, dan validasi API pada server yang hidup
npm run test:ui     # tes browser alur fitur + layout desktop/tablet/ponsel
npm run check:all   # lint, unit test, dead-code, build, dan tes browser
```

Tes browser memerlukan Chromium satu kali: `npx playwright install chromium`.
Server Vite dimulai otomatis oleh `test:ui`; endpoint tulis di-mock agar tes
tidak mengirim data sungguhan. Screenshot/video/trace kegagalan tersimpan di
`test-results/`, laporan HTML di `playwright-report/`. Smoke test dapat diarahkan
ke deployment yang sedang aktif:
`npm run check:smoke -- --base-url https://domain-anda`.
Panduan detail ada di [`scripts/README.md`](./scripts/README.md).

Skrip maintainer menggunakan TypeScript `.mts` dan Node.js 22.6+:

```bash
npm run build:gallery-index   # butuh akses Google Sheets, Drive, dan Firebase
npm run build:hero-anim -- ./pedestrian.lottie  # butuh unzip dan ffmpeg
SIPEDAS_API_URL=http://localhost:3001 npm run verify:dates  # server API + kredensial Sheets
```

`verify:dates` menerima `SIPEDAS_API_URL` atau `VITE_SITE_URL`; default lokalnya
`http://localhost:3001`. `.vercelignore` mengecualikan skrip, tes, dokumentasi,
aset sumber animasi, dan file lokal yang tidak dibutuhkan runtime deployment.

### 4.2 Vercel

1. Import repo ini ke Vercel (framework **Vite**, terdeteksi otomatis).
2. **Environment Variables** — salin **seluruh isi `.env`** ke
   Dashboard → Settings → Environment Variables (Production + Preview + Development).

   > ⚠️ File `.env` **tidak ikut ter-deploy**. Kalau `FIREBASE_*` / `CLOUDINARY_*`
   > tidak di-set, `/api/*` akan membalas error konfigurasi yang jelas.
   > Daftar lengkap ada di `.env.example`.

3. Deploy. `vercel.json` sudah menangani rewrite SPA (`/survey` tetap bisa diakses
   lewat URL langsung) dan batas durasi function.

Chatbot membaca `OPENROUTER_API_KEY` hanya di server. Isi variabel itu di
Dashboard → Settings → Environment Variables untuk mengaktifkan Nemotron; jangan
memakai prefix `VITE_` atau memasukkan key ke kode browser.

---

## 5. Catatan performa

- Foto **dikompres di browser** sebelum dikirim (resize maks. 1600 px + JPEG).
  Ini menjaga payload di bawah batas 4.5 MB Vercel dan membuat unggah jauh lebih cepat.
- Chunk berat (`ChatbotUnified`, `AduanPanel`, `SurveyPage`, `VisitorCounter`) di-*lazy load*.
- `VisitorCounter` (yang menarik `firebase/firestore` ~485 KB) ditunda sampai
  browser menganggur agar halaman utama tampil cepat.
- Font Inter dimuat non-blocking; stylesheet Phosphor yang tidak terpakai sudah dihapus.
- Hash aset diberi `Cache-Control: immutable` (1 tahun) lewat `vercel.json`.

### 5.1 Ilustrasi hero (berat, tapi tidak menyesatkan)

Aset hero pernah berupa `.lottie` + `.json` berukuran 4 MB. Setelah ditelusuri, keduanya
hanya **"Lottie raster"**: 50 frame WebP hasil konversi MP4, bukan vektor. Jadi memakai
`lottie-web` berarti membayar ±250 KB library **plus** 2,3 MB JSON base64 demi gambaran
yang isinya identik dengan satu file WebP animasi.

Keputusan: **satu file WebP animasi** (`public/assets/hero-petugas.webp`, ±1,3 MB,
alpha asli, loop 2,5 detik), diputar **native oleh browser** — nol JavaScript per frame,
nol dependency tambahan.

Pemuatan bertahap (`src/components/PedestrianHero.tsx`):

| Tahap | File | Ukuran | Kapan |
|---|---|---|---|
| 1. Poster | `hero-petugas-poster.webp` | 33 KB | langsung — petugas langsung terlihat |
| 2. Animasi | `hero-petugas.webp` | ±1,3 MB | saat browser menganggur; di-*decode* dulu, baru `src` ditukar → tidak berkedip |

Tahap 2 dilewati seluruhnya bila `prefers-reduced-motion: reduce`, `Save-Data`, atau
jaringan `2g` — pengguna tersebut tetap melihat gambar statis yang sama persis.

Untuk membuat ulang dari file `.lottie`/`.json` (butuh `unzip` + `ffmpeg`):

```bash
npm run build:hero-anim -- ./pedestrian.lottie
```

### 5.2 Panorama 360° di latar hero

Latar paling belakang hero memakai panorama ekuirektangular
`public/assets/360.webp` (4096 × 2048, 840 KB) yang diputar otomatis 2°/detik
(±3 menit satu putaran penuh), mulai dari yaw 252°.

**Kenapa Canvas 2D, bukan Photo Sphere Viewer.** Panorama ini lapisan paling
belakang — selalu tertutup scrim, teks, dan ilustrasi. WebGL/Three.js untuk
seekadar itu berarti ±600 KB bundle plus shader yang harus dikompilasi, dan
panorama di bola tetap mendistorsi tepi (fish-eye) justru di sisi kiri–kanan
layar yang paling kelihatan. Yang dibutuhkan sebenarnya cuma satu: potong strip
dari gambar ekuirektangular, geser tiap frame, sambung lagi di seam — ±120 baris
Canvas 2D, nol dependensi baru.

**Kenapa fotonya tidak buram.** Ini inti dari `PanoramaBackdrop.tsx`. Pendekatan
"—canvas + `devicePixelRatio`" yang biasa memaksa potongan 1138 px mengisi kanvas
3840 px di layar 1920 px DPR2: pembesaran **3,4×**. Kalau begitu, FOV justru
**dilebarkan** sampai potongannya cukup besar (1638 px di contoh tadi), lalu kanvas
ditahan di resolusi sumber. Sumber → layar hanya di-resample **satu kali**, bukan
dua. Hasil terverifikasi 1:1 pada 1920/1440/1280/1152/1024/820/390/360 px.

Aturan lain yang menjaga ketajaman:

| Aturan | Nilai | Alasan |
|---|---|---|
| Batas pembesaran | 2,4× | di atas itu yang Keystone berubah jadi "diperbesar" |
| Plafon FOV | 150° | cukup untuk menjawab masalah ketajaman tanpa fish-eye tepi |
| Anggaran piksel | 2,6 Mpx | ≈ 1920 × 1350, murah di semua GPU |
| `imageSmoothingQuality` | `high` hanya saat mengecilkan | saat membesar, bilinear sudah cukup |
| Filter blur | **nol** | tidak ada `filter: blur()` / `backdrop-filter` di hero |

**Yang tidak dilakukan.** Sengaja `pointer-events: none`: menahan gestur di
latar akan merebut scroll vertikal di HP dan memblokir pemilihan teks di desktop.
Berhenti berputar saat ter-scroll keluar layar (`IntersectionObserver`), saat tab
tidak aktif (`visibilitychange`), dan saat `prefers-reduced-motion: reduce`
(fotonya tetap tampil, cuma diam). Kalau pengguna menyalakan **Save-Data**,
panorama tidak diunduh sama sekali (0 request) dan hero jatuh ke gradien temanya.

Ilustrasi petugas di atasnya (`PedestrianHero.tsx`) sekarang full opacity di
semua ukuran layar — sebelumnya 0,40 (mobile) dan 0,30 (desktop) — ia berdiri
sendiri di bawah teks (mobile/tablet) atau di kanan teks (desktop).

Di desktop, kolom teks disempitkan ke `lg:col-span-6` persis agar tepi
kanannya jatuh di **W/2** untuk semua lebar viewport. Itu mengubah batas lebar
ilustrasi dari tebakan per breakpoint menjadi persamaan yang bisa dihitung:
`L ≤ (W/2 − 24) / 0,925 ≈ 51,6%`. Persentasenya (50% → 54% → 56%) disetel
sedikit di bawah plafon itu. Sebesar 2,5% juga sengaja dibiarkan keluar layar
di kanan: yang menjulang cuma margin transparan — tidak ada piksel petugas
yang terpotong.

| Lebar viewport | Ukuran ilustrasi | Celah aman ke paragraf |
|---|---|---|
| 1024 px | 512 × 280 | 77 px |
| 1280 px | 691 × 378 | 50 px |
| 1440 px | 778 × 425 | 56 px |
| 1600 px | 896 × 490 | 34 px |
| 1920 px | 1075 × 588 | 40 px |

### 5.3 Anti-banding: kenapa "garis vertikal" itu muncul lalu hilang

Tirai hero punya alpha yang sangat landai — `0,72 → 0,22` sepanjang ±800 px adalah
128 tingkat warna dari 255, jadi satu tingkat tiap ±6 px. Layar 8-bit tidak bisa
menampilkannya sebagai ramp halus, dan mata membaca lompatan yang tak bisa
dibedakan itu sebagai garis — makin mencolok di panel dengan gradien lemah.

Perbaikannya bukan kurangi gradiennya, tapi **dither**: butiran noise 1 px
(feTurbulence, 128 × 128 px, di-raster sekali lalu di-tile) di opacity 5 % di atas
`hero-scrim`, `hero-figure__scrim`, dan `hero-fade`. Nol filter, nol `blur()`, nol
JavaScript, nol biaya per frame.

Diuji di kondisi lab (hero tanpa panorama, jadi yang diukur murni gradien) —
1000 px satu baris:

| | piksel kembar (banding) |
|---|---|
| tanpa dither | 574 |
| dither 0,02 | 170 |
| dither 0,05 | ~65 |

Sekitar 89 % bidang rata terpecah, sementara butirannya sendiri berukuran 1 px
jadi tidak terlihat sebagai "butiran".

### 5.4 Galeri: tumpukan kartu bergulir

Pratinjau galeri di beranda memakai tumpukan kartu yang bisa digeser, diklik, dan
dinavigasi dengan keyboard / tombol panah / titik navigasi. Tiga berkas:

| Berkas | Isi |
|---|---|
| `GalleryStackSkeleton.tsx` | skeleton + konstanta geometri (tanpa `motion`) |
| `ScrollableCardStack.tsx` | tumpukan kartunya (`motion/react`) |
| `GallerySection.tsx` | pengait data + gerbang pemuatan |

**Konstanta geometri tinggal di satu tempat.** `cardGeometry(index, currentIndex)`
dihitung oleh skeleton DAN oleh tumpukan aslinya, dari kelas CSS yang sama
(`.gallery-stack*`). Hasilnya saat foto tiba: **selisih 0 px** pada kelima slot,
wadah identik (1232 × 415 pada 1440 px). Kalau masing-masing mengarang angkanya
sendiri, satu meleset sedikit dan "loading yang mulus" itu kembali jadi lompatan
layout.

Dua detail kecil yang harus ikut dijaga agar presisi tetap 0 px:

- **Jumlah slot.** Skeleton wajib menggambar `PREVIEW` slot, bukan
  `items.length` — saat loading `items` masih kosong, jadi tanpa itu skeleton
  cuma menggambar satu kartu.
- **Tinggi bar navigasi.** Baris panah + titik harus setinggi yang asli
  (32 px) di kedua keadaan; kalau tidak, baris itu menyusut 24 px.

#### Tiga keputusan yang menyimpang dari referensi, dan alasannya

1. **`touch-action: none` + `preventDefault()` tanpa syarat dihapus.**
   Referensi memakai `touchAction: "none"` dan memanggil `preventDefault()`
   pada *setiap* putaran roda mouse. Di beranda yang panjang seperti ini, itu
   berarti galeri merebut scroll vertikal halaman — dan di HP, menahan
   halaman terus-menerus selama jari ada di atas tumpukan. Sekarang: roda
   dengan `|deltaX| > |deltaY|` milik widget (dicegah, kartu berpindah satu
   langkah); roda vertikal milik halaman; `touch-action: pan-y` memberi gesek
   horizontal ke JavaScript sementara gesek vertikal tetap digulir browser.
   Widget dekoratif tidak boleh merebut scroll halaman.

2. **`filter: blur()` dibuang seluruhnya.** Pada referensi, `blur` diberikan ke
   kartu `index < currentIndex` — yang kebetulan `opacity`-nya `0`, jadi tidak
   pernah terlihat, hanya memboroskan lapisan komposit. Efek yang dimaksud
   dibangun ulang dari `scale` + `opacity` + scrim gelap yang makin pekat
   seiring jarak (`cardGeometry().depth`, 0 → 22 %). Foto tetap tajam.

3. **Ukuran dihitung di CSS, bukan di JavaScript.** `--card-w =
   min(440px, 100vw − 2rem)`, tinggi dari `aspect-ratio: 16/10`, ruang untuk
   kartu di belakang dari konstanta `ROOM_PX`. Tidak ada pengukuran DOM, tidak
   ada `ResizeObserver`, dan kartu tidak mungkin meluber saat perangkat
   dirotasi. Terukur 328 px @ 360, 358 px @ 390, 382 px @ 414 — nol overflow.

#### Gerbang pemuatan: `motion` tidak ikut critical path

`motion` bernilai **87 KB gzip** dan hanya dipakai oleh section ini. Karena
`manualChunks` di `vite.config.ts` melempar semua `node_modules` lain ke chunk
`vendor` — dan `vendor` ikut terimpor entry — `motion` semula ikut terunduh
bersama `360.webp` di halaman awal, percuma.

Dua perbaikan:

- `manualChunks` punya baris khusus `(framer-)?motion[a-z-]*` → chunk
  `vendor-motion` sendiri, sehingga `lazy()` benar-benar menundanya. Polanya
  perlu slash di belakang, jadi hanya nama paket yang benar-benar tersentuh
  (`motion`, `motion-dom`, `motion-utils`, `framer-motion`).
- **Dua gerbang, bukan satu.** Permintaan data tetap memakai `rootMargin: 600px`
  (murah, JSON kecil). Chunk `motion` memakai gerbang sendiri `200px` — tanpa
  itu ia menyala seketika di halaman awal, karena section ini cuma ~1,5 layar
  dari atas. Sebelum chunk tiba, `GalleryStackSkeleton` (tanpa motion) mengisi
  tempatnya dengan geometri persis sama, jadi pergantiannya tidak terlihat.

Terukur: `vendor-motion` **tidak** ada di daftar request saat halaman dibuka, dan
baru muncul setelah section di-scroll mendekat. Beban boot turun dari 384 KB
menjadi 297 KB transfer.

### 5.5 Beban awal & cache

Aset hero di-*preload* dari `<head>` (blok pertama di dalamnya, bukan menunggu
React mount):

| Aset | Ukuran | Kapan |
|---|---|---|
| `hero-petugas-poster.webp` | 33 KB | preload, `fetchpriority=high` |
| `360.webp` | 840 KB | preload, `fetchpriority=high` |
| `hero-petugas.webp` (animasi) | ±1,3 MB | `requestIdleCallback` setelah 4 detik |

Yang animasi sengaja **tidak** di-preload: memaksa 1,3 MB mendahului JS akan
menunda judul dan justru memperlambat LCP.

Preload-nya di-*inject* lewat skrip inline, bukan `<link>` statis, karena
`<link>` tidak bisa membaca `navigator.connection.saveData`. Dampaknya sudah
diukur di jaringan 1,6 Mbps/150 ms: selisih statis vs injeksi hanya
**14–64 ms** pada seluruh metrik — jauh di bawah yang bisa dirasakan, sementara
injeksi tetap mempertahankan 0 unduhan bagi pengguna Save-Data.

Cache di `vercel.json`:

| Pola | Nilai |
|---|---|
| `/assets/*.{js,css,woff2,woff}$` | `max-age=31536000, immutable` (file ber-hash) |
| `/assets/*.{webp,png,jpg,avif,svg,ico}$` | `max-age=2592000, stale-while-revalidate=604800` |
| sisanya di `/assets/*` | hanya di-cache CDN |

Aturan gambar yang lama (`max-age=0`) memaksa browser **revalidasi tiap
kunjungan** — itu sebabnya aset hero terus terunduh ulang. Sekarang 30 hari cache
peramban + 7 hari stale-while-revalidate, jadi kunjungan berikutnya instan.

### 5.6 Dua jebakan CSS di hero yang perlu diketahui

**(a) `hero-scene.css` kalah spesifisitas dari utilitas Tailwind.** Di CSS hasil
build, berkas ini emitted *sebelum* blok `@tailwind utilities`. Jadi selektor
sederhana seperti `.hero-content` (0,1,0) selalu kalah dari kelas utilitas
`.pb-2` (0,1,0) — bukan karena salah tulis, tapi karena urutan. Aturan hero yang
perlu mengalahkan utilitas ditulis `header .hero-content` (0,1,1). Ini sempat
menyembunyikan bug: `position: relative` hilang, elemen jadi `static`, dan karena
elemen statis selalu digambar di bawah elemen ber-posisi, seluruh teks hero tertutup
`.hero-scrim`.

Urutan `z-index` di dalam header (berpisah dari masalah spesifisitas di atas):

| Lapisan | z-index |
|---|---|
| `.hero-pano` (panorama) | 0 |
| `.hero-scrim` (tirai tema) | 1 |
| `.hero-figure` (ilustrasi) | 10 |
| `.hero-fade` (tutup bawah) | 20 |
| `.hero-content` (teks) | 30 |

Tutup bawah hanya perlu menutupi ilustrasi; teks harus di atasnya, kalau tidak
ujung bawah kartu ikut diredup ±6 %.

**(b) Persentase tinggi tidak resolve dari flex item.** `.hero-content` adalah flex
item, jadi `-webkit-min-content` tingginya datang dari flex layout sementara
properti `height` di CSS-nya `auto`. Akibatnya `height: 100%` pada anaknya (grid)
turun jadi `auto`, `align-content: center` tidak punya ruang untuk bekerja, dan teks
nempel terus di atas di semua ukuran layar. Solusinya bukan memperkuat
persentase, tapi menjadikan `.hero-content` `display: flex; flex-direction: column`
lalu memberi grid `flex-1` — flex item benar-benar diregangkan tanpa perlu
persentase sama sekali. Ini juga mengembalikan perilaku asli desain (teks di tengah
vertikal), yang hilang saat hero direstruktur jadi flex column.

### 5.7 Padding vertikal di mobile

Teks diturunkan sedikit dan ilustrasi dinaikkan 30 px, jadi ruang mati di antara
kartu dan petugas berkurang hampir separuh:

| Layar | Ruang mati (sebelum → sesudah) |
|---|---|
| 360 × 640 | 26 → **17** px |
| 390 × 844 | 212 → **95** px |
| 414 × 896 | 273 → **126** px |
| 768 × 1024 | 287 → **133** px |

Pengangkatan ilustrasi **hanya aktif di layar yang ruang sisa-nya cukup**
(`max-width: 1023px and min-height: 760px`). Di layar pendek seperti 360 × 640 atau
375 × 667 ruang kosong antar elemen hanya ±20 px — mengangkat petugas di sana justru
membuat teks dan gambar bertabrakan, dan `min-h-[100svh]` akan memaksa hero tumbuh.
Syarat itu yang membuat penyesuaiannya aman di semua ukuran.

Karena kaki petugas sekarang berhenti 30 px di atas dasar hero, `.hero-fade` ikut
memanjang (`calc(24% + 30px)`) dengan ramp yang lebih rapat di ujung bawah, supaya
potongan itu larut penuh (α ≈ 0,96) dan tidak meninggalkan garis tipis.

---

## 6. Struktur project

```
sapapedestrian/
├── api/                          ← Vercel Functions (Node.js)
│   ├── submit-complaint.ts       ← POST aduan + foto → Cloudinary + Firestore
│   ├── complaint-status.ts        ← GET status tiket + respons petugas
│   ├── upload-photo.ts           ← POST 1 foto (terpisah agar tidak timeout)
│   ├── wa-number.ts              ← GET nomor WA petugas piket
│   └── submit-survey.ts          ← POST survei
├── src/
│   ├── app/page.tsx              ← halaman utama + routing state (home | survey)
│   ├── components/
│   │   ├── AduanPanel.tsx         ← form aduan + lacak tiket
│   │   ├── ChatbotUnified.tsx     ← asisten 24 jam + flow lapor
│   │   ├── SurveyPage.tsx · SurveySection.tsx
│   │   ├── Header · Hero · Footer · InfoSection · MonitoringSection
│   │   ├── PanoramaBackdrop.tsx     ← panorama 360° (Canvas 2D, auto-rotate)
│   │   ├── hero-scene.css           ← scrim tema + tata letak ilustrasi hero
│   │   ├── PedestrianHero.tsx      ← ilustrasi petugas (WebP animasi, lazy)
│   │   ├── ScrollableCardStack.tsx  ← tumpukan kartu galeri (motion, lazy)
│   │   ├── GalleryStackSkeleton.tsx ← skeleton galeri (tanpa motion)
│   │   └── ProgramModal · JadwalModal · VisitorCounter
│   └── lib/
│       ├── apiClient.ts           ← ★ lapisan API tahan banting + fallback Firestore
│       ├── utils.ts               ← cn() gabungan class, tanpa dependensi
│       ├── image.ts               ← kompresi foto di browser
│       ├── wib.ts                 ← seluruh fungsi waktu WIB + tiket
│       ├── waSchedule.ts          ← logika jadwal petugas (shared server+browser)
│       ├── firebase.ts            ← Firestore client (lazy import)
│       ├── cloudinary.ts          ← upload server-side (lazy config)
│       ├── cloudinaryPublic.ts    ← unsigned preset (jalur cadangan)
│       └── server/                ← khusus runtime serverless
│           ├── firebase.ts · aduan.ts · http.ts
├── index.html · vite.config.ts · vercel.json · tailwind.config.ts
└── .env.example
```