-- ============================================================
-- Mercedes-Benz Club Indonesia — SOS Rescue Table Migration
-- Tabel: public.sos_alerts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    full_name TEXT,
    member_number TEXT,
    chapter TEXT,
    car_model TEXT,
    car_plate TEXT,
    phone TEXT,
    emergency_type TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_notes TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'resolved' | 'cancelled'
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_profile_id ON public.sos_alerts(profile_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated to insert sos_alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow authenticated to view sos_alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow authenticated to update sos_alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow anon to insert sos_alerts" ON public.sos_alerts;

-- Policies
CREATE POLICY "Allow authenticated to insert sos_alerts"
    ON public.sos_alerts FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Allow authenticated to view sos_alerts"
    ON public.sos_alerts FOR SELECT
    USING (TRUE);

CREATE POLICY "Allow authenticated to update sos_alerts"
    ON public.sos_alerts FOR UPDATE
    USING (TRUE);

COMMENT ON TABLE public.sos_alerts IS 'Log riwayat panggilan darurat & roadside rescue MBCI';
