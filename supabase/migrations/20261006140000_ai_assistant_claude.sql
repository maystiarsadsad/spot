-- ══════════════════════════════════════════
-- AI ASSISTANT — Claude (bring your own key), usage log and daily caps
-- ══════════════════════════════════════════
-- The Anthropic API key of each business lives in Supabase Vault (encrypted).
-- Only the service role can read or write it, through the functions below;
-- the app only ever shows the last 4 characters.

CREATE TABLE public.business_ai_settings (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    claude_enabled BOOLEAN NOT NULL DEFAULT false,
    model VARCHAR NOT NULL DEFAULT 'claude-opus-5-5',
    daily_cap_usd NUMERIC(10,2) NOT NULL DEFAULT 5 CHECK (daily_cap_usd >= 0 AND daily_cap_usd <= 1000),
    monthly_cap_usd NUMERIC(10,2) CHECK (monthly_cap_usd IS NULL OR (monthly_cap_usd >= 0 AND monthly_cap_usd <= 10000)),

    -- Vault reference + display hint (never the key itself)
    key_secret_id UUID,
    key_last4 VARCHAR(8),
    key_verified_at TIMESTAMPTZ,

    -- "Entrenamiento": shared by the keyword assistant and Claude
    greeting TEXT,
    instructions TEXT,
    extra_info TEXT,
    faqs JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ai settings" ON public.business_ai_settings
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage ai settings" ON public.business_ai_settings
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- One row per assistant call (storefront or dashboard playground)
CREATE TABLE public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    engine VARCHAR NOT NULL CHECK (engine IN ('claude', 'keywords')),
    source VARCHAR NOT NULL DEFAULT 'storefront' CHECK (source IN ('storefront', 'playground')),
    status VARCHAR NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'error', 'capped', 'refusal')),
    model VARCHAR,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    question TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_business_time ON public.ai_usage(business_id, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ai usage" ON public.ai_usage
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
-- Inserts happen server-side with the service role only.

-- ── Vault helpers (service role only) ───────────────────
CREATE OR REPLACE FUNCTION public.set_business_ai_key(p_business_id UUID, p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    v_secret UUID;
BEGIN
    SELECT key_secret_id INTO v_secret FROM public.business_ai_settings WHERE business_id = p_business_id;

    IF p_key IS NULL OR p_key = '' THEN
        IF v_secret IS NOT NULL THEN
            DELETE FROM vault.secrets WHERE id = v_secret;
        END IF;
        UPDATE public.business_ai_settings
           SET key_secret_id = NULL, key_last4 = NULL, key_verified_at = NULL,
               claude_enabled = false, updated_at = now()
         WHERE business_id = p_business_id;
        RETURN;
    END IF;

    IF v_secret IS NULL THEN
        v_secret := vault.create_secret(p_key, 'anthropic_key_' || p_business_id::text, 'Anthropic API key (Spot business)');
    ELSE
        PERFORM vault.update_secret(v_secret, p_key);
    END IF;

    INSERT INTO public.business_ai_settings (business_id, key_secret_id, key_last4, key_verified_at)
    VALUES (p_business_id, v_secret, right(p_key, 4), now())
    ON CONFLICT (business_id) DO UPDATE
       SET key_secret_id = EXCLUDED.key_secret_id,
           key_last4 = EXCLUDED.key_last4,
           key_verified_at = EXCLUDED.key_verified_at,
           updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_ai_key(p_business_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, vault
AS $$
    SELECT ds.decrypted_secret
      FROM public.business_ai_settings s
      JOIN vault.decrypted_secrets ds ON ds.id = s.key_secret_id
     WHERE s.business_id = p_business_id;
$$;

REVOKE ALL ON FUNCTION public.set_business_ai_key(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_business_ai_key(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_ai_key(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_business_ai_key(UUID) TO service_role;
