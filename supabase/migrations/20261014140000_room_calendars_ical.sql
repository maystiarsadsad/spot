-- ══════════════════════════════════════════
-- iCAL CHANNEL SYNC — Airbnb / Booking.com calendars per room
-- ══════════════════════════════════════════
-- Import: each room can follow external calendar URLs; their reservations
-- become stays (source 'ota', channel = airbnb|booking|other) so availability,
-- the tape chart and the no-overlap constraint treat them like any booking.
-- Export: each room publishes /api/ical/<ical_token> with its occupied nights.

ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS ical_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');
UPDATE public.rooms SET ical_token = replace(gen_random_uuid()::text, '-', '') WHERE ical_token IS NULL;
ALTER TABLE public.rooms ALTER COLUMN ical_token SET NOT NULL;

CREATE TABLE public.room_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    channel VARCHAR NOT NULL DEFAULT 'other' CHECK (channel IN ('airbnb', 'booking', 'other')),
    url TEXT NOT NULL CHECK (url ~* '^https://'),
    active BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (room_id, url)
);
CREATE INDEX idx_room_calendars_business ON public.room_calendars(business_id);
ALTER TABLE public.room_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view room calendars" ON public.room_calendars
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage room calendars" ON public.room_calendars
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

ALTER TABLE public.stays
    ADD COLUMN IF NOT EXISTS channel VARCHAR CHECK (channel IS NULL OR channel IN ('airbnb', 'booking', 'other')),
    ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES public.room_calendars(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS external_uid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stays_calendar_uid ON public.stays(calendar_id, external_uid) WHERE calendar_id IS NOT NULL;
