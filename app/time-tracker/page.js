"use client";

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  IndianRupee, 
  Briefcase,
  PieChart,
  Activity,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function TimeTrackerPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalHours: 0,
    taskBreakdown: [],
    dailyBreakdown: []
  });

  useEffect(() => {
    if (user && profile) {
      fetchStats();
    }
  }, [user, profile]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: logs, error } = await supabase
        .from('time_logs')
        .select(`
          duration,
          start_time,
          tasks (
             id,
             title,
             status
          )
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      processStats(logs);
    } catch (err) {
      console.error('Error fetching time stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (logs) => {
    const hourlyRate = profile?.hourly_rate || 0;
    let totalSeconds = 0;
    const taskMap = {};
    const dateMap = {};

    logs.forEach(log => {
      const duration = Number(log.duration) || 0;
      totalSeconds += duration;

      // Task Breakdown
      const taskTitle = log.tasks?.title || 'Unassigned Work';
      const taskId = log.tasks?.id || 'unknown';
      if (!taskMap[taskId]) {
        taskMap[taskId] = { 
          title: taskTitle, 
          seconds: 0, 
          status: log.tasks?.status,
          lastActive: log.start_time 
        };
      }
      taskMap[taskId].seconds += duration;

      // Daily Breakdown
      const dateKey = new Date(log.start_time).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = 0;
      }
      dateMap[dateKey] += duration;
    });

    // Formatting Logic
    const taskBreakdown = Object.values(taskMap)
        .sort((a, b) => b.seconds - a.seconds); // Most time first
    
    // Sort dates descending
    const dailyBreakdown = Object.entries(dateMap).map(([date, seconds]) => ({
        date,
        seconds
    })); // Usually we want sorting by raw date, but string key makes it hard.
    // Better to map to object then sort.
    
    // Let's rely on insertion order if logs were sorted? 
    // Logs were sorted desc by start_time. So dates appear desc.
    
    setStats({
      totalEarnings: Math.round((totalSeconds / 3600) * hourlyRate),
      totalHours: totalSeconds,
      taskBreakdown,
      dailyBreakdown
    });
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  if (loading) {
     return (
        <div className="h-screen flex items-center justify-center p-10">
           <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
     );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 space-y-12 animate-in fade-in duration-700">
      
      {/* Header */}
      <div>
         <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Efficiency Analysis</h1>
         <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Personal Performance Metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Earnings */}
         <div className="p-8 rounded-3xl bg-green-900/10 border border-green-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full" />
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-8">
                  <div className="p-3 rounded-2xl bg-green-500/20 text-green-400">
                     <IndianRupee className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                     Lifetime
                  </span>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total_Earnings</p>
                  <h3 className="text-4xl font-black text-white tracking-tighter">
                     ₹{stats.totalEarnings.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-green-400/60 mt-2 font-mono">Based on ₹{profile?.hourly_rate || 0}/hr rate</p>
               </div>
            </div>
         </div>

         {/* Total Hours */}
         <div className="p-8 rounded-3xl bg-blue-900/10 border border-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-8">
                  <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                     <Clock className="w-6 h-6" />
                  </div>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total_Hours_Logged</p>
                  <h3 className="text-4xl font-black text-white tracking-tighter">
                     {formatDuration(stats.totalHours)}
                  </h3>
                  <p className="text-[10px] text-blue-400/60 mt-2 font-mono">Across {stats.taskBreakdown.length} Projects</p>
               </div>
            </div>
         </div>

         {/* Daily Average (Estimated) */}
         <div className="p-8 rounded-3xl bg-purple-900/10 border border-purple-500/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                   <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                      <Activity className="w-6 h-6" />
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active_Days</p>
                   <h3 className="text-4xl font-black text-white tracking-tighter">
                      {stats.dailyBreakdown.length}
                   </h3>
                   <p className="text-[10px] text-purple-400/60 mt-2 font-mono">Working Days Recorded</p>
                </div>
             </div>
         </div>
      </div>

      {/* Main Grid: Task Breakdown & Daily Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         
         {/* Task Breakdown */}
         <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-8 flex items-center gap-3">
               <Briefcase className="w-5 h-5 text-gray-500" />
               Work_Distribution
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {stats.taskBreakdown.map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                           <h4 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight line-clamp-1">{item.title}</h4>
                           <span className={cn(
                              "inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                              item.status === 'verified' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                              item.status === 'completed' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                              item.status === 'rejected' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-blue-500/10 text-blue-400 border-blue-500/20"
                           )}>
                              {item.status || 'Active'}
                           </span>
                        </div>
                        <div className="text-right">
                           <p className="text-2xl font-black text-white tracking-tighter">{formatDuration(item.seconds)}</p>
                           <p className="text-[9px] text-gray-600 uppercase font-black mt-1">Total_Time</p>
                        </div>
                     </div>
                     <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-blue-500 rounded-full" 
                           style={{ width: `${(item.seconds / stats.totalHours) * 100}%` }} 
                        />
                     </div>
                  </div>
               ))}
               {stats.taskBreakdown.length === 0 && (
                  <div className="text-center py-20 text-gray-600 italic">No task history found.</div>
               )}
            </div>
         </div>

         {/* Daily Logs */}
         <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-8 flex items-center gap-3">
               <Calendar className="w-5 h-5 text-gray-500" />
               Daily_Activity_Log
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
               {stats.dailyBreakdown.map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center font-bold text-purple-400 text-xs border border-purple-500/20">
                           {day.date.split(' ')[0]}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-gray-300 group-hover:text-white uppercase tracking-tight">{day.date}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black text-white tracking-tighter font-mono">{formatDuration(day.seconds)}</p>
                     </div>
                  </div>
               ))}
               {stats.dailyBreakdown.length === 0 && (
                  <div className="text-center py-20 text-gray-600 italic">No daily logs found.</div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
}
