'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Server Action to create a new employee using the Service Role.
 * This bypasses client-side rate limits and ensures secure provisioning.
 */
export async function createEmployee(prevState, formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');
  const role = formData.get('role');
  const hourlyRate = formData.get('hourly_rate');

  try {
    // 1. Create the user in Supabase Auth
    // Use admin.createUser to skip email verification if needed, or just standard creation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so they can login immediately
      user_metadata: {
        full_name: name,
        role: role
      }
    });

    let userId;

    if (authError) {
      // If user already exists, we want to heal the profile link
      if (authError.message.includes('already been registered') || authError.status === 422) {
         console.log('User already exists, fetching ID to sync profile...');
         
         // Fetch all users (with high limit) to find the existing user
         // supabase-js listUsers() defaults to 50, so we increase it to ensure we find them
         const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
         
         if (listError) {
            console.error('List Users Error:', listError);
            return { success: false, message: 'Failed to resolve existing user.' };
         }

         const existingUser = listData?.users.find(u => u.email.toLowerCase() === email.toLowerCase());
         
         if (existingUser) {
            userId = existingUser.id;
            // Update metadata to ensure latest role/name
            await supabaseAdmin.auth.admin.updateUserById(userId, {
               user_metadata: { full_name: name, role: role }
            });
         } else {
            return { success: false, message: 'User exists but could not be resolved. Please contact support.' };
         }
      } else {
         console.error('Auth Creation Error:', authError);
         return { success: false, message: authError.message };
      }
    } else {
      userId = authData.user.id;
    }

    if (!userId) {
      return { success: false, message: 'User resolution failed.' };
    }

    // 2. Update the Profile in the database
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: name,
        role: role,
        hourly_rate: parseFloat(hourlyRate),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile Update Error:', profileError);
      return { success: false, message: 'Account created but profile sync failed: ' + profileError.message };
    }

    return { success: true, message: `Employee record synced for ${name} successfully.` };

  } catch (error) {
    console.error('Server Action Error:', error);
    return { success: false, message: 'Unexpected server error: ' + error.message };
  }
}

/**
 * Server Action to fetch all employees with their unpaid tracked time.
 * Replaces client-side fetching to ensure reliability and bypass RLS/anon key issues.
 */
export async function getEmployees() {
  try {
    // 1. Fetch profiles
    const { data: profiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('full_name');

    if (pError) throw new Error('Profiles fetch failed: ' + pError.message);

    // 2. Fetch logs and tasks for stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Get start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString();

    const [
        { data: allUnpaidLogs },
        { data: allPaidLogs },
        { data: monthlyLogs },
        { data: weeklyLogs },
        { data: taskStats }
    ] = await Promise.all([
        supabaseAdmin.from('time_logs').select('user_id, duration, start_time, end_time').eq('is_paid', false),
        supabaseAdmin.from('time_logs').select('user_id, duration, start_time, end_time').eq('is_paid', true),
        supabaseAdmin.from('time_logs').select('user_id, duration, start_time, end_time').gte('start_time', startOfMonth),
        supabaseAdmin.from('time_logs').select('user_id, duration, start_time, end_time').gte('start_time', startOfWeekStr),
        supabaseAdmin.from('tasks').select('id, title, assigned_to, status').order('created_at', { ascending: false })
    ]);

    // 3. Aggregate data
    const safeProfiles = profiles || [];
    
    // Helper to calc duration including live sessions
    const calcSeconds = (logs) => logs.reduce((acc, curr) => {
        let dur = Number(curr.duration) || 0;
        // If end_time is null, it's a live session
        if (!curr.end_time && curr.start_time) {
            const start = new Date(curr.start_time).getTime();
            const now = Date.now();
            const activeDur = Math.max(0, Math.floor((now - start) / 1000));
            dur += activeDur;
        }
        return acc + dur;
    }, 0);

    const processedEmployees = safeProfiles.map(profile => {
      const unpaid = (allUnpaidLogs || []).filter(l => l.user_id === profile.id);
      const paid = (allPaidLogs || []).filter(l => l.user_id === profile.id);
      const monthly = (monthlyLogs || []).filter(l => l.user_id === profile.id);
      const weekly = (weeklyLogs || []).filter(l => l.user_id === profile.id);
      const tasks = (taskStats || []).filter(t => t.assigned_to === profile.id);

      const unpaidSeconds = calcSeconds(unpaid);
      const paidSeconds = calcSeconds(paid);
      
      const hourlyRate = profile.hourly_rate || 0;
      // Return top 20 recent tasks
      const recentTasks = tasks.slice(0, 20); 

      return {
        ...profile,
        stats: {
             unpaidSeconds: unpaidSeconds,
             paidSeconds: paidSeconds,
             monthlySeconds: calcSeconds(monthly),
             weeklySeconds: calcSeconds(weekly),
             completedTasks: tasks.filter(t => t.status === 'verified').length,
             recentTasks: recentTasks,
             pendingTasks: tasks.filter(t => t.status !== 'verified').length,
             pendingPayment: Math.round((unpaidSeconds / 3600) * hourlyRate),
             totalPaidEstimated: Math.round((paidSeconds / 3600) * hourlyRate)
        }
      };
    });

    return { success: true, data: processedEmployees };
  } catch (error) {
    console.error('Server Action Error (getEmployees):', error);
    return { success: false, message: 'Data fetch error: ' + error.message };
  }
}

/**
 * Server Action to update an employee's hourly rate.
 */
export async function updateEmployeeSalary(prevState, formData) {
  const userId = formData.get('userId');
  const newRate = formData.get('hourly_rate');

  if (!userId || !newRate) {
    return { success: false, message: 'Missing required fields.' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ hourly_rate: parseFloat(newRate) })
      .eq('id', userId);

    if (error) throw error;

    return { success: true, message: 'Salary updated successfully.' };
  } catch (error) {
    console.error('Update Salary Error:', error);
    return { success: false, message: 'Failed to update salary: ' + error.message };
  }
}
