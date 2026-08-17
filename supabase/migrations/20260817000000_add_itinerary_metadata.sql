-- Add metadata JSONB column to public.itinerary_items to store real-world itinerary intelligence
-- (opening hours, rating, verification status, cost range, reasons, address, website)
ALTER TABLE public.itinerary_items 
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
