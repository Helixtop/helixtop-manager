"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getDashboardMetrics() {
  try {
    const [
      { count: totalTasks },
      { count: pending },
      { count: verified },
      { data: transactions },
      { data: leads },
      { data: profiles },
      { data: marketingReview },
      { data: reviewTasks }
    ] = await Promise.all([
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in-progress']),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
      supabaseAdmin.from('transactions').select('amount, type'),
      supabaseAdmin.from('leads').select('*').limit(3).order('created_at', { ascending: false }),
      supabaseAdmin.from('profiles').select('id, full_name, role').limit(5),
      supabaseAdmin.from('marketing_content').select('*, profiles:assigned_to(full_name)').eq('status', 'admin-review').limit(5),
      supabaseAdmin.from('tasks').select('*, profiles:assigned_to(full_name)').eq('status', 'completed').order('created_at', { ascending: false })
    ]);

    const income = transactions?.filter(t => t.type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
    const expense = transactions?.filter(t => t.type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;

    return {
      success: true,
      stats: {
        totalProjects: totalTasks || 0,
        pendingTasks: pending || 0,
        completedWork: verified || 0,
        monthlyProfit: income - expense
      },
      leads: leads || [],
      activeEmployees: profiles || [],
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
