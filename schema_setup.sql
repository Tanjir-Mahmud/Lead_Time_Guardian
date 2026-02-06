-- Create 'shipments' table (Safely)
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    invoice_no TEXT,
    fob_value NUMERIC,
    hs_code TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create 'audit_logs' table (Safely)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES public.shipments(id),
    assessable_value NUMERIC,
    incentive_amount NUMERIC,
    ldc_risk_value NUMERIC,
    risk_score NUMERIC,
    audit_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and Create Policies (Drop first to avoid conflicts if re-running)
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write" ON public.shipments;
CREATE POLICY "Allow public read-write" ON public.shipments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write" ON public.audit_logs;
CREATE POLICY "Allow public read-write" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
