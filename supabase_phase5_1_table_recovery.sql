-- ============================================================================
-- MJ ESPORTS — Phase 5.1: Tournament Payout Infrastructure Table Recovery Migration
-- Target Engine: Supabase PostgreSQL
-- Description: Minimal corrective migration to recover missing payout tables:
--              1. public.payout_queue
--              2. public.payout_approval_requests
--              Also recreates dependent indexes, circular FK constraint, RLS policies,
--              and privilege grants. DOES NOT drop or recreate existing RPC functions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PAYOUT QUEUE TABLE SETUP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  source_result_id UUID REFERENCES public.match_scorecards(id) ON DELETE SET NULL,
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_game_uid TEXT,
  winner_game_ign TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1 CHECK (rank > 0),
  payout_amount NUMERIC(12, 2) NOT NULL CHECK (payout_amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (
    status IN (
      'PENDING_REVIEW',
      'AWAITING_OWNER_APPROVAL',
      'APPROVED',
      'READY_FOR_EXECUTION',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    )
  ),
  idempotency_key TEXT NOT NULL UNIQUE,
  approval_request_id UUID,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payout queue
CREATE INDEX IF NOT EXISTS idx_payout_queue_tournament ON public.payout_queue(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payout_queue_status ON public.payout_queue(status);
CREATE INDEX IF NOT EXISTS idx_payout_queue_winner ON public.payout_queue(winner_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_queue_idempotency ON public.payout_queue(idempotency_key);


-- ----------------------------------------------------------------------------
-- 2. PAYOUT APPROVAL REQUESTS TABLE SETUP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_queue_id UUID NOT NULL REFERENCES public.payout_queue(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payout approval requests
CREATE INDEX IF NOT EXISTS idx_payout_approval_queue_id ON public.payout_approval_requests(payout_queue_id);
CREATE INDEX IF NOT EXISTS idx_payout_approval_status ON public.payout_approval_requests(status);


-- Foreign key constraint for approval_request_id in payout_queue safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_payout_queue_approval_request'
  ) THEN
    ALTER TABLE public.payout_queue
      ADD CONSTRAINT fk_payout_queue_approval_request
      FOREIGN KEY (approval_request_id)
      REFERENCES public.payout_approval_requests(id)
      ON DELETE SET NULL;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) & PRIVILEGES
-- ----------------------------------------------------------------------------
ALTER TABLE public.payout_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_approval_requests ENABLE ROW LEVEL SECURITY;

-- SELECT Policies: Admins view all, players view their own payout queue items
DROP POLICY IF EXISTS "Admins read all payout queue or winner reads own" ON public.payout_queue;
CREATE POLICY "Admins read all payout queue or winner reads own"
  ON public.payout_queue FOR SELECT
  USING (public.is_admin() OR auth.uid() = winner_user_id);

DROP POLICY IF EXISTS "Admins read all payout approval requests" ON public.payout_approval_requests;
CREATE POLICY "Admins read all payout approval requests"
  ON public.payout_approval_requests FOR SELECT
  USING (public.is_admin());

-- Revoke direct write access (INSERT, UPDATE, DELETE) from anon, authenticated, public
REVOKE INSERT, UPDATE, DELETE ON public.payout_queue FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON public.payout_approval_requests FROM anon, authenticated, public;
