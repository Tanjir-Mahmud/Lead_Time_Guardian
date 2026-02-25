-- Add missing columns to shipments table
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS destination TEXT,
ADD COLUMN IF NOT EXISTS origin_city TEXT,
ADD COLUMN IF NOT EXISTS lead_time_days NUMERIC,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- Optional: Add status if not exists (was present in some versions of schema but let's be safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='status'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN status TEXT DEFAULT 'Pending';
    END IF;
END $$;
