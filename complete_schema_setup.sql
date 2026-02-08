-- Complete Database Schema for Lead Time Guardian
-- Run this in your Supabase SQL Editor to create all missing tables

-- ====================================================
-- 1. REGULATORY_RATES TABLE (MISSING - CRITICAL)
-- ====================================================
CREATE TABLE IF NOT EXISTS public.regulatory_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    incentive_rate NUMERIC NOT NULL DEFAULT 0.08,
    ldc_risk_rate NUMERIC NOT NULL DEFAULT 0.119,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default regulatory rates
INSERT INTO public.regulatory_rates (category, incentive_rate, ldc_risk_rate, description) VALUES
    ('Textile', 0.08, 0.119, 'RMG Sector - Chapters 61-63'),
    ('Footwear', 0.08, 0.119, 'Footwear - Chapter 64'),
    ('Leather', 0.05, 0.119, 'Leather Goods - Chapter 42'),
    ('Plastics', 0.03, 0.119, 'Plastic Products - Chapter 39'),
    ('General', 0.04, 0.119, 'Default for other categories')
ON CONFLICT DO NOTHING;

-- Make regulatory_rates publicly readable (no auth required for API to fetch)
ALTER TABLE public.regulatory_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for regulatory rates" ON public.regulatory_rates;
CREATE POLICY "Allow public read for regulatory rates" 
ON public.regulatory_rates FOR SELECT 
TO public 
USING (true);

-- ====================================================
-- 2. ENSURE SHIPMENTS TABLE EXISTS
-- ====================================================
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    invoice_no TEXT UNIQUE NOT NULL,
    fob_value NUMERIC NOT NULL,
    hs_code TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================
-- 3. ENSURE AUDIT_LOGS TABLE EXISTS WITH ALL COLUMNS
-- ====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    assessable_value NUMERIC,
    incentive_amount NUMERIC,
    ldc_risk_value NUMERIC,
    risk_score NUMERIC,
    carbon_score TEXT,
    audit_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add carbon_score column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='audit_logs' AND column_name='carbon_score'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN carbon_score TEXT;
    END IF;
END $$;

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='audit_logs' AND column_name='user_id'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- ====================================================
-- 4. ENABLE RLS AND CREATE POLICIES
-- ====================================================

-- Shipments RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users can update their own shipments" ON public.shipments;
CREATE POLICY "Users can update their own shipments" 
ON public.shipments FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Audit Logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

-- ====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ====================================================
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_invoice_no ON public.shipments(invoice_no);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_shipment_id ON public.audit_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_rates_category ON public.regulatory_rates(category);

-- ====================================================
-- VERIFICATION QUERIES
-- ====================================================
-- Run these to verify everything is set up correctly:

-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check regulatory_rates data:
-- SELECT * FROM public.regulatory_rates;

-- Check RLS policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
