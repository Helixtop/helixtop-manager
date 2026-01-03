"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export async function getProjects() {
    try {
        const { data, error } = await supabaseAdmin
            .from('projects')
            .select('*, profiles:assigned_to(full_name, role)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('getProjects Error:', error);
        return { success: false, error: error.message };
    }
}

export async function createProject(formData) {
    try {
        const name = formData.get('name');
        const description = formData.get('description');
        const assigned_to = formData.get('assigned_to');
        const deadline = formData.get('deadline');

        if (!name || !assigned_to) {
            throw new Error('Project Name and Assignee are required.');
        }

        const { data, error } = await supabaseAdmin
            .from('projects')
            .insert([{
                name,
                description,
                assigned_to,
                deadline: deadline || null,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/projects');
        revalidatePath('/'); // Update dashboard count
        return { success: true, data };
    } catch (error) {
        console.error('createProject Error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteProject(projectId) {
    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;

        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('deleteProject Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateProjectStatus(projectId, status) {
    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .update({ status })
            .eq('id', projectId);

        if (error) throw error;

        revalidatePath('/projects');
        return { success: true };
    } catch (error) {
        console.error('updateProjectStatus Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateProjectDetails(projectId, updates) {
    try {
        const { error } = await supabaseAdmin
            .from('projects')
            .update(updates)
            .eq('id', projectId);

        if (error) throw error;

        revalidatePath('/projects');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('updateProjectDetails Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getProjectLogs(projectId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('time_logs')
            .select('*, profiles:user_id(full_name), tasks:task_id(title)')
            .eq('project_id', projectId)
            .order('start_time', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('getProjectLogs Error:', error);
        return { success: false, error: error.message };
    }
}
