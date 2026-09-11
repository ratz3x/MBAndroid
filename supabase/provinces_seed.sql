-- ============================================================
-- TABLE: provinces (38 Provinsi Republik Indonesia)
-- Mercedes-Benz Club Indonesia
-- ============================================================

CREATE TABLE IF NOT EXISTS provinces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast search & lookup
CREATE INDEX IF NOT EXISTS idx_provinces_kode ON provinces(kode);
CREATE INDEX IF NOT EXISTS idx_provinces_nama ON provinces(nama);

-- Enable Row Level Security
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;

-- Everyone can read provinces
DROP POLICY IF EXISTS "Allow public read on provinces" ON provinces;
CREATE POLICY "Allow public read on provinces"
  ON provinces FOR SELECT
  USING (TRUE);

-- Only admins can manage provinces
DROP POLICY IF EXISTS "Allow admin write on provinces" ON provinces;
CREATE POLICY "Allow admin write on provinces"
  ON provinces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Seed 38 Provinsi
INSERT INTO provinces (kode, nama) VALUES
  ('ACE', 'Aceh'),
  ('SMU', 'Sumatera Utara'),
  ('SMB', 'Sumatera Barat'),
  ('RIA', 'Riau'),
  ('JAM', 'Jambi'),
  ('SMS', 'Sumatera Selatan'),
  ('BEN', 'Bengkulu'),
  ('LAM', 'Lampung'),
  ('BAB', 'Kepulauan Bangka Belitung'),
  ('KEP', 'Kepulauan Riau'),
  ('JKT', 'DKI Jakarta'),
  ('JBR', 'Jawa Barat'),
  ('JTG', 'Jawa Tengah'),
  ('DIY', 'D.I. Yogyakarta'),
  ('JTM', 'Jawa Timur'),
  ('BTN', 'Banten'),
  ('BAL', 'Bali'),
  ('NTB', 'Nusa Tenggara Barat'),
  ('NTT', 'Nusa Tenggara Timur'),
  ('KLB', 'Kalimantan Barat'),
  ('KLT', 'Kalimantan Tengah'),
  ('KLS', 'Kalimantan Selatan'),
  ('KIM', 'Kalimantan Timur'),
  ('KLU', 'Kalimantan Utara'),
  ('SLU', 'Sulawesi Utara'),
  ('SLT', 'Sulawesi Tengah'),
  ('SLG', 'Sulawesi Tenggara'),
  ('SLS', 'Sulawesi Selatan'),
  ('GOR', 'Gorontalo'),
  ('SLB', 'Sulawesi Barat'),
  ('MAL', 'Maluku'),
  ('MLU', 'Maluku Utara'),
  ('PAP', 'Papua'),
  ('PAB', 'Papua Barat'),
  ('PAS', 'Papua Selatan'),
  ('PAT', 'Papua Tengah'),
  ('PPG', 'Papua Pegunungan'),
  ('PBD', 'Papua Barat Daya')
ON CONFLICT (kode) DO UPDATE SET
  nama = EXCLUDED.nama,
  updated_at = NOW();
