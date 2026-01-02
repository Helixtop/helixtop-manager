'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

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
        supabaseAdmin.from('tasks').select('id, title, assigned_to, status, submission_link').order('created_at', { ascending: false })
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

export async function processSalaryPayment(userId, amount, durationStr) {
    try {
        if (!userId || !amount) {
            throw new Error('User ID and Amount are required for payment.');
        }

        // 1. Fetch user name for notes
        const { data: profile, error: pError } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
        
        if (pError) throw pError;

        // 2. Insert transaction
        const { error: tError } = await supabaseAdmin.from('transactions').insert([{
            amount: parseFloat(amount),
            type: 'expense',
            category: 'Payroll',
            notes: `${profile.full_name} (${durationStr})`,
            date: new Date().toISOString().split('T')[0],
            reference_id: userId
        }]);

        if (tError) throw tError;

        // 3. Mark time logs as paid
        const { error: lError } = await supabaseAdmin
            .from('time_logs')
            .update({ is_paid: true })
            .eq('user_id', userId)
            .eq('is_paid', false);
        
        if (lError) throw lError;

        revalidatePath('/team');
        revalidatePath('/accounting');
        revalidatePath('/'); // Dashboard

        return { success: true, message: 'Payment processed and logged to Accounting.' };
    } catch (error) {
        console.error('processSalaryPayment Error:', error);
        return { success: false, message: error.message };
    }
}

export async function getDetailedEmployeeTime(userId, type, value, weekIndex = null) {
    try {
        let query = supabaseAdmin
            .from('time_logs')
            .select('duration, start_time, end_time')
            .eq('user_id', userId);

        const date = new Date(value);
        let start, end;

        if (type === 'Day') {
            start = new Date(date.setHours(0, 0, 0, 0)).toISOString();
            end = new Date(date.setHours(23, 59, 59, 999)).toISOString();
            query = query.gte('start_time', start).lte('start_time', end);
        } else if (type === 'Week') {
            // value is expected as 'YYYY-MM', weekIndex is 1-5
            const [year, month] = value.split('-').map(Number);
            const firstDayOfMonth = new Date(year, month - 1, 1);
            
            // Start of week 1 is the 1st of the month.
            // Each week is exactly 7 days for simplicity as per user request (1st week, 2nd week...)
            const startDay = (weekIndex - 1) * 7 + 1;
            start = new Date(year, month - 1, startDay, 0, 0, 0, 0).toISOString();
            
            // End day is either (start + 7) or end of month
            const endDay = startDay + 7;
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            const actualEndDay = Math.min(endDay, lastDayOfMonth + 1);
            
            end = new Date(year, month - 1, actualEndDay, 0, 0, 0, 0).toISOString();
            query = query.gte('start_time', start).lt('start_time', end);
        } else if (type === 'Month') {
            start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
            end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
            query = query.gte('start_time', start).lte('start_time', end);
        }

        const { data, error } = await query;
        if (error) throw error;

        const totalSeconds = (data || []).reduce((acc, curr) => {
            let dur = Number(curr.duration) || 0;
            if (!curr.end_time && curr.start_time) {
                const s = new Date(curr.start_time).getTime();
                const n = Date.now();
                dur += Math.max(0, Math.floor((n - s) / 1000));
            }
            return acc + dur;
        }, 0);

        return { success: true, totalSeconds };
    } catch (error) {
        console.error('getDetailedEmployeeTime Error:', error);
        return { success: false, message: error.message };
    }
}

export async function updateEmployeeRole(prevState, formData) {
  const userId = formData.get('userId');
  const role = formData.get('role');

  if (!userId || !role) {
    return { success: false, message: 'Missing required fields.' };
  }

  try {
    // 1. Update Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role })
      .eq('id', userId);

    if (profileError) throw profileError;

    // 2. Update Auth Metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: role }
    });

    if (authError) throw authError;

    revalidatePath('/team');
    return { success: true, message: 'Role updated successfully.' };
  } catch (error) {
    console.error('Update Role Error:', error);
    return { success: false, message: 'Failed to update role: ' + error.message };
  }
}

export async function scheduleMeeting(prevState, formData) {
  const userId = formData.get('userId');
  const leadName = formData.get('leadName');
  const meetingTime = formData.get('meetingTime');
  const description = formData.get('description');

  if (!userId || !leadName || !meetingTime) {
    return { success: false, message: 'Missing required fields.' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('leads')
      .insert([{
        name: leadName,
        stage: 'meeting-booked',
        assigned_to: userId,
        meeting_time: meetingTime,
        type: 'General Meeting',
        priority: 'medium',
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    revalidatePath('/team');
    revalidatePath('/pending-works');
    return { success: true, message: 'Meeting scheduled successfully.' };
  } catch (error) {
    console.error('Schedule Meeting Error:', error);
    return { success: false, message: 'Failed to schedule meeting: ' + error.message };
  }
}
