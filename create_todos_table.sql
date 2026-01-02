-- Table: todos
CREATE TABLE public.todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SECURITY: Enable RLS
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- POLICY: Full access for authenticated users (matching existing pattern)
CREATE POLICY "Full access for authenticated users - Todos" ON public.todos FOR ALL TO authenticated USING (true);
