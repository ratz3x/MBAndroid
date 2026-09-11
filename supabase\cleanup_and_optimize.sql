-- ============================================================
-- Mercedes-Benz Club Indonesia
-- Pembersihan Tabel Members & Pengaktifan Skema Approval Mandiri
-- ============================================================

-- ------------------------------------------------------------
-- LANGKAH 1: RAPIHKAN ISI TABEL (HAPUS DATA DUPLIKAT / SAMPAH)
-- ------------------------------------------------------------
-- Jika satu akun mendaftar berkali-kali (seperti Derist Touriano 000001-000005),
-- hapus data sampah lama dan HANYA simpan 1 data pendaftaran yang paling baru:
DELETE FROM public.members
WHERE id NOT IN (
    SELECT DISTINCT ON (profile_id) id
    FROM public.members
    ORDER BY profile_id, created_at DESC
);

-- Tambahkan aturan agar 1 akun HANYA bisa memiliki 1 data anggota (Cegah Duplikasi)
ALTER TABLE public.members
DROP CONSTRAINT IF EXISTS unique_member_profile;

ALTER TABLE public.members
ADD CONSTRAINT unique_member_profile UNIQUE (profile_id);


-- ------------------------------------------------------------
-- LANGKAH 2: HAPUS KOLOM KOSONG / TIDAK TERPAKAI
-- ------------------------------------------------------------
-- Kolom-kolom berikut tidak digunakan lagi setelah penyederhanaan form (1 langkah)
ALTER TABLE public.members DROP COLUMN IF EXISTS payment_proof_url;
ALTER TABLE public.members DROP COLUMN IF EXISTS car_color;
ALTER TABLE public.members DROP COLUMN IF EXISTS vin;
ALTER TABLE public.members DROP COLUMN IF EXISTS expiry_date;


-- ------------------------------------------------------------
-- LANGKAH 3: ATURAN KOLOM member_number (NULLABLE)
-- ------------------------------------------------------------
-- Hapus nilai default jika ada
ALTER TABLE public.members 
ALTER COLUMN member_number DROP DEFAULT;

-- Pastikan kolom boleh NULL untuk pendaftar berstatus pending
ALTER TABLE public.members 
ALTER COLUMN member_number DROP NOT NULL;

-- Kosongkan nomor anggota untuk data yang statusnya belum di-approve
UPDATE public.members 
SET member_number = NULL 
WHERE status != 'active' OR is_approved = FALSE;


-- ------------------------------------------------------------
-- LANGKAH 4: SEQUENCE KHUSUS APPROVAL & RESET KE 1
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS member_number_seq START 1;

-- Reset sequence kembali ke angka 1 agar rapi
ALTER SEQUENCE member_number_seq RESTART WITH 1;


-- ------------------------------------------------------------
-- LANGKAH 5: FUNGSI APPROVAL RESMI (RPC)
-- ------------------------------------------------------------
-- Dipanggil otomatis saat Admin menekan tombol "Setujui & Terbitkan KTA"
-- Format Nomor Resmi: MBINA-[KODE_PROVINSI]-[TAHUN]-[6_DIGIT_URUT]
CREATE OR REPLACE FUNCTION approve_member_registration(target_member_id UUID)
RETURNS VOID AS $$
DECLARE
    next_num INT;
    formatted_seq TEXT;
    prov_code TEXT := 'JKT';
    reg_year TEXT := TO_CHAR(NOW(), 'YYYY');
    member_rec RECORD;
    final_number TEXT;
BEGIN
    -- 1. Ambil data member dan provinsinya
    SELECT m.*, p.province 
    INTO member_rec
    FROM public.members m
    LEFT JOIN public.profiles p ON p.id = m.profile_id
    WHERE m.id = target_member_id;

    -- 2. Ambil kode provinsi 3 huruf (misal: JAM untuk Jambi, JBR untuk Jawa Barat)
    IF member_rec.province IS NOT NULL THEN
        SELECT kode INTO prov_code
        FROM public.provinces
        WHERE LOWER(nama) = LOWER(member_rec.province)
           OR LOWER(kode) = LOWER(member_rec.province)
        LIMIT 1;

        IF prov_code IS NULL THEN
            prov_code := 'JKT';
        END IF;
    END IF;

    -- 3. Ambil nomor urut berikutnya HANYA saat verifikasi disetujui
    next_num := nextval('member_number_seq');
    
    -- 4. Format 6 digit: 000001
    formatted_seq := LPAD(next_num::TEXT, 6, '0');

    -- 5. Susun format nomor KTA resmi
    final_number := 'MBINA-' || prov_code || '-' || reg_year || '-' || formatted_seq;

    -- 6. Update status pendaftaran menjadi aktif dan simpan nomor resmi
    UPDATE public.members
    SET 
        status = 'active',
        is_approved = TRUE,
        member_number = final_number,
        approved_at = NOW(),
        approved_by = auth.uid()
    WHERE id = target_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
