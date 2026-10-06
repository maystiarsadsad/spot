-- New business types: logistics (mensajería / envíos) and hardware_store (ferretería)
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_type_check;

ALTER TABLE public.businesses ADD CONSTRAINT businesses_type_check CHECK (type IN (
    'restaurant', 'fast_food', 'supermarket', 'barbershop', 'tattoo',
    'bar', 'hotel', 'hostel', 'cafe', 'gym', 'laundry', 'clothing',
    'veterinary', 'logistics', 'hardware_store', 'custom'
));
