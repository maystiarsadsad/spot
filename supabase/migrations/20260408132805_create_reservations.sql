-- Create the reservations table
CREATE TABLE public.reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  reservation_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  party_size int DEFAULT 1,
  notes text,
  item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL, -- optional reference to a catalog item (e.g. room, table, service)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reservations are viewable by business members" 
ON public.reservations FOR SELECT 
USING (business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid()));

CREATE POLICY "Reservations are insertable by business members" 
ON public.reservations FOR INSERT 
WITH CHECK (business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid()));

CREATE POLICY "Reservations are updatable by business members" 
ON public.reservations FOR UPDATE 
USING (business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid()));

CREATE POLICY "Reservations are deletable by business members" 
ON public.reservations FOR DELETE 
USING (business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid()));
