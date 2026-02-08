-- Fix for regulatory_rates table
-- This will drop and recreate the table cleanly

-- Step 1: Drop the existing table if it exists (safe to run)
DROP TABLE IF EXISTS public.regulatory_rates CASCADE;

-- Step 2: Create the table with correct schema
CREATE TABLE public.regulatory_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    incentive_rate NUMERIC NOT NULL DEFAULT 0.08,
    ldc_risk_rate NUMERIC NOT NULL DEFAULT 0.119,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Insert default data
INSERT INTO public.regulatory_rates (category, incentive_rate, ldc_risk_rate, description) VALUES
    ('Textile', 0.08, 0.119, 'RMG Sector - Chapters 61-63'),
    ('Footwear', 0.08, 0.119, 'Footwear - Chapter 64'),
    ('Leather', 0.05, 0.119, 'Leather Goods - Chapter 42'),
    ('Plastics', 0.03, 0.119, 'Plastic Products - Chapter 39'),
    ('General', 0.04, 0.119, 'Default for other categories');

-- Step 4: Enable RLS and create public read policy
ALTER TABLE public.regulatory_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for regulatory rates" ON public.regulatory_rates;
CREATE POLICY "Allow public read for regulatory rates" 
ON public.regulatory_rates FOR SELECT 
TO public 
USING (true);

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_regulatory_rates_category ON public.regulatory_rates(category);

-- Verification: Check the data
SELECT * FROM public.regulatory_rates ORDER BY category;
