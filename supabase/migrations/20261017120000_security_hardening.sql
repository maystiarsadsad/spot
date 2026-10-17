-- Security hardening (audit 2026-10-17, docs/auditoria_2026-10-17.md).
-- Idempotent: safe to run on production, where parts of this already exist.

-- 1) Helper functions: pin search_path (SECURITY DEFINER without it is hijackable).
ALTER FUNCTION public.is_business_member(uuid) SET search_path = public;
ALTER FUNCTION public.is_superadmin() SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_business_owner_or_admin(b_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = b_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    );
END;
$$;

-- 2) business_members: the original policy compared business_id with itself, so
--    any owner/admin of ANY business could manage members of ALL businesses.
--    Production already had this fixed outside the migrations (drift); this
--    brings the repo in line with it.
DROP POLICY IF EXISTS "Owners/admins can manage members" ON public.business_members;
CREATE POLICY "Owners/admins can manage members" ON public.business_members
    FOR ALL
    USING (public.is_business_owner_or_admin(business_id) OR public.is_superadmin())
    WITH CHECK (public.is_business_owner_or_admin(business_id) OR public.is_superadmin());

-- 3) profiles.platform_role: any user could UPDATE their own row, including
--    platform_role, and make themselves superadmin. Only a superadmin (or a
--    trusted server context with no end-user JWT: service role / migrations)
--    may change it.
CREATE OR REPLACE FUNCTION public.guard_profile_platform_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
        IF NEW.platform_role IS DISTINCT FROM OLD.platform_role THEN
            RAISE EXCEPTION 'platform_role can only be changed by a superadmin'
                USING ERRCODE = '42501';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'profile id is immutable' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_platform_fields ON public.profiles;
CREATE TRIGGER guard_profile_platform_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_platform_fields();

-- Also stop a user from re-pointing the policy at another row.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4) businesses: owners may edit their business, but not platform-managed
--    columns (plan, billing state, suspension, internal notes, ownership).
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
           OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
           OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
           OR NEW.active IS DISTINCT FROM OLD.active
           OR NEW.suspended IS DISTINCT FROM OLD.suspended
           OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
        THEN
            RAISE EXCEPTION 'platform-managed business fields can only be changed by a superadmin'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_business_platform_fields ON public.businesses;
CREATE TRIGGER guard_business_platform_fields
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.guard_business_platform_fields();

-- 5) webpage_proposals: the "share token" policy never required knowing the
--    token, so anonymous users could list every non-draft proposal. The
--    feature is unused in src/, so only superadmins keep access.
DROP POLICY IF EXISTS "Public can view by share token" ON public.webpage_proposals;
