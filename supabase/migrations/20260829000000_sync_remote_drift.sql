-- ══════════════════════════════════════════
-- Sync migration history with remote schema drift.
--
-- Between 2026-04-27 and 2026-05-02 seven migrations were applied directly
-- to the linked Supabase project (versions 20260427054016, 20260427064306,
-- 20260502191957, 20260502220003, 20260502224646, 20260502224923,
-- 20260502230436) without a corresponding file ever landing in this repo.
-- `supabase migration list` showed them as remote-only.
--
-- Docker wasn't available locally to run `supabase db pull` (it needs a
-- shadow database), so this file was reconstructed from the live schema via
-- read-only introspection (information_schema / pg_catalog) instead — it
-- captures the net effect of those seven migrations, not each one
-- individually (their original SQL wasn't recoverable). The seven versions
-- were marked `reverted` via `supabase migration repair` so the CLI's
-- history table no longer expects them; this file's own version is then
-- marked `applied` (already true in production) via the same command,
-- rather than actually re-run.
-- ══════════════════════════════════════════

-- ── AI storefront agent (businesses) ──
ALTER TABLE public.businesses
    ADD COLUMN ai_agent_enabled BOOLEAN DEFAULT false,
    ADD COLUMN ai_agent_prompt TEXT,
    ADD COLUMN ai_agent_greeting TEXT DEFAULT 'Hola 👋 ¿En qué te puedo ayudar?';

-- ── Barcode scanning (inventory) ──
ALTER TABLE public.inventory
    ADD COLUMN barcode VARCHAR;

-- ── "Sell directly from inventory" link (catalog_items) ──
ALTER TABLE public.catalog_items
    ADD COLUMN inventory_id UUID REFERENCES public.inventory(id);

-- ══════════════════════════════════════════
-- CATALOG_ITEM_INGREDIENTS (recipe mode: a catalog item consumes N
-- inventory items per sale)
-- ══════════════════════════════════════════
CREATE TABLE public.catalog_item_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (catalog_item_id, inventory_id)
);

CREATE INDEX idx_catalog_item_ingredients_item ON public.catalog_item_ingredients(catalog_item_id);

ALTER TABLE public.catalog_item_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ingredients for their business items" ON public.catalog_item_ingredients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.catalog_items ci
            JOIN public.business_members bm ON bm.business_id = ci.business_id
            WHERE ci.id = catalog_item_ingredients.catalog_item_id AND bm.user_id = auth.uid()
        )
    );

-- ══════════════════════════════════════════
-- CREDIT_ACCOUNTS (fiado / store credit per contact)
-- ══════════════════════════════════════════
CREATE TABLE public.credit_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    guarantor_id UUID REFERENCES public.contacts(id),
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    current_balance NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed', 'defaulted')),
    guarantor_name VARCHAR,
    guarantor_document VARCHAR,
    guarantor_phone VARCHAR,
    guarantor_relationship VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (business_id, contact_id)
);

CREATE INDEX idx_credit_accounts_business ON public.credit_accounts(business_id);
CREATE INDEX idx_credit_accounts_contact ON public.credit_accounts(contact_id);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage credit accounts for their businesses" ON public.credit_accounts
    FOR ALL USING (
        business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    );

-- ══════════════════════════════════════════
-- CREDIT_PAYMENTS (charges + payments against a credit account)
-- ══════════════════════════════════════════
CREATE TABLE public.credit_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_account_id UUID NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id),
    type VARCHAR NOT NULL DEFAULT 'payment' CHECK (type IN ('charge', 'payment')),
    amount NUMERIC NOT NULL,
    payment_method VARCHAR DEFAULT 'cash',
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_payments_account ON public.credit_payments(credit_account_id);

ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage credit payments for their businesses" ON public.credit_payments
    FOR ALL USING (
        credit_account_id IN (
            SELECT ca.id FROM public.credit_accounts ca
            JOIN public.business_members bm ON bm.business_id = ca.business_id
            WHERE bm.user_id = auth.uid()
        )
    );
