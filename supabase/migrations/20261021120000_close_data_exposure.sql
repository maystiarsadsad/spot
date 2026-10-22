-- Close data exposures found in the 2026-10-17 audit (findings 4, profiles and Storage).

-- ── 1. businesses: platform-internal fields were readable by anyone ────────────
-- "Public can view published businesses" exposes every column of a published business
-- to anonymous visitors (and, being a row policy, to any signed-in user). The three
-- internal fields move to a table only superadmins can read or write; the app never
-- read internal_notes or assigned_to and only wrote suspended_reason.
CREATE TABLE IF NOT EXISTS public.business_platform_notes (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    internal_notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    suspended_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.business_platform_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmins manage platform notes" ON public.business_platform_notes;
CREATE POLICY "Superadmins manage platform notes" ON public.business_platform_notes
    FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- Carry over whatever existed, then drop the columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'internal_notes') THEN
        INSERT INTO public.business_platform_notes (business_id, internal_notes, assigned_to, suspended_reason)
        SELECT id, internal_notes, assigned_to, suspended_reason
          FROM public.businesses
         WHERE internal_notes IS NOT NULL OR assigned_to IS NOT NULL OR suspended_reason IS NOT NULL
        ON CONFLICT (business_id) DO NOTHING;
    END IF;
END $$;

-- The platform-fields guard referenced those columns: update it first
CREATE OR REPLACE FUNCTION public.guard_business_platform_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
           OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
           OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
           OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
           OR NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at
           OR NEW.active IS DISTINCT FROM OLD.active
           OR NEW.suspended IS DISTINCT FROM OLD.suspended
        THEN
            RAISE EXCEPTION 'platform-managed business fields can only be changed by a superadmin'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE public.businesses
    DROP COLUMN IF EXISTS internal_notes,
    DROP COLUMN IF EXISTS assigned_to,
    DROP COLUMN IF EXISTS suspended_reason;

-- ── 2. profiles: every signed-in user could read every profile ─────────────────
-- (email, phone, name, platform_role of the whole platform). Now: your own, those of
-- people who share a business with you (team lists), and everything for superadmins.
CREATE OR REPLACE FUNCTION public.shares_business_with(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.business_members me
          JOIN public.business_members other ON other.business_id = me.business_id
         WHERE me.user_id = auth.uid()
           AND me.status = 'active'
           AND other.user_id = p_user
    );
$$;

DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;
CREATE POLICY "Profiles visible to self, teammates and superadmins" ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.is_superadmin()
        OR public.shares_business_with(id)
    );

-- ── 3. Storage: any signed-in user could write ANY file in catalog-images ──────
-- Files live under "<business_id>/…". Public read stays (the storefront serves them).
-- Writing now requires an operating role in the business named by the first folder.
DROP POLICY IF EXISTS "Auth users manage catalog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update catalog images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete catalog images" ON storage.objects;

CREATE POLICY "Operators upload catalog images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'catalog-images'
        AND CASE
            WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN public.has_business_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager','cashier','employee'])
            ELSE false
        END
    );
CREATE POLICY "Operators update catalog images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'catalog-images'
        AND CASE
            WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN public.has_business_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager','cashier','employee'])
            ELSE false
        END
    );
CREATE POLICY "Operators delete catalog images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'catalog-images'
        AND CASE
            WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN public.has_business_role(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager','cashier','employee'])
            ELSE false
        END
    );
