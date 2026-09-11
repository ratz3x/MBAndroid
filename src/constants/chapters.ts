// ============================================================
// Master Data: Clubs & Chapters Mercedes-Benz Club Indonesia
// ============================================================

export interface ClubChapter {
  kode: string;
  nama: string;
  region: string;
  kota: string;
  tipe: 'CLUB' | 'CHAPTER';
}

export const CLUB_CHAPTERS: ClubChapter[] = [
  // ── Regional Sumatra ──────────────────────────────────────────
  { kode: 'MBCACEH', nama: 'MBC Aceh', region: 'Regional Sumatra', kota: 'Aceh', tipe: 'CLUB' },
  { kode: 'MTCINABI', nama: 'MTC Ina Bireuen Chapter', region: 'Regional Sumatra', kota: 'Bireuen', tipe: 'CHAPTER' },
  { kode: 'MBCLANGS', nama: 'MBC Langsa', region: 'Regional Sumatra', kota: 'Langsa', tipe: 'CLUB' },
  { kode: 'MBCMEDAN', nama: 'MBC Medan', region: 'Regional Sumatra', kota: 'Medan', tipe: 'CLUB' },
  { kode: 'W124MBCI', nama: 'W124MBCI Medan Chapter', region: 'Regional Sumatra', kota: 'Medan', tipe: 'CHAPTER' },
  { kode: 'MBW202CI', nama: 'MBW202CI Medan Region', region: 'Regional Sumatra', kota: 'Medan', tipe: 'CHAPTER' },
  { kode: 'MTCINAME', nama: 'MTC Ina Medan Chapter', region: 'Regional Sumatra', kota: 'Medan', tipe: 'CHAPTER' },
  { kode: 'MCCIMEDA', nama: 'MCCI Medan Chapter', region: 'Regional Sumatra', kota: 'Medan', tipe: 'CHAPTER' },
  { kode: 'MBW204CI', nama: 'MBW204CI Medan Chapter', region: 'Regional Sumatra', kota: 'Medan', tipe: 'CHAPTER' },
  { kode: 'MBCPADAN', nama: 'MBC Padang', region: 'Regional Sumatra', kota: 'Padang', tipe: 'CLUB' },
  { kode: 'MTCINAPA', nama: 'MTC Ina Padang Chapter', region: 'Regional Sumatra', kota: 'Padang', tipe: 'CHAPTER' },
  { kode: 'MBCPEKAN', nama: 'MBC Pekanbaru', region: 'Regional Sumatra', kota: 'Pekanbaru', tipe: 'CLUB' },
  { kode: 'MTCINAPE', nama: 'MTC Ina Pekanbaru Chapter', region: 'Regional Sumatra', kota: 'Pekanbaru', tipe: 'CHAPTER' },
  { kode: 'MBCPALEM', nama: 'MBC Palembang', region: 'Regional Sumatra', kota: 'Palembang', tipe: 'CLUB' },
  { kode: 'MBCLAMPU', nama: 'MBC Lampung', region: 'Regional Sumatra', kota: 'Lampung', tipe: 'CLUB' },
  { kode: 'W124MB01', nama: 'W124MBCI Lampung Chapter', region: 'Regional Sumatra', kota: 'Lampung', tipe: 'CHAPTER' },

  // ── Regional Banten ───────────────────────────────────────────
  { kode: 'MBCBANTE', nama: 'MBC Banten', region: 'Regional Banten', kota: 'Banten', tipe: 'CLUB' },
  { kode: 'MBCTANGE', nama: 'MBC Tangerang Raya', region: 'Regional Banten', kota: 'Tangerang', tipe: 'CLUB' },
  { kode: 'MBW211CI', nama: 'MBW211CI Tangerang Chapter', region: 'Regional Banten', kota: 'Tangerang', tipe: 'CHAPTER' },
  { kode: 'MBW20401', nama: 'MBW204CI Tangerang Chapter', region: 'Regional Banten', kota: 'Tangerang', tipe: 'CHAPTER' },

  // ── Regional Metro DKI Jakarta ────────────────────────────────
  { kode: 'MCCI', nama: 'MCCI', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MTCINA', nama: 'MTC Ina', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MJI', nama: 'MJI', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'W124MB02', nama: 'W124 MBCI', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW140CL', nama: 'MBW140 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBVITOVI', nama: 'MBVitoViano Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBSLCLUB', nama: 'MBSL Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBDIECAS', nama: 'MBDiecast Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBMLCLUB', nama: 'MBML Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW201CL', nama: 'MBW201 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW202CL', nama: 'MBW202 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW203CL', nama: 'MBW203 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW204CL', nama: 'MBW204 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW205CO', nama: 'MBW205 Community Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW210CL', nama: 'MBW210 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW211CL', nama: 'MBW211 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW212CL', nama: 'MBW212 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW213CO', nama: 'MBW213 Community Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'MBW221CL', nama: 'MBW221 Club Indonesia', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CLUB' },
  { kode: 'W124MB03', nama: 'W124MBCI Jakarta Chapter', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CHAPTER' },
  { kode: 'MBW20201', nama: 'MBW202CI Jakarta Region', region: 'Regional Metro DKI Jakarta', kota: 'Jakarta', tipe: 'CHAPTER' },

  // ── Regional Jawa Barat ───────────────────────────────────────
  { kode: 'MBCBANDU', nama: 'MBC Bandung', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CLUB' },
  { kode: 'BMUC', nama: 'BMUC', region: 'Regional Jawa Barat', kota: 'Bogor', tipe: 'CLUB' },
  { kode: 'MBCSUKAB', nama: 'MBC Sukabumi', region: 'Regional Jawa Barat', kota: 'Sukabumi', tipe: 'CLUB' },
  { kode: 'MBCSUMED', nama: 'MBC Sumedang', region: 'Regional Jawa Barat', kota: 'Sumedang', tipe: 'CLUB' },
  { kode: 'MBCCIREB', nama: 'MBC Cirebon', region: 'Regional Jawa Barat', kota: 'Cirebon', tipe: 'CLUB' },
  { kode: 'MBW123CL', nama: 'MBW123 Club Bandung Ina', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CLUB' },
  { kode: 'MCCIBAND', nama: 'MCCI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'W124MB04', nama: 'W124MBCI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'W124MB05', nama: 'W124MBCI Bogor Chapter', region: 'Regional Jawa Barat', kota: 'Bogor', tipe: 'CHAPTER' },
  { kode: 'W124MB06', nama: 'W124MBCI Cirebon Chapter', region: 'Regional Jawa Barat', kota: 'Cirebon', tipe: 'CHAPTER' },
  { kode: 'MBW140CI', nama: 'MBW140CI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MBW20202', nama: 'MBW202CI Bandung Region', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MBW203CI', nama: 'MBW203CI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MBW20301', nama: 'MBW203CI Bogor Chapter', region: 'Regional Jawa Barat', kota: 'Bogor', tipe: 'CHAPTER' },
  { kode: 'MBW20402', nama: 'MBW204CI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MBW20403', nama: 'MBW204CI Bekasi Chapter', region: 'Regional Jawa Barat', kota: 'Bekasi', tipe: 'CHAPTER' },
  { kode: 'MBW210CI', nama: 'MBW210CI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MBW21101', nama: 'MBW211CI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MBW21102', nama: 'MBW211CI Bekasi Chapter', region: 'Regional Jawa Barat', kota: 'Bekasi', tipe: 'CHAPTER' },
  { kode: 'MBW21103', nama: 'MBW211CI Bogor Chapter', region: 'Regional Jawa Barat', kota: 'Bogor', tipe: 'CHAPTER' },
  { kode: 'MBW212CI', nama: 'MBW212CI Bandung Chapter', region: 'Regional Jawa Barat', kota: 'Bandung', tipe: 'CHAPTER' },
  { kode: 'MTCINACI', nama: 'MTC-Ina Cirebon Chapter', region: 'Regional Jawa Barat', kota: 'Cirebon', tipe: 'CHAPTER' },

  // ── Regional Jawa Tengah ──────────────────────────────────────
  { kode: 'MBCTEGAL', nama: 'MBC Tegal Raya', region: 'Regional Jawa Tengah', kota: 'Tegal', tipe: 'CLUB' },
  { kode: 'MBCPEKAL', nama: 'MBC Pekalongan', region: 'Regional Jawa Tengah', kota: 'Pekalongan', tipe: 'CLUB' },
  { kode: 'MBCBANYU', nama: 'MBC Banyumas', region: 'Regional Jawa Tengah', kota: 'Banyumas', tipe: 'CLUB' },
  { kode: 'MBCCILAC', nama: 'MBC Cilacap', region: 'Regional Jawa Tengah', kota: 'Cilacap', tipe: 'CLUB' },
  { kode: 'MBCSEMAR', nama: 'MBC Semarang', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CLUB' },
  { kode: 'MBCSOLOR', nama: 'MBC Solo Raya', region: 'Regional Jawa Tengah', kota: 'Solo', tipe: 'CLUB' },
  { kode: 'MBCJEPAR', nama: 'MBC Jepara', region: 'Regional Jawa Tengah', kota: 'Jepara', tipe: 'CLUB' },
  { kode: 'W124MB07', nama: 'W124MBCI Banyumas Chapter', region: 'Regional Jawa Tengah', kota: 'Banyumas', tipe: 'CHAPTER' },
  { kode: 'W124MB08', nama: 'W124MBCI Semarang Chapter', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },
  { kode: 'W124MB09', nama: 'W124MBCI Solo Chapter', region: 'Regional Jawa Tengah', kota: 'Solo', tipe: 'CHAPTER' },
  { kode: 'MTCINASE', nama: 'MTC Ina Semarang Chapter', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },
  { kode: 'MBW20203', nama: 'MBW202CI Distrik PKL PML', region: 'Regional Jawa Tengah', kota: 'Pekalongan', tipe: 'CHAPTER' },
  { kode: 'MBW20204', nama: 'MBW202CI Distrik Solo', region: 'Regional Jawa Tengah', kota: 'Solo', tipe: 'CHAPTER' },
  { kode: 'MBW20205', nama: 'MBW202CI Semarang Region', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },
  { kode: 'MBW20302', nama: 'MBW203CI Semarang Chapter', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },
  { kode: 'MBW21001', nama: 'MBW210CI Semarang Chapter', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },
  { kode: 'MBW21002', nama: 'MBW210CI Solo Chapter', region: 'Regional Jawa Tengah', kota: 'Solo', tipe: 'CHAPTER' },
  { kode: 'MBW21104', nama: 'MBW211CI Semarang Chapter', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },
  { kode: 'MCCISEMA', nama: 'MCCI Semarang Chapter', region: 'Regional Jawa Tengah', kota: 'Semarang', tipe: 'CHAPTER' },

  // ── Regional Yogyakarta ───────────────────────────────────────
  { kode: 'MBCYOGYA', nama: 'MBC Yogyakarta', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CLUB' },
  { kode: 'MCCIYOGY', nama: 'MCCI Yogyakarta Chapter', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CHAPTER' },
  { kode: 'MTCINAYO', nama: 'MTC Ina Yogyakarta Chapter', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CHAPTER' },
  { kode: 'MBW20206', nama: 'MBW202CI Yogyakarta Region', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CHAPTER' },
  { kode: 'W124MB10', nama: 'W124MBCI Yogyakarta Chapter', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CHAPTER' },
  { kode: 'MBW21003', nama: 'MBW210CI Yogyakarta Chapter', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CHAPTER' },
  { kode: 'MBW21105', nama: 'MBW211CI Yogyakarta Chapter', region: 'Regional Yogyakarta', kota: 'Yogyakarta', tipe: 'CHAPTER' },

  // ── Regional Jawa Timur & Bali ────────────────────────────────
  { kode: 'MBCMADIU', nama: 'MBC Madiun', region: 'Regional Jawa Timur & Bali', kota: 'Madiun', tipe: 'CLUB' },
  { kode: 'MBCMADUR', nama: 'MBC Madura', region: 'Regional Jawa Timur & Bali', kota: 'Madura', tipe: 'CLUB' },
  { kode: 'MBCMALAN', nama: 'MBC Malang', region: 'Regional Jawa Timur & Bali', kota: 'Malang', tipe: 'CLUB' },
  { kode: 'MBCTULUN', nama: 'MBC Tulung Agung', region: 'Regional Jawa Timur & Bali', kota: 'Tulung Agung', tipe: 'CLUB' },
  { kode: 'MBCJEMBE', nama: 'MBC Jember', region: 'Regional Jawa Timur & Bali', kota: 'Jember', tipe: 'CLUB' },
  { kode: 'MBCBALI', nama: 'MBC Bali', region: 'Regional Jawa Timur & Bali', kota: 'Bali', tipe: 'CLUB' },
  { kode: 'MTCINASU', nama: 'MTC Ina Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'MTCINAMA', nama: 'MTC Ina Malang Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Malang', tipe: 'CHAPTER' },
  { kode: 'MJISURAB', nama: 'MJI Surabaya', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CLUB' },
  { kode: 'MCCISURA', nama: 'MCCI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'MBW20207', nama: 'MBW202CI Surabaya Region', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'MBW20208', nama: 'MBW202CI Malang District', region: 'Regional Jawa Timur & Bali', kota: 'Malang', tipe: 'CHAPTER' },
  { kode: 'MBW20303', nama: 'MBW203CI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'MBW20404', nama: 'MBW204CI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'W124MB11', nama: 'W124MBCI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'W124MB12', nama: 'W124MBCI Malang Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Malang', tipe: 'CHAPTER' },
  { kode: 'MBW21004', nama: 'MBW210CI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'MBW21106', nama: 'MBW211CI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },
  { kode: 'MBW21201', nama: 'MBW212CI Surabaya Chapter', region: 'Regional Jawa Timur & Bali', kota: 'Surabaya', tipe: 'CHAPTER' },

  // ── Regional Kalimantan & Sulawesi ───────────────────────────
  { kode: 'MBCBANJA', nama: 'MBC Banjarmasin', region: 'Regional Kalimantan & Sulawesi', kota: 'Banjarmasin', tipe: 'CLUB' },
  { kode: 'MBCMAKAS', nama: 'MBC Makassar', region: 'Regional Kalimantan & Sulawesi', kota: 'Makassar', tipe: 'CLUB' },
];

export const REGIONS = Array.from(new Set(CLUB_CHAPTERS.map((c) => c.region)));
