-- ============================================
-- SPOT — Initial Database Schema
-- Multi-tenant platform for local businesses
-- ============================================

-- ══════════════════════════════════════════
-- 1. PROFILES (platform users)
-- ══════════════════════════════════════════
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    display_name VARCHAR,
    avatar_url TEXT,
    phone VARCHAR,
    locale VARCHAR DEFAULT 'es',
    platform_role VARCHAR DEFAULT 'user' CHECK (platform_role IN ('superadmin', 'support', 'user')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND platform_role = 'superadmin')
    );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════
-- 2. BUSINESSES (tenants)
-- ══════════════════════════════════════════
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    type VARCHAR NOT NULL CHECK (type IN (
        'restaurant', 'fast_food', 'supermarket', 'barbershop', 'tattoo',
        'bar', 'hotel', 'hostel', 'cafe', 'gym', 'laundry', 'clothing',
        'veterinary', 'custom'
    )),
    owner_id UUID NOT NULL REFERENCES auth.users(id),

    -- Branding
    logo_url TEXT,
    cover_url TEXT,
    favicon_url TEXT,
    description TEXT,
    tagline VARCHAR,

    -- Contact
    address TEXT,
    city VARCHAR,
    country VARCHAR DEFAULT 'CO',
    phone VARCHAR,
    email VARCHAR,
    whatsapp VARCHAR,
    social_links JSONB DEFAULT '{}',

    -- Configuration
    business_hours JSONB DEFAULT '{}',
    currency VARCHAR DEFAULT 'COP',
    timezone VARCHAR DEFAULT 'America/Bogota',
    locale VARCHAR DEFAULT 'es',

    -- Webpage
    theme JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    custom_domain VARCHAR,
    webpage_published BOOLEAN DEFAULT false,

    -- Subscription
    subscription_plan VARCHAR DEFAULT 'free' CHECK (subscription_plan IN ('free', 'starter', 'pro', 'enterprise')),
    subscription_status VARCHAR DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled')),
    trial_ends_at TIMESTAMPTZ,
    subscription_started_at TIMESTAMPTZ,

    -- SuperAdmin management
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    internal_notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),

    -- Status
    active BOOLEAN DEFAULT true,
    suspended BOOLEAN DEFAULT false,
    suspended_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════
-- 3. BUSINESS_MEMBERS (user ↔ business)
-- ══════════════════════════════════════════
CREATE TABLE public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'admin', 'manager', 'employee')),
    permissions JSONB DEFAULT '[]',
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, user_id)
);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of a business
CREATE OR REPLACE FUNCTION public.is_business_member(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = b_id AND user_id = auth.uid() AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND platform_role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for businesses
CREATE POLICY "Members can view their businesses" ON public.businesses
    FOR SELECT USING (public.is_business_member(id) OR public.is_superadmin());

CREATE POLICY "Owners can update their business" ON public.businesses
    FOR UPDATE USING (owner_id = auth.uid() OR public.is_superadmin());

CREATE POLICY "Superadmins can insert businesses" ON public.businesses
    FOR INSERT WITH CHECK (public.is_superadmin() OR auth.uid() = owner_id);

-- RLS Policies for business_members
CREATE POLICY "Members can view their business members" ON public.business_members
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Owners/admins can manage members" ON public.business_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_members
            WHERE business_id = business_members.business_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        ) OR public.is_superadmin()
    );

-- Public access for published webpages
CREATE POLICY "Public can view published businesses" ON public.businesses
    FOR SELECT USING (active = true AND webpage_published = true AND suspended = false);

-- ══════════════════════════════════════════
-- 4. BUSINESS_MODULES
-- ══════════════════════════════════════════
CREATE TABLE public.business_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    module_key VARCHAR NOT NULL,
    enabled BOOLEAN DEFAULT true,
    label VARCHAR,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, module_key)
);

ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their modules" ON public.business_modules
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Superadmins can manage modules" ON public.business_modules
    FOR ALL USING (public.is_superadmin());

-- ══════════════════════════════════════════
-- 5. EMPLOYEES
-- ══════════════════════════════════════════
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    full_name VARCHAR NOT NULL,
    document_id VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    position VARCHAR NOT NULL,
    department VARCHAR,
    hire_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC NOT NULL DEFAULT 0,
    salary_type VARCHAR DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly', 'per_service')),
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
    schedule JSONB DEFAULT '{}',
    avatar_url TEXT,
    emergency_contact VARCHAR,
    emergency_phone VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view employees" ON public.employees
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Managers can manage employees" ON public.employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_members
            WHERE business_id = employees.business_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
        ) OR public.is_superadmin()
    );

-- ══════════════════════════════════════════
-- 6. CONTACTS (customers/guests)
-- ══════════════════════════════════════════
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name VARCHAR NOT NULL,
    phone VARCHAR,
    email VARCHAR,
    address TEXT,
    document_type VARCHAR,
    document_number VARCHAR,
    date_of_birth DATE,
    tags JSONB DEFAULT '[]',
    total_visits INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contacts" ON public.contacts
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage contacts" ON public.contacts
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 7. CATALOG_CATEGORIES
-- ══════════════════════════════════════════
CREATE TABLE public.catalog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    icon VARCHAR DEFAULT '📦',
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories" ON public.catalog_categories
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage categories" ON public.catalog_categories
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Public can view active categories" ON public.catalog_categories
    FOR SELECT USING (
        active = true AND EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = catalog_categories.business_id AND webpage_published = true AND active = true
        )
    );

-- ══════════════════════════════════════════
-- 8. CATALOG_ITEMS (products/services/rooms)
-- ══════════════════════════════════════════
CREATE TABLE public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    compare_price NUMERIC,
    cost NUMERIC,
    sku VARCHAR,
    image_url TEXT,
    images JSONB DEFAULT '[]',
    type VARCHAR DEFAULT 'product' CHECK (type IN ('product', 'service', 'room', 'membership')),
    duration_minutes INTEGER,
    capacity INTEGER,
    options JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view items" ON public.catalog_items
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage items" ON public.catalog_items
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Public can view active items" ON public.catalog_items
    FOR SELECT USING (
        active = true AND EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = catalog_items.business_id AND webpage_published = true AND active = true
        )
    );

-- ══════════════════════════════════════════
-- 9. TRANSACTIONS (orders/reservations/appointments)
-- ══════════════════════════════════════════
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    type VARCHAR NOT NULL CHECK (type IN ('order', 'reservation', 'appointment', 'sale')),
    code VARCHAR,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method VARCHAR,
    payment_status VARCHAR DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
    customer_name VARCHAR,
    customer_phone VARCHAR,
    customer_email VARCHAR,
    scheduled_at TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    address TEXT,
    notes TEXT,
    admin_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view transactions" ON public.transactions
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage transactions" ON public.transactions
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 10. TRANSACTION_ITEMS
-- ══════════════════════════════════════════
CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    options JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view transaction items" ON public.transaction_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_items.transaction_id
            AND (public.is_business_member(t.business_id) OR public.is_superadmin())
        )
    );

CREATE POLICY "Members can manage transaction items" ON public.transaction_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_items.transaction_id
            AND (public.is_business_member(t.business_id) OR public.is_superadmin())
        )
    );

-- ══════════════════════════════════════════
-- 11. INVENTORY
-- ══════════════════════════════════════════
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    category VARCHAR,
    unit VARCHAR DEFAULT 'unidad',
    current_stock NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    supplier VARCHAR,
    location VARCHAR,
    active BOOLEAN DEFAULT true,
    last_restock_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view inventory" ON public.inventory
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage inventory" ON public.inventory
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 12. INVENTORY_MOVEMENTS
-- ══════════════════════════════════════════
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('purchase', 'usage', 'waste', 'adjustment', 'return')),
    quantity NUMERIC NOT NULL,
    unit_cost NUMERIC,
    total_cost NUMERIC,
    reference_id UUID,
    notes TEXT,
    registered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view movements" ON public.inventory_movements
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage movements" ON public.inventory_movements
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 13. EXPENSES
-- ══════════════════════════════════════════
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category VARCHAR NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR DEFAULT 'cash',
    receipt_url TEXT,
    recurring BOOLEAN DEFAULT false,
    recurring_interval VARCHAR,
    registered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses" ON public.expenses
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage expenses" ON public.expenses
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 14. DAILY_CASH
-- ══════════════════════════════════════════
CREATE TABLE public.daily_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opening_balance NUMERIC DEFAULT 0,
    closing_balance NUMERIC,
    total_sales NUMERIC DEFAULT 0,
    total_expenses NUMERIC DEFAULT 0,
    total_cash_in NUMERIC DEFAULT 0,
    total_digital_in NUMERIC DEFAULT 0,
    status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, date)
);

ALTER TABLE public.daily_cash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view daily cash" ON public.daily_cash
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Members can manage daily cash" ON public.daily_cash
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 15. PAYROLL
-- ══════════════════════════════════════════
CREATE TABLE public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary NUMERIC NOT NULL,
    overtime_hours NUMERIC DEFAULT 0,
    overtime_pay NUMERIC DEFAULT 0,
    bonuses NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    net_pay NUMERIC NOT NULL,
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
    payment_method VARCHAR,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payroll" ON public.payroll
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Managers can manage payroll" ON public.payroll
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_members
            WHERE business_id = payroll.business_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        ) OR public.is_superadmin()
    );

-- ══════════════════════════════════════════
-- 16. SHIFTS
-- ══════════════════════════════════════════
CREATE TABLE public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    hours_worked NUMERIC,
    status VARCHAR DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'absent')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view shifts" ON public.shifts
    FOR SELECT USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Managers can manage shifts" ON public.shifts
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

-- ══════════════════════════════════════════
-- 17. WEBPAGE_SECTIONS
-- ══════════════════════════════════════════
CREATE TABLE public.webpage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    section_type VARCHAR NOT NULL,
    title VARCHAR,
    content JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webpage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage sections" ON public.webpage_sections
    FOR ALL USING (public.is_business_member(business_id) OR public.is_superadmin());

CREATE POLICY "Public can view visible sections" ON public.webpage_sections
    FOR SELECT USING (
        visible = true AND EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = webpage_sections.business_id AND webpage_published = true AND active = true
        )
    );

-- ══════════════════════════════════════════
-- 18. BUSINESS_TEMPLATES (SuperAdmin)
-- ══════════════════════════════════════════
CREATE TABLE public.business_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    business_type VARCHAR NOT NULL,
    description TEXT,
    preview_url TEXT,
    thumbnail_url TEXT,
    theme JSONB NOT NULL DEFAULT '{}',
    layout JSONB NOT NULL DEFAULT '{}',
    sections JSONB NOT NULL DEFAULT '[]',
    default_modules JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage templates" ON public.business_templates
    FOR ALL USING (public.is_superadmin());

CREATE POLICY "Public can view active templates" ON public.business_templates
    FOR SELECT USING (active = true);

-- ══════════════════════════════════════════
-- 19. WEBPAGE_PROPOSALS (SuperAdmin)
-- ══════════════════════════════════════════
CREATE TABLE public.webpage_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.business_templates(id) ON DELETE SET NULL,
    prospect_name VARCHAR,
    prospect_email VARCHAR,
    prospect_phone VARCHAR,
    prospect_business_name VARCHAR,
    prospect_business_type VARCHAR,
    theme JSONB NOT NULL DEFAULT '{}',
    layout JSONB NOT NULL DEFAULT '{}',
    sections JSONB NOT NULL DEFAULT '[]',
    content JSONB NOT NULL DEFAULT '{}',
    modules JSONB NOT NULL DEFAULT '[]',
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'rejected')),
    share_token VARCHAR UNIQUE,
    share_url TEXT,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webpage_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage proposals" ON public.webpage_proposals
    FOR ALL USING (public.is_superadmin());

CREATE POLICY "Public can view by share token" ON public.webpage_proposals
    FOR SELECT USING (share_token IS NOT NULL AND status != 'draft');

-- ══════════════════════════════════════════
-- 20. NOTIFICATIONS
-- ══════════════════════════════════════════
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    body TEXT,
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ══════════════════════════════════════════
-- 21. AUDIT_LOG
-- ══════════════════════════════════════════
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id UUID,
    changes JSONB DEFAULT '{}',
    ip_address VARCHAR,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all logs" ON public.audit_log
    FOR SELECT USING (public.is_superadmin());

CREATE POLICY "Members can view business logs" ON public.audit_log
    FOR SELECT USING (public.is_business_member(business_id));

-- ══════════════════════════════════════════
-- INDEXES for performance
-- ══════════════════════════════════════════
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_type ON public.businesses(type);
CREATE INDEX idx_business_members_user ON public.business_members(user_id);
CREATE INDEX idx_business_members_business ON public.business_members(business_id);
CREATE INDEX idx_employees_business ON public.employees(business_id);
CREATE INDEX idx_contacts_business ON public.contacts(business_id);
CREATE INDEX idx_catalog_categories_business ON public.catalog_categories(business_id);
CREATE INDEX idx_catalog_items_business ON public.catalog_items(business_id);
CREATE INDEX idx_catalog_items_category ON public.catalog_items(category_id);
CREATE INDEX idx_transactions_business ON public.transactions(business_id);
CREATE INDEX idx_transactions_status ON public.transactions(business_id, status);
CREATE INDEX idx_transaction_items_transaction ON public.transaction_items(transaction_id);
CREATE INDEX idx_inventory_business ON public.inventory(business_id);
CREATE INDEX idx_expenses_business ON public.expenses(business_id);
CREATE INDEX idx_daily_cash_business_date ON public.daily_cash(business_id, date);
CREATE INDEX idx_payroll_business ON public.payroll(business_id);
CREATE INDEX idx_shifts_business ON public.shifts(business_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_audit_log_business ON public.audit_log(business_id);

-- ══════════════════════════════════════════
-- Updated_at trigger function
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.webpage_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.webpage_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
