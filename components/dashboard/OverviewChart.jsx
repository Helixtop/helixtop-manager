"use client";

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function OverviewChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .order('date', { ascending: true });

      if (error) throw error;

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = months.map(m => ({ name: m, income: 0, expense: 0, profit: 0 }));

      transactions?.forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        const amount = parseFloat(t.amount);
        if (t.type === 'income') {
          monthlyData[monthIndex].income += amount;
        } else {
          monthlyData[monthIndex].expense += amount;
        }
      });

      // Calculate profit and filter months with data
      const finalData = monthlyData.map(d => ({
        ...d,
        profit: d.income - d.expense
      })).filter(d => d.income > 0 || d.expense > 0);

      setData(finalData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl h-full min-h-[400px]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Financial_Flux_Vector</h3>
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mt-1">Real-time Data Stream</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Profit</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
             <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
             <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Compiling Analytics...</p>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#444', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#444', fontSize: 10, fontWeight: 'bold' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#000', 
                  border: '1px solid #1f1f1f', 
                  borderRadius: '12px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorIncome)" 
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorProfit)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#1f1f1f] rounded-2xl bg-black/50">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No Financial Logs Detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
