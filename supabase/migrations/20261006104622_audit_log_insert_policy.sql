-- audit_log only had SELECT policies, so every logAudit() insert from a
-- user session was rejected by RLS ("new row violates row-level security
-- policy") and the table stayed empty — the /sa/logs page never had data.
--
-- Allow a signed-in user to write audit rows attributed to themselves. The
-- business_id check stops someone from writing entries into another tenant's
-- log (members of that business can read it through the existing SELECT policy).
CREATE POLICY "Users can insert their own audit entries" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND (
            business_id IS NULL
            OR public.is_business_member(business_id)
            OR public.is_superadmin()
        )
    );
