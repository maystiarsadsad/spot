-- Atomic stock and credit (fiado) movements (audit 2026-10-17, finding 7).
-- Before: the app read the balance, computed in JS and wrote it back, so two
-- concurrent sales lost deductions, and a failure between the two writes left a
-- movement without its balance. Everything here is a single statement or a
-- row-locked transaction. SECURITY INVOKER on purpose: RLS of the caller still applies.

-- ── Stock ────────────────────────────────────────────────

-- Production had a CHECK (purchase/usage/waste/adjustment/return) that the app never
-- matched: it writes in/out/adjust, so every movement insert failed silently and the
-- table is empty. Accept both vocabularies (the table has no rows, nothing to migrate).
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_type_check
    CHECK (type IN ('in', 'out', 'adjust', 'purchase', 'usage', 'waste', 'adjustment', 'return'));

-- One movement (in / out / adjust). Returns the new stock.
--   out    : fails with 'Stock insuficiente' unless p_clamp (sales never block and floor at 0)
--   adjust : p_quantity is a signed delta
CREATE OR REPLACE FUNCTION public.apply_inventory_movement(
    p_business_id uuid,
    p_inventory_id uuid,
    p_type text,
    p_quantity numeric,
    p_unit_cost numeric DEFAULT 0,
    p_notes text DEFAULT NULL,
    p_clamp boolean DEFAULT false,
    p_reference_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_new numeric;
    v_cur numeric;
BEGIN
    IF p_type NOT IN ('in', 'out', 'adjust') THEN
        RAISE EXCEPTION 'Tipo de movimiento no válido' USING ERRCODE = 'P0001';
    END IF;
    IF p_quantity IS NULL OR (p_type <> 'adjust' AND p_quantity <= 0) OR (p_type = 'adjust' AND p_quantity = 0) THEN
        RAISE EXCEPTION 'La cantidad no es válida' USING ERRCODE = 'P0001';
    END IF;

    IF p_type = 'in' THEN
        UPDATE inventory
           SET current_stock = COALESCE(current_stock, 0) + p_quantity,
               last_restock_at = now()
         WHERE id = p_inventory_id AND business_id = p_business_id
        RETURNING current_stock INTO v_new;
    ELSIF p_type = 'adjust' THEN
        UPDATE inventory
           SET current_stock = COALESCE(current_stock, 0) + p_quantity
         WHERE id = p_inventory_id AND business_id = p_business_id
        RETURNING current_stock INTO v_new;
    ELSIF p_clamp THEN
        UPDATE inventory
           SET current_stock = GREATEST(0, COALESCE(current_stock, 0) - p_quantity)
         WHERE id = p_inventory_id AND business_id = p_business_id
        RETURNING current_stock INTO v_new;
    ELSE
        UPDATE inventory
           SET current_stock = COALESCE(current_stock, 0) - p_quantity
         WHERE id = p_inventory_id AND business_id = p_business_id
           AND COALESCE(current_stock, 0) >= p_quantity
        RETURNING current_stock INTO v_new;
        IF v_new IS NULL THEN
            -- Nothing updated: tell "not enough stock" apart from "not allowed / not found"
            SELECT COALESCE(current_stock, 0) INTO v_cur FROM inventory WHERE id = p_inventory_id AND business_id = p_business_id;
            IF FOUND AND v_cur < p_quantity THEN
                RAISE EXCEPTION 'Stock insuficiente' USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    IF v_new IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado o sin permiso' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_movements (business_id, inventory_id, type, quantity, unit_cost, total_cost, reference_id, notes, registered_by)
    VALUES (p_business_id, p_inventory_id, p_type, p_quantity, COALESCE(p_unit_cost, 0),
            COALESCE(p_unit_cost, 0) * abs(p_quantity), p_reference_id, p_notes, auth.uid());

    RETURN v_new;
END;
$$;

-- Deductions of one sale in a single atomic call. p_items: [{"inventory_id": uuid, "quantity": n}, ...]
-- Never blocks the sale: stock floors at 0 (same behaviour the app had).
CREATE OR REPLACE FUNCTION public.deduct_sale_inventory(
    p_business_id uuid,
    p_items jsonb,
    p_reference_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_item jsonb;
    v_count integer := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
        -- Skip lines pointing at items of another business or already gone
        CONTINUE WHEN NOT EXISTS (
            SELECT 1 FROM inventory WHERE id = (v_item->>'inventory_id')::uuid AND business_id = p_business_id
        );
        PERFORM public.apply_inventory_movement(
            p_business_id, (v_item->>'inventory_id')::uuid, 'out', (v_item->>'quantity')::numeric,
            0, 'Descuento automático por venta', true, p_reference_id
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

-- ── Credit (fiado) ───────────────────────────────────────

-- Charge or payment on a credit account. Locks the account row, validates, writes
-- the movement and the balance together. Returns the new balance.
CREATE OR REPLACE FUNCTION public.apply_credit_movement(
    p_account_id uuid,
    p_type text,
    p_amount numeric,
    p_payment_method text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_transaction_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_account credit_accounts%ROWTYPE;
    v_new numeric;
BEGIN
    IF p_type NOT IN ('charge', 'payment') THEN
        RAISE EXCEPTION 'Tipo de movimiento no válido' USING ERRCODE = 'P0001';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_account FROM credit_accounts WHERE id = p_account_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta de crédito no encontrada' USING ERRCODE = 'P0001';
    END IF;

    IF p_type = 'charge' THEN
        IF v_account.status <> 'active' THEN
            RAISE EXCEPTION 'La cuenta de crédito no está activa' USING ERRCODE = 'P0001';
        END IF;
        v_new := COALESCE(v_account.current_balance, 0) + p_amount;
        IF v_account.credit_limit > 0 AND v_new > v_account.credit_limit THEN
            RAISE EXCEPTION 'Excede el límite de crédito. Disponible: %', v_account.credit_limit - COALESCE(v_account.current_balance, 0)
                USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF p_amount > COALESCE(v_account.current_balance, 0) THEN
            RAISE EXCEPTION 'El abono no puede ser mayor al saldo pendiente' USING ERRCODE = 'P0001';
        END IF;
        v_new := COALESCE(v_account.current_balance, 0) - p_amount;
    END IF;

    INSERT INTO credit_payments (credit_account_id, transaction_id, type, amount, payment_method, notes, recorded_by)
    VALUES (p_account_id, p_transaction_id, p_type, p_amount,
            CASE WHEN p_type = 'payment' THEN COALESCE(p_payment_method, 'cash') ELSE NULL END,
            COALESCE(p_notes, CASE WHEN p_type = 'charge' THEN 'Venta a crédito' ELSE 'Abono' END),
            auth.uid());

    UPDATE credit_accounts SET current_balance = v_new, updated_at = now() WHERE id = p_account_id;
    RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_inventory_movement(uuid, uuid, text, numeric, numeric, text, boolean, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.deduct_sale_inventory(uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_credit_movement(uuid, text, numeric, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_inventory_movement(uuid, uuid, text, numeric, numeric, text, boolean, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deduct_sale_inventory(uuid, jsonb, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_credit_movement(uuid, text, numeric, text, text, uuid) TO authenticated, service_role;

-- ── Role-aware RLS for inventory (same model as money tables) ────────────
DROP POLICY IF EXISTS "Members can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Members can view inventory" ON public.inventory;
CREATE POLICY "Members can view inventory" ON public.inventory
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert inventory" ON public.inventory
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Operators can update inventory" ON public.inventory
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can delete inventory" ON public.inventory
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

DROP POLICY IF EXISTS "Members can manage movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Members can view movements" ON public.inventory_movements;
CREATE POLICY "Members can view movements" ON public.inventory_movements
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());
CREATE POLICY "Operators can insert movements" ON public.inventory_movements
    FOR INSERT WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager','cashier','employee']));
CREATE POLICY "Managers can modify movements" ON public.inventory_movements
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner','admin','manager']));
CREATE POLICY "Managers can delete movements" ON public.inventory_movements
    FOR DELETE USING (public.has_business_role(business_id, ARRAY['owner','admin','manager']));

-- ── Index for the orders / finance / reports hot path ────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_business_created
    ON public.transactions (business_id, created_at DESC);
