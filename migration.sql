-- Add missing columns for Payroll System

-- Fix time_logs table
ALTER TABLE public.time_logs 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Fix profiles table (ensure payroll tracking columns exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(15, 2) DEFAULT 0;

-- Ensure RLS policies are up to date for new columns (usually automatic, but good to check)
-- (No extra commands needed for existing policies as they are 'USING (true)' for authenticated)

-- Create working_days table if not exists (Required for Marketing Module)
CREATE TABLE IF NOT EXISTS public.working_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for working_days
ALTER TABLE public.working_days ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid errors, then recreate
DROP POLICY IF EXISTS "Full access for authenticated users - Working Days" ON public.working_days;
CREATE POLICY "Full access for authenticated users - Working Days" ON public.working_days FOR ALL TO authenticated USING (true);

-- Tasks Table Policies for RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow users to view tasks assigned to them
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
CREATE POLICY "Users can view assigned tasks" ON public.tasks 
FOR SELECT TO authenticated 
USING (auth.uid() = assigned_to);

-- Allow users to update tasks assigned to them (e.g. status)
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
CREATE POLICY "Users can update assigned tasks" ON public.tasks 
FOR UPDATE TO authenticated 
USING (auth.uid() = assigned_to);
