-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'verified', 'on-hold')),
    assigned_to UUID REFERENCES public.profiles(id),
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Add wide-open policy for authenticated users (matching existing pattern)
CREATE POLICY "Full access for authenticated users - Projects" 
ON public.projects FOR ALL TO authenticated USING (true);
