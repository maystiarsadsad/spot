-- Seller identity printed on sales receipts ("comprobante de venta").
ALTER TABLE public.businesses
    ADD COLUMN IF NOT EXISTS legal_name TEXT,
    ADD COLUMN IF NOT EXISTS tax_id TEXT;
