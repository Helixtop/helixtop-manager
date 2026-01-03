"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getDashboardMetrics() {
  try {
    // Calculate week start
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString();

    const [
      { count: totalTasks },
      { count: totalProjects },
      { count: pending },
      { count: verified },
      { data: transactions },
      { data: profiles },
      { data: weeklyLogs },
      { data: assignedProjects },
      { data: marketingContent },
      { data: marketingReview },
      { data: reviewTasks }
    ] = await Promise.all([
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in-progress']),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
      supabaseAdmin.from('transactions').select('amount, type'),
      supabaseAdmin.from('profiles').select('id, full_name, role').neq('role', 'Admin'),
      supabaseAdmin.from('time_logs').select('user_id, duration, start_time, end_time').gte('start_time', startOfWeekStr),
      supabaseAdmin.from('projects').select('id, name, assigned_to, status').neq('status', 'completed'),
      supabaseAdmin.from('marketing_content').select('*').neq('status', 'posted').neq('status', 'approved'),
      supabaseAdmin.from('marketing_content').select('*, profiles:assigned_to(full_name)').eq('status', 'admin-review').limit(5),
      supabaseAdmin.from('tasks').select('*, profiles:assigned_to(full_name)').eq('status', 'completed').order('created_at', { ascending: false })
    ]);

    const income = transactions?.filter(t => t.type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
    const expense = transactions?.filter(t => t.type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;

    // Get all marketing content for statistics
    const { data: allMarketingContent } = await supabaseAdmin
      .from('marketing_content')
      .select('assigned_to, status');

    // Process team members with working hours, projects, and marketing content
    const teamMembers = (profiles || []).map(profile => {
      // Calculate weekly working hours
      const userWeeklyLogs = (weeklyLogs || []).filter(log => log.user_id === profile.id);
      const weeklySeconds = userWeeklyLogs.reduce((acc, curr) => {
        let dur = Number(curr.duration) || 0;
        // Include live sessions
        if (!curr.end_time && curr.start_time) {
          const start = new Date(curr.start_time).getTime();
          const nowTime = Date.now();
          const activeDur = Math.max(0, Math.floor((nowTime - start) / 1000));
          dur += activeDur;
        }
        return acc + dur;
      }, 0);

      // Get assigned projects
      const userProjects = (assignedProjects || []).filter(proj => proj.assigned_to === profile.id);

      // Get pending marketing content
      const userMarketingContent = (marketingContent || []).filter(content => content.assigned_to === profile.id);

      // Calculate work statistics from all marketing content
      const allUserContent = (allMarketingContent || []).filter(content => content.assigned_to === profile.id);
      const completedWork = allUserContent.filter(c => c.status === 'posted' || c.status === 'approved').length;
      const pendingWork = allUserContent.filter(c => !['posted', 'approved', 'rejected'].includes(c.status)).length;
      const rejectedWork = allUserContent.filter(c => c.status === 'rejected').length;

      return {
        ...profile,
        weeklySeconds,
        assignedProjects: userProjects.map(p => ({ id: p.id, name: p.name, status: p.status })),
        projectCount: userProjects.length,
        pendingMarketing: userMarketingContent,
        marketingCount: userMarketingContent.length,
        workStats: {
          completed: completedWork,
          pending: pendingWork,
          rejected: rejectedWork
        }
      };
    });

    return {
      success: true,
      stats: {
        totalProjects: totalProjects || 0,
        pendingTasks: pending || 0,
        completedWork: verified || 0,
        monthlyProfit: income - expense
      },
      teamMembers: teamMembers,
      marketingReview: marketingReview || [],
      reviewTasks: reviewTasks || []
    };
  } catch (error) {
    console.error('Dashboard Metrics Error:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyTask(taskId, status, feedback = '') {
  try {
    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ 
        status, 
        admin_feedback: feedback 
      })
      .eq('id', taskId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Verify Task Error:', error);
    return { success: false, error: error.message };
  }
}

export async function createTask(formData) {
  try {
    const title = formData.get('title');
    const description = formData.get('description');
    const deadline = formData.get('deadline');
    const assigned_to = formData.get('assigned_to');

    // Basic validation
    if (!title || !description || !assigned_to) {
      throw new Error('Missing required fields');
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert([
        {
          title,
          description,
          deadline: deadline || null,
          assigned_to,
          status: 'pending',
          type: 'Project', // Defaulting to Project as per feature request
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Create Task Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getIncomeGraphData(period) {
  try {
    const today = new Date();
    let startDate = new Date();
    let dateFormat = ''; // 'daily' or 'monthly'

    if (period === 'week') {
      startDate.setDate(today.getDate() - 7);
      dateFormat = 'daily';
    } else if (period === 'month') {
      startDate.setDate(today.getDate() - 30);
      dateFormat = 'daily';
    } else if (period === 'year') {
      startDate.setFullYear(today.getFullYear() - 1);
      dateFormat = 'monthly';
    }

    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select('amount, date, type')
      .eq('type', 'income')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    // Aggregation Logic
    const aggregated = {};
    
    // Initialize defaults to show empty graph if no data
    if (period === 'week') {
        for(let i=0; i<7; i++) {
            const d = new Date();
            d.setDate(today.getDate() - (6-i));
            aggregated[d.toISOString().split('T')[0]] = 0;
        }
    } else if (period === 'month') {
        for(let i=0; i<30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - (29-i));
            aggregated[d.toISOString().split('T')[0]] = 0;
        }
    } else if (period === 'year') {
        for(let i=0; i<12; i++) {
            const d = new Date();
            d.setMonth(today.getMonth() - (11-i));
            const key = d.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
            aggregated[key] = 0;
        }
    }

    transactions.forEach(t => {
      let key = t.date; // Default YYYY-MM-DD
      if (dateFormat === 'monthly') {
        key = t.date.substring(0, 7); // YYYY-MM
      }
      
      aggregated[key] = (aggregated[key] || 0) + parseFloat(t.amount);
    });

    // Format for Recharts
    const chartData = Object.keys(aggregated).map(key => ({
      name: key,
      income: aggregated[key]
    })).sort((a,b) => new Date(a.name) - new Date(b.name));

    return { success: true, data: chartData };
  } catch (error) {
    console.error('Graph Data Error:', error);
    return { success: false, error: error.message };
  }
}

export async function migrateTasksToProjects() {
  try {
    // 1. Fetch all tasks of type 'Project'
    const { data: tasks, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('type', 'Project');

    if (fetchError) throw fetchError;
    if (!tasks || tasks.length === 0) return { success: true, count: 0 };

    // 2. Insert into projects table
    const projectsToInsert = tasks.map(t => ({
      name: t.title,
      description: t.description,
      status: t.status === 'verified' ? 'completed' : t.status,
      assigned_to: t.assigned_to,
      deadline: t.deadline,
      created_at: t.created_at
    }));

    const { error: insertError } = await supabaseAdmin
      .from('projects')
      .insert(projectsToInsert);

    if (insertError) throw insertError;

    // 3. Mark tasks as migrated or delete them? 
    // Let's just keep them but the user requested "Registry" style.
    
    return { success: true, count: tasks.length };
  } catch (error) {
    console.error('Migration Error:', error);
    return { success: false, error: error.message };
  }
}
export async function deleteMarketingContent(contentId) {
  try {
    const { error } = await supabaseAdmin
      .from('marketing_content')
      .delete()
      .eq('id', contentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete Marketing Content Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMarketingContentDetails(contentId, formData) {
  try {
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      platform: formData.get('platform'),
      scheduled_date: formData.get('scheduled_date')
    };

    const { error } = await supabaseAdmin
      .from('marketing_content')
      .update(data)
      .eq('id', contentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Update Marketing Content Error:', error);
    return { success: false, error: error.message };
  }
}
