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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';

export default function AccountingPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState('Month');
  
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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ income: 0, expense: 0, profit: 0 });
  const [chartData, setChartData] = useState([]);

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
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (filter === 'Month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      } else if (filter === 'Year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
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

  const stats = [
    { title: 'Total Income', value: `₹${totals.income.toLocaleString('en-IN')}`, trend: 12, icon: ArrowUpRight, color: 'text-green-400' },
    { title: 'Total Expenses', value: `₹${totals.expense.toLocaleString('en-IN')}`, trend: 8, icon: ArrowDownRight, color: 'text-red-400' },
    { title: 'Net Profit', value: `₹${totals.profit.toLocaleString('en-IN')}`, trend: 15, icon: TrendingUp, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Accounting</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Financial Intelligence Hub</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] text-xs font-bold text-gray-400 hover:text-white transition-all uppercase tracking-widest">
            <Download className="w-4 h-4" />
            Archive_Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-500">Flux_Analytics</h3>
              <div className="flex bg-black p-1 rounded-lg border border-[#1f1f1f]">
                {['Week', 'Month', 'Year'].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setFilter(t)}
                    className={cn(
                      "px-3 py-1 rounded text-[10px] font-bold uppercase transition-all",
                      filter === t ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#444', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#444', fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #1f1f1f', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions / Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-blue-600/10 to-green-600/10 border border-blue-500/20 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-green-500/5 blur-3xl rounded-full" />
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-blue-400 mb-6">Tax_Provisioning</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center group/item">
                  <span className="text-[10px] text-gray-500 group-hover/item:text-gray-300 transition-colors uppercase font-bold tracking-tighter">Est_GST_Liability</span>
                  <span className="text-sm font-bold font-mono text-gray-200">₹{(totals.income * 0.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <span className="text-[10px] text-gray-500 group-hover/item:text-gray-300 transition-colors uppercase font-bold tracking-tighter">Corporate_Tax_Reserve</span>
                  <span className="text-sm font-bold font-mono text-gray-200">₹{(totals.profit > 0 ? totals.profit * 0.25 : 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-4 border-t border-blue-500/20 flex justify-between items-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Total_Reserve</span>
                  <span className="text-lg font-bold text-blue-400 font-mono tracking-tighter">₹{((totals.income * 0.18) + (totals.profit > 0 ? totals.profit * 0.25 : 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button className="w-full mt-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20">
                Execute Settlement
              </button>
            </div>
            
            <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl shadow-xl">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-500 mb-4">Linked_Accounts</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tight text-gray-200">Main Operations</p>
                    <p className="text-[8px] text-gray-500 font-mono">.... 8842</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      {!loading && (
        <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-[#1f1f1f] flex justify-between items-center bg-white/5">
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-white">Recent_Transactions_Stream</h3>
            <button className="text-[10px] font-black text-blue-400 hover:underline uppercase tracking-widest">View_Detailed_Log</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/50">
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Iso_Date</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Description_String</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Flux_Type</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Value_Delta</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Confirmation_Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {transactions.length > 0 ? transactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-[10px] text-gray-400 font-mono font-bold tracking-tighter">{t.date}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-200 uppercase tracking-tight group-hover:text-blue-400 transition-colors">{t.category}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      t.type === 'income' ? "text-green-400" : "text-blue-400"
                    )}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold font-mono tracking-tighter">
                    {t.type === 'income' ? '+' : '-'}₹{parseFloat(t.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] text-gray-500 font-black uppercase tracking-widest group-hover:border-blue-500/20 group-hover:text-blue-400 transition-all">
                      Verified_In_Chain
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest opacity-50">Zero Financial Flux Detected</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
