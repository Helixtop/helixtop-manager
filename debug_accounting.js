const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAccounting() {
  console.log('--- Checking Ad Campaigns ---');
  const { data: campaigns } = await supabase.from('ad_campaigns').select('id, campaign_name, budget, spend');
  console.table(campaigns);

  console.log('\n--- Checking Transactions (last 10) ---');
  const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10);
  console.table(txs);

  console.log('\n--- Checking for "Ad Allocation" or "Ad Spend" categories ---');
  const { data: adTxs } = await supabase.from('transactions').select('*').in('category', ['Ad Allocation', 'Ad Spend']);
  console.table(adTxs);
}

debugAccounting();
