-- FIX Foreign Key Violation V4 (Comprehensive Cleanup)

-- 1. DROP POLICIES FIRST (CRITICAL: Cannot alter column type if used in policy)
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can insert their own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update their own shipments" ON public.shipments;

-- 2. Drop existing constraints (if any)
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_user_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- 3. Clean up INVALID FORMATS (Non-UUIDs)
DELETE FROM public.shipments WHERE user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM public.audit_logs WHERE user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Clean up ORPHANED UUIDs (UUIDs that don't exist in auth.users)
-- This fixes the "insert or update on table violates foreign key constraint" error
DELETE FROM public.shipments WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);
DELETE FROM public.audit_logs WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- 5. Ensure columns are UUID type
ALTER TABLE public.shipments ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.audit_logs ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- 6. Add correct Foreign Keys referencing Supabase Auth
ALTER TABLE public.shipments 
    ADD CONSTRAINT shipments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs 
    ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. RE-CREATE POLICIES (Restoring security)
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own shipments" ON public.shipments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shipments" ON public.shipments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shipments" ON public.shipments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
