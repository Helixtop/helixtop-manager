"use client";

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  ChevronRight, 
  Briefcase, 
  Calendar,
  User,
  History,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function TimeTrackerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [activeTask, setActiveTask] = useState('Nexus IX Frontend Development');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*, tasks(title, type)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const stopTimer = async () => {
    setIsRunning(false);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    try {
      const { error } = await supabase
        .from('time_logs')
        .insert([{
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration: durationSeconds,
          // user_id and task_id would be set here in a real scenario
        }]);

      if (error) throw error;
      setTime(0);
      fetchLogs();
    } catch (error) {
      console.error('Error saving time log:', error);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Time Tracker</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Productivity Monitor</p>
        </div>
        <div className="flex gap-3 bg-[#0a0a0a] p-1 border border-[#1f1f1f] rounded-xl shadow-xl">
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">Active_Timer</button>
          <button className="px-4 py-2 rounded-lg text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Manual_Entry</button>
        </div>
      </div>

      {/* Main Timer */}
      <div className="p-10 bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl relative overflow-hidden group shadow-2xl">
        {isRunning && (
          <div className="absolute inset-0 bg-blue-600/[0.02] animate-pulse -z-10" />
        )}
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all">
          <Clock className="w-32 h-32" />
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                Active_Project_Node
              </div>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" />
                Helixtop_Suite
              </span>
            </div>
            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{activeTask}</h3>
            <div className="flex items-center justify-center lg:justify-start gap-6 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500/50" /> Jan 02, 2026</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500/50" /> Log_Start: 10:00 AM</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="text-8xl font-mono font-black tracking-tighter text-blue-400 drop-shadow-[0_0_25px_rgba(59,130,246,0.3)] select-none">
              {formatTime(time)}
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={isRunning ? stopTimer : startTimer}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95",
                  isRunning 
                    ? "bg-red-600 hover:bg-red-500 shadow-red-600/20" 
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
                )}
              >
                {isRunning ? <Square className="fill-white w-6 h-6 text-white" /> : <Play className="fill-white w-7 h-7 text-white ml-1.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <History className="w-4 h-4" />
              Temporal_Logs
            </h3>
            <button className="text-[10px] font-black text-blue-400 hover:underline uppercase tracking-widest">Export_Full_Log</button>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center p-20 gap-3 bg-black/50 border border-[#1f1f1f] rounded-3xl">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Decrypting History...</p>
              </div>
            ) : logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl hover:border-blue-500/30 transition-all group shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center group-hover:bg-blue-600/10 transition-all">
                    <Briefcase className="w-6 h-6 text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors uppercase tracking-tight">{log.tasks?.title || 'System Maintenance'}</h4>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">{log.tasks?.type || 'CORE'} • {new Date(log.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-lg font-mono font-black text-white tracking-tighter">{formatTime(log.duration)}</p>
                    <p className="text-[8px] text-gray-600 uppercase font-bold text-right">Accumulated_Time</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            )) : (
              <div className="text-center py-20 border-2 border-dashed border-[#1f1f1f] rounded-3xl opacity-50">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Stationary Mode • No Active Logs</p>
              </div>
            )}
          </div>
        </div>

        {/* Efficiency Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0a0a0a] border border-[#3b82f6]/20 rounded-3xl p-8 relative overflow-hidden group shadow-2xl shadow-blue-900/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h3 className="font-black text-[10px] uppercase tracking-widest text-blue-400">Efficiency_Vector</h3>
            </div>
            
            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-4xl font-black tracking-tighter">38h 15m</p>
                  <p className="text-[9px] text-gray-500 uppercase font-black mt-1 tracking-widest">Metric_Accumulation_Weekly</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-xs font-black uppercase tracking-widest">+2.5h Delta</p>
                </div>
              </div>

              <div className="flex gap-2 items-end h-24">
                {[4, 6, 8, 5, 9, 3, 0].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-500/10 rounded-t-lg relative group">
                      <div 
                        className="w-full bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-400" 
                        style={{ height: `${(h/10)*100}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-white/10 text-white text-[8px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                          {h}H
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-gray-600 uppercase">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 bg-orange-500/5 border border-orange-500/10 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-orange-400">
              <AlertCircle className="w-4 h-4" />
              <h3 className="font-black text-[10px] uppercase tracking-widest">Protocol_Deviation</h3>
            </div>
            <p className="text-[11px] font-medium text-orange-200/60 leading-relaxed uppercase tracking-tight">
              3 items from Cycle_T-1 remain in unconfirmed state. Immediate re-sync required to maintain billing integrity.
            </p>
            <button className="w-full mt-6 py-3 text-[9px] font-black uppercase tracking-widest text-white border border-orange-500/20 rounded-xl hover:bg-orange-500/10 transition-all">
              Initialize_Re-Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
