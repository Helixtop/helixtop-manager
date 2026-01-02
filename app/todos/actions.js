"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function getUserTodos(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('getUserTodos Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getTeamTodos() {
  try {
    const { data, error } = await supabaseAdmin
      .from('todos')
      .select('*, profiles(id, full_name, role)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('getTeamTodos Error:', error);
    return { success: false, error: error.message };
  }
}

export async function addTodo(text, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('todos')
      .insert([{ text, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/'); // Revalidate home/dashboard
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function toggleTodo(id, completed) {
  try {
    const { error } = await supabaseAdmin
      .from('todos')
      .update({ completed })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteTodo(id) {
  try {
    const { error } = await supabaseAdmin
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
