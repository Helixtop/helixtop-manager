-- Comprehensive Fix for Leads Table Schema
-- Resolves "column not found" errors for: company, email, phone, budget, description

-- 1. Add 'company' column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS company TEXT;

-- 2. Add 'email' column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add 'phone' column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. Add 'budget' column
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;

-- 5. Add 'description' column (for project scope)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Note: 'contact' column likely exists but is split into phone/email in the UI now.
-- We keep 'contact' for backward compatibility.
