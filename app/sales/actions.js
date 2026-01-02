"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

function serializeLead(lead) {
  if (!lead) return null;
  return {
    ...lead,
    created_at: lead.created_at ? new Date(lead.created_at).toISOString() : null,
    meeting_time: lead.meeting_time ? new Date(lead.meeting_time).toISOString() : null,
  };
}

export async function getLeads() {
  try {
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Serialize dates for client
    return { 
      data: leads.map(serializeLead), 
      error: null 
    };
  } catch (error) {
    console.error('Server Action getLeads Error:', error);
    return { data: [], error: error.message };
  }
}

export async function createLead(formData) {
  try {
    const leadData = {
      name: formData.get('name'),
      type: formData.get('type'),
      contact: formData.get('contact'),
      priority: formData.get('priority'),
      stage: 'ad-leads', // Default
      assigned_to: formData.get('assigned_to') || null,
      meeting_time: null,
      created_at: new Date().toISOString()
    };
    
    // Basic validation
    if (!leadData.name) throw new Error('Name is required');

    const { error } = await supabaseAdmin.from('leads').insert([leadData]);

    if (error) throw error;
    
    revalidatePath('/sales');
    return { success: true };
  } catch (error) {
    console.error('Server Action createLead Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateLeadStage(id, newStage) {
  try {
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ stage: newStage })
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/sales');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateLead(id, updates) {
  try {
    const { error } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    
    revalidatePath('/sales');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function generatePriceEstimate(scope) {
  // Simulate AI Analysis
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const complexity = scope.length > 100 ? 1.5 : 1;
  const basePrice = Math.floor(Math.random() * (50000 - 20000) + 20000);
  const estimated = Math.round(basePrice * complexity / 1000) * 1000;
  
  return {
    price: estimated,
    timeline: `${Math.floor(complexity * 4)}-${Math.floor(complexity * 6)} Weeks`,
    breakdown: `Based on the scope "${scope.substring(0, 20)}...", we estimate high complexity in frontend modules.`
  };
}

export async function closeDeal(id, dealData) {
    try {
        // 1. Update Lead
        const { error: lError } = await supabaseAdmin
            .from('leads')
            .update({ 
                stage: 'win',
                budget: dealData.total,
                payment_structure: dealData
            })
            .eq('id', id)
            .select()
            .single();
        
        if (lError) throw lError;

        // 2. Add Transaction
        if (parseFloat(dealData.advance) > 0) {
             // Retrieve name indirectly or pass it? For speed, we assume name comes in or we fetch.
             // Let's just create generic record for now to save a query if needed, or query above.
             // We can query above.
        }

        // 2. Transaction for Advance
        if (parseFloat(dealData.advance) > 0) {
            await supabaseAdmin.from('transactions').insert([{
              amount: dealData.advance,
              type: 'income',
              category: `Advance Payment`, 
              notes: `Advance for Deal ID: ${id}`,
              date: new Date().toISOString().split('T')[0]
            }]);
        }
        
        // 3. Create Task
        await supabaseAdmin.from('tasks').insert([{
            title: `Project Execution: ${dealData.scope ? dealData.scope.substring(0, 20) + '...' : 'New Deal'}`,
            description: dealData.scope,
            status: 'pending',
            type: 'Development', // Def to dev for now
            assigned_to: dealData.assignee || null,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }]);

        revalidatePath('/sales');
        return { success: true };
    } catch(err) {
        console.error('Close Deal Error', err);
        return { success: false, error: err.message };
    }
}

export async function addPayment(id, amount, note) {
  try {
    // 1. Fetch current structure
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('payment_structure, budget')
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;

    const currentStructure = lead.payment_structure || {};
    const payments = currentStructure.payments || [];
    
    const newPayment = {
      amount: parseFloat(amount),
      note,
      date: new Date().toISOString()
    };
    
    const updatedPayments = [newPayment, ...payments];
    const totalCollected = updatedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    // 2. Update Lead
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({ 
        payment_structure: { ...currentStructure, payments: updatedPayments, total_collected: totalCollected }
      })
      .eq('id', id);

    if (updateError) throw updateError;
    
    // 3. Log Transaction
    await supabaseAdmin.from('transactions').insert([{
        amount: parseFloat(amount),
        type: 'income',
        category: 'Project Payment', 
        notes: `Payment for Lead ${id}: ${note}`,
        date: new Date().toISOString().split('T')[0]
    }]);

    revalidatePath('/sales');
    return { success: true, totalCombined: totalCollected };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
