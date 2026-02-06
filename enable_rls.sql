-- 1. Enable RLS on audit_logs and shipments
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 2. Update audit_logs: Ensure user_id exists and references auth.users
-- Note: converting text to uuid if necessary, or adding if missing.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN user_id UUID references auth.users(id);
    ELSE
        -- If it exists but is not a foreign key or wrong type, we might need manual fixing.
        -- Assuming it's clean for now or empty. 
        -- If it was TEXT, this might fail without casting. 
        -- We will attempt to alter it to UUID if it exists.
        BEGIN
            ALTER TABLE public.audit_logs ALTER COLUMN user_id TYPE UUID USING user_id::UUID;
            ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not alter user_id to UUID or add FK automatically. Check existing data.';
        END;
    END IF;
END $$;

-- 3. Update shipments: Ensure user_id references auth.users
-- Previous scripts might have linked it to public.users or text.
-- We want to switch to auth.users.
DO $$
BEGIN
    -- Drop old FK if exists
    ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_user_id_fkey;
    
    -- Alter column type to UUID if it's not
    ALTER TABLE public.shipments ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    
    -- Add new FK to auth.users
    ALTER TABLE public.shipments ADD CONSTRAINT shipments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error migrating shipments user_id. Ensure no incompatible data exists.';
END $$;

-- 4. Create Security Policies (Isolation)

-- audit_logs policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- shipments policies
DROP POLICY IF EXISTS "Users can view their own shipments" ON public.shipments;
CREATE POLICY "Users can view their own shipments" 
ON public.shipments FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own shipments" ON public.shipments;
CREATE POLICY "Users can insert their own shipments" 
ON public.shipments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow updates too if needed
DROP POLICY IF EXISTS "Users can update their own shipments" ON public.shipments;
CREATE POLICY "Users can update their own shipments" 
ON public.shipments FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

