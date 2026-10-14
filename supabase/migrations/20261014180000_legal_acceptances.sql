-- Proof of acceptance of the legal documents (terms, privacy policy and data
-- processing agreement) at sign-up: who, which version, when and from where.
CREATE TABLE public.legal_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document VARCHAR NOT NULL CHECK (document IN ('terms', 'privacy', 'data_processing')),
    version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip TEXT,
    user_agent TEXT
);
CREATE INDEX idx_legal_acceptances_user ON public.legal_acceptances(user_id, document);
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
-- Users can see their own acceptances; rows are written only by the server (service role)
CREATE POLICY "Users can view own legal acceptances" ON public.legal_acceptances
    FOR SELECT USING (user_id = auth.uid() OR public.is_superadmin());
