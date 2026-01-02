const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function restoreRole() {
  const email = 'sajithk@gmail.com';
  const newRole = 'Digital Content Creator';

  console.log(`Restoring role for ${email} to ${newRole}...`);

  // 1. Get User ID
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error('Error listing users:', authError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error('User not found in Auth');
    return;
  }

  const userId = user.id;

  // 2. Update Profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
  } else {
    console.log('Profile updated successfully.');
  }

  // 3. Update Auth Metadata
  const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole }
  });

  if (metadataError) {
    console.error('Error updating auth metadata:', metadataError);
  } else {
    console.log('Auth metadata updated successfully.');
  }
}

restoreRole();
