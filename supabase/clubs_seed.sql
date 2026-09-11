-- ============================================================
-- TABLE: clubs (104 Master Clubs & Chapters MBCI)
-- Mercedes-Benz Club Indonesia
-- ============================================================

CREATE TABLE IF NOT EXISTS clubs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  region      TEXT NOT NULL,
  kota        TEXT NOT NULL,
  tipe        TEXT NOT NULL CHECK (tipe IN ('CLUB', 'CHAPTER')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast filtering & searching
CREATE INDEX IF NOT EXISTS idx_clubs_kode   ON clubs(kode);
CREATE INDEX IF NOT EXISTS idx_clubs_region ON clubs(region);
CREATE INDEX IF NOT EXISTS idx_clubs_tipe   ON clubs(tipe);

-- Enable Row Level Security
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Everyone (authenticated and anon) can view the clubs directory
DROP POLICY IF EXISTS "Allow public read on clubs" ON clubs;
CREATE POLICY "Allow public read on clubs"
  ON clubs FOR SELECT
  USING (TRUE);

-- Only admins can insert/update/delete clubs
DROP POLICY IF EXISTS "Allow admin write on clubs" ON clubs;
CREATE POLICY "Allow admin write on clubs"
  ON clubs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Seed 104 Clubs & Chapters
INSERT INTO clubs (kode, nama, region, kota, tipe) VALUES
  -- Regional Sumatra
  ('MBCACEH', 'MBC Aceh', 'Regional Sumatra', 'Aceh', 'CLUB'),
  ('MTCINABI', 'MTC Ina Bireuen Chapter', 'Regional Sumatra', 'Bireuen', 'CHAPTER'),
  ('MBCLANGS', 'MBC Langsa', 'Regional Sumatra', 'Langsa', 'CLUB'),
  ('MBCMEDAN', 'MBC Medan', 'Regional Sumatra', 'Medan', 'CLUB'),
  ('W124MBCI', 'W124MBCI Medan Chapter', 'Regional Sumatra', 'Medan', 'CHAPTER'),
  ('MBW202CI', 'MBW202CI Medan Region', 'Regional Sumatra', 'Medan', 'CHAPTER'),
  ('MTCINAME', 'MTC Ina Medan Chapter', 'Regional Sumatra', 'Medan', 'CHAPTER'),
  ('MCCIMEDA', 'MCCI Medan Chapter', 'Regional Sumatra', 'Medan', 'CHAPTER'),
  ('MBW204CI', 'MBW204CI Medan Chapter', 'Regional Sumatra', 'Medan', 'CHAPTER'),
  ('MBCPADAN', 'MBC Padang', 'Regional Sumatra', 'Padang', 'CLUB'),
  ('MTCINAPA', 'MTC Ina Padang Chapter', 'Regional Sumatra', 'Padang', 'CHAPTER'),
  ('MBCPEKAN', 'MBC Pekanbaru', 'Regional Sumatra', 'Pekanbaru', 'CLUB'),
  ('MTCINAPE', 'MTC Ina Pekanbaru Chapter', 'Regional Sumatra', 'Pekanbaru', 'CHAPTER'),
  ('MBCPALEM', 'MBC Palembang', 'Regional Sumatra', 'Palembang', 'CLUB'),
  ('MBCLAMPU', 'MBC Lampung', 'Regional Sumatra', 'Lampung', 'CLUB'),
  ('W124MB01', 'W124MBCI Lampung Chapter', 'Regional Sumatra', 'Lampung', 'CHAPTER'),

  -- Regional Banten
  ('MBCBANTE', 'MBC Banten', 'Regional Banten', 'Banten', 'CLUB'),
  ('MBCTANGE', 'MBC Tangerang Raya', 'Regional Banten', 'Tangerang', 'CLUB'),
  ('MBW211CI', 'MBW211CI Tangerang Chapter', 'Regional Banten', 'Tangerang', 'CHAPTER'),
  ('MBW20401', 'MBW204CI Tangerang Chapter', 'Regional Banten', 'Tangerang', 'CHAPTER'),

  -- Regional Metro DKI Jakarta
  ('MCCI', 'MCCI', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MTCINA', 'MTC Ina', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MJI', 'MJI', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('W124MB02', 'W124 MBCI', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW140CL', 'MBW140 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBVITOVI', 'MBVitoViano Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBSLCLUB', 'MBSL Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBDIECAS', 'MBDiecast Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBMLCLUB', 'MBML Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW201CL', 'MBW201 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW202CL', 'MBW202 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW203CL', 'MBW203 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW204CL', 'MBW204 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW205CO', 'MBW205 Community Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW210CL', 'MBW210 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW211CL', 'MBW211 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW212CL', 'MBW212 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW213CO', 'MBW213 Community Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('MBW221CL', 'MBW221 Club Indonesia', 'Regional Metro DKI Jakarta', 'Jakarta', 'CLUB'),
  ('W124MB03', 'W124MBCI Jakarta Chapter', 'Regional Metro DKI Jakarta', 'Jakarta', 'CHAPTER'),
  ('MBW20201', 'MBW202CI Jakarta Region', 'Regional Metro DKI Jakarta', 'Jakarta', 'CHAPTER'),

  -- Regional Jawa Barat
  ('MBCBANDU', 'MBC Bandung', 'Regional Jawa Barat', 'Bandung', 'CLUB'),
  ('BMUC', 'BMUC', 'Regional Jawa Barat', 'Bogor', 'CLUB'),
  ('MBCSUKAB', 'MBC Sukabumi', 'Regional Jawa Barat', 'Sukabumi', 'CLUB'),
  ('MBCSUMED', 'MBC Sumedang', 'Regional Jawa Barat', 'Sumedang', 'CLUB'),
  ('MBCCIREB', 'MBC Cirebon', 'Regional Jawa Barat', 'Cirebon', 'CLUB'),
  ('MBW123CL', 'MBW123 Club Bandung Ina', 'Regional Jawa Barat', 'Bandung', 'CLUB'),
  ('MCCIBAND', 'MCCI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('W124MB04', 'W124MBCI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('W124MB05', 'W124MBCI Bogor Chapter', 'Regional Jawa Barat', 'Bogor', 'CHAPTER'),
  ('W124MB06', 'W124MBCI Cirebon Chapter', 'Regional Jawa Barat', 'Cirebon', 'CHAPTER'),
  ('MBW140CI', 'MBW140CI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MBW20202', 'MBW202CI Bandung Region', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MBW203CI', 'MBW203CI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MBW20301', 'MBW203CI Bogor Chapter', 'Regional Jawa Barat', 'Bogor', 'CHAPTER'),
  ('MBW20402', 'MBW204CI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MBW20403', 'MBW204CI Bekasi Chapter', 'Regional Jawa Barat', 'Bekasi', 'CHAPTER'),
  ('MBW210CI', 'MBW210CI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MBW21101', 'MBW211CI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MBW21102', 'MBW211CI Bekasi Chapter', 'Regional Jawa Barat', 'Bekasi', 'CHAPTER'),
  ('MBW21103', 'MBW211CI Bogor Chapter', 'Regional Jawa Barat', 'Bogor', 'CHAPTER'),
  ('MBW212CI', 'MBW212CI Bandung Chapter', 'Regional Jawa Barat', 'Bandung', 'CHAPTER'),
  ('MTCINACI', 'MTC-Ina Cirebon Chapter', 'Regional Jawa Barat', 'Cirebon', 'CHAPTER'),

  -- Regional Jawa Tengah
  ('MBCTEGAL', 'MBC Tegal Raya', 'Regional Jawa Tengah', 'Tegal', 'CLUB'),
  ('MBCPEKAL', 'MBC Pekalongan', 'Regional Jawa Tengah', 'Pekalongan', 'CLUB'),
  ('MBCBANYU', 'MBC Banyumas', 'Regional Jawa Tengah', 'Banyumas', 'CLUB'),
  ('MBCCILAC', 'MBC Cilacap', 'Regional Jawa Tengah', 'Cilacap', 'CLUB'),
  ('MBCSEMAR', 'MBC Semarang', 'Regional Jawa Tengah', 'Semarang', 'CLUB'),
  ('MBCSOLOR', 'MBC Solo Raya', 'Regional Jawa Tengah', 'Solo', 'CLUB'),
  ('MBCJEPAR', 'MBC Jepara', 'Regional Jawa Tengah', 'Jepara', 'CLUB'),
  ('W124MB07', 'W124MBCI Banyumas Chapter', 'Regional Jawa Tengah', 'Banyumas', 'CHAPTER'),
  ('W124MB08', 'W124MBCI Semarang Chapter', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),
  ('W124MB09', 'W124MBCI Solo Chapter', 'Regional Jawa Tengah', 'Solo', 'CHAPTER'),
  ('MTCINASE', 'MTC Ina Semarang Chapter', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),
  ('MBW20203', 'MBW202CI Distrik PKL PML', 'Regional Jawa Tengah', 'Pekalongan', 'CHAPTER'),
  ('MBW20204', 'MBW202CI Distrik Solo', 'Regional Jawa Tengah', 'Solo', 'CHAPTER'),
  ('MBW20205', 'MBW202CI Semarang Region', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),
  ('MBW20302', 'MBW203CI Semarang Chapter', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),
  ('MBW21001', 'MBW210CI Semarang Chapter', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),
  ('MBW21002', 'MBW210CI Solo Chapter', 'Regional Jawa Tengah', 'Solo', 'CHAPTER'),
  ('MBW21104', 'MBW211CI Semarang Chapter', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),
  ('MCCISEMA', 'MCCI Semarang Chapter', 'Regional Jawa Tengah', 'Semarang', 'CHAPTER'),

  -- Regional Yogyakarta
  ('MBCYOGYA', 'MBC Yogyakarta', 'Regional Yogyakarta', 'Yogyakarta', 'CLUB'),
  ('MCCIYOGY', 'MCCI Yogyakarta Chapter', 'Regional Yogyakarta', 'Yogyakarta', 'CHAPTER'),
  ('MTCINAYO', 'MTC Ina Yogyakarta Chapter', 'Regional Yogyakarta', 'Yogyakarta', 'CHAPTER'),
  ('MBW20206', 'MBW202CI Yogyakarta Region', 'Regional Yogyakarta', 'Yogyakarta', 'CHAPTER'),
  ('W124MB10', 'W124MBCI Yogyakarta Chapter', 'Regional Yogyakarta', 'Yogyakarta', 'CHAPTER'),
  ('MBW21003', 'MBW210CI Yogyakarta Chapter', 'Regional Yogyakarta', 'Yogyakarta', 'CHAPTER'),
  ('MBW21105', 'MBW211CI Yogyakarta Chapter', 'Regional Yogyakarta', 'Yogyakarta', 'CHAPTER'),

  -- Regional Jawa Timur & Bali
  ('MBCMADIU', 'MBC Madiun', 'Regional Jawa Timur & Bali', 'Madiun', 'CLUB'),
  ('MBCMADUR', 'MBC Madura', 'Regional Jawa Timur & Bali', 'Madura', 'CLUB'),
  ('MBCMALAN', 'MBC Malang', 'Regional Jawa Timur & Bali', 'Malang', 'CLUB'),
  ('MBCTULUN', 'MBC Tulung Agung', 'Regional Jawa Timur & Bali', 'Tulung Agung', 'CLUB'),
  ('MBCJEMBE', 'MBC Jember', 'Regional Jawa Timur & Bali', 'Jember', 'CLUB'),
  ('MBCBALI', 'MBC Bali', 'Regional Jawa Timur & Bali', 'Bali', 'CLUB'),
  ('MTCINASU', 'MTC Ina Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('MTCINAMA', 'MTC Ina Malang Chapter', 'Regional Jawa Timur & Bali', 'Malang', 'CHAPTER'),
  ('MJISURAB', 'MJI Surabaya', 'Regional Jawa Timur & Bali', 'Surabaya', 'CLUB'),
  ('MCCISURA', 'MCCI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('MBW20207', 'MBW202CI Surabaya Region', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('MBW20208', 'MBW202CI Malang District', 'Regional Jawa Timur & Bali', 'Malang', 'CHAPTER'),
  ('MBW20303', 'MBW203CI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('MBW20404', 'MBW204CI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('W124MB11', 'W124MBCI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('W124MB12', 'W124MBCI Malang Chapter', 'Regional Jawa Timur & Bali', 'Malang', 'CHAPTER'),
  ('MBW21004', 'MBW210CI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('MBW21106', 'MBW211CI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),
  ('MBW21201', 'MBW212CI Surabaya Chapter', 'Regional Jawa Timur & Bali', 'Surabaya', 'CHAPTER'),

  -- Regional Kalimantan & Sulawesi
  ('MBCBANJA', 'MBC Banjarmasin', 'Regional Kalimantan & Sulawesi', 'Banjarmasin', 'CLUB'),
  ('MBCMAKAS', 'MBC Makassar', 'Regional Kalimantan & Sulawesi', 'Makassar', 'CLUB')
ON CONFLICT (kode) DO UPDATE SET
  nama = EXCLUDED.nama,
  region = EXCLUDED.region,
  kota = EXCLUDED.kota,
  tipe = EXCLUDED.tipe,
  updated_at = NOW();
