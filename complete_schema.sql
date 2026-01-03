-- Comprehensive Supabase Schema Setup
-- This script includes all tables, extensions, and policies needed for the application.

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables

-- Table: profiles (Users & Employees)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('Admin', 'Developer', 'Digital Content Creator', 'Salesman')),
    hourly_rate DECIMAL(10, 2),
    last_paid_at TIMESTAMP WITH TIME ZONE,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: leads (Sales Pipeline)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT,
    contact TEXT,
    stage TEXT CHECK (stage IN ('ad-leads', 'contacted', 'meeting-booked', 'meeting-completed', 'win', 'lose')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    meeting_time TIMESTAMP WITH TIME ZONE,
    loss_reason TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    payment_structure JSONB, -- total, advance, installments
    company TEXT,
    email TEXT,
    phone TEXT,
    budget NUMERIC DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: projects (Project Management)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'verified', 'on-hold', 'under-review', 'rejected')),
    submission_link TEXT,
    admin_feedback TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: tasks (Workflow)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'verified', 'rejected', 'under-review')),
    type TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    project_id UUID REFERENCES public.projects(id),
    submission_link TEXT,
    admin_feedback TEXT,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure project_id exists if table was already created
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Table: marketing_content (Calendar)
CREATE TABLE IF NOT EXISTS public.marketing_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    platform TEXT,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'shot', 'edited', 'posted', 'admin-review', 'approved', 'rejected', 'under-review', 'completed')),
    is_shot BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_posted BOOLEAN DEFAULT FALSE,
    drive_link TEXT,
    admin_feedback TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ad_campaigns
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name TEXT NOT NULL,
    budget DECIMAL(10, 2),
    spend DECIMAL(10, 2),
    leads_generated INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: transactions (Accounting)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT, -- Salary, Project Payment, Ad Spend, etc.
    amount DECIMAL(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    reference_id UUID, -- Link to lead (for income) or profile/salary (for expense)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: time_logs
CREATE TABLE IF NOT EXISTS public.time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    task_id UUID REFERENCES public.tasks(id),
    project_id UUID REFERENCES public.projects(id),
    marketing_content_id UUID REFERENCES public.marketing_content(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    is_paid BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure project_id exists if table was already created
ALTER TABLE public.time_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Table: credentials_vault
CREATE TABLE IF NOT EXISTS public.credentials_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    url TEXT,
    login_email TEXT,
    encrypted_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: working_days
CREATE TABLE IF NOT EXISTS public.working_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: todos
CREATE TABLE IF NOT EXISTS public.todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Triggers & Functions

-- TRIGGER: Auto-create profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'Developer')
  )
  ON CONFLICT (id) DO NOTHING; -- Handle duplicate calls safely
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid duplication error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- INITIAL ADMIN SETUP (Idempotent)
INSERT INTO public.profiles (email, full_name, role, hourly_rate)
VALUES ('admin@helixtop.com', 'Helixtop Admin', 'Admin', 0.00)
ON CONFLICT (email) DO NOTHING;

-- 4. Enable RLS and Policies

-- Helper to enable RLS and drop existing policies to ensure clean state
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t); 
    END LOOP; 
END $$;

-- Policy Creation

-- --- ROW LEVEL SECURITY POLICIES ---

-- Profiles: Users can view all profiles, but only edit their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Leads: Full access for authenticated users (Admin and Sales)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leads full access" ON public.leads;
CREATE POLICY "Leads full access" ON public.leads FOR ALL TO authenticated USING (true);

-- Projects: Full access for authenticated users
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects full access" ON public.projects;
CREATE POLICY "Projects full access" ON public.projects FOR ALL TO authenticated USING (true);

-- Tasks: Users can see assigned, Admins see all
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT TO authenticated 
USING (auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
CREATE POLICY "Users can update assigned tasks" ON public.tasks FOR UPDATE TO authenticated 
USING (auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

DROP POLICY IF EXISTS "Admins can do everything on tasks" ON public.tasks;
CREATE POLICY "Admins can do everything on tasks" ON public.tasks FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Marketing Content: Users see assigned, Admins see all
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Marketing full access" ON public.marketing_content;
CREATE POLICY "Marketing full access" ON public.marketing_content FOR ALL TO authenticated 
USING (auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Ad Campaigns
DROP POLICY IF EXISTS "Full access for authenticated users - Ads" ON public.ad_campaigns;
CREATE POLICY "Full access for authenticated users - Ads" ON public.ad_campaigns FOR ALL TO authenticated USING (true);

-- Transactions: Admin only (for safety)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins only transactions" ON public.transactions;
CREATE POLICY "Admins only transactions" ON public.transactions FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Time Logs: Users see own, Admins see all
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Time logs access" ON public.time_logs;
CREATE POLICY "Time logs access" ON public.time_logs FOR ALL TO authenticated 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Credentials Vault: Admins only
ALTER TABLE public.credentials_vault ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins only vault" ON public.credentials_vault;
CREATE POLICY "Admins only vault" ON public.credentials_vault FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Working Days
DROP POLICY IF EXISTS "Full access for authenticated users - Working Days" ON public.working_days;
CREATE POLICY "Full access for authenticated users - Working Days" ON public.working_days FOR ALL TO authenticated USING (true);

-- Todos
DROP POLICY IF EXISTS "Full access for authenticated users - Todos" ON public.todos;
CREATE POLICY "Full access for authenticated users - Todos" ON public.todos FOR ALL TO authenticated USING (true);


-- 5. Safe Checks for Columns
-- Leads Extras
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS description TEXT;

-- Transactions Extras
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_id UUID;
