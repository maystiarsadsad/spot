-- Courier link for service orders: shipments also need the pickup point and
-- who receives the package (the customer is the sender).
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
        'currency', b.currency,
        'service_kind', so.kind,
        'pickup_address', CASE WHEN so.kind = 'shipment' THEN so.pickup_address END,
        'pickup_lat', CASE WHEN so.kind = 'shipment' THEN so.pickup_lat END,
        'pickup_lng', CASE WHEN so.kind = 'shipment' THEN so.pickup_lng END,
        'recipient_name', so.recipient_name,
        'recipient_phone', so.recipient_phone,
        'package_description', so.package_description,
        'service_notes', so.notes
    )
    FROM public.deliveries d
    JOIN public.transactions t ON t.id = d.transaction_id
    JOIN public.businesses b ON b.id = d.business_id
    LEFT JOIN public.service_orders so ON so.transaction_id = d.transaction_id
    WHERE d.courier_token = p_token;
$$;
