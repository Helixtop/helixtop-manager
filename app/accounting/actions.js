"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function addTransaction(transactionData) {
  try {
    const { amount, type, category, notes, date } = transactionData;

    if (!amount || !type || !category || !date) {
      throw new Error('Missing required transaction fields');
    }

    const { error } = await supabaseAdmin.from('transactions').insert([{
      amount: parseFloat(amount),
      type,
      category,
      notes,
      date
    }]);

    if (error) throw error;

    revalidatePath('/accounting');
    revalidatePath('/'); // Also revalidate dashboard if it shows financial data
    
    return { success: true };
  } catch (error) {
    console.error('addTransaction Error:', error);
    return { success: false, error: error.message };
  }
}

export async function syncAccountingData() {
  try {
    // 1. Fetch all Won leads with payment info
    const { data: leads, error: lError } = await supabaseAdmin
      .from('leads')
      .select('id, name, budget, payment_structure, created_at')
      .eq('stage', 'win');
    
    if (lError) throw lError;

    // 2. Fetch all campaigns for spend
    const { data: campaigns, error: cError } = await supabaseAdmin
      .from('ad_campaigns')
      .select('id, campaign_name, spend, budget');
    
    if (cError) throw cError;

    // 3. Fetch existing transactions to avoid duplicates
    const { data: existingTxs, error: tError } = await supabaseAdmin
      .from('transactions')
      .select('reference_id, category, notes');
    
    if (tError) throw tError;

    const newTransactions = [];

    // Process Leads
    leads?.forEach(lead => {
      const structure = lead.payment_structure || {};
      
      // Sync Advance if exists
      if (structure.advance > 0) {
        const hasAdvance = existingTxs?.some(t => t.reference_id === lead.id && t.category?.includes(lead.name));
        if (!hasAdvance) {
          newTransactions.push({
            amount: parseFloat(structure.advance),
            type: 'income',
            category: lead.name,
            notes: `Advance Payment`,
            reference_id: lead.id,
            date: lead.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
          });
        }
      }

      // Sync Individual Payments
      if (structure.payments && Array.isArray(structure.payments)) {
        structure.payments.forEach((p, idx) => {
          const uniqueKey = `Payment #${idx + 1}`;
          const hasPayment = existingTxs?.some(t => t.reference_id === lead.id && t.notes?.includes(uniqueKey));
          if (!hasPayment) {
            newTransactions.push({
              amount: parseFloat(p.amount),
              type: 'income',
              category: lead.name,
              notes: `${uniqueKey} - ${p.note || ''}`,
              reference_id: lead.id,
              date: p.date?.split('T')[0] || new Date().toISOString().split('T')[0]
            });
          }
        });
      }
    });

    // Process Campaigns
    const campaignsToSync = campaigns || [];
    for (const camp of campaignsToSync) {
      if (camp.budget > 0) {
        // 1. Check if Allocation already exists
        const hasAllocation = existingTxs?.some(t => t.reference_id === camp.id && t.category === 'Ad Allocation');
        
        if (!hasAllocation) {
          // 2. Proactively delete any old 'Ad Spend' transactions for this campaign 
          // to prevent double counting before adding the Allocation (Budget)
          await supabaseAdmin.from('transactions')
            .delete()
            .eq('reference_id', camp.id)
            .eq('category', 'Ad Spend');

          newTransactions.push({
            amount: parseFloat(camp.budget),
            type: 'expense',
            category: 'Ad Allocation',
            notes: `Auto-synced Budget: ${camp.campaign_name}`,
            reference_id: camp.id,
            date: new Date().toLocaleDateString('en-CA')
          });
        }
      }
    }

    if (newTransactions.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('transactions').insert(newTransactions);
      if (insertError) throw insertError;
    }

    revalidatePath('/accounting');
    return { success: true, count: newTransactions.length };
  } catch (error) {
    console.error('syncAccountingData Error:', error);
    return { success: false, error: error.message };
  }
}
