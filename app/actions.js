"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getDashboardMetrics() {
  try {
    const [
      { count: totalTasks },
      { count: pending },
      { count: completed },
      { data: transactions },
      { data: leads },
      { data: profiles }
    ] = await Promise.all([
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in-progress']),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['completed', 'verified']),
      supabaseAdmin.from('transactions').select('amount, type'),
      supabaseAdmin.from('leads').select('*').limit(3).order('created_at', { ascending: false }),
      supabaseAdmin.from('profiles').select('id, full_name, role').limit(5)
    ]);

    const income = transactions?.filter(t => t.type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
    const expense = transactions?.filter(t => t.type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;

    return {
      success: true,
      stats: {
        totalProjects: totalTasks || 0,
        pendingTasks: pending || 0,
        completedWork: completed || 0,
        monthlyProfit: income - expense
      },
      leads: leads || [],
      activeEmployees: profiles || []
    };
  } catch (error) {
    console.error('Dashboard Metrics Error:', error);
    return { success: false, error: error.message };
  }
}
