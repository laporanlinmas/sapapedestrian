/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         SIPEDAS Chatbot Engine  —  v7.0 Ultra Intelligence              ║
 * ║         Satgas Linmas Pedestrian Ponorogo  ×  SIPEDAS Dev Team          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Pipeline 8-Lapis untuk Pemrosesan Query Cerdas                         ║
 * ║                                                                          ║
 * ║  L1  Query Preprocessing    normalisasi, singkatan, koreksi ejaan        ║
 * ║  L2  Morfologi & Stemming   Porter-like + tabel lemma + compound word   ║
 * ║  L3  Intent × NER           multi-label intent + ekstraksi entitas       ║
 * ║  L4  Domain Confidence      scoring in-domain vs off-topic detection     ║
 * ║  L5  Hybrid Retrieval       BM25+ × TF-IDF × posisi × proximity         ║
 * ║  L6  Sentence Intelligence  multi-chunk ranking + koherensi + diversity  ║
 * ║  L7  Synthesis & Parafrase  template parafrase + transisi alami          ║
 * ║  L8  Session Memory         konteks giliran + follow-up + anti-repetisi  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Fitur unggulan v7.0 vs v6.0:
 *  • BM25+ (DELTA lower-bound) — skor lebih adil untuk term langka
 *  • Proximity scoring — token query yang berdekatan di dok = bonus
 *  • Multi-chunk synthesis — sintesis dari ≤4 chunk sekaligus
 *  • Paraphrase engine — 5+ template per intent, transisi kalimat cerdas
 *  • Off-topic handler — mini-KB + jawaban singkat + redirect halus
 *  • Spell correction — Damerau-Levenshtein ringan untuk 40+ kata umum
 *  • Coherence & diversity scoring — hindari kalimat redundan
 *  • Anti-repetition — cache respons terakhir, variasikan otomatis
 *  • Quality scoring — skor diri sebelum kirim respons
 *  • Follow-up resolution — resolusi "itu", "tersebut", "tadi"
 *  • Entity extraction — waktu, lokasi, topik, angka
 */

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 0 — TYPES & INTERFACES
// ════════════════════════════════════════════════════════════════════════════

/** Jenis intent yang didukung engine */
export type Intent =
  | 'GREETING'   // salam pembuka
  | 'THANKS'     // ucapan terima kasih
  | 'HOW'        // pertanyaan prosedur/cara
  | 'WHERE'      // pertanyaan lokasi/tempat
  | 'WHEN'       // pertanyaan waktu/jadwal
  | 'WHO'        // pertanyaan orang/petugas
  | 'WHY'        // pertanyaan alasan/tujuan
  | 'COST'       // pertanyaan biaya/tarif
  | 'WHAT'       // pertanyaan definisi/penjelasan
  | 'COMPLAINT'  // pelaporan/pengaduan
  | 'CONTACT'    // mencari kontak petugas
  | 'TICKET'     // cek tiket/status laporan
  | 'OFF_TOPIC'  // di luar domain SIPEDAS
  | 'GENERAL';   // umum / tidak terpola

/** Jenis entitas yang bisa diekstrak dari query */
export type EntityType = 'TIME' | 'PERSON' | 'LOCATION' | 'NUMBER' | 'TOPIC';

export interface ExtractedEntity {
  type: EntityType;
  value: string;    // nilai terstandarisasi (lowercase)
  raw: string;      // teks asli dari query
  span: [number, number]; // posisi [start, end] di query
}

export interface IntentResult {
  primary: Intent;
  secondary?: Intent;
  tertiary?: Intent;
  scores: Map<Intent, number>;
  confidence: number;  // skor intent utama
}

export interface QueryAnalysis {
  raw: string;
  normalized: string;
  tokens: string[];         // token dasar (no synonym expansion)
  expandedTokens: string[]; // token + ekspansi sinonim domain
  intent: IntentResult;
  entities: ExtractedEntity[];
  isFollowUp: boolean;
  domainConfidence: number; // 0.0 – 1.0
  isOffTopic: boolean;
}

export interface RetrievedChunk {
  idx: number;
  text: string;
  score: number;
  isHeaderLike: boolean;
}

export interface ScoredSentence {
  text: string;
  bm25Score: number;
  positionScore: number;    // kalimat awal chunk = nilai lebih tinggi
  totalScore: number;
  sourceChunk: number;      // indeks chunk asal
}

export interface SynthesisResult {
  response: string;
  quality: number;          // 0.0 – 1.0
  usedChunks: number[];
  intent: Intent;
}

export interface KnowledgeHit {
  text: string;
  score: number;
  intent: string;
}

export interface ConversationTurn {
  query: string;
  response: string;
  intent: Intent;
  topicTokens: string[];
  timestamp: number;
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 1 — ENGINE CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const CFG = {
  // ── BM25+ Parameters ──────────────────────────────────────────────────────
  /** Term frequency saturation */
  K1: 1.5,
  /** Document-length normalization factor */
  B: 0.75,
  /** BM25+ lower-bound delta (ensures non-zero contribution) */
  DELTA: 0.5,

  // ── Retrieval Thresholds ──────────────────────────────────────────────────
  /** Skor minimum chunk agar dianggap relevan */
  CHUNK_MIN_SCORE: 1.8,
  /** Skor minimum kalimat agar dipilih */
  SENTENCE_MIN_SCORE: 0.45,
  /** Di bawah nilai ini, query dianggap off-topic */
  DOMAIN_CONFIDENCE_THRESHOLD: 0.30,

  // ── Response Construction ─────────────────────────────────────────────────
  /** Berapa chunk teratas diproses untuk sentence extraction */
  TOP_CHUNKS: 2,
  /** Berapa kalimat dipertimbangkan sebelum diversity filter */
  TOP_SENTENCES_POOL: 4,
  /** Berapa kalimat maksimal dalam satu respons */
  RESPONSE_MAX_SENTENCES: 1,
  /** Panjang minimum kalimat agar valid */
  MIN_SENTENCE_LEN: 24,
  /** Panjang maksimum respons (karakter) */
  MAX_RESPONSE_LEN: 500,

  // ── Quality ───────────────────────────────────────────────────────────────
  /** Threshold kualitas minimum untuk dikirim (bukan fallback) */
  QUALITY_THRESHOLD: 0.35,
  /** Threshold similarity kalimat agar dianggap redundan */
  REDUNDANCY_THRESHOLD: 0.52,

  // ── Session ───────────────────────────────────────────────────────────────
  MAX_HISTORY_TURNS: 8,
  CONTEXT_TOKEN_INJECTION: 6,
  RESPONSE_CACHE_SIZE: 6,

  // ── Respons Default ───────────────────────────────────────────────────────
  FALLBACK: [
    'Mohon maaf, saya belum memiliki informasi spesifik mengenai hal tersebut dalam pangkalan data saya. Silakan hubungi petugas Satlinmas melalui tombol kontak di bawah, atau ajukan pertanyaan lain seputar kawasan pedestrian Ponorogo.',
    'Informasi yang Anda tanyakan belum tersedia dalam basis pengetahuan saya saat ini. Untuk pertanyaan lebih lanjut, Anda dapat menghubungi petugas piket Satlinmas Ponorogo atau mengajukan pertanyaan lain.',
    'Saya belum dapat menemukan jawaban yang tepat untuk pertanyaan tersebut. Apakah Anda ingin mengetahui informasi lain seputar kawasan pedestrian, PKL, patroli, atau layanan Satgas Linmas Ponorogo?',
  ],
  GREETING: [
    'Halo! Selamat datang di SIPEDAS Assistant — asisten resmi Satgas Linmas Pedestrian Ponorogo. Saya siap membantu Anda terkait informasi kawasan pedestrian, aturan PKL, jadwal patroli, pemantauan CCTV, prosedur pengaduan, dan informasi petugas. Apa yang ingin Anda ketahui?',
    'Hai! Saya SIPEDAS, asisten virtual Satgas Linmas Pedestrian Ponorogo. Tanyakan apa saja seputar kawasan pedestrian — mulai dari aturan berjualan, cara lapor pengaduan, jadwal operasional, hingga kontak petugas. Dengan senang hati saya bantu!',
    'Selamat datang di SIPEDAS! Saya hadir untuk membantu Anda mendapatkan informasi lengkap seputar Satgas Linmas Pedestrian Ponorogo dan kawasan pedestrian kota. Ada yang bisa saya bantu hari ini?',
  ],
  THANKS: [
    'Sama-sama! Jangan ragu untuk bertanya lagi jika ada informasi lain yang Anda butuhkan seputar kawasan pedestrian Ponorogo.',
    'Dengan senang hati! Apakah ada hal lain yang bisa saya bantu terkait layanan Satgas Linmas Pedestrian?',
    'Terima kasih sudah menggunakan SIPEDAS! Jika ada pertanyaan lain seputar pedestrian, PKL, atau layanan Satlinmas, saya siap membantu.',
  ],
} as const;

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 2 — STOP WORDS (KOMPREHENSIF)
// ════════════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set<string>([
  // Kata ganti
  'aku','saya','kami','kita','kalian','mereka','dia','ia','kamu','anda','beliau',
  'nya','mu','ku','kau',
  // Kata tanya dasar (dipertahankan di token, dihapus dari stemming pool)
  'apa','apakah','bagaimana','gimana','kenapa','mengapa','kapan','siapa',
  'dimana','berapa','mana',
  // Konjungsi
  'dan','atau','tetapi','tapi','namun','melainkan','sedangkan','padahal',
  'bahwa','karena','sebab','sehingga','supaya','agar','apabila','jika',
  'kalau','bila','walaupun','meskipun','walau','kendati','biarpun','sekalipun',
  'maupun','baik','pun',
  // Preposisi
  'di','ke','dari','pada','dalam','atas','bawah','antara','tentang','mengenai',
  'terhadap','dengan','oleh','untuk','bagi','demi','sampai','hingga','sejak',
  'selama','sepanjang','sekitar','sekitarnya','terhadap',
  // Artikel & penentu
  'si','sang','para','berbagai','semua','seluruh','setiap','masing','tiap',
  'beberapa','sejumlah','banyak','sedikit','cukup','paling',
  // Kata kerja bantu
  'adalah','ialah','yaitu','yakni','merupakan','ada','adanya','adapun',
  'terdapat','dapat','bisa','boleh','harus','wajib','perlu','mesti','ingin',
  'mau','akan','bakal','hendak','sudah','telah','pernah','sedang','masih',
  'belum','tidak','tak','bukan','jangan','tanpa',
  // Kata keterangan umum
  'sangat','amat','terlalu','lebih','paling','cukup','hampir','nyaris',
  'sebentar','segera','secepatnya','langsung','dulu','dahulu','nanti',
  'kemudian','lalu','kini','sekarang','tadi','begini','begitu','seperti',
  'ibarat','bagaikan',
  // Kata tunjuk
  'ini','itu','sini','situ','sana','tersebut','demikian','begitu',
  // Informal / gaul
  'nih','lho','deh','dong','sih','ah','oh','eh','nah','ya','iya','yap',
  'oke','ok','wah','aduh','hmm','ayo','yuk','saja','aja','kok','kan',
  'kak','bang','bro','sis','mas','mbak','pak','bu','gan',
  // Kata hubung lain
  'hal','cara','jenis','macam','bentuk','tipe','model','versi',
  'nomor','no','kode','id',
  // Preposisi tambahan
  'lewat','melalui','menuju','sebelum','sesudah','setelah','lalu',
  'kemudian','selanjutnya','akhirnya',
]);

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 3 — DOMAIN ONTOLOGY (SINONIM BERLAPIS)
// ════════════════════════════════════════════════════════════════════════════

interface OntologyEntry {
  l1: string[];    // sinonim langsung (semantik terdekat)
  l2: string[];    // istilah berkaitan (associated concepts)
  l3: string[];    // varian informal / bahasa sehari-hari
  weight: number;  // bobot kepentingan domain (1=rendah, 3=tinggi)
}

const DOMAIN_ONTOLOGY: Record<string, OntologyEntry> = {
  'lapor': {
    l1: ['aduan','pengaduan','laporan','laporkan','melaporkan','pelaporan'],
    l2: ['report','komplain','keluhan','melapor','pengaduan resmi'],
    l3: ['ngadu','ngomong','kasih tau','kasih tahu','cerita','curhat masalah'],
    weight: 3,
  },
  'cctv': {
    l1: ['kamera','kamera pengawas','kamera cctv','kamera pantau','kamera keamanan'],
    l2: ['live streaming','pantauan','pemantauan','monitoring','pengawasan visual','rekaman'],
    l3: ['kamera jalanan','cctv jalan','nonton live','lihat langsung'],
    weight: 3,
  },
  'pkl': {
    l1: ['pedagang kaki lima','penjual','pedagang','berjualan','lapak'],
    l2: ['dagang','gerobak','dagangan','warung','kios','stan'],
    l3: ['abang','tukang','penjual makanan','jajanan','tukang jualan'],
    weight: 3,
  },
  'tiket': {
    l1: ['nomor tiket','kode tiket','nomor laporan','no tiket','id laporan'],
    l2: ['resi','tanda terima','bukti laporan','kode unik','tracking'],
    l3: ['nomor aduan','kode lapor','cek status','status pengaduan'],
    weight: 3,
  },
  'satgas': {
    l1: ['satlinmas','petugas linmas','petugas satgas','anggota satgas'],
    l2: ['linmas','personel','anggota','regu patroli','tim lapangan'],
    l3: ['satpam pedestrian','penjaga jalan','petugas jalan','penjaga'],
    weight: 3,
  },
  'pedestrian': {
    l1: ['trotoar','kawasan pejalan kaki','kawasan pedestrian','area pedestrian'],
    l2: ['jalan pedestrian','area pejalan','jalur pejalan','kawasan kota'],
    l3: ['area jalan','face off ponorogo','jalan kaki','gang pedestrian'],
    weight: 3,
  },
  'parkir': {
    l1: ['parkir liar','motor trotoar','kendaraan trotoar','parkir sembarangan'],
    l2: ['mobil trotoar','jukir','tempat parkir','kendaraan parkir','melanggar parkir'],
    l3: ['motor nangkring','mobil nongkrong','parkiran liar'],
    weight: 2,
  },
  'pengamen': {
    l1: ['pengemis','gelandangan','pmks','anak jalanan'],
    l2: ['badut jalanan','pengamen jalanan','orang tak dikenal'],
    l3: ['orang ngemis','minta-minta','gelandang'],
    weight: 2,
  },
  'cfd': {
    l1: ['car free day','hari bebas kendaraan','minggu bebas'],
    l2: ['jalan bebas kendaraan','car free','hari tanpa mobil'],
    l3: ['cfd ponorogo','minggu cfd'],
    weight: 2,
  },
  'peta': {
    l1: ['peta kerawanan','titik rawan','zona kerawanan','geospasial'],
    l2: ['peta kawasan','zona merah','titik pantau','peta digital'],
    l3: ['peta jalan','denah','letak titik'],
    weight: 2,
  },
  'jadwal': {
    l1: ['jam operasional','waktu kerja','jadwal piket','shift kerja'],
    l2: ['waktu patroli','jam patroli','operasional','jadwal tugas','jam buka'],
    l3: ['kapan buka','jam berapa','jadwal harian','mulai jam'],
    weight: 2,
  },
  'kontak': {
    l1: ['nomor wa','whatsapp','nomor telepon','nomor hp','nomor kontak'],
    l2: ['hubungi','telepon','call center','piket','posko'],
    l3: ['wa berapa','nomor satpol','no telp','mau hubungi','minta nomor'],
    weight: 3,
  },
  'aturan': {
    l1: ['peraturan','larangan','kewajiban','ketentuan','regulasi'],
    l2: ['sop','tata tertib','dilarang','wajib','prosedur resmi'],
    l3: ['boleh nggak','gimana aturannya','aturan mainnya','boleh gak'],
    weight: 2,
  },
  'guiding_block': {
    l1: ['jalur difabel','blok kuning','guiding block','ubin kuning'],
    l2: ['tunanetra','aksesibilitas','jalur khusus disabilitas','blok difabel'],
    l3: ['batu kuning','jalur tunanetra','ubin timbul'],
    weight: 2,
  },
  'fasilitas': {
    l1: ['sarana','prasarana','infrastruktur','perlengkapan kawasan'],
    l2: ['lampu','bangku','taman','tempat duduk','kerusakan','vandalisme'],
    l3: ['barang rusak','fasilitas rusak','coret-coret','dicorat-coret'],
    weight: 2,
  },
  'patroli': {
    l1: ['ronda','penjagaan','pengawasan lapangan','patrol'],
    l2: ['keliling','regu patroli','piket patroli','jaga','pengawalan'],
    l3: ['patroli malam','keliling jalan','penjagaan jalan','ronda malam'],
    weight: 2,
  },
  'posko': {
    l1: ['pos jaga','pos komando','pos satgas','markas'],
    l2: ['kantor satgas','posko satlinmas','pos piket','sekretariat'],
    l3: ['kantor linmas','tempat lapor','pos satpol'],
    weight: 2,
  },
  'basith': {
    l1: ['developer','pengembang aplikasi','pembuat sipedas'],
    l2: ['tim developer','sipedas developer','pembangun sistem'],
    l3: ['yang buat','yang bikin','sang developer'],
    weight: 1,
  },
  'biaya': {
    l1: ['gratis','bayar','tarif','iuran','harga'],
    l2: ['biaya lapor','biaya aduan','pungutan','pungli','bayaran'],
    l3: ['berapa bayar','harus bayar','kena biaya','free'],
    weight: 2,
  },
  'keamanan': {
    l1: ['aman','keselamatan','perlindungan','ketertiban'],
    l2: ['pengamanan','rasa aman','keamanan kawasan','tertib'],
    l3: ['bahaya','tidak aman','terancam','ganggu keamanan'],
    weight: 2,
  },
  'tokoh': {
    l1: ['pejabat','pemimpin','kepala','ketua','direktur'],
    l2: ['pemrakarsa','konseptor','pengembang','penggagas','pencetus'],
    l3: ['siapa yang','orang dibalik','yang bikin','yang buat','yang pegang'],
    weight: 2,
  },
  'profil': {
    l1: ['identitas','tentang','latar belakang','riwayat','biodata'],
    l2: ['sejarah','asal usul','cerita','kisah','latar'],
    l3: ['siapa sih','ceritanya gimana','apa itu','apaan'],
    weight: 2,
  },
  'izin': {
    l1: ['perizinan','boleh','diizinkan','diperbolehkan','disetujui'],
    l2: ['surat izin','persetujuan','ketentuan izin','lisensi'],
    l3: ['boleh ga','boleh nggak','apa boleh','bisa nggak'],
    weight: 2,
  },
  'larangan': {
    l1: ['dilarang','tidak boleh','tidak diperkenankan','terlarang'],
    l2: ['sanksi','hukuman','denda','teguran','penindakan'],
    l3: ['gaboleh','gabisa','nggak boleh','dilarang apa aja'],
    weight: 2,
  },
  'pengembang': {
    l1: ['developer','pembuat','perancang','arsitek sistem'],
    l2: ['tim teknis','sipedas developer','programmer','ahli it'],
    l3: ['yang bikin','yang buat','yang coding'],
    weight: 2,
  },
  'visi': {
    l1: ['tujuan','misi','cita-cita','harapan','target'],
    l2: ['arah kebijakan','program unggulan','goal','sasaran'],
    l3: ['mau ngapain','buat apa','tujuannya apa'],
    weight: 1,
  },
  'sejarah': {
    l1: ['latar belakang','asal usul','dibentuk','didirikan','berdiri'],
    l2: ['history','kronologi','awal mula','mulai kapan'],
    l3: ['kapan dibuat','udah lama','sejak kapan'],
    weight: 1,
  },
};

/** Kumpulan kata kunci domain — dipakai untuk domain confidence scoring */
const DOMAIN_KEYWORDS = new Set<string>([
  'pedestrian','trotoar','satgas','satlinmas','linmas','lapor','aduan',
  'pengaduan','cctv','pkl','pedagang','lapak','parkir','patroli','shift',
  'piket','ponorogo','kawasan','pejalan','kaki','jalur','difabel','guiding',
  'block','face','off','tiket','laporan','resi','kontak','whatsapp','telepon',
  'hubungi','aturan','larangan','peraturan','sop','ketentuan','fasilitas',
  'rusak','kerusakan','vandalisme','pengamen','pengemis','pmks','cfd','car',
  'free','peta','kerawanan','rawan','zona','geospasial','operasional','jadwal',
  'posko','pos','jaga','regu','keamanan','tertib','wisata',
  // Dari analisis frekuensi txt
  'sipedas','satpol','warga','sistem','digital','website','aplikasi',
  'petugas','kabupaten','masyarakat','gangguan','pengawasan','ketertiban',
  'pelayanan','pelaporan','pengamanan','ruang','publik','kota','lokasi',
  'kendaraan','titik','area','program','layanan','praja','pamong','polisi',
  'personel','regu','komandan','shift','alun','cokroaminoto','face','real',
  'time','perlindungan','satuan','resmi','humanis','darurat','bantuan',
  'pelanggaran','pengunjung','liar','foto','tiket','nomor','informasi',
  'operasional','aman','khusus','tugas','bidang','lapangan','daerah',
  'kegiatan','program','jalanan','berjualan','dilarang',
  // Tokoh & nama terkait SIPEDAS
  'erry','setiyoso','birowo','basith','ahmad','abdul','eko','edi','suprapto',
  'kepala','kasatpol','developer','pemrakarsa','konseptor','pengembang',
  'pejabat','jabatan','beliau','bapak',
  // Hukum & regulasi
  'dasar','hukum','perda','peraturan','keputusan','bupati','regulasi',
  'legalitas','kebijakan','pasal','ayat','undang','hak',
]);

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 4 — SINGKATAN, NORMALISASI & KOREKSI EJAAN
// ════════════════════════════════════════════════════════════════════════════

/** Ekspansi singkatan & bahasa informal → bahasa baku */
const ABBREVIATIONS: Record<string, string> = {
  // Singkatan umum bahasa Indonesia
  'yg': 'yang', 'dgn': 'dengan', 'dlm': 'dalam', 'pd': 'pada',
  'dr': 'dari', 'utk': 'untuk', 'krn': 'karena', 'klo': 'kalau',
  'kl': 'kalau', 'kalo': 'kalau', 'gmn': 'bagaimana', 'bgmn': 'bagaimana',
  'giman': 'bagaimana', 'kpn': 'kapan', 'dmn': 'dimana', 'brp': 'berapa',
  'tdk': 'tidak', 'ga': 'tidak', 'gak': 'tidak', 'ngga': 'tidak',
  'nggak': 'tidak', 'blm': 'belum', 'bsk': 'besok', 'skrg': 'sekarang',
  'bgt': 'sangat', 'aja': 'saja', 'sy': 'saya', 'aq': 'saya',
  'km': 'kamu', 'org': 'orang', 'tmpt': 'tempat', 'tpt': 'tempat',
  'bln': 'bulan', 'thn': 'tahun', 'hrs': 'harus', 'bs': 'bisa',
  'lg': 'lagi', 'jg': 'juga', 'spt': 'seperti', 'tp': 'tapi',
  'ny': 'nya', 'udh': 'sudah', 'udah': 'sudah', 'dah': 'sudah',
  'msh': 'masih', 'gtu': 'begitu', 'gini': 'begini',
  'emng': 'memang', 'emang': 'memang', 'ntar': 'nanti', 'entar': 'nanti',
  'abis': 'setelah', 'abish': 'setelah', 'trus': 'terus', 'teross': 'terus',
  'bkn': 'bukan', 'jgn': 'jangan', 'knp': 'kenapa', 'sdh': 'sudah',
  'ttg': 'tentang', 'thd': 'terhadap', 'tsb': 'tersebut',
  'dst': 'dan seterusnya', 'dll': 'dan lain-lain', 'sbb': 'sebagai berikut',
  'svp': 'sesuai', 'krg': 'kurang', 'lbh': 'lebih', 'dgr': 'dengar',
  'minta': 'mohon', 'mau': 'ingin', 'mo': 'ingin', 'mao': 'ingin',
  'gimana': 'bagaimana', 'kayak': 'seperti', 'kek': 'seperti',
  'pengen': 'ingin', 'pingin': 'ingin', 'pgn': 'ingin',
  'nanya': 'bertanya', 'nanyain': 'menanyakan', 'nyari': 'mencari',
  'beneran': 'sungguh', 'bner': 'benar',
  'bentar': 'sebentar', 'sebntar': 'sebentar',
  'barengan': 'bersama', 'bareng': 'bersama', 'sama2': 'bersama',
  'gmana': 'bagaimana', 'gmnaa': 'bagaimana', 'gimananya': 'bagaimana caranya',
  // Singkatan domain SIPEDAS
  'info': 'informasi', 'satpol': 'satpol pp',
  'cfd': 'car free day', 'pkl': 'pedagang kaki lima', 'wa': 'whatsapp',
  'cctv': 'kamera pengawas', 'pos': 'posko', 'koord': 'koordinasi',
  'ops': 'operasional',
  'kasat': 'kepala satuan', 'kabid': 'kepala bidang',
  'aipda': 'anggota', 'praka': 'personel', 'bintara': 'personel',
  'sda': 'sumber daya aparatur', 'pemkab': 'pemerintah kabupaten',
  'pemda': 'pemerintah daerah', 'opd': 'organisasi perangkat daerah',
  'sk': 'surat keputusan', 'pergub': 'peraturan gubernur',
  'perbup': 'peraturan bupati', 'perda': 'peraturan daerah',
  'tipiring': 'tindak pidana ringan', 'yustisi': 'operasi yustisi',
  'razia': 'penertiban', 'tibum': 'ketertiban umum',
  'tramtib': 'ketertiban dan ketentraman', 'linmas': 'perlindungan masyarakat',
  'satlinmas': 'satuan perlindungan masyarakat',
  'pkk': 'program keluarga', 'rt': 'rukun tetangga', 'rw': 'rukun warga',
  'kel': 'kelurahan', 'kec': 'kecamatan', 'kab': 'kabupaten',
};

/**
 * Koreksi ejaan untuk kata-kata domain yang sering salah ketik.
 * Menggunakan lookup table, lebih cepat dari Levenshtein penuh.
 */
const SPELL_CORRECTIONS: Record<string, string> = {
  'pedistrian': 'pedestrian', 'pedestrain': 'pedestrian', 'pedetrian': 'pedestrian',
  'pedistrain': 'pedestrian', 'pedesrian': 'pedestrian', 'pedestiran': 'pedestrian',
  'satlinmast': 'satlinmas', 'satlinmax': 'satlinmas', 'satpoolpp': 'satpol pp',
  'satlimas': 'satlinmas', 'satlinmaz': 'satlinmas', 'satgas linmas': 'satgas',
  'patrol': 'patroli', 'patroil': 'patroli', 'patroly': 'patroli',
  'kontac': 'kontak', 'kontaks': 'kontak', 'kontact': 'kontak',
  'telefon': 'telepon', 'telpon': 'telepon', 'telp': 'telepon',
  'telfon': 'telepon', 'telephon': 'telepon', 'tlpn': 'telepon',
  'whatsup': 'whatsapp', 'watshapp': 'whatsapp', 'watsap': 'whatsapp',
  'watsapp': 'whatsapp', 'whatapp': 'whatsapp', 'wa2': 'whatsapp',
  'jadual': 'jadwal', 'jadal': 'jadwal', 'jdwal': 'jadwal', 'jadwl': 'jadwal',
  'fasiltas': 'fasilitas', 'fasilitay': 'fasilitas', 'facilitas': 'fasilitas',
  'fasillitas': 'fasilitas', 'fasilites': 'fasilitas',
  'laporkan': 'melaporkan', 'ngaduin': 'melaporkan', 'ngadu': 'melaporkan',
  'lapora': 'laporan', 'laporan2': 'laporan',
  'cctf': 'cctv', 'cctb': 'cctv', 'ccvt': 'cctv', 'cctd': 'cctv', 'cctff': 'cctv',
  'pengadaan': 'pengaduan', 'pengadaun': 'pengaduan',
  'keamana': 'keamanan', 'keaaman': 'keamanan',
  'petuags': 'petugas', 'petuggas': 'petugas', 'petugas2': 'petugas',
  // Typo umum kata baku Indonesia
  'perturan': 'peraturan', 'peraturn': 'peraturan', 'peraturna': 'peraturan',
  'kewajian': 'kewajiban', 'kewajiaban': 'kewajiban',
  'pengumuman': 'pengumuman',
  'kawasaan': 'kawasan', 'kawasn': 'kawasan', 'kwasan': 'kawasan',
  'trotaor': 'trotoar', 'trotar': 'trotoar', 'trotroa': 'trotoar',
  'gardu': 'pos jaga', 'pos jaga': 'posko',
  'aduan2': 'aduan', 'pengaduan2': 'pengaduan',
  'status2': 'status', 'tiket2': 'tiket',
  'kendaraaan': 'kendaraan', 'kendraan': 'kendaraan',
  'laragan': 'larangan', 'larangn': 'larangan',
  'ketertipan': 'ketertiban', 'ketertibn': 'ketertiban',
  'pelangaran': 'pelanggaran', 'pelanggrn': 'pelanggaran',
  'pengamna': 'pengamanan', 'pengamanaan': 'pengamanan',
  'keamanna': 'keamanan', 'keamanaan': 'keamanan',
  'kemana': 'ke mana', 'dimana': 'di mana', 'darimana': 'dari mana',
  'gmn': 'bagaimana', 'bgmn': 'bagaimana', 'bgaimana': 'bagaimana',
  'siapakah': 'siapa', 'apakah': 'apa', 'dimanakah': 'di mana',
  'bagaimanakah': 'bagaimana', 'kapankah': 'kapan',
  'beropersi': 'beroperasi', 'beroprasi': 'beroperasi',
  'informsi': 'informasi', 'informas': 'informasi', 'inforamsi': 'informasi',
  'layanaan': 'layanan', 'layaan': 'layanan', 'layannan': 'layanan',
  'peleyanan': 'pelayanan', 'pelayanan2': 'pelayanan',
  'sipedas': 'sipedas', 'sipeadas': 'sipedas', 'sipedaz': 'sipedas',
  'ponorgo': 'ponorogo', 'ponorgoo': 'ponorogo',
};

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 5 — MORFOLOGI & STEMMER BAHASA INDONESIA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tabel lemma irregular — diutamakan sebelum stemming algoritmik.
 * Kata-kata yang tidak mengikuti pola afiks baku.
 */
const LEMMA_TABLE: Record<string, string> = {
  // Turunan kata "lapor"
  'melaporkan': 'lapor', 'melapor': 'lapor', 'pelaporan': 'lapor',
  'dilaporkan': 'lapor', 'terlaporkan': 'lapor', 'pelapor': 'lapor',
  'laporkan': 'lapor', 'laporannya': 'lapor',
  // Turunan kata "aduan"
  'pengaduan': 'adu', 'mengadukan': 'adu', 'diadukan': 'adu',
  'teradukan': 'adu', 'pengadu': 'adu',
  // Turunan kata "pantau"
  'pemantauan': 'pantau', 'memantau': 'pantau', 'dipantau': 'pantau',
  'terpantau': 'pantau', 'pemantau': 'pantau', 'pantauan': 'pantau',
  // Turunan kata "awas"
  'pengawasan': 'awas', 'mengawasi': 'awas', 'diawasi': 'awas',
  'terawasi': 'awas', 'pengawas': 'awas', 'pengawasnya': 'awas',
  // Turunan kata "tertib"
  'penertiban': 'tertib', 'menertibkan': 'tertib', 'ketertiban': 'tertib',
  'ditertibkan': 'tertib', 'tertibkan': 'tertib',
  // Turunan kata "aman"
  'keamanan': 'aman', 'pengamanan': 'aman', 'mengamankan': 'aman',
  'diamankan': 'aman', 'keamanannya': 'aman', 'pengamanannya': 'aman',
  // Turunan kata "dagang"
  'pedagang': 'dagang', 'berdagang': 'dagang', 'perdagangan': 'dagang',
  'berdaganglah': 'dagang', 'pedagang2': 'dagang', 'berjualan': 'dagang',
  // Turunan kata "jalan"
  'pejalan': 'jalan', 'berjalan': 'jalan', 'jalanan': 'jalan',
  'perjalanan': 'jalan', 'dijalani': 'jalan', 'menjalani': 'jalan',
  'jalur': 'jalan', 'jalan2': 'jalan',
  // Turunan kata "tugas"
  'petugas': 'tugas', 'bertugas': 'tugas', 'penugasan': 'tugas',
  'ditugaskan': 'tugas', 'petugasnya': 'tugas', 'tugasnya': 'tugas',
  // Turunan kata "parkir"
  'memarkirkan': 'parkir', 'diparkir': 'parkir', 'diparkirkan': 'parkir',
  'parkiran': 'parkir', 'parkirnya': 'parkir', 'perparkiran': 'parkir',
  // Turunan kata "patroli"
  'berpatroli': 'patroli', 'melakukan patroli': 'patroli', 'patrolinya': 'patroli',
  'dipatroli': 'patroli', 'kegiatan patroli': 'patroli',
  // Turunan kata "langgar"
  'pelanggaran': 'langgar', 'melanggar': 'langgar', 'dilanggar': 'langgar',
  'pelanggar': 'langgar', 'pelanggarnya': 'langgar',
  // Turunan kata "bantu"
  'bantuan': 'bantu', 'membantu': 'bantu', 'dibantu': 'bantu',
  'pertolongan': 'bantu', 'menolong': 'bantu', 'tolong': 'bantu',
  // Turunan kata "layanan"
  'melayani': 'layan', 'pelayanan': 'layan', 'dilayani': 'layan',
  'layanannya': 'layan', 'pelayanannya': 'layan',
  // Turunan kata "tindak"
  'menindak': 'tindak', 'ditindak': 'tindak', 'penindakan': 'tindak',
  'tindaklanjut': 'tindak', 'menindaklanjuti': 'tindak',
  // Turunan kata "hubung"
  'menghubungi': 'hubung', 'dihubungi': 'hubung', 'hubungan': 'hubung',
  'penghubung': 'hubung', 'terhubung': 'hubung',
  // Turunan kata "kelola"
  'mengelola': 'kelola', 'dikelola': 'kelola', 'pengelolaan': 'kelola',
  'pengelola': 'kelola',
  // Turunan kata "kembang"
  'mengembangkan': 'kembang', 'dikembangkan': 'kembang', 'pengembangan': 'kembang',
  'pengembang': 'kembang', 'berkembang': 'kembang',
  // Turunan kata "rancang"
  'merancang': 'rancang', 'dirancang': 'rancang', 'perancangan': 'rancang',
  'rancangan': 'rancang', 'perancang': 'rancang',
  // Turunan lain
  'kawasan': 'kawas', 'kendaraan': 'kendar', 'berkendara': 'kendar',
  'beroperasi': 'operas', 'operasional': 'operas', 'operasinya': 'operas',
  'pemeriksaan': 'periksa', 'memeriksa': 'periksa', 'diperiksa': 'periksa',
  'jadwal': 'jadwal', 'penjadwalan': 'jadwal', 'dijadwalkan': 'jadwal',
  'fasilitas': 'fasilit', 'fasilitasnya': 'fasilit',
  'pengumuman': 'umum', 'diumumkan': 'umum', 'mengumumkan': 'umum',
  'keindahan': 'indah', 'kebersihannya': 'bersih', 'kebersihan': 'bersih',
  'menjaga': 'jaga', 'dijaga': 'jaga', 'penjaga': 'jaga', 'penjagaan': 'jaga',
  'mendirikan': 'diri', 'dibentuk': 'bentuk', 'pembentukan': 'bentuk',
  'dilindungi': 'lindung', 'perlindungan': 'lindung', 'melindungi': 'lindung',
  'peringatan': 'ingat', 'memperingatkan': 'ingat', 'diperingatkan': 'ingat',
  'penanganan': 'tangan', 'menangani': 'tangan', 'ditangani': 'tangan',
  'koordinasi': 'koordinasi', 'berkoordinasi': 'koordinasi', 'mengoordinasi': 'koordinasi',
};

/** Tabel prefiks Indonesia — diurut dari terpanjang ke terpendek */
const PREFIXES: ReadonlyArray<readonly [string, number]> = [
  ['menge', 5], ['penge', 5],
  ['meng', 4], ['peng', 4], ['meny', 4], ['peny', 4],
  ['mem', 3], ['men', 3], ['pen', 3], ['pem', 3],
  ['ber', 3], ['ter', 3], ['per', 3],
  ['me', 2], ['di', 2], ['pe', 2], ['se', 2], ['ke', 2],
];

/** Tabel sufiks Indonesia — diurut dari terpanjang ke terpendek */
const SUFFIXES: ReadonlyArray<readonly [string, number]> = [
  ['kah', 3], ['lah', 3], ['pun', 3],
  ['nya', 3], ['kan', 3], ['wan', 3],
  ['an', 2], ['in', 2], ['i', 1],
];

/**
 * Stemmer Porter-like untuk Bahasa Indonesia.
 * Menggunakan lemma table dulu, baru stemming algoritmik.
 */
export function stem(word: string): string {
  if (!word || word.length <= 3) return word;

  // Prioritas: lemma table
  const lemma = LEMMA_TABLE[word];
  if (lemma) return lemma;

  let w = word;

  // Lepas sufiks (satu pass)
  for (const [sfx, len] of SUFFIXES) {
    if (w.endsWith(sfx) && w.length - len >= 3) {
      w = w.slice(0, -len);
      break;
    }
  }

  // Lepas prefiks (max 2 pass)
  for (let pass = 0; pass < 2; pass++) {
    let stripped = false;
    for (const [pfx, len] of PREFIXES) {
      if (w.startsWith(pfx) && w.length - len >= 3) {
        w = w.slice(len);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }

  return w.length >= 2 ? w : word;
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 6 — TOKENIZER CERDAS
// ════════════════════════════════════════════════════════════════════════════

interface TokenizeOptions {
  expandSynonyms?: boolean;  // ekspansi sinonim domain
  filterStop?: boolean;      // hapus stop words
  stemWords?: boolean;       // terapkan stemmer
}

/**
 * Tokenizer berlapis:
 * 1. Normalisasi teks (lowercase, hapus diakritik, hapus karakter aneh)
 * 2. Ekspansi singkatan & koreksi ejaan
 * 3. Filter stop words (opsional)
 * 4. Stemming morfologi (opsional)
 * 5. Ekspansi sinonim domain (opsional)
 * 6. Deduplikasi & sort
 */
export function tokenize(
  text: string,
  options: TokenizeOptions = {}
): string[] {
  const {
    expandSynonyms = false,
    filterStop = true,
    stemWords = true,
  } = options;

  // ── Normalisasi ───────────────────────────────────────────────────────────
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // hapus diakritik (é → e, dll)
    .replace(/[^\w\s]/g, ' ')        // hapus tanda baca
    .replace(/\s+/g, ' ')
    .trim();

  const rawWords = normalized.split(' ').filter(w => w.length > 0);

  // ── Ekspansi Singkatan & Koreksi Ejaan ───────────────────────────────────
  const expandedWords: string[] = [];
  for (const w of rawWords) {
    const abbr = ABBREVIATIONS[w];
    if (abbr) {
      abbr.split(' ').forEach(sub => expandedWords.push(sub));
    } else {
      const corrected = SPELL_CORRECTIONS[w] ?? w;
      expandedWords.push(corrected);
    }
  }

  // ── Filter & Stemming ─────────────────────────────────────────────────────
  const filtered = expandedWords
    .filter(w => w.length > 1)
    .filter(w => !filterStop || !STOP_WORDS.has(w));

  const stemmed = stemWords ? filtered.map(stem) : filtered;
  const unique = [...new Set(stemmed)].filter(Boolean);

  if (!expandSynonyms) return unique;

  // ── Ekspansi Sinonim Domain (L1 only untuk presisi) ───────────────────────
  const extras: string[] = [];
  for (const [key, data] of Object.entries(DOMAIN_ONTOLOGY)) {
    const keyStem = stem(key.split(' ')[0]);
    const l1Stems = data.l1.map(t => stem(t.split(' ')[0]));

    const isMatched = unique.some(w => w === keyStem || l1Stems.includes(w));
    if (!isMatched) continue;

    // Tambahkan max 3 sinonim L1 untuk ekspansi terkontrol
    data.l1.slice(0, 3).forEach(s => {
      const st = stem(s.split(' ')[0]);
      if (!unique.includes(st)) extras.push(st);
    });
  }

  return [...new Set([...unique, ...extras.slice(0, 10)])];
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 7 — INTENT & ENTITY RECOGNITION
// ════════════════════════════════════════════════════════════════════════════

interface IntentPattern {
  intent: Intent;
  patterns: RegExp[];
  weight: number;
  exclusive?: boolean; // jika true, intent ini override semua yang lain
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'GREETING',
    patterns: [
      /^(halo|hai|hello|hi|hey|hei)\b/i,
      /^(selamat\s*(pagi|siang|sore|malam))\b/i,
      /^(assalam|permisi|salam|p)\b/i,
    ],
    weight: 10,
    exclusive: true,
  },
  {
    intent: 'THANKS',
    patterns: [
      /\b(terima kasih|makasih|thanks|thank you|thx|trims|tengkyu|tq|terimakasih)\b/i,
    ],
    weight: 10,
    exclusive: true,
  },
  {
    intent: 'TICKET',
    patterns: [
      /\b(tiket|no tiket|nomor tiket|kode tiket|cek tiket|status tiket|lacak tiket)\b/i,
      /\b(status laporan|cek laporan|nomor laporan|resi laporan|id laporan)\b/i,
    ],
    weight: 9,
  },
  {
    intent: 'COMPLAINT',
    patterns: [
      /\b(lapor|aduan|pengaduan|report|keluhan|komplain|melapor|melaporkan)\b/i,
      /\b(cara lapor|gimana lapor|mau lapor|ingin lapor|bagaimana lapor)\b/i,
      /\b(ada masalah|ada gangguan|ada kejadian|ada pelanggaran|mau ngadu)\b/i,
    ],
    weight: 8,
  },
  {
    intent: 'CONTACT',
    patterns: [
      /\b(hubungi|kontak|nomor|wa|whatsapp|telepon|telpon|call|menghubungi)\b/i,
      /\b(petugas piket|posko|pos jaga|siapa yang dihubungi|nomor berapa)\b/i,
    ],
    weight: 7,
  },
  {
    intent: 'COST',
    patterns: [
      /\b(biaya|harga|bayar|tarif|gratis|pungutan|pungli|bayaran|iuran|berapa bayar)\b/i,
      /\b(ada bayaran|kena biaya|free|percuma|tidak bayar|tidak dipungut)\b/i,
    ],
    weight: 7,
  },
  {
    intent: 'HOW',
    patterns: [
      /\b(bagaimana|gimana|caranya|cara|langkah|prosedur|proses|mekanisme|panduan)\b/i,
      /\b(tutorial|petunjuk|tata cara|alur|bisa jelaskan cara|jelaskan langkah)\b/i,
    ],
    weight: 6,
  },
  {
    intent: 'WHERE',
    patterns: [
      /\b(dimana|di mana|lokasi|tempat|alamat|posisi|letak|terletak|berada)\b/i,
      /\b(dimana bisa|dimana ada|ada di mana|tempatnya di|letaknya)\b/i,
    ],
    weight: 6,
  },
  {
    intent: 'WHEN',
    patterns: [
      /\b(kapan|waktu|jam|hari|tanggal|jadwal|shift|mulai|selesai|sampai jam)\b/i,
      /\b(jam berapa|hari apa|kapan saja|berapa lama|durasi|buka jam|tutup jam)\b/i,
    ],
    weight: 6,
  },
  {
    intent: 'WHO',
    patterns: [
      /\b(siapa|nama petugas|pimpinan|kepala|koordinator|penanggung jawab)\b/i,
      /\b(developer|pembuat|siapa yang bertugas|siapa petugasnya|siapa korlap)\b/i,
    ],
    weight: 6,
  },
  {
    intent: 'WHY',
    patterns: [
      /\b(kenapa|mengapa|alasan|penyebab|tujuan|fungsi|manfaat|apa gunanya)\b/i,
      /\b(untuk apa|digunakan untuk|maksudnya apa|tujuannya apa)\b/i,
    ],
    weight: 5,
  },
  {
    intent: 'WHAT',
    patterns: [
      /\b(apa itu|apa yang|definisi|pengertian|maksud|jelaskan|ceritakan|tolong jelaskan)\b/i,
      /\b(apakah|apa sih|itu apa|maksudnya|artinya apa)\b/i,
    ],
    weight: 4,
  },
];

/** Pola ekstraksi entitas domain */
const ENTITY_PATTERNS: Array<{ type: EntityType; patterns: RegExp[] }> = [
  {
    type: 'TIME',
    patterns: [
      /\b(\d{1,2}[:.]\d{2})\s*(wib|wita|wit)?\b/i,
      /\b(pagi|siang|sore|malam|subuh|dini hari)\b/i,
      /\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/i,
      /\b(\d{1,2}\s*(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember))\b/i,
    ],
  },
  {
    type: 'LOCATION',
    patterns: [
      /\b(pedestrian|trotoar|kawasan|alun-alun|jalan|gang)\b/i,
      /\b(ponorogo|posko|pos jaga|titik pantau|lokasi)\b/i,
    ],
  },
  {
    type: 'NUMBER',
    patterns: [
      /\b(\d{4,})\b/,  // nomor tiket / ID
      /\b(\d{1,3})\b/,
    ],
  },
  {
    type: 'TOPIC',
    patterns: [
      /\b(pkl|pedagang|lapak|parkir|pengamen|pengemis|cctv|kamera)\b/i,
      /\b(fasilitas|rusak|vandalisme|sampah|keamanan|ketertiban|patroli)\b/i,
    ],
  },
];

export function detectIntent(query: string): IntentResult {
  const lower = query.toLowerCase();
  const scores = new Map<Intent, number>();

  // Cek exclusive intents terlebih dahulu
  for (const { intent, patterns, weight, exclusive } of INTENT_PATTERNS) {
    for (const pat of patterns) {
      if (pat.test(lower)) {
        const cur = scores.get(intent) ?? 0;
        scores.set(intent, cur + weight);
        if (exclusive) scores.set(intent, (scores.get(intent) ?? 0) + 30);
      }
    }
  }

  if (scores.size === 0) {
    return { primary: 'GENERAL', scores, confidence: 0 };
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  return {
    primary: sorted[0][0],
    secondary: sorted[1]?.[0],
    tertiary: sorted[2]?.[0],
    scores,
    confidence: sorted[0][1],
  };
}

export function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  for (const { type, patterns } of ENTITY_PATTERNS) {
    for (const pat of patterns) {
      const globalPat = new RegExp(pat.source, 'gi');
      let match: RegExpExecArray | null;
      while ((match = globalPat.exec(query)) !== null) {
        entities.push({
          type,
          value: match[0].trim().toLowerCase(),
          raw: match[0],
          span: [match.index, match.index + match[0].length],
        });
      }
    }
  }

  // Deduplikasi berdasarkan span
  const seen = new Set<string>();
  return entities.filter(e => {
    const key = `${e.type}:${e.span[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 8 — DOMAIN CONFIDENCE SCORING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Menghitung seberapa dalam query berakar dalam domain SIPEDAS.
 * Mengembalikan nilai 0.0 (off-topic total) hingga 1.0 (sangat in-domain).
 *
 * Algoritma:
 * 1. Hitung hits token terhadap DOMAIN_KEYWORDS
 * 2. Hitung hits terhadap ontologi domain (dengan weight)
 * 3. Bonus untuk frasa kunci spesifik di raw query
 * 4. Normalisasi ke [0, 1]
 */
export function computeDomainConfidence(
  tokens: string[],
  rawQuery: string
): number {
  if (!tokens.length) return 0;

  let domainScore = 0;
  let tokenCount = 0;

  for (const token of tokens) {
    tokenCount++;

    // Cek terhadap domain keyword set
    if (DOMAIN_KEYWORDS.has(token)) {
      domainScore += 2.5;
      continue;
    }

    // Cek terhadap ontologi (semua level)
    let found = false;
    for (const [key, data] of Object.entries(DOMAIN_ONTOLOGY)) {
      const keyStem = stem(key.split(' ')[0]);
      if (token === keyStem) {
        domainScore += data.weight * 1.5;
        found = true;
        break;
      }
      const allTermStems = [...data.l1, ...data.l2].map(t => stem(t.split(' ')[0]));
      if (allTermStems.includes(token)) {
        domainScore += data.weight;
        found = true;
        break;
      }
    }
    if (!found) {
      // Token netral, tidak mengurangi skor
    }
  }

  // Bonus frasa spesifik di raw query
  const rawLower = rawQuery.toLowerCase();
  const bonusPhrases = [
    ['satgas', 4], ['satlinmas', 4], ['pedestrian', 4], ['ponorogo', 3],
    ['lapor', 3], ['tiket', 3], ['cctv', 3], ['pkl', 3],
    ['patroli', 2], ['trotoar', 2], ['kawasan', 2], ['pengaduan', 2],
  ] as const;

  for (const [phrase, bonus] of bonusPhrases) {
    if (rawLower.includes(phrase)) domainScore += bonus;
  }

  // Normalisasi: skala dinamis berdasarkan panjang query
  const maxPossible = tokenCount * 2.5 + 8;
  const confidence = Math.min(1.0, domainScore / Math.max(maxPossible * 0.4, 3));

  return confidence;
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 9 — OFF-TOPIC HANDLER & MINI KNOWLEDGE BASE
// ════════════════════════════════════════════════════════════════════════════

interface OffTopicEntry {
  patterns: RegExp[];
  /** Jawaban singkat yang relevan */
  briefAnswer: string;
  /** Kalimat redirect kembali ke domain SIPEDAS */
  redirect: string;
}

/**
 * Mini-KB untuk topik umum yang mungkin ditanyakan.
 * Engine menjawab SINGKAT lalu mengarahkan kembali ke domain.
 */
const OFF_TOPIC_KB: OffTopicEntry[] = [
  {
    patterns: [/\b(cuaca|hujan|panas|mendung|cerah|berawan|gerimis)\b/i],
    briefAnswer: 'Untuk informasi cuaca terkini Ponorogo, Anda bisa memeriksa aplikasi cuaca atau situs BMKG.',
    redirect: 'Sebagai asisten SIPEDAS, saya lebih siap membantu terkait kawasan pedestrian dan layanan Satlinmas Ponorogo.',
  },
  {
    patterns: [/\b(makan|kuliner|restoran|warung|nasi|soto|bakso|makanan enak)\b/i],
    briefAnswer: 'Kawasan pedestrian Ponorogo sendiri memiliki beragam pedagang kaki lima kuliner yang menarik!',
    redirect: 'Jika Anda ingin tahu aturan berjualan PKL atau informasi lengkap kawasan pedestrian, saya siap membantu.',
  },
  {
    patterns: [/\b(wisata|destinasi|liburan|jalan-jalan|tempat menarik|rekreasi)\b/i],
    briefAnswer: 'Ponorogo punya banyak destinasi menarik, dan kawasan pedestrian termasuk salah satunya yang ramai dikunjungi!',
    redirect: 'Untuk informasi jadwal CFD, fasilitas kawasan, atau hal menarik di pedestrian Ponorogo, tanyakan saja kepada saya.',
  },
  {
    patterns: [/\b(covid|corona|vaksin|pandemi|virus|penyakit menular)\b/i],
    briefAnswer: 'Untuk informasi kesehatan terkait pandemi, silakan kunjungi situs resmi Dinas Kesehatan Ponorogo atau KEMENKES.',
    redirect: 'Terkait keamanan dan ketertiban di kawasan pedestrian, informasi tersebut bisa saya bantu.',
  },
  {
    patterns: [/\b(harga|beli|jual|toko|belanja|marketplace|online shop|shopee|tokopedia)\b/i],
    briefAnswer: 'Untuk berbelanja, kawasan pedestrian Ponorogo juga menjadi lokasi PKL dengan beragam produk yang menarik.',
    redirect: 'Jika Anda ingin informasi seputar aturan PKL atau kegiatan perdagangan di kawasan pedestrian, saya bisa membantu.',
  },
  {
    patterns: [/\b(ai|kecerdasan buatan|machine learning|teknologi|chatbot|robot)\b/i],
    briefAnswer: 'SIPEDAS sendiri merupakan sistem informasi cerdas berbasis teknologi AI untuk mendukung layanan Satgas Linmas Pedestrian Ponorogo.',
    redirect: 'Untuk pertanyaan tentang layanan SIPEDAS, pedestrian, atau Satlinmas, silakan tanyakan kepada saya.',
  },
  {
    patterns: [/\b(olahraga|sepakbola|futsal|basket|renang|lari|gym|fitness|joging)\b/i],
    briefAnswer: 'Kawasan pedestrian Ponorogo bisa menjadi tempat yang nyaman untuk joging dan jalan kaki, terutama saat Car Free Day!',
    redirect: 'Untuk informasi jadwal CFD atau fasilitas olahraga di kawasan pedestrian, saya siap memberikannya.',
  },
  {
    patterns: [/\b(pendidikan|sekolah|kuliah|kampus|belajar|ujian|skripsi)\b/i],
    briefAnswer: 'Untuk informasi pendidikan, Anda bisa mengunjungi situs resmi Dinas Pendidikan Ponorogo.',
    redirect: 'Jika ada pertanyaan terkait kawasan pedestrian, layanan Satlinmas, atau SIPEDAS, saya siap membantu.',
  },
  {
    patterns: [/\b(gak jelas|ga jelas|tidak jelas|ngasal|asal|gak ngerti|ga ngerti|bingung|gak paham|ga paham|gak pintar|ga pinter|bodoh|goblok|percuma)\b/i],
    briefAnswer: 'Mohon maaf jika respons saya kurang tepat.',
    redirect: 'Coba tanyakan dengan kalimat yang lebih spesifik — misalnya tentang cara lapor pengaduan, jadwal patroli, atau info kawasan pedestrian Ponorogo.',
  },
  {
    patterns: [/\b(gajadi|ga jadi|ndak jadi|batalin|ya sudah|yasudah|okedeh|oke deh|nvm|nevermind)\b/i],
    briefAnswer: 'Baik, tidak apa-apa.',
    redirect: 'Jika ada yang ingin ditanyakan seputar SIPEDAS atau layanan Satlinmas Pedestrian Ponorogo, saya siap membantu.',
  },
  {
    patterns: [/\b(hiburan|film|musik|konser|bioskop|nonton|youtube)\b/i],
    briefAnswer: 'Kawasan pedestrian Ponorogo sering menjadi lokasi acara seni dan hiburan komunitas, terutama di akhir pekan!',
    redirect: 'Untuk informasi event di kawasan pedestrian atau jadwal kegiatan, saya bisa membantu mencarinya.',
  },
];

/** Redirect generik untuk off-topic yang tidak cocok dengan KB */
const GENERIC_REDIRECT_RESPONSES = [
  'Maaf, pertanyaan itu di luar yang bisa saya bantu. Saya fokus pada layanan SIPEDAS — pengaduan, patroli, CCTV, dan info kawasan pedestrian Ponorogo. Ada yang bisa saya bantu?',
  'Hmm, sepertinya itu di luar lingkup saya. Coba tanyakan seputar kawasan pedestrian, cara lapor gangguan, jadwal patroli, atau kontak petugas Satlinmas.',
  'Maaf, saya tidak memiliki informasi tentang itu. Saya siap membantu seputar SIPEDAS dan layanan Satgas Linmas Pedestrian Ponorogo.',
];

function handleOffTopic(query: string, turnCount: number): string {
  const lower = query.toLowerCase();

  for (const entry of OFF_TOPIC_KB) {
    const matched = entry.patterns.some(p => p.test(lower));
    if (matched) {
      return `${entry.briefAnswer} ${entry.redirect}`;
    }
  }

  return GENERIC_REDIRECT_RESPONSES[turnCount % GENERIC_REDIRECT_RESPONSES.length];
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 10 — DOCUMENT PROCESSOR
// ════════════════════════════════════════════════════════════════════════════

/** Hapus baris komentar dari dokumen TXT (baris yang dimulai '#' atau '//') */
function stripComments(raw: string): string {
  return raw
    .split('\n')
    .filter(line => {
      const t = line.trimStart();
      return t.length > 0 && !t.startsWith('#') && !t.startsWith('//');
    })
    .join('\n');
}

/**
 * Bagi dokumen menjadi chunk paragraf (dipisahkan oleh baris kosong).
 * Filter chunk terlalu pendek.
 */
function toChunks(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 30);
}

/**
 * Segmentasi kalimat yang cerdas.
 * Melindungi: "No.", "Rp.", angka desimal, inisial nama, singkatan umum.
 * Hanya split pada titik/tanda seru/tanda tanya yang diikuti spasi + huruf kapital.
 */
function toSentences(text: string): string[] {
  // Lindungi pola yang TIDAK boleh displit
  const PLACEHOLDER_MAP: Array<[RegExp, string]> = [
    [/\b(No|Rp|Dr|Mr|Mrs|Prof|Art|Pasal|Ayat|Vol|Hal|hal)\./g, '$1__DOT__'],
    [/(\d+)\.(\d+)/g, '$1__DEC__$2'],
    [/([A-Z])\.([A-Z])/g, '$1__INIT__$2'],
    [/([A-Z]{2,})\./g, '$1__ABBR__'],
  ];

  let protected_text = text;
  for (const [pat, repl] of PLACEHOLDER_MAP) {
    protected_text = protected_text.replace(pat, repl);
  }

  // Split pada akhir kalimat yang diikuti spasi atau akhir string
  const raw = protected_text
    .replace(/([.!?;])\s+(?=[A-Z"'"'])/g, '$1\n')
    .replace(/([.!?;])\s*$/gm, '$1\n')
    .split('\n');

  // Restore placeholder
  return raw
    .map(s => s
      .replace(/__DOT__/g, '.')
      .replace(/__DEC__/g, '.')
      .replace(/__INIT__/g, '.')
      .replace(/__ABBR__/g, '.')
      .trim()
    )
    .filter(s => s.length >= CFG.MIN_SENTENCE_LEN);
}

/** Apakah chunk ini terlihat seperti header/judul? */
function isHeaderLike(text: string): boolean {
  const trimmed = text.trim();
  return (
    /^[A-Z\d]/.test(trimmed) ||
    trimmed.includes(':') ||
    trimmed.length < 80 ||
    /^[IVX]+\./.test(trimmed) || // Romawi
    /^\d+\./.test(trimmed)        // Nomor
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 11 — BM25+ ENGINE (CORE RETRIEVAL)
// ════════════════════════════════════════════════════════════════════════════

interface BM25Doc {
  tokens: string[];
  termFreq: Map<string, number>;
  length: number;
}

/**
 * BM25+ Engine — penyempurnaan BM25 standar.
 *
 * Keunggulan BM25+ vs BM25:
 * - Menambahkan nilai DELTA ke term yang muncul di dokumen,
 *   sehingga term yang muncul sekali tetap mendapat bobot minimum (bukan 0).
 * - Lebih adil untuk term dengan frekuensi rendah.
 *
 * Tambahan: proximity bonus + exact phrase match bonus.
 */
class BM25PlusEngine {
  private readonly docs: BM25Doc[];
  private readonly df: Map<string, number>;
  private readonly avgDocLen: number;
  private readonly N: number;
  private readonly idfCache = new Map<string, number>();

  constructor(private readonly texts: string[]) {
    this.N = texts.length;
    this.df = new Map();
    let totalLen = 0;

    this.docs = texts.map(text => {
      const tokens = tokenize(text, { filterStop: true, stemWords: true });
      const termFreq = new Map<string, number>();
      for (const t of tokens) {
        termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
      }
      new Set(tokens).forEach(t => {
        this.df.set(t, (this.df.get(t) ?? 0) + 1);
      });
      totalLen += tokens.length;
      return { tokens, termFreq, length: tokens.length };
    });

    this.avgDocLen = this.N > 0 ? totalLen / this.N : 1;
  }

  private idf(term: string): number {
    if (this.idfCache.has(term)) return this.idfCache.get(term)!;
    const df = this.df.get(term) ?? 0;
    const val = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
    this.idfCache.set(term, val);
    return val;
  }

  private bm25PlusScore(doc: BM25Doc, queryTokens: string[]): number {
    const { K1, B, DELTA } = CFG;
    let score = 0;

    for (const term of queryTokens) {
      const tf = doc.termFreq.get(term) ?? 0;
      const idf = this.idf(term);
      if (idf <= 0) continue;

      // BM25+ formula: TF component with DELTA lower bound
      const normTF = tf * (K1 + 1) / (tf + K1 * (1 - B + B * doc.length / this.avgDocLen));
      score += idf * (normTF + DELTA);
    }

    return score;
  }

  /** Bonus skor untuk query token yang saling berdekatan dalam dokumen */
  private proximityBonus(text: string, queryTokens: string[]): number {
    if (queryTokens.length < 2) return 0;
    const lower = text.toLowerCase();
    let bonus = 0;

    for (let i = 0; i < queryTokens.length - 1; i++) {
      const idx1 = lower.indexOf(queryTokens[i]);
      const idx2 = lower.indexOf(queryTokens[i + 1]);
      if (idx1 < 0 || idx2 < 0) continue;
      const dist = Math.abs(idx2 - idx1);
      if (dist < 30) bonus += 4;
      else if (dist < 80) bonus += 2;
      else if (dist < 200) bonus += 0.5;
    }

    return bonus;
  }

  score(
    queryTokens: string[],
    rawQuery: string,
    opts: { boostTitle?: boolean } = {}
  ): Array<{ idx: number; score: number; text: string; isHeaderLike: boolean }> {
    const qLower = rawQuery.toLowerCase().trim();
    const qWords = qLower.split(/\s+/).filter(w => w.length > 3);

    return this.texts.map((text, i) => {
      const doc = this.docs[i];
      let s = this.bm25PlusScore(doc, queryTokens);

      // Bonus: exact phrase match
      if (qLower.length > 5 && text.toLowerCase().includes(qLower)) s += 22;

      // Bonus: partial word matches (tiap kata query 4+ karakter yang ditemukan)
      const hits = qWords.filter(w => text.toLowerCase().includes(w)).length;
      if (hits > 1) s += hits * 2.0;

      // Bonus: proximity
      s += this.proximityBonus(text, queryTokens);

      // Bonus: header/title
      const isHdr = isHeaderLike(text);
      if (isHdr && opts.boostTitle) s *= 1.15;

      return { idx: i, score: s, text, isHeaderLike: isHdr };
    }).sort((a, b) => b.score - a.score);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 12 — SENTENCE RANKING & COHERENCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Jaccard similarity antar dua kalimat (berdasarkan token).
 * Digunakan untuk mendeteksi redundansi.
 */
function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a, { filterStop: true }));
  const tb = new Set(tokenize(b, { filterStop: true }));
  if (!ta.size || !tb.size) return 0;

  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;

  const union = new Set([...ta, ...tb]).size;
  return intersection / union;
}

/** Apakah dua kalimat terlalu mirip (redundan)? */
function areTooSimilar(s1: string, s2: string): boolean {
  return jaccardSimilarity(s1, s2) > CFG.REDUNDANCY_THRESHOLD;
}

/**
 * Rank kalimat dari sekumpulan chunk menggunakan BM25+ per-kalimat.
 * Menggabungkan skor BM25, skor posisi, dan skor frasa.
 */
function rankSentencesFromChunks(
  chunks: string[],
  chunkIndices: number[],
  queryTokens: string[],
  rawQuery: string
): ScoredSentence[] {
  interface RawSent {
    text: string;
    sourceChunk: number;
    posInChunk: number;
  }

  const allSents: RawSent[] = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const sents = toSentences(chunks[ci]);
    sents.forEach((s, pos) => {
      allSents.push({
        text: s,
        sourceChunk: chunkIndices[ci],
        posInChunk: pos,
      });
    });
  }

  if (!allSents.length) return [];

  const sentTexts = allSents.map(s => s.text);
  const engine = new BM25PlusEngine(sentTexts);
  const scores = engine.score(queryTokens, rawQuery);
  const scoreMap = new Map(scores.map(r => [r.idx, r.score]));

  return allSents.map((sent, idx) => {
    const bm25Score = scoreMap.get(idx) ?? 0;
    // Kalimat di awal chunk (posisi 0-2) mendapat bonus kecil
    const positionScore = Math.max(0, 1.0 - sent.posInChunk * 0.08);
    const totalScore = bm25Score * 0.82 + positionScore * 0.18;

    return {
      text: sent.text,
      bm25Score,
      positionScore,
      totalScore,
      sourceChunk: sent.sourceChunk,
    };
  }).sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Pilih N kalimat terbaik sambil menjaga diversity (tidak redundan).
 */
function selectDiverseSentences(
  ranked: ScoredSentence[],
  maxN: number,
  minScore: number
): ScoredSentence[] {
  const selected: ScoredSentence[] = [];

  for (const candidate of ranked) {
    if (selected.length >= maxN) break;
    if (candidate.totalScore < minScore) break;
    if (candidate.text.length < CFG.MIN_SENTENCE_LEN) continue;

    const isRedundant = selected.some(s => areTooSimilar(s.text, candidate.text));
    if (isRedundant) continue;

    selected.push(candidate);
  }

  return selected;
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 13 — PARAPHRASE & SYNTHESIS ENGINE
// ════════════════════════════════════════════════════════════════════════════


function pickByIndex<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

/** Menghasilkan seed deterministik dari token query */
function querySeed(tokens: string[]): number {
  return tokens.reduce((acc, t, i) => acc + t.charCodeAt(0) * (i + 1), 0);
}

/** Bersihkan kalimat dari artefak markdown/bullet */
function cleanSentence(s: string): string {
  return s
    .replace(/^[\s\-–—•*·→▸▹\d]+[.):\s]*/u, '') // hapus bullet/nomor
    .replace(/\*\*(.*?)\*\*/g, '$1')              // hapus **bold**
    .replace(/\*(.*?)\*/g, '$1')                  // hapus *italic*
    .replace(/#{1,6}\s*/g, '')                    // hapus ## heading
    .replace(/`([^`]+)`/g, '$1')                  // hapus `code`
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ensurePunctuation(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : t + '.';
}

/**
 * Ekstrak fakta inti dari kalimat panjang — ambil bagian terpenting,
 * buang kata-kata basa-basi di awal.
 */
function extractCore(sent: string): string {
  // Buang awalan basa-basi umum
  return sent
    .replace(/^(adapun,?\s*|hal ini\s*(dikarenakan|berarti|menunjukkan)\s*|perlu diketahui bahwa\s*|sebagaimana disebutkan,?\s*|berdasarkan ketentuan yang berlaku,?\s*|sesuai dengan peraturan yang ada,?\s*)/i, '')
    .replace(/^(dalam rangka\s*|guna\s*|untuk\s*(keperluan|tujuan)\s*[^,]*,\s*)/i, '')
    .trim();
}

/**
 * Ekstrak komponen fakta dari kalimat:
 * { subject, predicate, object }
 * Contoh: "X adalah Y" → { subject: "X", predicate: "adalah", object: "Y" }
 */
function extractComponents(sent: string): { subject: string; predicate: string; object: string } | null {
  const s = sent.replace(/[.!?]$/, '').trim();

  // Pola: "X adalah/merupakan/ialah/yaitu Y"
  const copula = s.match(/^(.+?)\s+(adalah|merupakan|ialah|yaitu|yakni)\s+(.+)$/i);
  if (copula) return { subject: copula[1].trim(), predicate: copula[2].trim(), object: copula[3].trim() };

  // Pola: "X dijabat/dipimpin/dikelola oleh Y"
  const passive = s.match(/^(.+?)\s+(dijabat|dipimpin|dikelola|dilaksanakan|dibentuk|dirancang)\s+(.+)$/i);
  if (passive) return { subject: passive[1].trim(), predicate: passive[2].trim(), object: passive[3].trim() };

  return null;
}

/**
 * Buat variasi kalimat dari komponen subjek-predikat-objek.
 * Menghasilkan pola berbeda setiap kali dipanggil dengan seed berbeda.
 */
function restructure(sent: string, seed: number): string {
  const comp = extractComponents(sent);
  if (!comp) return sent; // fallback jika tidak bisa diparsing

  const { subject, predicate, object } = comp;
  const subjectLower = subject.charAt(0).toLowerCase() + subject.slice(1);
  const objectLower  = object.charAt(0).toLowerCase() + object.slice(1);

  // Variasi pola berdasarkan tipe predikat
  if (/adalah|merupakan|ialah|yaitu|yakni/i.test(predicate)) {
    // subject = "X", object = "seorang Y di Z"
    // Coba ekstrak nama dari object (biasanya "Bapak Nama, gelar")
    const nameMatch = object.match(/^(Bapak|Ibu)?\s*([A-Z][a-zA-Z\s]+?)(?:,\s*[A-Z]|$)/);
    const name = nameMatch ? nameMatch[0].trim() : object.split(',')[0].trim();
    const rest = object.includes(',') ? object.slice(object.indexOf(',') + 1).trim() : '';

    const patterns = [
      `${subject} adalah ${object}`,
      `${name}${rest ? ` (${rest})` : ''} menjabat sebagai ${subjectLower}`,
      `${subjectLower.charAt(0).toUpperCase() + subjectLower.slice(1)} dipercayakan kepada ${objectLower}`,
      `${subject}: ${name}`,
      `${name} adalah orang di balik ${subjectLower}`,
      `Sosok ${name} dikenal sebagai ${subjectLower}`,
    ];
    return patterns[Math.abs(seed) % patterns.length];
  }

  if (/dijabat|dipimpin/i.test(predicate)) {
    // subject = "jabatan X", object = "oleh Bapak Y"
    const who = object.replace(/^oleh\s+/i, '').trim();
    const whoLower = who.charAt(0).toLowerCase() + who.slice(1);
    const patterns = [
      `${subject} ${predicate} ${object}`,
      `${who} menjabat sebagai ${subjectLower}`,
      `${subjectLower.charAt(0).toUpperCase() + subjectLower.slice(1)} saat ini diemban oleh ${whoLower}`,
      `${who}: ${subjectLower}`,
      `Saat ini, ${whoLower} yang bertanggung jawab sebagai ${subjectLower}`,
    ];
    return patterns[Math.abs(seed) % patterns.length];
  }

  return sent;
}

/**
 * Rangkai ulang kalimat inti menjadi variasi parafrase berdasarkan intent + seed.
 */
function paraphrase(core: string, intent: Intent, seed: number): string {
  // Coba restrukturisasi faktual terlebih dahulu
  const restructured = restructure(core, seed);
  if (restructured !== core) return restructured;

  // Fallback: variasi ringan per intent
  const c = core.charAt(0).toLowerCase() + core.slice(1).replace(/[.!?]$/, '');
  const variants: Record<string, string[]> = {
    WHO:       [core, `Beliau: ${c}`, core, `Yang bersangkutan — ${c}`, core, `Sosoknya: ${c}`],
    WHAT:      [core, `Singkatnya, ${c}`, core, core, core],
    HOW:       [core, `Caranya: ${c}`, `Prosedurnya — ${c}`, `Langkah yang perlu ditempuh: ${c}`, core],
    WHEN:      [core, `Jadwalnya: ${c}`, `Waktu operasionalnya — ${c}`, `Berdasarkan jadwal: ${c}`, core],
    WHERE:     [core, `Lokasinya: ${c}`, `Tempatnya — ${c}`, core],
    WHY:       [core, `Alasannya: ${c}`, `Hal ini karena ${c}`, core],
    COMPLAINT: [core, `Untuk melapor: ${c}`, `Prosedur pengaduan: ${c}`, core],
    CONTACT:   [core, `Untuk menghubungi: ${c}`, core],
    GENERAL:   [core, core, core, core, core],
  };
  const pool = variants[intent] ?? variants.GENERAL;
  return pool[Math.abs(seed) % pool.length];
}

/**
 * Merakit respons akhir dari kalimat-kalimat terpilih.
 * Mengekstrak inti fakta → merestrukturisasi → menghasilkan jawaban bervariasi.
 */
function synthesizeResponse(
  sentences: ScoredSentence[],
  intent: Intent,
  queryTokens: string[],
  turnCount: number = 0
): string {
  if (!sentences.length) return '';

  const seed = querySeed(queryTokens) + turnCount * 31 + Math.floor(Date.now() / 1000) % 97;
  const primary = extractCore(cleanSentence(sentences[0].text));
  let response = capitalize(ensurePunctuation(paraphrase(primary, intent, seed)));

  // Kalimat sekunder hanya jika config izinkan
  if (
    CFG.RESPONSE_MAX_SENTENCES >= 2 &&
    sentences.length >= 2 &&
    response.length < CFG.MAX_RESPONSE_LEN * 0.6
  ) {
    const secondary = extractCore(cleanSentence(sentences[1].text));
    if (secondary.length >= CFG.MIN_SENTENCE_LEN && !areTooSimilar(primary, secondary)) {
      const s2 = paraphrase(secondary, intent, seed + 7);
      response = ensurePunctuation(response) + ' ' + capitalize(s2);
    }
  }

  if (response.length > CFG.MAX_RESPONSE_LEN) {
    const cut = response.slice(0, CFG.MAX_RESPONSE_LEN).trim();
    const last = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    response = last > CFG.MAX_RESPONSE_LEN * 0.5 ? cut.slice(0, last + 1) : ensurePunctuation(cut);
  }

  return ensurePunctuation(response);
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 14 — RESPONSE QUALITY SCORING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Menilai kualitas respons yang dihasilkan (self-assessment).
 *
 * Kriteria penilaian:
 * - Relevansi: berapa banyak query token muncul di respons
 * - Panjang: tidak terlalu pendek, tidak terlalu panjang
 * - Struktur: diakhiri tanda baca, tidak mengandung artefak
 * - Spesifisitas: mengandung konten substantif (angka, nama, prosedur)
 */
function scoreResponseQuality(
  response: string,
  queryTokens: string[]
): number {
  if (!response || response.length < 20) return 0;

  let quality = 0;
  const lower = response.toLowerCase();

  // Relevansi (bobot: 45%)
  if (queryTokens.length > 0) {
    const hits = queryTokens.filter(t => lower.includes(t)).length;
    quality += (hits / queryTokens.length) * 0.45;
  }

  // Panjang optimal (bobot: 25%)
  if (response.length >= 50)  quality += 0.08;
  if (response.length >= 100) quality += 0.10;
  if (response.length >= 150) quality += 0.07;
  if (response.length > CFG.MAX_RESPONSE_LEN) quality -= 0.08;

  // Struktur (bobot: 15%)
  if (/[.!?]$/.test(response.trim())) quality += 0.08;
  if (!/[#*\\[\]]/.test(response))    quality += 0.07;

  // Spesifisitas (bobot: 15%)
  if (/\d/.test(response))            quality += 0.05; // mengandung angka
  if (/[A-Z]{2,}/.test(response))     quality += 0.05; // mengandung akronim
  if (response.split(' ').length > 12) quality += 0.05; // kalimat cukup panjang

  return Math.min(1.0, Math.max(0.0, quality));
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 15 — SESSION MEMORY & ANTI-REPETITION
// ════════════════════════════════════════════════════════════════════════════

/** State sesi percakapan (in-memory, per instance) */
interface SessionState {
  history: ConversationTurn[];
  lastTopicTokens: string[];
  lastIntent: Intent;
  lastEntities: ExtractedEntity[];
  recentResponses: string[];
  turnCount: number;
}

const SESSION: SessionState = {
  history: [],
  lastTopicTokens: [],
  lastIntent: 'GENERAL',
  lastEntities: [],
  recentResponses: [],
  turnCount: 0,
};

/** Reset seluruh memori sesi */
export function resetMemory(): void {
  SESSION.history = [];
  SESSION.lastTopicTokens = [];
  SESSION.lastIntent = 'GENERAL';
  SESSION.lastEntities = [];
  SESSION.recentResponses = [];
  SESSION.turnCount = 0;
}

/** Ekspor state sesi untuk inspeksi/debugging */
export function getSessionState(): Readonly<SessionState> {
  return {
    history: [...SESSION.history],
    lastTopicTokens: [...SESSION.lastTopicTokens],
    lastIntent: SESSION.lastIntent,
    lastEntities: [...SESSION.lastEntities],
    recentResponses: [...SESSION.recentResponses],
    turnCount: SESSION.turnCount,
  };
}

/**
 * Deteksi apakah query ini adalah follow-up dari giliran sebelumnya.
 * Follow-up = query pendek / mengandung kata deiktik / tidak punya domain keyword baru.
 */
function isFollowUpQuery(query: string): boolean {
  if (!SESSION.history.length) return false;

  const lower = query.toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);

  // Kata-kata deiktik yang merujuk ke konteks sebelumnya
  const DEICTIC = ['itu','tersebut','tadi','yang tadi','sama itu','hal itu','tadi apa','yang dimaksud'];
  if (DEICTIC.some(d => lower.includes(d))) return true;

  // Query sangat pendek — kemungkinan kelanjutan
  if (words.length <= 2) return true;

  // Query tidak mengandung domain keyword baru + pendek
  const tokens = tokenize(query, { filterStop: true });
  const hasDomainToken = tokens.some(t => DOMAIN_KEYWORDS.has(t));
  if (!hasDomainToken && words.length <= 5) return true;

  return false;
}

/**
 * Apakah respons ini terlalu mirip dengan respons-respons sebelumnya?
 */
function isDuplicateResponse(response: string): boolean {
  const respTokens = new Set(tokenize(response, { filterStop: true }));
  if (!respTokens.size) return false;

  for (const prev of SESSION.recentResponses) {
    const prevTokens = new Set(tokenize(prev, { filterStop: true }));
    let intersection = 0;
    for (const t of respTokens) if (prevTokens.has(t)) intersection++;
    const similarity = intersection / Math.max(respTokens.size, 1);
    if (similarity > 0.72) return true;
  }

  return false;
}

function addToSession(turn: ConversationTurn): void {
  SESSION.history.push(turn);
  SESSION.recentResponses.push(turn.response);

  if (SESSION.history.length > CFG.MAX_HISTORY_TURNS) SESSION.history.shift();
  if (SESSION.recentResponses.length > CFG.RESPONSE_CACHE_SIZE) SESSION.recentResponses.shift();
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 16 — QUERY ANALYSIS ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════

/**
 * Analisis menyeluruh terhadap query masuk.
 * Menghasilkan QueryAnalysis yang digunakan oleh semua layer berikutnya.
 */
function analyzeQuery(query: string): QueryAnalysis {
  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const tokens = tokenize(query, {
    expandSynonyms: false,
    filterStop: true,
    stemWords: true,
  });

  const expandedTokens = tokenize(query, {
    expandSynonyms: true,
    filterStop: true,
    stemWords: true,
  });

  const intent = detectIntent(query);
  const entities = extractEntities(query);
  const domainConfidence = computeDomainConfidence(tokens, query);
  const followUp = isFollowUpQuery(query);

  // Off-topic: confidence rendah + bukan intent high-priority
  const HIGH_PRIORITY_INTENTS: Intent[] = ['GREETING', 'THANKS', 'COMPLAINT', 'TICKET', 'CONTACT'];
  // Nama tokoh SIPEDAS selalu in-domain meski query pendek
  const KNOWN_NAMES = /\b(erry|setiyoso|birowo|basith|ahmad|abdul|eko\s+edi|suprapto|satlinmas|sipedas|satpol)\b/i;
  const isOffTopic =
    domainConfidence < CFG.DOMAIN_CONFIDENCE_THRESHOLD &&
    !HIGH_PRIORITY_INTENTS.includes(intent.primary) &&
    !KNOWN_NAMES.test(query);

  return {
    raw: query,
    normalized,
    tokens,
    expandedTokens,
    intent,
    entities,
    isFollowUp: followUp,
    domainConfidence,
    isOffTopic,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 17 — RETRIEVAL & RESPONSE PIPELINE (CORE)
// ════════════════════════════════════════════════════════════════════════════

function getFallback(): string {
  return CFG.FALLBACK[SESSION.turnCount % CFG.FALLBACK.length];
}

/**
 * Pipeline utama retrieval → sentence ranking → synthesis.
 * Mengembalikan SynthesisResult yang berisi respons final dan metadata.
 */
function retrieveAndBuild(
  analysis: QueryAnalysis,
  documentRaw: string
): SynthesisResult {
  const { tokens, expandedTokens, intent, isFollowUp } = analysis;

  // ── Bangun token kontekstual ────────────────────────────────────────────
  let contextualTokens = [...expandedTokens];

  if (isFollowUp && SESSION.lastTopicTokens.length > 0) {
    const ctxTokens = SESSION.lastTopicTokens.slice(0, CFG.CONTEXT_TOKEN_INJECTION);
    contextualTokens = [...new Set([...contextualTokens, ...ctxTokens])];
  }

  if (!contextualTokens.length) {
    return { response: getFallback(), quality: 0, usedChunks: [], intent: intent.primary };
  }

  // ── Parsing dokumen ─────────────────────────────────────────────────────
  const cleaned = stripComments(documentRaw);
  const chunks = toChunks(cleaned);

  if (!chunks.length) {
    return { response: getFallback(), quality: 0, usedChunks: [], intent: intent.primary };
  }

  // ── L5: BM25+ Retrieval pada level chunk ────────────────────────────────
  const chunkEngine = new BM25PlusEngine(chunks);
  const chunkResults = chunkEngine.score(contextualTokens, analysis.raw, { boostTitle: true });

  let topChunks = chunkResults.filter(r => r.score >= CFG.CHUNK_MIN_SCORE);

  // Fallback 1: retry dengan pure tokens (tanpa konteks sesi)
  if (!topChunks.length && isFollowUp) {
    const pureResults = chunkEngine.score(tokens, analysis.raw);
    topChunks = pureResults.filter(r => r.score >= CFG.CHUNK_MIN_SCORE * 0.75);
  }

  // Fallback 2: ambil skor terbaik meski di bawah threshold
  if (!topChunks.length && chunkResults.length > 0) {
    const best = chunkResults[0];
    if (best.score > 0.5) topChunks = [best];
  }

  if (!topChunks.length) {
    return { response: getFallback(), quality: 0, usedChunks: [], intent: intent.primary };
  }

  // ── Ambil TOP_CHUNKS terbaik ─────────────────────────────────────────────
  const selectedChunks = topChunks.slice(0, CFG.TOP_CHUNKS);
  const chunkTexts = selectedChunks.map(r => r.text);
  const chunkIndices = selectedChunks.map(r => r.idx);

  // ── L6: Sentence ranking dari multi-chunk ───────────────────────────────
  const rankedSentences = rankSentencesFromChunks(
    chunkTexts,
    chunkIndices,
    contextualTokens,
    analysis.raw
  );

  // ── L6: Pilih kalimat terbaik dengan diversity filter ───────────────────
  const selectedSentences = selectDiverseSentences(
    rankedSentences,
    CFG.RESPONSE_MAX_SENTENCES,
    CFG.SENTENCE_MIN_SCORE
  );

  if (!selectedSentences.length) {
    // Fallback: ambil kalimat pertama chunk terbaik
    const firstSents = toSentences(chunkTexts[0]);
    if (firstSents.length > 0) {
      const fb = ensurePunctuation(capitalize(cleanSentence(firstSents[0])));
      return {
        response: fb,
        quality: scoreResponseQuality(fb, contextualTokens),
        usedChunks: [chunkIndices[0]],
        intent: intent.primary,
      };
    }
    return { response: getFallback(), quality: 0, usedChunks: [], intent: intent.primary };
  }

  // ── L7: Synthesis & Paraphrase ──────────────────────────────────────────
  const response = synthesizeResponse(selectedSentences, intent.primary, contextualTokens, SESSION.turnCount);
  const quality = scoreResponseQuality(response, contextualTokens);

  return {
    response,
    quality,
    usedChunks: chunkIndices,
    intent: intent.primary,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 18 — MAIN ENTRY POINT: askChatbot
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fungsi utama chatbot SIPEDAS.
 *
 * @param query       - Pertanyaan/pesan dari pengguna
 * @param documentRaw - Isi dokumen satgaslinmas.txt (raw text)
 * @returns           - Respons chatbot dalam Bahasa Indonesia
 *
 * Alur:
 * 1. Preprocessing & analisis query
 * 2. Deteksi intent khusus (greeting, thanks)
 * 3. Cek off-topic
 * 4. Retrieval + synthesis (pipeline utama)
 * 5. Anti-repetition check
 * 6. Update session memory
 */
export function askChatbot(query: string, documentRaw: string): string {
  const qTrimmed = query.trim();
  if (!qTrimmed) return getFallback();

  SESSION.turnCount++;

  // ── L3: Analisis lengkap query ────────────────────────────────────────────
  const analysis = analyzeQuery(qTrimmed);
  const { intent, isFollowUp } = analysis;

  // ── Intent: Greeting ──────────────────────────────────────────────────────
  if (
    intent.primary === 'GREETING' &&
    qTrimmed.split(/\s+/).length <= 5
  ) {
    const resp = CFG.GREETING[SESSION.turnCount % CFG.GREETING.length];
    addToSession({ query: qTrimmed, response: resp, intent: 'GREETING', topicTokens: [], timestamp: Date.now() });
    return resp;
  }

  // ── Intent: Thanks ────────────────────────────────────────────────────────
  if (intent.primary === 'THANKS') {
    const resp = CFG.THANKS[SESSION.turnCount % CFG.THANKS.length];
    addToSession({ query: qTrimmed, response: resp, intent: 'THANKS', topicTokens: [], timestamp: Date.now() });
    return resp;
  }

  // ── L4: Off-topic (saat dokumen tidak ada / query jelas di luar domain) ──
  if (analysis.isOffTopic && documentRaw.trim().length < 100) {
    const resp = handleOffTopic(qTrimmed, SESSION.turnCount);
    addToSession({ query: qTrimmed, response: resp, intent: 'OFF_TOPIC', topicTokens: [], timestamp: Date.now() });
    return resp;
  }

  // ── L5-L7: Retrieval & Synthesis ─────────────────────────────────────────
  const result = retrieveAndBuild(analysis, documentRaw);

  // Jika off-topic, arahkan ke off-topic handler
  if (analysis.isOffTopic) {
    const resp = handleOffTopic(qTrimmed, SESSION.turnCount);
    addToSession({ query: qTrimmed, response: resp, intent: 'OFF_TOPIC', topicTokens: [], timestamp: Date.now() });
    return resp;
  }

  // Jika retrieval tidak menemukan hasil yang cukup baik, juga off-topic
  if (result.quality < CFG.QUALITY_THRESHOLD) {
    const resp = handleOffTopic(qTrimmed, SESSION.turnCount);
    addToSession({ query: qTrimmed, response: resp, intent: 'OFF_TOPIC', topicTokens: [], timestamp: Date.now() });
    return resp;
  }

  let finalResponse = result.response;

  // ── L8: Anti-repetition — variasikan jika terlalu mirip dengan respons lalu ──
  if (isDuplicateResponse(finalResponse)) {
    // Coba dengan token urutan terbalik untuk diversifikasi
    const altAnalysis: QueryAnalysis = {
      ...analysis,
      expandedTokens: [...analysis.expandedTokens].sort(() => 0.5 - Math.random()),
    };
    const altResult = retrieveAndBuild(altAnalysis, documentRaw);

    if (
      altResult.quality >= CFG.QUALITY_THRESHOLD &&
      !isDuplicateResponse(altResult.response)
    ) {
      finalResponse = altResult.response;
    }
  }

  // ── L8: Update Session Memory ─────────────────────────────────────────────
  const topicTokens = analysis.expandedTokens.slice(0, 8);
  SESSION.lastTopicTokens = topicTokens;
  SESSION.lastIntent = intent.primary;
  SESSION.lastEntities = analysis.entities;

  addToSession({
    query: qTrimmed,
    response: finalResponse,
    intent: intent.primary,
    topicTokens,
    timestamp: Date.now(),
  });

  return finalResponse;
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 19 — KNOWLEDGE SEARCH API (PUBLIK)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cari N chunk paling relevan dari dokumen untuk query tertentu.
 * Berguna untuk fitur "Lihat Sumber" atau debugging retrieval.
 *
 * @param query       - Query pencarian
 * @param documentRaw - Dokumen pengetahuan
 * @param topN        - Jumlah hasil maksimal (default: 3)
 */
export function searchKnowledgeTop(
  query: string,
  documentRaw: string,
  topN = 3
): KnowledgeHit[] {
  const tokens = tokenize(query, { expandSynonyms: true });
  const chunks = toChunks(stripComments(documentRaw));

  if (!chunks.length) return [];

  const engine = new BM25PlusEngine(chunks);
  const { primary: intent } = detectIntent(query);

  return engine
    .score(tokens, query, { boostTitle: true })
    .filter(r => r.score >= CFG.CHUNK_MIN_SCORE)
    .slice(0, topN)
    .map(r => ({
      text: chunks[r.idx],
      score: r.score,
      intent,
    }));
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 20 — FETCH & CACHE DOKUMEN
// ════════════════════════════════════════════════════════════════════════════

let _fetchPromise: Promise<string> | null = null;
let _fetchRetries = 0;
const MAX_FETCH_RETRIES = 3;

/** Prefetch dokumen ke cache agar respons pertama tidak delay */
export function prefetchSatgasLinmasText(): void {
  void getSatgasLinmasText();
}

/**
 * Fetch + cache dokumen satgaslinmas.txt.
 * Otomatis retry hingga MAX_FETCH_RETRIES kali jika gagal.
 */
export function getSatgasLinmasText(forceRefresh = false): Promise<string> {
  if (forceRefresh) _fetchPromise = null;

  if (!_fetchPromise) {
    _fetchRetries = 0;

    const fetchWithRetry = (): Promise<string> =>
      fetch('/satgaslinmas.txt')
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
          return r.text();
        })
        .catch(err => {
          _fetchRetries++;
          if (_fetchRetries < MAX_FETCH_RETRIES) {
            console.warn(`[SIPEDAS] Retry fetch ${_fetchRetries}/${MAX_FETCH_RETRIES}:`, err);
            return new Promise<string>(res => setTimeout(() => res(fetchWithRetry()), 1000 * _fetchRetries));
          }
          console.error('[SIPEDAS] Gagal fetch dokumen setelah', MAX_FETCH_RETRIES, 'percobaan:', err);
          _fetchPromise = null;
          return '';
        });

    _fetchPromise = fetchWithRetry();
  }

  return _fetchPromise;
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 21 — DEBUG & DIAGNOSTIC UTILITIES
// ════════════════════════════════════════════════════════════════════════════

export interface DiagnosticReport {
  query: string;
  analysis: QueryAnalysis;
  topChunks: KnowledgeHit[];
  sessionTurnCount: number;
  engineVersion: string;
}

/**
 * Analisis query tanpa memanggil full pipeline.
 * Berguna untuk debugging intent detection & tokenisasi.
 */
export function debugAnalyzeQuery(query: string): QueryAnalysis {
  return analyzeQuery(query);
}

/**
 * Laporan diagnostik lengkap — analisis + retrieval + state sesi.
 * Hanya untuk development/debugging.
 */
export function diagnosticReport(
  query: string,
  documentRaw: string
): DiagnosticReport {
  return {
    query,
    analysis: analyzeQuery(query),
    topChunks: searchKnowledgeTop(query, documentRaw, 5),
    sessionTurnCount: SESSION.turnCount,
    engineVersion: '7.0.0',
  };
}

/**
 * Menghitung statistik skor sebuah dokumen terhadap query
 * tanpa mengubah state sesi.
 */
export function scoreDocument(
  query: string,
  documentRaw: string
): { maxScore: number; avgScore: number; chunkCount: number } {
  const tokens = tokenize(query, { expandSynonyms: true });
  const chunks = toChunks(stripComments(documentRaw));
  if (!chunks.length || !tokens.length) {
    return { maxScore: 0, avgScore: 0, chunkCount: 0 };
  }

  const engine = new BM25PlusEngine(chunks);
  const results = engine.score(tokens, query);
  const scores = results.map(r => r.score);

  return {
    maxScore: Math.max(...scores),
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    chunkCount: chunks.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  SECTION 22 — CONVENIENCE EXPORTS & NAMED CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

export const ENGINE_VERSION = '7.0.0' as const;
export const ENGINE_NAME = 'SIPEDAS Ultra Intelligence Engine' as const;

/** Daftar semua intent yang didukung */
export const ALL_INTENTS: Intent[] = [
  'GREETING', 'THANKS', 'HOW', 'WHERE', 'WHEN', 'WHO', 'WHY',
  'COST', 'WHAT', 'COMPLAINT', 'CONTACT', 'TICKET', 'OFF_TOPIC', 'GENERAL',
];

/** Konfigurasi engine (read-only export untuk inspeksi) */
export { CFG as ENGINE_CONFIG };

