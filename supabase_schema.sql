-- Helixtop Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles (Users & Employees)
CREATE TABLE public.profiles (
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
CREATE TABLE public.leads (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: projects_tasks (Workflow)
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'verified', 'rejected')),
    type TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    submission_link TEXT,
    admin_feedback TEXT,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: marketing_content (Calendar)
CREATE TABLE public.marketing_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    platform TEXT,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'shot', 'edited', 'posted', 'admin-review', 'approved', 'rejected')),
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
CREATE TABLE public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name TEXT NOT NULL,
    budget DECIMAL(10, 2),
    spend DECIMAL(10, 2),
    leads_generated INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: transactions (Accounting)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT CHECK (type IN ('income', 'expense')),
    category TEXT, -- Salary, Project Payment, Ad Spend, etc.
    amount DECIMAL(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    reference_id UUID, -- Link to lead (for income) or profile/salary (for expense)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: time_logs
CREATE TABLE public.time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    task_id UUID REFERENCES public.tasks(id),
    marketing_content_id UUID REFERENCES public.marketing_content(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: credentials_vault
CREATE TABLE public.credentials_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    url TEXT,
    login_email TEXT,
    encrypted_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INITIAL ADMIN SETUP
INSERT INTO public.profiles (email, full_name, role, hourly_rate)
VALUES ('admin@helixtop.com', 'Helixtop Admin', 'Admin', 0.00);

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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- SECURITY: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials_vault ENABLE ROW LEVEL SECURITY;

-- POLICY: Wide open access for authenticated users (Debugging)
CREATE POLICY "Full access for authenticated users - Profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access for authenticated users - Leads" ON public.leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access for authenticated users - Tasks" ON public.tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access for authenticated users - Marketing" ON public.marketing_content FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access for authenticated users - Transactions" ON public.transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access for authenticated users - Times" ON public.time_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access for authenticated users - Vault" ON public.credentials_vault FOR ALL TO authenticated USING (true);
-- Table: working_days
CREATE TABLE public.working_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SECURITY & POLICIES
ALTER TABLE public.working_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access for authenticated users - Working Days" ON public.working_days FOR ALL TO authenticated USING (true);
