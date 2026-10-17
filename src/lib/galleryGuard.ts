/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Pembatasan interaksi pada foto galeri
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  ⚠️ KEJUJURAN DULU
 *  Fungsi-fungsi di file ini BUKAN keamanan. Mematikan klik kanan, drag,
 *  atau tombol Ctrl+S hanya menahan pengguna yang tidak tekuni — siapa pun
 *  bisa mengambil tangkapan layar, membuka DevTools, atau menyimpan
 *  jawabannya.
 *
 *  Yang benar-benar melindungi foto:
 *    1. ID Google Drive tidak pernah tampil di browser (lihat api/gallery-photo)
 *    2. Rate limit server menghentikan pengambilan massal
 *    3. Watermark menandai sumber redistribute
 *
 *  Fungsi di bawah dipakai sebagai "barrier sopan": menahan gesture
 *  yang paling sering dipakai untuk mengambil aset secara tidak sengaja,
 *  tanpa memblokir fungsi penting (salin teks biasa, zoom, aksesibilitas).
 */

/** pasang penahan gesture pada elemen galeri. Kembalikan fungsi lepas. */
export function protectImages(root: HTMLElement): () => void {
  const onContextMenu = (e: Event) => {
    const target = e.target as HTMLElement | null;
    // Blokir hanya bila gesture terjadi pada/sekitar gambar.
    if (target?.closest('[data-protected-img]')) {
      e.preventDefault();
    }
  };

  const onDragStart = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-protected-img]')) {
      e.preventDefault();
    }
  };

  // Blokir "Save image as…" lewat menu konteks browser serta Ctrl+S saat
  // fokus berada di dalam galeri.
  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === 's') { e.preventDefault(); }
  };

  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('dragstart', onDragStart);
  document.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('contextmenu', onContextMenu);
    root.removeEventListener('dragstart', onDragStart);
    document.removeEventListener('keydown', onKeyDown);
  };
}

/**
 * Menahan gesture pada satu elemen <img>.
 * `onContextMenu` dicegah, `draggable` dimatikan.
 */
export function protectImageNode(el: HTMLImageElement): void {
  el.setAttribute('draggable', 'false');
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('dragstart', (e) => e.preventDefault());
}
