-- Fix for Transactions Table Schema
-- Adds the missing 'notes' column required for detailed financial logging

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify/Add reference_id just in case
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS reference_id UUID;
