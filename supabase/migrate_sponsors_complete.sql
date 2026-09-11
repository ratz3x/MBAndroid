-- ============================================================
-- MIGRATION: Lengkapi Tabel sponsors untuk MB Club Indonesia
-- Jalankan di: Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS sponsor_id              TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pic_name                TEXT,
  ADD COLUMN IF NOT EXISTS pic_phone               TEXT,
  ADD COLUMN IF NOT EXISTS login_email             TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS login_password          TEXT DEFAULT 'spn@20252027',
  ADD COLUMN IF NOT EXISTS contract_start          DATE,
  ADD COLUMN IF NOT EXISTS contract_end            DATE,
  ADD COLUMN IF NOT EXISTS duration_months         INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS lapak_id                TEXT,
  ADD COLUMN IF NOT EXISTS has_forum_access        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS forum_access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_renewal         JSONB,
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE sponsors
SET sponsor_id = 'MBINA-SPN-2026-' || LPAD(rn::TEXT, 3, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM sponsors WHERE sponsor_id IS NULL
) sub
WHERE sponsors.id = sub.id;

UPDATE sponsors
SET
  contract_start          = CURRENT_DATE,
  contract_end            = CURRENT_DATE + INTERVAL '3 months',
  forum_access_expires_at = (CURRENT_DATE + INTERVAL '3 months')::TIMESTAMPTZ
WHERE contract_start IS NULL;

CREATE INDEX IF NOT EXISTS idx_sponsors_sponsor_id   ON sponsors(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_login_email  ON sponsors(login_email);
CREATE INDEX IF NOT EXISTS idx_sponsors_contract_end ON sponsors(contract_end);

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sponsors'
ORDER BY ordinal_position;
