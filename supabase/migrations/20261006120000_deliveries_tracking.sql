-- ══════════════════════════════════════════
-- DELIVERIES — live tracking for home delivery orders
-- ══════════════════════════════════════════
-- Customer and courier never authenticate: each delivery carries two
-- unguessable tokens (tracking_token for the customer, courier_token for the
-- courier). Anonymous access happens ONLY through the SECURITY DEFINER
-- functions below, never through table RLS.
-- Live updates are pushed with realtime.send() to the public broadcast topic
-- 'delivery:<tracking_token>' (the secret token makes the topic unguessable).

CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
    tracking_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
    courier_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
    status VARCHAR NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'on_the_way', 'delivered', 'cancelled')),

    -- Destination (pin set by the customer at checkout)
    dest_lat DOUBLE PRECISION CHECK (dest_lat BETWEEN -90 AND 90),
    dest_lng DOUBLE PRECISION CHECK (dest_lng BETWEEN -180 AND 180),

    -- Courier live position
    courier_name VARCHAR,
    courier_lat DOUBLE PRECISION CHECK (courier_lat BETWEEN -90 AND 90),
    courier_lng DOUBLE PRECISION CHECK (courier_lng BETWEEN -180 AND 180),
    courier_heading DOUBLE PRECISION,
    courier_accuracy DOUBLE PRECISION,
    location_updated_at TIMESTAMPTZ,

    started_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deliveries_business ON public.deliveries(business_id);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view deliveries" ON public.deliveries
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage deliveries" ON public.deliveries
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ── Public payload (shared by RPC + broadcast) ──────────
CREATE OR REPLACE FUNCTION public.delivery_public_payload(d public.deliveries)
RETURNS JSONB
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'status', d.status,
        'courier_name', d.courier_name,
        'courier_lat', d.courier_lat,
        'courier_lng', d.courier_lng,
        'courier_heading', d.courier_heading,
        'location_updated_at', d.location_updated_at,
        'started_at', d.started_at,
        'delivered_at', d.delivered_at
    );
$$;

-- ── Customer: read tracking info ────────────────────────
CREATE OR REPLACE FUNCTION public.get_delivery_tracking(p_token TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.delivery_public_payload(d) || jsonb_build_object(
        'dest_lat', d.dest_lat,
        'dest_lng', d.dest_lng,
        'address', t.address,
        'order_code', t.code,
        'order_status', t.status,
        'order_created_at', t.created_at,
        'business_name', b.name,
        'business_slug', b.slug,
        'business_logo', b.logo_url,
        'business_phone', COALESCE(b.whatsapp, b.phone)
    )
    FROM public.deliveries d
    JOIN public.transactions t ON t.id = d.transaction_id
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.tracking_token = p_token;
$$;

-- ── Courier: read the delivery assigned to the link ─────
CREATE OR REPLACE FUNCTION public.get_courier_delivery(p_token TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.delivery_public_payload(d) || jsonb_build_object(
        'dest_lat', d.dest_lat,
        'dest_lng', d.dest_lng,
        'address', t.address,
        'notes', t.notes,
        'order_code', t.code,
        'order_status', t.status,
        'total', t.total,
        'payment_status', t.payment_status,
        'customer_name', t.customer_name,
        'customer_phone', t.customer_phone,
        'business_name', b.name,
        'business_slug', b.slug,
        'currency', b.currency
    )
    FROM public.deliveries d
    JOIN public.transactions t ON t.id = d.transaction_id
    JOIN public.businesses b ON b.id = d.business_id
    WHERE d.courier_token = p_token;
$$;

-- ── Courier: push GPS position ──────────────────────────
CREATE OR REPLACE FUNCTION public.courier_update_location(
    p_token TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_heading DOUBLE PRECISION DEFAULT NULL,
    p_accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_lat IS NULL OR p_lng IS NULL
       OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
        RETURN FALSE;
    END IF;

    UPDATE public.deliveries
       SET courier_lat = p_lat,
           courier_lng = p_lng,
           courier_heading = p_heading,
           courier_accuracy = p_accuracy,
           location_updated_at = now(),
           updated_at = now()
     WHERE courier_token = p_token
       AND status = 'on_the_way'
       -- basic throttle: at most one write every 2 seconds per delivery
       AND (location_updated_at IS NULL OR location_updated_at < now() - interval '2 seconds');

    RETURN FOUND;
END;
$$;

-- ── Courier: start / finish the delivery ────────────────
CREATE OR REPLACE FUNCTION public.courier_set_status(
    p_token TEXT,
    p_status TEXT,
    p_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_status = 'on_the_way' THEN
        UPDATE public.deliveries
           SET status = 'on_the_way',
               courier_name = COALESCE(NULLIF(left(trim(p_name), 60), ''), courier_name),
               started_at = COALESCE(started_at, now()),
               updated_at = now()
         WHERE courier_token = p_token AND status = 'pending';
    ELSIF p_status = 'delivered' THEN
        UPDATE public.deliveries
           SET status = 'delivered',
               delivered_at = now(),
               updated_at = now()
         WHERE courier_token = p_token AND status = 'on_the_way';
    ELSE
        RETURN FALSE;
    END IF;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_delivery_tracking(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_courier_delivery(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.courier_update_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.courier_set_status(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_delivery_tracking(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_courier_delivery(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.courier_update_location(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.courier_set_status(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ── Realtime: broadcast every delivery change ───────────
CREATE OR REPLACE FUNCTION public.broadcast_delivery_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        PERFORM realtime.send(
            public.delivery_public_payload(NEW),
            'delivery',
            'delivery:' || NEW.tracking_token,
            false
        );
    EXCEPTION WHEN OTHERS THEN
        -- Never block the write because Realtime is unavailable; clients also poll.
        NULL;
    END;
    RETURN NULL;
END;
$$;

CREATE TRIGGER deliveries_broadcast
    AFTER UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.broadcast_delivery_change();

-- ── Order status → customer timeline + auto-cancel ──────
CREATE OR REPLACE FUNCTION public.sync_delivery_with_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NULL;
    END IF;

    SELECT tracking_token INTO v_token FROM public.deliveries WHERE transaction_id = NEW.id;
    IF v_token IS NULL THEN
        RETURN NULL;
    END IF;

    IF NEW.status = 'cancelled' THEN
        UPDATE public.deliveries
           SET status = 'cancelled', updated_at = now()
         WHERE transaction_id = NEW.id AND status IN ('pending', 'on_the_way');
    END IF;

    BEGIN
        PERFORM realtime.send(
            jsonb_build_object('order_status', NEW.status),
            'order',
            'delivery:' || v_token,
            false
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN NULL;
END;
$$;

CREATE TRIGGER transactions_sync_delivery
    AFTER UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_with_order();
