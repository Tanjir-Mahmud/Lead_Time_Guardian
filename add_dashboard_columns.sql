-- Add missing columns to shipments table for dashboard metrics
-- Run this in Supabase SQL Editor

-- Add destination column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='destination'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN destination TEXT;
    END IF;
END $$;

-- Add lead_time_days column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='lead_time_days'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN lead_time_days INTEGER DEFAULT 30;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'shipments' 
ORDER BY ordinal_position;
