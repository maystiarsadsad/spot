-- ══════════════════════════════════════════
-- APPOINTMENTS ENGINE — barbershop, tattoo, veterinary, studios…
-- Professionals with weekly schedules, the services each one performs,
-- time off, and appointments that can never overlap per professional.
-- ══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- Professionals = employees that take appointments.
-- employees.schedule (already existing, unused) holds the weekly hours:
--   {"mon":[{"start":"09:00","end":"13:00"},{"start":"14:00","end":"19:00"}], "tue":[…], …}
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS bookable BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS bio TEXT;

-- Which services (catalog items) each professional performs
CREATE TABLE public.employee_services (
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    catalog_item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    PRIMARY KEY (employee_id, catalog_item_id)
);
CREATE INDEX idx_employee_services_business ON public.employee_services(business_id);
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view employee services" ON public.employee_services
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage employee services" ON public.employee_services
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Vacations, sick days, blocked hours
CREATE TABLE public.staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (ends_at > starts_at)
);
CREATE INDEX idx_staff_time_off_lookup ON public.staff_time_off(business_id, employee_id, starts_at);
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view time off" ON public.staff_time_off
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage time off" ON public.staff_time_off
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Appointments reuse public.reservations
ALTER TABLE public.reservations
    ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS price NUMERIC,
    ADD COLUMN IF NOT EXISTS source VARCHAR NOT NULL DEFAULT 'dashboard' CHECK (source IN ('web', 'dashboard')),
    ADD COLUMN IF NOT EXISTS manage_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE INDEX IF NOT EXISTS idx_reservations_business_time ON public.reservations(business_id, reservation_time);

-- A professional can't have two active appointments at the same time — enforced
-- by the database, so two customers booking the same slot at once can't both win.
ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
        employee_id WITH =,
        tstzrange(reservation_time, end_time, '[)') WITH &&
    )
    WHERE (employee_id IS NOT NULL AND end_time IS NOT NULL AND status IN ('pending', 'confirmed'));

-- Booking rules per business (slot step, notice, horizon, buffer, auto-confirm, cancel window)
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS booking_settings JSONB NOT NULL DEFAULT '{}';
