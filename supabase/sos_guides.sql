-- ============================================================
-- Mercedes-Benz Club Indonesia — SOS Guides Table Migration
-- Tabel: public.sos_guides (Roadside Quick Guide)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sos_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Umum', -- 'Mesin' | 'Elektrikal' | 'Transmisi' | 'Suspensi / Ban' | 'Umum'
    icon TEXT DEFAULT 'help-buoy-outline',
    content TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_sos_guides_category ON public.sos_guides(category);
CREATE INDEX IF NOT EXISTS idx_sos_guides_sort_order ON public.sos_guides(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_sos_guides_is_active ON public.sos_guides(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sos_guides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to sos_guides" ON public.sos_guides;
DROP POLICY IF EXISTS "Allow authenticated admin manage sos_guides" ON public.sos_guides;

-- Policies
CREATE POLICY "Allow public read access to sos_guides"
    ON public.sos_guides FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Allow authenticated admin manage sos_guides"
    ON public.sos_guides FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- Data Awal Resmi (Seed Data: Panduan Darurat Mercedes-Benz)
INSERT INTO public.sos_guides (title, category, icon, content, sort_order, is_active)
VALUES
(
    'Mesin Overheat (Suhu Tinggi)',
    'Mesin',
    'flame-outline',
    '1. Segera nyalakan lampu hazard dan menepi ke tempat aman.
2. JANGAN langsung membuka tutup reservoir/radiator saat mendidih (bahaya semburan uap panas bertekanan tinggi).
3. Biarkan mesin mendingin minimal 30 menit dengan kap mesin terbuka.
4. Cek level coolant dan kebocoran selang radiator setelah mesin benar-benar dingin.',
    1,
    TRUE
),
(
    'Jumper Aki Mercy (Battery Jump Start)',
    'Elektrikal',
    'battery-charging-outline',
    '1. Gunakan terminal jumper khusus (kutub merah bertutup geser) di ruang mesin, jangan langsung cabut aki utama di bagasi/bawah jok.
2. Pastikan mobil penolong dalam kondisi mesin mati saat kabel dipasang untuk melindungi modul SAM & ECU sensitif.
3. Hubungkan Positif (+) ke Positif (+), lalu Negatif (-) ke tiang baut ground bodi mobil.
4. Hidupkan mobil penolong, diamkan 5 menit, baru start mobil Mercedes-Benz Anda.',
    2,
    TRUE
),
(
    'Transmisi Terkunci di Posisi P saat Mogok',
    'Transmisi',
    'key-outline',
    '1. Jika aki drop atau sistem elektrikal mati, tuas transmisi otomatis Mercy tidak bisa digeser ke posisi N.
2. Buka penutup konsol/kulit tuas transmisi dan tekan tombol darurat manual (Shift Lock Override) menggunakan obeng/kunci.
3. Geser tuas ke posisi N agar mobil bisa didorong atau dinaikkan ke atas towing flatdeck tanpa merusak girboks.',
    3,
    TRUE
),
(
    'Suspensi Udara (Airmatic) Ambles / Malfunction',
    'Suspensi / Ban',
    'speedometer-outline',
    '1. Jika muncul notifikasi "Airmatic Stop, Car Too Low", hentikan mobil di permukaan rata.
2. Jangan paksakan berkendara dengan kecepatan tinggi karena dapat merusak balon suspensi dan fender ban.
3. Matikan mesin 3 menit, hidupkan kembali untuk merestart kompresor suspensi.
4. Jika tetap ambles, wajib gunakan derek flatdeck rebah hidrolik penuh (jangan derek gantung).',
    4,
    TRUE
),
(
    'Kunci Smartkey / Keyless Tidak Terdeteksi',
    'Elektrikal',
    'hardware-chip-outline',
    '1. Tarik anak kunci manual fisik dari sisi remote smartkey untuk membuka pintu supir secara mekanikal.
2. Letakkan remote kunci tepat di slot darurat (di dalam konsol tengah atau di bawah tombol Engine Start/Stop).
3. Injak pedal rem dan tekan tombol start untuk menghidupkan mesin meskipun baterai remote habis.',
    5,
    TRUE
),
(
    'Ban Bocor / Prosedur Dongkrak & Baut Roda Mercy',
    'Suspensi / Ban',
    'disc-outline',
    '1. Pastikan mobil di permukaan rata, aktifkan rem parkir (Electronic Parking Brake), dan pasang segitiga pengaman 30 meter di belakang mobil.
2. Wajib gunakan titik tumpu dongkrak resmi (Jack Pad karet khusus Mercy) di bawah side skirt agar bodi tidak penyok.
3. Kendorkan baut roda setengah putaran saat ban masih menempel tanah.
4. Pasang ban cadangan space saver atau gunakan tire sealant kit + kompresor mini 12V bawaan Mercedes-Benz di bawah lantai bagasi.',
    6,
    TRUE
),
(
    'Indikator Check Engine Menyala Kuning',
    'Mesin',
    'alert-circle-outline',
    '1. Jika lampu Check Engine menyala diam (kuning solid) dan tidak ada getaran mesin hebat, mobil masih dapat dikemudikan dengan kecepatan rendah (di bawah 60 km/jam) menuju bengkel terdekat.
2. Jika lampu Check Engine berkedip (flashing) atau mesin pincang (misfire), segera menepi dan matikan mesin untuk mencegah kerusakan katalis knalpot (Catalytic Converter) dan koil.
3. Hubungi bengkel spesialis untuk pembacaan kode error menggunakan scanner Xentry / Star Diagnosis.',
    7,
    TRUE
),
(
    'Rem Parkir Elektronik (EPB) Macet / Tidak Rilis',
    'Elektrikal',
    'hand-left-outline',
    '1. Jika tombol rem parkir elektrik tidak mau rilis karena voltase aki drop, coba hidupkan mesin atau hubungkan jumper kabel untuk menyuplai daya ke modul EPB.
2. Injak pedal rem dengan kuat, lalu tekan dan tahan tuas rem parkir ke bawah selama 5 detik.
3. Pada beberapa model, buka penutup roda cadangan di bagasi dan gunakan kabel rilis darurat manual (Emergency Brake Release Tool) berwarna merah untuk melepaskan kaliper secara mekanis.',
    8,
    TRUE
),
(
    'Transmisi Masuk Mode Pincang (Limp Home Mode)',
    'Transmisi',
    'hardware-chip-outline',
    '1. Transmisi terkunci di gigi 2 atau 3 dan tidak mau oper gigi adalah sistem proteksi (Limp Mode) untuk melindungi girboks dari kerusakan fatal.
2. Menepi ke tempat aman, pindahkan tuas ke P, matikan mesin, dan cabut kunci kontak.
3. Tunggu sekitar 2-3 menit hingga seluruh modul komputer (TCU & ECU) memasuki mode sleep.
4. Hidupkan kembali mesin. Jika Limp Mode hilang sementara, segera kemudikan santai ke bengkel spesialis.',
    9,
    TRUE
),
(
    'Penanganan Terobos Banjir / Genangan Air Tinggi',
    'Mesin',
    'water-outline',
    '1. Mercy memiliki posisi intake udara mesin yang relatif rendah di balik grill depan. Jangan memaksakan melintasi genangan air melebihi setengah velg roda.
2. Jika mesin tiba-tiba mati saat menerjang banjir, JANGAN PERNAH MENCOBA START ULANG (bahaya Water Hammer yang membengkokkan setang piston).
3. Pindahkan transmisi ke N (gunakan shift lock release jika perlu), dorong mobil ke tempat tinggi atau segera panggil towing flatdeck.',
    10,
    TRUE
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.sos_guides IS 'Direktori artikel panduan penanganan darurat teknis Mercedes-Benz';
