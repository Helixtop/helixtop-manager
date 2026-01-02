"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

function serializeDate(item) {
  if (!item) return null;
  return {
    ...item,
    scheduled_date: item.scheduled_date || null,
    date: item.scheduled_date ? new Date(item.scheduled_date).toISOString() : null, // Helper for serialization
    created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
  };
}

export async function getMarketingData() {
  try {
    const [
      { data: content, error: cError },
      { data: ads, error: aError },
      { data: workingDays, error: wError }
    ] = await Promise.all([
      supabaseAdmin.from('marketing_content').select('*').order('scheduled_date', { ascending: true }),
      supabaseAdmin.from('ad_campaigns').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('working_days').select('date')
    ]);

    if (cError) throw cError;
    if (aError) throw aError;
    if (wError) throw wError;

    return {
      success: true,
      content: content?.map(serializeDate) || [],
      ads: ads || [],
      workingDays: workingDays?.map(d => d.date) || []
    };
  } catch (error) {
    console.error('Server Action getMarketingData Error:', error);
    return { success: false, error: error.message };
  }
}

export async function createContent(formData) {
  try {
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      platform: formData.get('platform'),
      scheduled_date: formData.get('scheduled_date'),
      status: 'planned'
    };
    
    // Validate
    if (!data.title || !data.scheduled_date) {
        throw new Error('Title and Date are required');
    }

    const { error } = await supabaseAdmin.from('marketing_content').insert([data]);

    if (error) throw error;
    
    revalidatePath('/marketing');
    return { success: true };
  } catch (error) {
    console.error('Server Action createContent Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateContentStatus(id, status, feedback = '') {
  try {
    const updateData = { status, admin_feedback: feedback };
    const { error } = await supabaseAdmin
        .from('marketing_content')
        .update(updateData)
        .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/marketing');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateContentProgress(id, formData) {
    try {
        const is_shot = formData.get('is_shot') === 'on';
        const is_edited = formData.get('is_edited') === 'on';
        const drive_link = formData.get('drive_link');

        let status = 'planned';
        if (is_shot) status = 'shot';
        if (is_edited) status = 'edited';
        if (is_edited && drive_link) status = 'admin-review';

        const data = {
           is_shot,
           is_edited,
           drive_link,
           status
        };

        const { error } = await supabaseAdmin
            .from('marketing_content')
            .update(data)
            .eq('id', id);
        
        if (error) throw error;
        
        revalidatePath('/marketing');
        return { success: true, newStatus: status };
    } catch(err) {
        return { success: false, error: err.message };
    }
}

export async function toggleWorkingDay(dateStr, isWorking) {
    try {
        if (isWorking) {
            await supabaseAdmin.from('working_days').delete().eq('date', dateStr);
        } else {
            await supabaseAdmin.from('working_days').insert([{ date: dateStr }]);
        }
        revalidatePath('/marketing');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
