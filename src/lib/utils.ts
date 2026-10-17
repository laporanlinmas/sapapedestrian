/**
 * Gabungan class name.
 *
 * Sengaja sangat kecil dan tanpa dependensi: proyek ini tidak memakai
 * shadcn/ui, jadi tidak ada `clsx` + `tailwind-merge` di sini. Yang
 * dibutuhkan komponen ini cuma kemampuan menggabungkan string dan membuang
 * nilai kosong — conditional class di JSX sudah cukup untuk itu.
 *
 * Class yang saling bertentangan (mis. `p-2` lalu `p-4`) TIDAK digabung
 * secara cerdas di sini; pemanggil menulisnya berurutan dan Tailwind yang
 * menentukan menang lewat urutan di CSS hasil build.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}