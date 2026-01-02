"use client";

import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Download, 
  Calendar,
  Wallet,
  TrendingUp,
  CreditCard,
  Lock,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';
import { addTransaction, syncAccountingData } from './actions';
import { X } from 'lucide-react';

export default function AccountingPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState('Month');
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expense: 0, profit: 0 });
  const [chartData, setChartData] = useState([]);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'income',
    category: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase.from('transactions').select('*').order('date', { ascending: false });
      
      const now = new Date();
      let startDate;

      if (filter === 'Week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (filter === 'Month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (filter === 'Year') {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (filter === 'All') {
        startDate = null; // No date restriction
      }

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      const txs = data || [];
      setTransactions(txs);

      const inc = txs.filter(t => t.type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
      const exp = txs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
      setTotals({ income: inc, expense: exp, profit: inc - exp });

      // Chart Data Aggregation
      const aggregated = {};
      txs.forEach(t => {
        const label = filter === 'Year' 
          ? new Date(t.date).toLocaleString('default', { month: 'short' })
          : new Date(t.date).toLocaleDateString('default', { day: 'numeric', month: 'short' });
        
        if (!aggregated[label]) aggregated[label] = { label, income: 0, expense: 0 };
        if (t.type === 'income') aggregated[label].income += parseFloat(t.amount);
        else aggregated[label].expense += parseFloat(t.amount);
      });

      setChartData(Object.values(aggregated).reverse());

    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { success, error } = await addTransaction(formData);
      if (success) {
        setShowAddModal(false);
        setFormData({
          amount: '',
          type: 'income',
          category: '',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchTransactions();
      } else {
        alert('Error adding entry: ' + error);
      }
    } catch (err) {
      alert('System Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    { title: 'Total Income', value: `₹${totals.income.toLocaleString('en-IN')}`, trend: 12, icon: ArrowUpRight, color: 'text-green-400' },
    { title: 'Total Expenses', value: `₹${totals.expense.toLocaleString('en-IN')}`, trend: 8, icon: ArrowDownRight, color: 'text-red-400' },
    { title: 'Net Profit', value: `₹${totals.profit.toLocaleString('en-IN')}`, trend: 15, icon: TrendingUp, color: totals.profit >= 0 ? 'text-green-400' : 'text-red-400' },
  ];

  if (profile?.role !== ROLES.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-6">
        <Lock className="w-16 h-16 text-red-500/50" />
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 font-mono">Insufficient_Privileges_Detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Accounting</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Financial Intelligence Hub</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-black p-1 rounded-lg border border-[#1f1f1f]">
            {['Week', 'Month', 'Year', 'All'].map((t) => (
              <button 
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all tracking-widest",
                  filter === t ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#0a0a0a] border border-[#1f1f1f] p-8 rounded-2xl relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-bl-full group-hover:bg-white/[0.05] transition-all" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{stat.title}</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-bold font-mono tracking-tighter">{stat.value}</h3>
              <div className={cn("flex items-center gap-0.5 text-[10px] font-black mb-2", stat.color)}>
                <stat.icon className="w-3 h-3" />
                {stat.trend}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Auditing Ledgers...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Financial Desk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Income Side */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#1f1f1f] bg-green-500/5 flex justify-between items-center">
                <h3 className="font-bold text-[10px] uppercase tracking-widest text-green-400">Income_Stream</h3>
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">Total: ₹{totals.income.toLocaleString('en-IN')}</span>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">Lead_Entity</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">Payment_Details</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {transactions.filter(t => t.type === 'income').map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <p className="text-[11px] font-bold text-gray-200 uppercase tracking-tight group-hover:text-green-400 transition-colors">{t.category}</p>
                          <p className="text-[8px] text-gray-600 font-mono tracking-tighter mt-0.5">{t.date}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[10px] text-gray-400 leading-relaxed font-medium">{t.notes || 'Project Payment'}</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-xs font-bold font-mono text-green-400">₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
                        </td>
                      </tr>
                    ))}
                    {transactions.filter(t => t.type === 'income').length === 0 && (
                      <tr>
                        <td colSpan="3" className="py-20 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest opacity-50">No Income Detected</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Side */}
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-[#1f1f1f] bg-blue-500/5 flex justify-between items-center">
                <h3 className="font-bold text-[10px] uppercase tracking-widest text-blue-400">Expense_ledger</h3>
                <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest">Total: ₹{totals.expense.toLocaleString('en-IN')}</span>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#0a0a0a] z-10">
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">Expense_Category</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">Allocation_Notes</th>
                      <th className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {transactions.filter(t => t.type === 'expense').map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-4">
                          <p className="text-[11px] font-bold text-gray-200 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{t.category}</p>
                          <p className="text-[8px] text-gray-600 font-mono tracking-tighter mt-0.5">{t.date}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[10px] text-gray-400 leading-relaxed font-medium">{t.notes || 'Internal Expense'}</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-xs font-bold font-mono text-blue-400">-₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
                        </td>
                      </tr>
                    ))}
                    {transactions.filter(t => t.type === 'expense').length === 0 && (
                      <tr>
                        <td colSpan="3" className="py-20 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest opacity-50">No Expenses Detected</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Net Profit Summary Bar */}
          <div className="p-8 rounded-2xl bg-[#0a0a0a] border border-[#1f1f1f] overflow-hidden relative group shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 font-mono">Grand_Financial_Equilibrium</p>
              <h3 className="text-2xl font-black uppercase tracking-tight">Net Operational Profit</h3>
            </div>
            <div className="flex items-center gap-8">
               <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Flux_Retention</p>
                  <p className={cn(
                    "text-3xl font-black font-mono tracking-tighter",
                    totals.profit >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {totals.profit >= 0 ? '+' : ''}₹{totals.profit.toLocaleString('en-IN')}
                  </p>
               </div>
               <div className="h-10 w-[1px] bg-white/5" />
               <div className="flex flex-col gap-1 items-end">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                     <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Revenue_Flow</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                     <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Capital_Drain</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Trigger for Admins to Recover History */}
      {profile?.role === ROLES.ADMIN && (
         <div className="mt-12 py-12 flex flex-col items-center justify-center bg-[#0a0a0a] border border-dashed border-[#1f1f1f] rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-gray-200 text-xs font-black uppercase tracking-widest mb-1 font-mono">Ledger_Integrity_Tool</p>
            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-6 text-center max-w-xs leading-relaxed italic">Synchronize missing ad budgets and lead data into your financial history.</p>
            <button 
               onClick={async () => {
                  const { success, count, error } = await syncAccountingData();
                  if (success) {
                     alert(`Sync complete! ${count} financial vectors restored.`);
                     fetchTransactions();
                  } else {
                     alert('Sync failed: ' + error);
                  }
               }}
               className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 text-blue-400 text-xs font-black uppercase tracking-widest transition-all shadow-2xl"
            >
               Run_Full_Historical_Recovery
            </button>
         </div>
      )}

      {/* Add New Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Log New Flux</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Manual_Transaction_Vector</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-white/5 text-gray-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Type</label>
                  <div className="flex p-1 bg-black border border-[#1f1f1f] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income' })}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        formData.type === 'income' ? "bg-green-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense' })}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        formData.type === 'expense' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                      )}
                    >
                      Expense
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs font-mono focus:border-blue-500/50 outline-none text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-4 pl-10 pr-4 text-lg font-mono font-bold focus:border-blue-500/50 outline-none text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category / Tag</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none text-white"
                  placeholder="e.g. Ad Spend, Project Payment..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none text-white resize-none h-24"
                  placeholder="Internal notes..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 border border-[#1f1f1f] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Terminate
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Execute_Log'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
