
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  const { data, count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total Transactions:', count);
    console.log('Sample Data:', data.slice(0, 3));
  }
}

test();
