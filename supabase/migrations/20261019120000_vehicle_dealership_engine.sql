-- ══════════════════════════════════════════
-- DEALERSHIP ENGINE — compraventa de vehículos (motos, carros, camionetas…)
-- Inventory keyed by plate, purchase/sale tracking, reconditioning costs,
-- physical-document location, stock aging and markdown history.
-- ══════════════════════════════════════════

-- New business type
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_type_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_type_check CHECK (type IN (
    'restaurant', 'fast_food', 'supermarket', 'barbershop', 'tattoo', 'bar', 'hotel', 'hostel',
    'cafe', 'gym', 'laundry', 'clothing', 'veterinary', 'logistics', 'hardware_store',
    'vehicle_dealer', 'custom'
));

-- Markdown policy per business (when to start lowering prices, how fast, minimum margin)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS dealer_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    vehicle_type VARCHAR NOT NULL DEFAULT 'moto' CHECK (vehicle_type IN ('moto', 'carro', 'camioneta', 'otro')),
    plate VARCHAR(12) NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    year INTEGER CHECK (year IS NULL OR year BETWEEN 1950 AND 2100),
    color TEXT,
    mileage_km INTEGER CHECK (mileage_km IS NULL OR mileage_km >= 0),
    displacement_cc INTEGER CHECK (displacement_cc IS NULL OR displacement_cc > 0),
    vin TEXT,
    engine_number TEXT,
    status VARCHAR NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'withdrawn')),
    published BOOLEAN NOT NULL DEFAULT true,

    -- Purchase (compra)
    acquired_on DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_price NUMERIC NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    seller_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    purchase_notes TEXT,

    -- Asking price (venta)
    list_price NUMERIC CHECK (list_price IS NULL OR list_price >= 0),
    min_price NUMERIC CHECK (min_price IS NULL OR min_price >= 0),

    -- Physical paperwork: where the folder is and what is in it
    doc_location TEXT,
    documents JSONB NOT NULL DEFAULT '{}'::jsonb,

    photos TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,

    -- Sale
    sold_on DATE,
    sold_price NUMERIC CHECK (sold_price IS NULL OR sold_price >= 0),
    buyer_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    sale_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- The plate identifies the vehicle inside a business; a vehicle that comes back
-- (sold, then bought again) reuses its row instead of duplicating.
CREATE UNIQUE INDEX uq_vehicles_business_plate ON public.vehicles(business_id, plate);
CREATE INDEX idx_vehicles_business_status ON public.vehicles(business_id, status, acquired_on);

-- Money spent on a vehicle after buying it (repairs, paperwork, cleaning, tow…)
CREATE TABLE public.vehicle_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    concept TEXT NOT NULL,
    category VARCHAR NOT NULL DEFAULT 'repair' CHECK (category IN ('repair', 'paperwork', 'cleaning', 'transport', 'other')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vehicle_costs_vehicle ON public.vehicle_costs(vehicle_id);
CREATE INDEX idx_vehicle_costs_business ON public.vehicle_costs(business_id, spent_on DESC);

-- Every change of the asking price (rebajas), with the reason
CREATE TABLE public.vehicle_price_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    old_price NUMERIC,
    new_price NUMERIC NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vehicle_price_changes_vehicle ON public.vehicle_price_changes(vehicle_id, created_at DESC);

-- ── RLS (role-aware from day one) ───────────────────────
-- read: any active member · write: owner/admin/manager/cashier/employee · delete: owner/admin/manager
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vehicles" ON public.vehicles
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert vehicles" ON public.vehicles
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Operators can update vehicles" ON public.vehicles
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can delete vehicles" ON public.vehicles
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vehicle costs" ON public.vehicle_costs
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert vehicle costs" ON public.vehicle_costs
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can modify vehicle costs" ON public.vehicle_costs
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager']));
CREATE POLICY "Managers can delete vehicle costs" ON public.vehicle_costs
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

ALTER TABLE public.vehicle_price_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view vehicle price changes" ON public.vehicle_price_changes
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert vehicle price changes" ON public.vehicle_price_changes
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
