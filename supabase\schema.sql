-- ============================================================
-- MB Club Indonesia — Supabase Database Schema
-- Jalankan di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ──────────────────────────────────────────────────────────────
CREATE TYPE member_status AS ENUM ('active', 'pending', 'suspended', 'inactive');
CREATE TYPE member_role   AS ENUM ('member', 'admin', 'super_admin', 'chapter_admin');
CREATE TYPE event_type    AS ENUM ('nasional', 'chapter', 'online');
CREATE TYPE event_status  AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE forum_category AS ENUM (
  'teknis_restorasi', 'pasaran_mobil', 'nongkrong_santai', 'pengumuman', 'koperasi'
);
CREATE TYPE transaction_type   AS ENUM ('simpanan', 'pinjaman', 'cicilan', 'dagang');
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE product_category AS ENUM ('merchandise', 'spare_parts', 'aksesoris');

-- ── TABLE: profiles ────────────────────────────────────────────────────
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  address      TEXT,
  city         TEXT,
  province     TEXT,
  role         member_role NOT NULL DEFAULT 'member',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── TABLE: members ─────────────────────────────────────────────────────
CREATE TABLE members (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_number       TEXT NOT NULL UNIQUE,
  status              member_status NOT NULL DEFAULT 'pending',
  chapter             TEXT,
  join_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date         DATE,
  -- Vehicle Data
  car_brand           TEXT NOT NULL DEFAULT 'Mercedes-Benz',
  car_model           TEXT NOT NULL,
  car_year            INTEGER NOT NULL,
  car_color           TEXT,
  car_plate           TEXT NOT NULL,
  vin                 TEXT,
  -- Documents
  ktp_url             TEXT,
  payment_proof_url   TEXT,
  -- Approval
  is_approved         BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by         UUID REFERENCES profiles(id),
  approved_at         TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_members_profile_id ON members(profile_id);
CREATE INDEX idx_members_status     ON members(status);
CREATE INDEX idx_members_chapter    ON members(chapter);

-- ── TABLE: events ──────────────────────────────────────────────────────
CREATE TABLE events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  description       TEXT,
  type              event_type NOT NULL DEFAULT 'chapter',
  status            event_status NOT NULL DEFAULT 'upcoming',
  chapter           TEXT,
  location          TEXT NOT NULL,
  location_url      TEXT,
  start_date        TIMESTAMPTZ NOT NULL,
  end_date          TIMESTAMPTZ NOT NULL,
  thumbnail_url     TEXT,
  max_participants  INTEGER,
  rsvp_deadline     DATE,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_events_status     ON events(status);
CREATE INDEX idx_events_type       ON events(type);
CREATE INDEX idx_events_start_date ON events(start_date);

-- ── TABLE: event_rsvps ─────────────────────────────────────────────────
CREATE TABLE event_rsvps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  UNIQUE(event_id, sponsor_id)
);

CREATE INDEX idx_rsvps_event_id  ON event_rsvps(event_id);
CREATE INDEX idx_rsvps_sponsor_id ON event_rsvps(sponsor_id);

-- ── TABLE: gallery ─────────────────────────────────────────────────────
CREATE TABLE gallery (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID REFERENCES events(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  media_url     TEXT NOT NULL,
  media_type    media_type NOT NULL DEFAULT 'image',
  thumbnail_url TEXT,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_event_id    ON gallery(event_id);
CREATE INDEX idx_gallery_media_type  ON gallery(media_type);
CREATE INDEX idx_gallery_created_at  ON gallery(created_at DESC);

-- ── TABLE: forum_threads ───────────────────────────────────────────────
CREATE TABLE forum_threads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category     forum_category NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  author_id    UUID NOT NULL REFERENCES profiles(id),
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count  INTEGER NOT NULL DEFAULT 0,
  view_count   INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER forum_threads_updated_at BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_threads_category ON forum_threads(category);
CREATE INDEX idx_threads_pinned   ON forum_threads(is_pinned DESC, last_reply_at DESC);

-- ── TABLE: forum_replies ───────────────────────────────────────────────
CREATE TABLE forum_replies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_solution BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-increment reply_count on thread
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_threads
  SET reply_count = reply_count + 1, last_reply_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reply_insert AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION increment_reply_count();

CREATE INDEX idx_replies_thread_id ON forum_replies(thread_id);
CREATE INDEX idx_replies_author_id ON forum_replies(author_id);

-- ── TABLE: sponsors ────────────────────────────────────────────────────
CREATE TABLE sponsors (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     TEXT NOT NULL,
  logo_url                 TEXT,
  description              TEXT,
  category                 TEXT NOT NULL,
  website_url              TEXT,
  discount_info            TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,

  -- Identitas KTA Sponsor Resmi MB INA
  sponsor_id                TEXT UNIQUE,                    -- Format: MBINA-SPN-2026-XXX
  pic_name                 TEXT,                           -- Nama Person In Charge
  pic_phone                TEXT,                           -- No. WhatsApp PIC

  -- Kredensial Login ke Mobile App
  login_email              TEXT UNIQUE,                    -- Email login sponsor
  login_password           TEXT DEFAULT 'spn@20252027',   -- Password login

  -- Periode Kerjasama
  contract_start           DATE,                          -- Tanggal mulai kerjasama
  contract_end             DATE,                          -- Tanggal berakhir kerjasama
  duration_months          INTEGER NOT NULL DEFAULT 3,    -- Durasi awal dalam bulan

  -- Fasilitas Lapak & Forum
  lapak_id                 TEXT,                          -- Kode lapak: LPK-SPN-2026-XXX
  has_forum_access         BOOLEAN NOT NULL DEFAULT TRUE,
  forum_access_expires_at  TIMESTAMPTZ,

  -- Pengajuan Perpanjangan (pending sebelum disetujui Admin)
  -- Struktur: { months, fee, payment_proof_url, notes, requested_at }
  pending_renewal          JSONB,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsors_active       ON sponsors(is_active);
CREATE INDEX idx_sponsors_sponsor_id    ON sponsors(sponsor_id);
CREATE INDEX idx_sponsors_login_email  ON sponsors(login_email);
CREATE INDEX idx_sponsors_contract_end ON sponsors(contract_end);

-- ── TABLE: products ────────────────────────────────────────────────────
CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  category     product_category NOT NULL,
  price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url    TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sku          TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_products_category    ON products(category);
CREATE INDEX idx_products_available   ON products(is_available);

-- ── TABLE: koperasi_transactions ──────────────────────────────────────
CREATE TABLE koperasi_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id        UUID NOT NULL REFERENCES profiles(id),
  type             transaction_type NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status           transaction_status NOT NULL DEFAULT 'pending',
  description      TEXT,
  reference_number TEXT NOT NULL UNIQUE DEFAULT 'KOP-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT,
  due_date         DATE,
  processed_by     UUID REFERENCES profiles(id),
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER koperasi_tx_updated_at BEFORE UPDATE ON koperasi_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_koperasi_tx_sponsor_id ON koperasi_transactions(sponsor_id);
CREATE INDEX idx_koperasi_tx_status    ON koperasi_transactions(status);

-- ── TABLE: koperasi_balances ───────────────────────────────────────────
CREATE TABLE koperasi_balances (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id           UUID NOT NULL UNIQUE REFERENCES profiles(id),
  simpanan_pokok      NUMERIC(12,2) NOT NULL DEFAULT 0,
  simpanan_wajib      NUMERIC(12,2) NOT NULL DEFAULT 0,
  simpanan_sukarela   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_balance       NUMERIC(12,2) GENERATED ALWAYS AS (simpanan_pokok + simpanan_wajib + simpanan_sukarela) STORED,
  active_loan         NUMERIC(12,2) DEFAULT 0,
  loan_remaining      NUMERIC(12,2) DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE members               ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery               ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE koperasi_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE koperasi_balances     ENABLE ROW LEVEL SECURITY;

-- Helper function untuk cek admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'chapter_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── POLICIES: profiles ─────────────────────────────────────────────────
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert on profiles"
  ON profiles FOR INSERT WITH CHECK (TRUE);

-- ── POLICIES: members ──────────────────────────────────────────────────
CREATE POLICY "Members can view all members"
  ON members FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own membership"
  ON members FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can update any member"
  ON members FOR UPDATE USING (is_admin() OR profile_id = auth.uid());

-- ── POLICIES: events ───────────────────────────────────────────────────
CREATE POLICY "Anyone can view upcoming events"
  ON events FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert events"
  ON events FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update events"
  ON events FOR UPDATE USING (is_admin());

-- ── POLICIES: event_rsvps ──────────────────────────────────────────────
CREATE POLICY "Users can view rsvps"
  ON event_rsvps FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own rsvp"
  ON event_rsvps FOR INSERT WITH CHECK (sponsor_id = auth.uid());

CREATE POLICY "Users can update own rsvp"
  ON event_rsvps FOR UPDATE USING (sponsor_id = auth.uid());

-- ── POLICIES: gallery ──────────────────────────────────────────────────
CREATE POLICY "Anyone can view gallery"
  ON gallery FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can upload"
  ON gallery FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── POLICIES: forum_threads ────────────────────────────────────────────
CREATE POLICY "Anyone can view threads"
  ON forum_threads FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create threads"
  ON forum_threads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

CREATE POLICY "Authors and admins can update threads"
  ON forum_threads FOR UPDATE USING (author_id = auth.uid() OR is_admin());

-- ── POLICIES: forum_replies ────────────────────────────────────────────
CREATE POLICY "Anyone can view replies"
  ON forum_replies FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can reply"
  ON forum_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

CREATE POLICY "Authors can update own reply"
  ON forum_replies FOR UPDATE USING (author_id = auth.uid());

-- ── POLICIES: sponsors & products (public read) ────────────────────────
CREATE POLICY "Anyone can view sponsors"
  ON sponsors FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage sponsors"
  ON sponsors FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view products"
  ON products FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL USING (is_admin());

-- ── POLICIES: koperasi (members only) ─────────────────────────────────
CREATE POLICY "Members can view own transactions"
  ON koperasi_transactions FOR SELECT USING (sponsor_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage transactions"
  ON koperasi_transactions FOR ALL USING (is_admin());

CREATE POLICY "Members can view own balance"
  ON koperasi_balances FOR SELECT USING (sponsor_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage balances"
  ON koperasi_balances FOR ALL USING (is_admin());

-- ── TRIGGER: Auto-create profile on auth signup ────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── SAMPLE DATA ────────────────────────────────────────────────────────
-- Insert sample events
INSERT INTO events (title, description, type, status, chapter, location, location_url, start_date, end_date, created_by)
SELECT
  'MBCI Gathering Nasional 2024',
  'Pertemuan tahunan seluruh anggota Mercedes-Benz Club Indonesia dari 24 chapter se-nusantara. Agenda: Rapat kerja, pameran kendaraan, dan gala dinner.',
  'nasional',
  'upcoming',
  NULL,
  'Hotel Mulia Senayan, Jakarta',
  'https://maps.google.com/?q=Hotel+Mulia+Senayan+Jakarta',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '31 days',
  id
FROM profiles LIMIT 1;

INSERT INTO events (title, description, type, status, chapter, location, location_url, start_date, end_date, max_participants, created_by)
SELECT
  'Touring Puncak — Chapter Jakarta',
  'Touring bersama menyusuri jalur Puncak Bogor. Kumpul pukul 06.00 WIB di Rest Area KM 19.',
  'chapter',
  'upcoming',
  'Jakarta',
  'Rest Area KM 19 Tol Jagorawi',
  'https://maps.google.com/?q=Rest+Area+KM+19+Jagorawi',
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '14 days' + INTERVAL '8 hours',
  50,
  id
FROM profiles LIMIT 1;

-- Insert sample sponsors
INSERT INTO sponsors (name, description, category, discount_info, is_active) VALUES
  ('Auto2000', 'Dealer resmi Toyota dengan layanan service premium', 'Bengkel', 'Diskon 15% untuk anggota MBCI', TRUE),
  ('Asuransi Adira', 'Asuransi kendaraan bermotor terpercaya', 'Asuransi', 'Premi khusus member, hemat hingga 20%', TRUE),
  ('Brabus Parts Indonesia', 'Distributor resmi aksesoris & modifikasi Mercedes-Benz', 'Aksesoris', 'Harga distributor untuk member aktif', TRUE),
  ('Hotel Shangri-La Jakarta', 'Hotel bintang 5 di pusat kota Jakarta', 'Hotel', 'Diskon 25% best available rate', TRUE),
  ('Mister Detailing', 'Salon mobil premium coating & detailing', 'Bengkel', 'Gratis coating wax untuk member', TRUE);

-- Insert sample products
INSERT INTO products (name, description, category, price, stock, is_available) VALUES
  ('Polo Shirt MBCI Premium', 'Polo shirt bahan pique premium dengan bordir logo MBCI. Tersedia ukuran S-XXL.', 'merchandise', 285000, 150, TRUE),
  ('Topi Snapback MBCI', 'Topi snapback hitam dengan logo Mercedes-Benz Club Indonesia bordir emas.', 'merchandise', 175000, 80, TRUE),
  ('Stiker Set MBCI Official', 'Set 5 stiker premium waterproof logo MBCI berbagai ukuran.', 'merchandise', 65000, 500, TRUE),
  ('Jaket Bomber MBCI', 'Jaket bomber eksklusif dengan patch MBCI dan liner premium. Edisi terbatas.', 'merchandise', 850000, 30, TRUE),
  ('Filter Oli MB Original W205', 'Filter oli original Mercedes-Benz untuk seri W205 C-Class. Kompatibel: C200/C250.', 'spare_parts', 425000, 25, TRUE),
  ('Emblem Kap Mesin AMG', 'Emblem kap mesin AMG chrome original. Kompatibel dengan semua seri AMG.', 'aksesoris', 680000, 15, TRUE);

-- Insert sample forum threads
INSERT INTO forum_threads (category, title, content, author_id) 
SELECT 
  'teknis_restorasi',
  'Rekomendasi bengkel spesialis MB di Jakarta Selatan?',
  'Halo rekan-rekan, ada yang bisa rekomendasikan bengkel spesialis Mercedes-Benz di area Jakarta Selatan? Lebih prefer yang sudah berpengalaman dengan W205. Terima kasih.',
  id
FROM profiles LIMIT 1;

INSERT INTO forum_threads (category, title, content, author_id, is_pinned)
SELECT 
  'pengumuman',
  '[PENGUMUMAN] Tata Cara Pendaftaran Anggota Baru 2024',
  'Selamat datang calon anggota baru MBCI! Berikut adalah tata cara pendaftaran keanggotaan tahun 2024. Syarat: 1) Pemilik kendaraan Mercedes-Benz aktif, 2) WNI/WNA berdomisili di Indonesia, 3) Melampirkan STNK dan KTP. Proses verifikasi 3-7 hari kerja.',
  id,
  TRUE
FROM profiles LIMIT 1;

COMMENT ON TABLE profiles IS 'Profil pengguna aplikasi MBCI';
COMMENT ON TABLE members IS 'Data keanggotaan MBCI';
COMMENT ON TABLE events IS 'Event dan agenda klub';
COMMENT ON TABLE koperasi_transactions IS 'Transaksi koperasi MBCI';
