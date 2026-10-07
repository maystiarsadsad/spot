-- ══════════════════════════════════════════
-- MEMBERSHIPS ENGINE — gyms (plans, members, renewals, check-ins, classes)
-- ══════════════════════════════════════════

-- Plans are catalog items of type 'membership' with a duration and,
-- for punch cards ("tiqueteras"), a number of sessions.
ALTER TABLE public.catalog_items
    ADD COLUMN IF NOT EXISTS membership_days INTEGER CHECK (membership_days IS NULL OR membership_days BETWEEN 1 AND 3660),
    ADD COLUMN IF NOT EXISTS membership_sessions INTEGER CHECK (membership_sessions IS NULL OR membership_sessions BETWEEN 1 AND 1000);

-- Members are contacts: a short code for the front desk and a private link
ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS member_code VARCHAR(8),
    ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_member_code ON public.contacts(business_id, member_code) WHERE member_code IS NOT NULL;

-- One row per purchased period (renewals create a new row → full history)
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled')),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    sessions_total INTEGER CHECK (sessions_total IS NULL OR sessions_total > 0),
    sessions_used INTEGER NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
    price NUMERIC,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    source VARCHAR NOT NULL DEFAULT 'desk' CHECK (source IN ('desk', 'web')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (ends_on >= starts_on)
);
CREATE INDEX idx_memberships_business_end ON public.memberships(business_id, ends_on);
CREATE INDEX idx_memberships_contact ON public.memberships(contact_id, ends_on DESC);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view memberships" ON public.memberships
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage memberships" ON public.memberships
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Attendance
CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT
);
CREATE INDEX idx_check_ins_business_time ON public.check_ins(business_id, checked_at DESC);
CREATE INDEX idx_check_ins_contact ON public.check_ins(contact_id, checked_at DESC);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view check ins" ON public.check_ins
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage check ins" ON public.check_ins
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Weekly class timetable (weekday: 1 = Monday … 7 = Sunday)
CREATE TABLE public.gym_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    instructor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 10 AND 480),
    capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity BETWEEN 1 AND 500),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_gym_classes_business ON public.gym_classes(business_id, weekday, start_time);
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view gym classes" ON public.gym_classes
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage gym classes" ON public.gym_classes
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE TABLE public.class_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.gym_classes(id) ON DELETE CASCADE,
    class_date DATE NOT NULL,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'cancelled', 'no_show')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (class_id, class_date, contact_id)
);
CREATE INDEX idx_class_bookings_lookup ON public.class_bookings(business_id, class_date);
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view class bookings" ON public.class_bookings
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage class bookings" ON public.class_bookings
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Books a spot without ever exceeding capacity: the class row is locked while
-- counting, so concurrent bookings are serialized. Returns 'ok' | 'full' |
-- 'duplicate' | 'invalid'. Service role only (called from server actions).
CREATE OR REPLACE FUNCTION public.book_class_spot(p_business_id UUID, p_class_id UUID, p_date DATE, p_contact_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_capacity INTEGER;
    v_taken INTEGER;
    v_existing TEXT;
BEGIN
    SELECT capacity INTO v_capacity
      FROM public.gym_classes
     WHERE id = p_class_id AND business_id = p_business_id AND active
     FOR UPDATE;
    IF v_capacity IS NULL THEN
        RETURN 'invalid';
    END IF;

    SELECT status INTO v_existing FROM public.class_bookings
     WHERE class_id = p_class_id AND class_date = p_date AND contact_id = p_contact_id;
    IF v_existing IN ('booked', 'attended') THEN
        RETURN 'duplicate';
    END IF;

    SELECT count(*) INTO v_taken FROM public.class_bookings
     WHERE class_id = p_class_id AND class_date = p_date AND status IN ('booked', 'attended');
    IF v_taken >= v_capacity THEN
        RETURN 'full';
    END IF;

    INSERT INTO public.class_bookings (business_id, class_id, class_date, contact_id, status)
    VALUES (p_business_id, p_class_id, p_date, p_contact_id, 'booked')
    ON CONFLICT (class_id, class_date, contact_id) DO UPDATE SET status = 'booked', created_at = now();
    RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.book_class_spot(UUID, UUID, DATE, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_class_spot(UUID, UUID, DATE, UUID) TO service_role;
