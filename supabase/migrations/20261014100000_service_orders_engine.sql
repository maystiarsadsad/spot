-- ══════════════════════════════════════════
-- SERVICE ORDERS ENGINE — laundries and couriers (requests with a status
-- pipeline, pickup/drop-off points and live courier tracking)
-- ══════════════════════════════════════════
-- Each service order has a `transactions` row (so it shows in cash and
-- reports when paid) and, when a courier is assigned, a `deliveries` row:
-- the existing courier link and live map are reused as-is.

CREATE TABLE public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    code VARCHAR(12) NOT NULL,
    kind VARCHAR NOT NULL CHECK (kind IN ('laundry', 'shipment')),
    status VARCHAR NOT NULL DEFAULT 'requested',
    source VARCHAR NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'desk')),

    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,

    -- Where we pick up (shipments, laundry pickup) and where we deliver
    pickup_address TEXT,
    pickup_lat DOUBLE PRECISION CHECK (pickup_lat BETWEEN -90 AND 90),
    pickup_lng DOUBLE PRECISION CHECK (pickup_lng BETWEEN -180 AND 180),
    dropoff_address TEXT,
    dropoff_lat DOUBLE PRECISION CHECK (dropoff_lat BETWEEN -90 AND 90),
    dropoff_lng DOUBLE PRECISION CHECK (dropoff_lng BETWEEN -180 AND 180),
    recipient_name TEXT,
    recipient_phone TEXT,
    distance_km NUMERIC,

    -- Shipments
    package_size VARCHAR CHECK (package_size IS NULL OR package_size IN ('small', 'medium', 'large')),
    package_description TEXT,
    declared_value NUMERIC,

    -- Laundry: customer brings it or we pick it up; returns at the store or delivered
    handoff VARCHAR CHECK (handoff IS NULL OR handoff IN ('store', 'pickup')),
    return_mode VARCHAR CHECK (return_mode IS NULL OR return_mode IN ('store', 'delivery')),
    weight_kg NUMERIC CHECK (weight_kg IS NULL OR weight_kg >= 0),

    -- Priced lines [{itemId, name, quantity, unitPrice, total}]
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
    payment_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    payment_method VARCHAR,

    scheduled_for TIMESTAMPTZ,
    promised_at TIMESTAMPTZ,
    tracking_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
    received_by TEXT,
    notes TEXT,
    internal_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_service_orders_business ON public.service_orders(business_id, status, created_at DESC);
CREATE INDEX idx_service_orders_transaction ON public.service_orders(transaction_id);
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view service orders" ON public.service_orders
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage service orders" ON public.service_orders
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Customer-facing timeline
CREATE TABLE public.service_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_service_order_events_order ON public.service_order_events(order_id, created_at);
ALTER TABLE public.service_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view service order events" ON public.service_order_events
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Members can manage service order events" ON public.service_order_events
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- Prices per km, package sizes, laundry turnaround… (see src/lib/service-orders/flow.ts)
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS service_settings JSONB NOT NULL DEFAULT '{}';

-- The courier drives the order: starting the route or delivering through the
-- courier link moves the service order forward and logs it on the timeline.
CREATE OR REPLACE FUNCTION public.sync_service_order_with_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.service_orders;
    v_status TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NULL;
    END IF;
    SELECT * INTO v_order FROM public.service_orders WHERE transaction_id = NEW.transaction_id LIMIT 1;
    IF v_order.id IS NULL OR v_order.status IN ('delivered', 'cancelled') THEN
        RETURN NULL;
    END IF;

    IF NEW.status = 'on_the_way' THEN
        v_status := CASE WHEN v_order.kind = 'shipment' THEN 'in_transit' ELSE 'out_for_delivery' END;
    ELSIF NEW.status = 'delivered' THEN
        v_status := 'delivered';
    ELSE
        RETURN NULL;
    END IF;

    UPDATE public.service_orders
       SET status = v_status,
           completed_at = CASE WHEN v_status = 'delivered' THEN now() ELSE completed_at END,
           updated_at = now()
     WHERE id = v_order.id;
    INSERT INTO public.service_order_events (business_id, order_id, status, note)
    VALUES (v_order.business_id, v_order.id, v_status,
            CASE WHEN v_status = 'delivered' THEN 'Entregado por ' || coalesce(NEW.courier_name, 'el mensajero')
                 ELSE coalesce(NEW.courier_name, 'El mensajero') || ' va en camino' END);
    RETURN NULL;
END;
$$;

CREATE TRIGGER deliveries_sync_service_order
    AFTER UPDATE OF status ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.sync_service_order_with_delivery();
