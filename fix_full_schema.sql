-- 1. Create the missing 'users' table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT
);

-- 2. Insert the required company (Prevent duplicates)
INSERT INTO public.users (company_name)
SELECT 'Synthetic Steps Ltd'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE company_name = 'Synthetic Steps Ltd'
);

-- 3. Fix the Foreign Key on 'shipments'
-- We drop the old constraint (in case it points to auth.users or is broken)
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_user_id_fkey;

-- 4. Add the correct constraint pointing to our new public.users table
ALTER TABLE public.shipments
ADD CONSTRAINT shipments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id);

-- 5. Enable permissions for the new table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write" ON public.users;
CREATE POLICY "Allow public read-write" ON public.users FOR ALL USING (true) WITH CHECK (true);
