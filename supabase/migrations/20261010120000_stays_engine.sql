-- ══════════════════════════════════════════
-- STAYS ENGINE — hotels and hostels (rooms, bookings by night, folio, rates)
-- ══════════════════════════════════════════
-- Room types are catalog items of type 'room' (price = base rate per night,
-- capacity = max guests). Physical units (room 201, dorm bed 3…) live in `rooms`.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor TEXT,
    housekeeping VARCHAR NOT NULL DEFAULT 'clean' CHECK (housekeeping IN ('clean', 'dirty', 'inspected', 'maintenance')),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (business_id, name)
);
CREATE INDEX idx_rooms_business_type ON public.rooms(business_id, item_id);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view rooms" ON public.rooms
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage rooms" ON public.rooms
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- One row per room per booking. Several rooms booked together share manage_token.
-- Nights are [check_in, check_out): the guest leaves on check_out.
CREATE TABLE public.stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    code VARCHAR(12) NOT NULL,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    guest_email TEXT,
    guest_document TEXT,
    guest_nationality TEXT,
    adults SMALLINT NOT NULL DEFAULT 1 CHECK (adults BETWEEN 1 AND 30),
    children SMALLINT NOT NULL DEFAULT 0 CHECK (children BETWEEN 0 AND 30),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    arrival_time TEXT,
    status VARCHAR NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
    nightly JSONB NOT NULL DEFAULT '[]',
    room_total NUMERIC NOT NULL DEFAULT 0 CHECK (room_total >= 0),
    source VARCHAR NOT NULL DEFAULT 'desk' CHECK (source IN ('web', 'desk', 'phone', 'ota')),
    manage_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
    notes TEXT,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (check_out > check_in),
    CHECK (check_out - check_in <= 120),
    -- A room can never hold two live bookings on the same night
    CONSTRAINT stays_no_overlap EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out) WITH &&
    ) WHERE (room_id IS NOT NULL AND status IN ('pending', 'confirmed', 'checked_in'))
);
CREATE INDEX idx_stays_business_dates ON public.stays(business_id, check_in, check_out);
CREATE INDEX idx_stays_token ON public.stays(manage_token);
CREATE INDEX idx_stays_contact ON public.stays(contact_id);
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view stays" ON public.stays
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage stays" ON public.stays
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Folio: extras charged to the room (minibar, spa, laundry…)
CREATE TABLE public.stay_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 999),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stay_charges_stay ON public.stay_charges(stay_id);
ALTER TABLE public.stay_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view stay charges" ON public.stay_charges
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage stay charges" ON public.stay_charges
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Folio: payments (deposits, balance at check-out); each one is also a cash transaction
CREATE TABLE public.stay_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    method VARCHAR NOT NULL CHECK (method IN ('cash', 'card', 'transfer')),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stay_payments_stay ON public.stay_payments(stay_id);
ALTER TABLE public.stay_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view stay payments" ON public.stay_payments
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage stay payments" ON public.stay_payments
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Seasonal rates: % over the base price for nights in [starts_on, ends_on]
-- (item_id NULL = every room type), optionally with a minimum stay.
CREATE TABLE public.rate_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    adjustment_pct INTEGER NOT NULL DEFAULT 0 CHECK (adjustment_pct BETWEEN -90 AND 300),
    min_nights SMALLINT CHECK (min_nights IS NULL OR min_nights BETWEEN 1 AND 30),
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (ends_on >= starts_on)
);
CREATE INDEX idx_rate_seasons_business ON public.rate_seasons(business_id, starts_on);
ALTER TABLE public.rate_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view rate seasons" ON public.rate_seasons
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage rate seasons" ON public.rate_seasons
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Check-in/out times, weekend %, min nights, booking window, cancellation, deposit
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS stay_settings JSONB NOT NULL DEFAULT '{}';

-- Books p_count rooms of a type for [p_check_in, p_check_out), picking free
-- rooms while the room type row is locked (concurrent web bookings are
-- serialized; the exclusion constraint is the final guard).
-- p_stay holds the guest/price fields. Returns the manage token, or 'full'.
CREATE OR REPLACE FUNCTION public.book_stay_rooms(
    p_business_id UUID, p_item_id UUID, p_check_in DATE, p_check_out DATE, p_count INTEGER, p_stay JSONB
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rooms UUID[];
    v_token TEXT := replace(gen_random_uuid()::text, '-', '');
    v_room UUID;
BEGIN
    IF p_count < 1 OR p_count > 10 OR p_check_out <= p_check_in THEN
        RETURN 'invalid';
    END IF;

    PERFORM 1 FROM public.catalog_items
     WHERE id = p_item_id AND business_id = p_business_id AND type = 'room'
     FOR UPDATE;
    IF NOT FOUND THEN
        RETURN 'invalid';
    END IF;

    SELECT array_agg(r.id ORDER BY r.sort_order, r.name) INTO v_rooms
      FROM (
        SELECT r.id, r.sort_order, r.name
          FROM public.rooms r
         WHERE r.business_id = p_business_id AND r.item_id = p_item_id AND r.active
           AND r.housekeeping <> 'maintenance'
           AND NOT EXISTS (
               SELECT 1 FROM public.stays s
                WHERE s.room_id = r.id
                  AND s.status IN ('pending', 'confirmed', 'checked_in')
                  AND daterange(s.check_in, s.check_out) && daterange(p_check_in, p_check_out)
           )
         ORDER BY r.sort_order, r.name
         LIMIT p_count
      ) r;

    IF coalesce(array_length(v_rooms, 1), 0) < p_count THEN
        RETURN 'full';
    END IF;

    FOREACH v_room IN ARRAY v_rooms LOOP
        INSERT INTO public.stays (
            business_id, code, item_id, room_id, contact_id, guest_name, guest_phone, guest_email,
            guest_document, guest_nationality, adults, children, check_in, check_out, arrival_time,
            status, nightly, room_total, source, manage_token, notes
        ) VALUES (
            p_business_id, p_stay->>'code', p_item_id, v_room, nullif(p_stay->>'contact_id', '')::uuid,
            p_stay->>'guest_name', p_stay->>'guest_phone', p_stay->>'guest_email',
            p_stay->>'guest_document', p_stay->>'guest_nationality',
            coalesce((p_stay->>'adults')::smallint, 1), coalesce((p_stay->>'children')::smallint, 0),
            p_check_in, p_check_out, p_stay->>'arrival_time',
            coalesce(p_stay->>'status', 'confirmed'), coalesce(p_stay->'nightly', '[]'::jsonb),
            coalesce((p_stay->>'room_total')::numeric, 0), coalesce(p_stay->>'source', 'web'),
            v_token, p_stay->>'notes'
        );
    END LOOP;
    RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.book_stay_rooms(UUID, UUID, DATE, DATE, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_stay_rooms(UUID, UUID, DATE, DATE, INTEGER, JSONB) TO service_role;
