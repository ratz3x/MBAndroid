-- ============================================================
-- Mercedes-Benz Club Indonesia
-- Migration: Member Number Nullable & Approval-Triggered Sequence
-- ============================================================

-- 1. Ubah Kolom member_number Menjadi Boleh Kosong (Nullable)
-- Hapus nilai default / sequence otomatis jika sebelumnya menempel
ALTER TABLE public.members 
ALTER COLUMN member_number DROP DEFAULT;

-- Pastikan kolom boleh NULL untuk pendaftar berstatus pending
ALTER TABLE public.members 
ALTER COLUMN member_number DROP NOT NULL;

-- Kosongkan nomor anggota untuk data yang statusnya belum di-approve (pending/inactive)
UPDATE public.members 
SET member_number = NULL 
WHERE status != 'active' OR is_approved = FALSE;

-- 2. Buat Sequence Khusus yang Hanya Bergerak Saat Approval
CREATE SEQUENCE IF NOT EXISTS member_number_seq START 1;

-- 3. Fungsi verifikasi admin (RPC)
-- Menghasilkan nomor registrasi resmi saat disahkan oleh admin:
-- Format: MBINA-[KODE_PROVINSI]-[TAHUN]-[6_DIGIT_URUT]
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
    -- Ambil data member dan provinsinya
    SELECT m.*, p.province 
    INTO member_rec
    FROM public.members m
    LEFT JOIN public.profiles p ON p.id = m.profile_id
    WHERE m.id = target_member_id;

    -- Cari kode provinsi dari tabel provinces jika tersedia
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

    -- Ambil nomor urut berikutnya HANYA saat verifikasi berhasil disetujui admin
    next_num := nextval('member_number_seq');
    
    -- Format 6 digit: 000001
    formatted_seq := LPAD(next_num::TEXT, 6, '0');

    -- Format nomor anggota resmi: MBINA-[KODE_PROVINSI]-[TAHUN]-[6_DIGIT_URUT]
    final_number := 'MBINA-' || prov_code || '-' || reg_year || '-' || formatted_seq;

    -- Update status menjadi active, masukkan member_number, dan tandai approval
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

-- 4. Reset Urutan Nomor ke 1 (Jika Masih Tahap Testing)
-- ALTER SEQUENCE member_number_seq RESTART WITH 1;
