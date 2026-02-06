-- Fix for: "violates foreign key constraint shipments_user_id_fkey"
-- The app needs this specific user to exist to link the Shipment to it.

INSERT INTO public.users (company_name)
VALUES ('Synthetic Steps Ltd');

-- If you get an error like "column id cannot be null", try this version instead:
-- INSERT INTO public.users (id, company_name) VALUES (gen_random_uuid(), 'Synthetic Steps Ltd');
