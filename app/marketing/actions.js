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

export async function getMarketingData(userId = null, role = null) {
  try {
    let contentQuery = supabaseAdmin.from('marketing_content').select('*').order('scheduled_date', { ascending: true });
    
    // Only restrict for specific roles that shouldn't see everything
    // Admins and Digital Content Creators see everything
    const sharedRoles = ['Admin', 'Digital Content Creator'];
    if (role && !sharedRoles.includes(role) && userId) {
        contentQuery = contentQuery.eq('assigned_to', userId);
    }

    const [
      { data: content, error: cError },
      { data: ads, error: aError },
      { data: workingDays, error: wError },
      { data: configs, error: configError },
      { data: leads, error: leadError }
    ] = await Promise.all([
      contentQuery,
      supabaseAdmin.from('ad_campaigns').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('working_days').select('date').order('date', { ascending: true }),
      supabaseAdmin.from('marketing_configs').select('*'),
      supabaseAdmin.from('leads').select('*')
    ]);

    if (cError) throw cError;
    if (aError) throw aError;
    if (wError) throw wError;
    if (leadError) throw leadError;

    // Convert configs array to a key-value object
    const configMap = configs?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) || {};

    return {
      success: true,
      content: content?.map(serializeDate) || [],
      ads: ads || [],
      workingDays: workingDays?.map(d => d.date) || [],
      configs: configMap,
      leads: leads || []
    };
  } catch (error) {
    console.error('Server Action getMarketingData Error:', error);
    return { success: false, error: error.message };
  }
}

export async function assignContentToCreator(contentId, creatorId) {
    try {
        const { error } = await supabaseAdmin
            .from('marketing_content')
            .update({ assigned_to: creatorId || null })
            .eq('id', contentId);
        
        if (error) throw error;
        revalidatePath('/marketing');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getContentCreators() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'Digital Content Creator');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
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
      assigned_to: formData.get('assigned_to') || null,
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
        const is_posted = formData.get('is_posted') === 'on';
        const drive_link = formData.get('drive_link');

        let status = 'planned';
        if (is_shot) status = 'shot';
        if (is_edited) {
            if (!drive_link || drive_link.trim() === '') {
                throw new Error('Please provide a Master File (Drive Link) to submit for Admin Review.');
            }
            status = 'admin-review';
        }
        if (is_posted) status = 'posted';

        const data = {
           is_shot,
           is_edited,
           is_posted,
           drive_link,
           status,
           admin_feedback: null // Clear feedback when updating
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

export async function updateMarketingConfig(key, value) {
    try {
        const { error } = await supabaseAdmin
            .from('marketing_configs')
            .upsert({ key, value, updated_at: new Date().toISOString() });
        
        if (error) throw error;
        revalidatePath('/marketing');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function createAdCampaign(formData) {
    try {
        const data = {
            campaign_name: formData.get('campaign_name'),
            description: formData.get('description'),
            budget: parseFloat(formData.get('budget')) || 0,
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            status: 'active',
            spend: 0,
            leads_generated: 0
        };

        const { data: campaign, error } = await supabaseAdmin.from('ad_campaigns').insert([data]).select().single();
        if (error) throw error;

        // Log Allocation as Expense in Accounting
        if (data.budget > 0) {
            const { error: txError } = await supabaseAdmin.from('transactions').insert([{
                amount: data.budget,
                type: 'expense',
                category: 'Ad Allocation',
                notes: `Budget for: ${data.campaign_name}`,
                date: new Date().toLocaleDateString('en-CA'),
                reference_id: campaign.id
            }]);
            if (txError) {
                console.error('Error logging ad allocation transaction:', txError);
                // We don't throw here to avoid failing campaign creation if accounting fails,
                // but we should probably inform or handle it.
            }
        }

        revalidatePath('/marketing');
        revalidatePath('/accounting');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function addLeadFromCampaign(campaignId, leadData) {
    try {
        // 1. Create the lead in the leads table
        const { data: lead, error: leadError } = await supabaseAdmin
            .from('leads')
            .insert([{
                name: leadData.name,
                contact: leadData.contact,
                type: 'Inbound Ad',
                stage: 'ad-leads',
                priority: 'medium',
                campaign_id: campaignId
            }])
            .select()
            .single();

        if (leadError) throw leadError;

        // 2. Increment leads_generated on the campaign
        const { error: campaignError } = await supabaseAdmin.rpc('increment_campaign_leads', { campaign_row_id: campaignId });
        
        // If RPC isn't available, we can do a manual update
        if (campaignError) {
             const { data: campaign } = await supabaseAdmin.from('ad_campaigns').select('leads_generated').eq('id', campaignId).single();
             await supabaseAdmin.from('ad_campaigns').update({ leads_generated: (campaign?.leads_generated || 0) + 1 }).eq('id', campaignId);
        }

        revalidatePath('/marketing');
        revalidatePath('/sales');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function updateAdCampaign(id, data) {
    try {
        const { error } = await supabaseAdmin
            .from('ad_campaigns')
            .update(data)
            .eq('id', id);
        
        if (error) throw error;

        // Ensure Ad Allocation exists or is updated in Accounting
        if (data.budget !== undefined) {
             const budgetVal = parseFloat(data.budget);
             if (budgetVal > 0) {
                 // Check if it already exists
                 const { data: existing } = await supabaseAdmin.from('transactions')
                    .select('id')
                    .eq('reference_id', id)
                    .eq('category', 'Ad Allocation')
                    .maybeSingle();

                 if (existing) {
                     const { error: utxError } = await supabaseAdmin.from('transactions')
                        .update({ amount: budgetVal })
                        .eq('id', existing.id);
                     if (utxError) console.error('Error updating ad allocation transaction:', utxError);
                 } else {
                     // Create it if it doesn't exist (legacy fallback)
                     const { data: campaign } = await supabaseAdmin.from('ad_campaigns').select('campaign_name').eq('id', id).single();
                     const { error: itxError } = await supabaseAdmin.from('transactions').insert([{
                        amount: budgetVal,
                        type: 'expense',
                        category: 'Ad Allocation',
                        notes: `Budget for: ${campaign?.campaign_name || 'Campaign'}`,
                        date: new Date().toLocaleDateString('en-CA'),
                        reference_id: id
                     }]);
                     if (itxError) console.error('Error inserting ad allocation transaction:', itxError);
                 }
             }
        }

        revalidatePath('/marketing');
        revalidatePath('/accounting');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logAdSpend(id, amount, note = "") {
    try {
        const { data: ad, error: fError } = await supabaseAdmin
            .from('ad_campaigns')
            .select('campaign_name, spend')
            .eq('id', id)
            .single();
        
        if (fError) throw fError;

        const additionalSpend = parseFloat(amount);
        if (isNaN(additionalSpend) || additionalSpend <= 0) {
            throw new Error('Invalid spend amount');
        }

        const { error: uError } = await supabaseAdmin
            .from('ad_campaigns')
            .update({ spend: (ad.spend || 0) + additionalSpend })
            .eq('id', id);
        
        if (uError) throw uError;

        // Note: We no longer insert a transaction here because we are using 'Ad Allocation' (Budget) 
        // as the primary accounting expense to avoid double counting.
        // The spend remains a metric for marketing performance tracking.

        revalidatePath('/marketing');
        revalidatePath('/accounting');
        revalidatePath('/');
        
        return { success: true };
    } catch (error) {
        console.error('logAdSpend Error:', error);
        return { success: false, error: error.message };
    }
}

import { generateMarketingContentAI } from '@/lib/gemini';

export async function generateMarketingContext(topic, type, platform, brief) {
  try {
    return await generateMarketingContentAI(topic, type, platform, brief);
  } catch (error) {
    console.error("AI Marketing Error:", error);
    return null;
  }
}
