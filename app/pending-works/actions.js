"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getPendingWorks() {
  try {
    const [
      { data: tasks, error: tasksError },
      { data: marketing, error: marketingError },
      { data: leads, error: leadsError }
    ] = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('*, profiles:assigned_to(full_name)')
        .in('status', ['pending', 'in-progress']),
      supabaseAdmin
        .from('marketing_content')
        .select('*, profiles:assigned_to(full_name)')
        .in('status', ['planned', 'shot', 'edited', 'admin-review']),
      supabaseAdmin
        .from('leads')
        .select('*, profiles:assigned_to(full_name)')
        .eq('stage', 'meeting-booked')
    ]);

    if (tasksError) throw tasksError;
    if (marketingError) throw marketingError;
    if (leadsError) throw leadsError;

    // Normalize data for the unified view
    const normalizedTasks = (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      type: 'Task',
      assigned_to: t.profiles?.full_name,
      deadline: t.deadline,
      created_at: t.created_at,
      original_type: 'task'
    }));

    const normalizedMarketing = (marketing || []).map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      type: 'Marketing',
      assigned_to: m.profiles?.full_name,
      deadline: m.scheduled_date,
      created_at: m.created_at,
      original_type: 'marketing'
    }));

    const normalizedMeetings = (leads || []).map(l => ({
      id: l.id,
      title: `Meeting with ${l.name}`,
      description: `Stage: ${l.stage}, Type: ${l.type}`,
      status: 'pending',
      type: 'Meeting',
      assigned_to: l.profiles?.full_name,
      deadline: l.meeting_time,
      created_at: l.created_at,
      original_type: 'meeting'
    }));

    return {
      success: true,
      data: [...normalizedTasks, ...normalizedMarketing, ...normalizedMeetings].sort((a, b) => 
        new Date(a.deadline || a.created_at) - new Date(b.deadline || b.created_at)
      )
    };
  } catch (error) {
    console.error('Error fetching pending works:', error);
    return { success: false, error: error.message };
  }
}
