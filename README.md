# SIPEDAS — Sapa Pedestrian Ponorogo

Platform terpadu: Live CCTV · Peta Kerawanan · Pengaduan Masyarakat

---

## Environment Variables (Vercel)

| Variable | Wajib | Keterangan |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ | Seluruh isi JSON service account (satu baris) |
| `SPREADSHEET_ID` | ✅ | ID Google Spreadsheet utama |
| `FOLDER_UTAMA_ID` | ✅ | ID folder Google Drive untuk foto aduan |
| `APPS_SCRIPT_URL` | — | URL Apps Script (opsional) |
| `COMPLAINT_SHEET_NAME` | — | Nama sheet aduan (default: `Aduan`) |
| `WA_SHEET_NAME` | — | Nama sheet nomor WA (default: `NoWA`) |
| `SETUP_SECRET` | — | Token untuk endpoint setup sheet (opsional) |

---

## Struktur Google Sheets (auto-setup)

Sheet dibuat otomatis dengan header biru + freeze saat pertama kali submit.
Atau panggil manual: `GET /api/setup-sheets`

### Sheet `Aduan` — 15 kolom (A–O)

| Kolom | Isi |
|---|---|
| A | Timestamp |
| B | ID Aduan |
| C | Nama Pelapor |
| D | Kategori |
| E | Lokasi |
| F | Deskripsi |
| G–K | Foto 1–5 (link Google Drive) |
| L | Jumlah Foto |
| M | Status |
| N | Catatan Petugas |
| O | Terakhir Diperbarui |

### Sheet `NoWA` — 4 kolom (A–D)

| Kolom | Isi | Contoh |
|---|---|---|
| A | Nama Petugas | Ahmad |
| B | No WA | `WA: 085123456789` |
| C | Jadwal Hari | `Senin-Rabu` atau `Senin,Selasa` atau `Kamis` |
| D | Keterangan | Shift Pagi |

**Format jadwal yang didukung:**
- Hari tunggal: `Senin`
- Range: `Senin-Jumat` (Senin sampai Jumat)
- List: `Senin,Rabu,Jumat`

**Format nomor WA:** Wajib diawali `WA:` agar tidak dianggap angka oleh Sheets.
Contoh: `WA: 085123456789` → sistem baca sebagai `6285123456789`

---

## Setup Awal

1. Buat Google Spreadsheet kosong
2. Share ke email service account sebagai **Editor**
3. Buat folder Google Drive, share ke service account sebagai **Editor**
4. Set environment variables di Vercel
5. Deploy
6. Panggil `GET /api/setup-sheets` sekali untuk inisialisasi header sheet

---

## Struktur Project

```
src/
├── app/
│   ├── api/
│   │   ├── wa-number/route.ts          ← GET nomor WA berdasarkan hari
│   │   ├── submit-complaint/route.ts   ← POST aduan + 5 foto ke Drive
│   │   └── setup-sheets/route.ts       ← GET setup header sheet
│   ├── layout.tsx · manifest.ts · page.tsx
├── components/
│   ├── Header · Hero · Footer
│   ├── CCTVSection · MapSection · ComplaintSection
│   ├── VideoStatsSection · InfoSection
│   ├── FormModal (multi-foto, kamera+galeri)
│   ├── WAModal (nomor berdasarkan hari)
│   ├── ProgramModal · JadwalModal · SuccessModal
│   └── Toast
├── lib/
│   ├── google-auth.ts    ← Auth service account
│   ├── google-sheets.ts  ← Append, read, ensureSheetSetup
│   ├── google-drive.ts   ← Upload file
│   └── useToast.ts
└── styles/
    ├── base.css · landing.css
```
