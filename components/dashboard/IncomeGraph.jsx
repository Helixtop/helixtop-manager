"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { getIncomeGraphData } from '@/app/actions';

export default function IncomeGraph() {
  const [period, setPeriod] = useState('week'); // 'week', 'month', 'year'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const result = await getIncomeGraphData(period);
    if (result.success) {
      setData(result.data);
      const sum = result.data.reduce((acc, curr) => acc + curr.income, 0);
      setTotal(sum);
    }
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
          <p className="text-emerald-400 font-mono text-sm font-bold">
            ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[80px] -z-10 rounded-full" />

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Income_Analysis
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
             <h2 className="text-2xl font-black text-white tracking-tight">₹{total.toLocaleString('en-IN')}</h2>
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
               in selected {period}
             </span>
          </div>
        </div>

        <div className="flex bg-black/50 border border-[#1f1f1f] rounded-lg p-1">
          {['week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                period === p 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[250px] w-full">
        {loading ? (
           <div className="h-full flex items-center justify-center">
             <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
           </div>
        ) : (
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
               <defs>
                 <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                   <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
               <XAxis 
                 dataKey="name" 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} 
                 dy={10}
                 tickFormatter={(value) => {
                    // Shorten date for week/month view
                    if (period === 'year') return value; // YYYY-MM
                    const d = new Date(value);
                    return `${d.getDate()}/${d.getMonth()+1}`;
                 }}
               />
               <YAxis 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} 
                 tickFormatter={(value) => `₹${value/1000}k`}
               />
               <Tooltip content={<CustomTooltip />} />
               <Area 
                 type="monotone" 
                 dataKey="income" 
                 stroke="#10b981" 
                 strokeWidth={2}
                 fillOpacity={1} 
                 fill="url(#colorIncome)" 
                 activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
               />
             </AreaChart>
           </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
