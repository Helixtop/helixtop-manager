import { createClient } from '@supabase/supabase-js';

// Access environment variables directly since this runs on the server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase Service Role configuration.');
}

// Create a Supabase client with the Service Role Key
// detailed: 'auth' options are set to persistSession: false because this is for admin tasks only
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
