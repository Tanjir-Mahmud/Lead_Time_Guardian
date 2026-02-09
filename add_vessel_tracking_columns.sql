-- Add vessel tracking columns to shipments table
-- Run this in Supabase SQL Editor after add_dashboard_columns.sql

-- Vessel identification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='vessel_mmsi'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN vessel_mmsi TEXT;
    END IF;
END $$;

-- Predicted vs Actual lead time tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='predicted_lead_time'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN predicted_lead_time INTEGER;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='actual_lead_time'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN actual_lead_time INTEGER;
    END IF;
END $$;

-- Vessel position tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='vessel_latitude'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN vessel_latitude NUMERIC;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='vessel_longitude'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN vessel_longitude NUMERIC;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='shipments' AND column_name='last_tracked_at'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN last_tracked_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add index for MMSI lookups
CREATE INDEX IF NOT EXISTS idx_shipments_vessel_mmsi ON public.shipments(vessel_mmsi);

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'shipments' 
ORDER BY ordinal_position;
