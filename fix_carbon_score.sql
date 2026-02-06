-- Add carbon_score column to audit_logs table for Sustainability tracking
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS carbon_score TEXT DEFAULT 'Low'; -- 🟢 (Low), 🟡 (Medium), 🔴 (High)

-- Ensure RLS is still enabled and policies are correct (idempotent)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
