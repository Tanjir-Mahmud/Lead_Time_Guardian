-- Force add the missing column 'audit_json' to 'audit_logs'
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS audit_json JSONB;

-- Just in case, grant permissions again (idempotent)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write" ON public.audit_logs;
CREATE POLICY "Allow public read-write" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
