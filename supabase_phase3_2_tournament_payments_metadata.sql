-- ============================================================================
-- MJ ESPORTS — Phase 3.2: Add metadata Column to public.tournament_payments
-- Target Engine: PostgreSQL 15+ (Supabase)
-- Target Project: fdhjqlejomtgwffqgmoq
-- Safety: 100% Non-destructive, Additive, Idempotent
-- ============================================================================

-- 1. ADD METADATA COLUMN TO public.tournament_payments
-- Resolves runtime defect where create-famgateway-order and reconcile-famgateway-payments
-- read and write payment session metadata (payable_amount, upi_intent, qr_url, checkout_url).
ALTER TABLE public.tournament_payments
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. GIN INDEX FOR EFFICIENT JSONB LOOKUPS
CREATE INDEX IF NOT EXISTS idx_tournament_payments_metadata
  ON public.tournament_payments USING gin (metadata);

-- 3. SCHEMA DOCUMENTATION & AUDIT COMMENT
COMMENT ON COLUMN public.tournament_payments.metadata IS 
  'Stores provider session attributes (payable_amount, upi_intent, qr_url, checkout_url, expires_at_ist, registration_data).';

