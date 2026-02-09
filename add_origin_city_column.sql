-- Add origin_city column to shipments table for dynamic map display
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin_city TEXT DEFAULT 'Dhaka';

-- Update existing records to have default
UPDATE shipments SET origin_city = 'Dhaka' WHERE origin_city IS NULL;
