-- Role-aware RLS for money tables (audit 2026-10-17, finding 6).
-- Before: any business member (even "viewer", even inactive) could insert, edit
-- and delete expenses, daily cash and credit (fiado) records straight through
-- the API. credit_* policies also never checked that the member was active.
--
--   read    : any active member (and superadmin)
--   write   : owner, admin, manager, cashier, employee   (day-to-day operation)
--   delete  : owner, admin, manager
--   "viewer": read only

CREATE OR REPLACE FUNCTION public.has_business_role(b_id uuid, allowed text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = b_id
          AND user_id = auth.uid()
          AND status = 'active'
          AND role = ANY (allowed)
    ) OR public.is_superadmin();
$$;

-- ── expenses ────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
CREATE POLICY "Members can view expenses" ON public.expenses
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Operators can update expenses" ON public.expenses
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can delete expenses" ON public.expenses
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

-- ── daily_cash ──────────────────────────────────────────
DROP POLICY IF EXISTS "Members can manage daily cash" ON public.daily_cash;
DROP POLICY IF EXISTS "Members can view daily cash" ON public.daily_cash;
CREATE POLICY "Members can view daily cash" ON public.daily_cash
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert daily cash" ON public.daily_cash
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Operators can update daily cash" ON public.daily_cash
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can delete daily cash" ON public.daily_cash
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

-- ── credit_accounts (fiado) ─────────────────────────────
-- Cashiers charge sales to credit at the POS, so they may update balances;
-- only managers open accounts or delete them.
DROP POLICY IF EXISTS "Users can manage credit accounts for their businesses" ON public.credit_accounts;
CREATE POLICY "Members can view credit accounts" ON public.credit_accounts
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Managers can insert credit accounts" ON public.credit_accounts
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager']));
CREATE POLICY "Operators can update credit accounts" ON public.credit_accounts
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can delete credit accounts" ON public.credit_accounts
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

-- ── credit_payments ─────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage credit payments for their businesses" ON public.credit_payments;
CREATE POLICY "Members can view credit payments" ON public.credit_payments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.credit_accounts ca
        WHERE ca.id = credit_payments.credit_account_id
          AND (public.is_business_member(ca.business_id) OR public.is_superadmin())
    ));
CREATE POLICY "Operators can insert credit payments" ON public.credit_payments
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.credit_accounts ca
        WHERE ca.id = credit_payments.credit_account_id
          AND public.has_business_role(ca.business_id, ARRAY['owner','admin','manager','cashier','employee'])
    ));
CREATE POLICY "Managers can modify credit payments" ON public.credit_payments
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.credit_accounts ca
        WHERE ca.id = credit_payments.credit_account_id
          AND public.has_business_role(ca.business_id, ARRAY['owner','admin','manager'])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.credit_accounts ca
        WHERE ca.id = credit_payments.credit_account_id
          AND public.has_business_role(ca.business_id, ARRAY['owner','admin','manager'])
    ));
CREATE POLICY "Managers can delete credit payments" ON public.credit_payments
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.credit_accounts ca
        WHERE ca.id = credit_payments.credit_account_id
          AND public.has_business_role(ca.business_id, ARRAY['owner','admin','manager'])
    ));
