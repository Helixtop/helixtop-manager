"use client";

import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  ChevronRight, 
  Clock, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Pause, 
  Square,
  FileText,
  MessageSquare,
  Paperclip,
  Loader2,
  Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function EmployeeDashboard() {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [statusInput, setStatusInput] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [marketingWork, setMarketingWork] = useState([]);
  const [showMarketingDetails, setShowMarketingDetails] = useState(false);

  const { user } = useAuth();

  // Restore active session
  const checkActiveSession = async (userId) => {
      try {
        const { data, error } = await supabase
            .from('time_logs')
            .select('*, tasks(*)')
            .eq('user_id', userId)
            .is('end_time', null)
            .maybeSingle();
        
        if (data) {
            const now = new Date();
            const start = new Date(data.start_time);
            const elapsed = Math.floor((now - start) / 1000);
            
            if (elapsed >= 3600) {
                // Auto-stopped while away
                 await supabase.from('time_logs').update({
                     end_time: new Date(start.getTime() + 3600000).toISOString(),
                     duration: 3600
                 }).eq('id', data.id);
                 return; 
            }

            setStartTime(start);
            setCurrentLogId(data.id);
            setIsRunning(true);
            setTime(elapsed);
            
            if (data.tasks) {
                setSelectedTask(Array.isArray(data.tasks) ? data.tasks[0] : data.tasks);
            }
        }
      } catch (err) {
          console.error("Error restoring session:", err);
      }
  };

  useEffect(() => {
    if (user) {
      fetchTasks(user.id);
      fetchMarketingWork(user.id);
      checkActiveSession(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedTask) {
      setSubmissionLink(selectedTask.submission_link || '');
      setStatusInput('');
    }
  }, [selectedTask]);

  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - new Date(startTime)) / 1000);
        setTime(elapsed);

        if (elapsed >= 3600) {
            // Auto stop after 1 hour
            handleStop();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const fetchTasks = async (userId) => {
    if (!userId) {
        console.warn('fetchTasks called without userId'); 
        return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketingWork = async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('marketing_content')
        .select('*')
        .eq('assigned_to', userId)
        .neq('status', 'posted')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setMarketingWork(data || []);
    } catch (error) {
      console.error('Error fetching marketing work:', error);
    }
  };

  const [currentLogId, setCurrentLogId] = useState(null);

  const startTaskTimer = async () => {
    try {
        const now = new Date();
        setIsRunning(true);
        setStartTime(now);
        
        // Create initial log entry
        const { data, error } = await supabase
            .from('time_logs')
            .insert([{
                task_id: selectedTask.id,
                start_time: now.toISOString(),
                end_time: null,
                duration: 0,
                user_id: user.id, // Explicitly ensure user_id is set if RLS doesn't auto-set or for clarity
                is_paid: false
            }])
            .select()
            .single();

        if (error) throw error;
        setCurrentLogId(data.id);
    } catch (error) {
        console.error('Error starting timer:', error);
        setIsRunning(false); // Revert on failure
    }
  };


  const handlePause = async () => {
    if (!isRunning || !startTime) return;
    
    setIsRunning(false);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    try {
      if (currentLogId) {
          // Update existing log
          const { error } = await supabase
            .from('time_logs')
            .update({
                end_time: endTime.toISOString(),
                duration: durationSeconds
            })
            .eq('id', currentLogId);
          
          if (error) throw error;
      } else {
          // Fallback for legacy behavior or if start failed silently
          const { error } = await supabase
            .from('time_logs')
            .insert([{
              task_id: selectedTask.id,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              duration: durationSeconds,
            }]);
          if (error) throw error;
      }

      setStartTime(null);
      setCurrentLogId(null);
    } catch (error) {
      console.error('Error saving time log (pause):', error);
    }
  };

  const handleStop = async () => {
    if (isRunning && startTime) {
        await handlePause(); 
    }
    setTime(0);
    setIsRunning(false);
    setStartTime(null);
    setCurrentLogId(null);
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
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">My Workspace</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Operation Center</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6">
          <div className="text-center">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Efficiency_Score</p>
            <p className="text-xl font-bold font-mono">94%</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Active_Hours</p>
            <p className="text-xl font-bold text-blue-400 font-mono">32.5</p>
          </div>
        </div>
      </div>

      {/* Marketing Notifications */}
      {marketingWork.length > 0 && (
         <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {marketingWork.map(work => (
               <a 
                href="/marketing" 
                key={work.id}
                className={cn(
                  "flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-2xl border bg-gradient-to-br from-blue-600/10 to-green-600/5 transition-all hover:scale-[1.02] active:scale-[0.98] group shadow-xl",
                  work.status === 'rejected' ? "border-red-500/30 from-red-500/10" : "border-blue-500/20"
                )}
               >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                    work.status === 'rejected' ? "bg-red-500/20" : "bg-blue-500/20"
                  )}>
                    <Megaphone className={cn("w-5 h-5", work.status === 'rejected' ? "text-red-400" : "text-blue-400")} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">New_Work_Detected</p>
                    <h4 className="font-bold text-sm text-white uppercase tracking-tight">
                        {work.title} <span className="text-blue-400 text-[10px] ml-1">[{new Date(work.scheduled_date).toLocaleDateString()}]</span>
                    </h4>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-1 transition-all" />
               </a>
            ))}
         </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Provisioning Tasks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Task Folders */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Assigned_Projects</h3>
            <div className="space-y-3">
              {tasks.map((task) => {
                 const isVerified = task.status === 'verified' || task.status === 'completed';
                 const isRejected = task.status === 'rejected';
                 const isSelected = selectedTask?.id === task.id;

                 return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden shadow-xl",
                        isSelected 
                          ? "bg-blue-600/10 border-blue-500/30" 
                          : isVerified 
                            ? "bg-green-900/5 border-green-500/10 hover:border-green-500/30"
                            : isRejected 
                              ? "bg-red-900/5 border-red-500/10 hover:border-red-500/30"
                              : "bg-[#0a0a0a] border-[#1f1f1f] hover:border-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg",
                          isSelected ? "bg-blue-500/20" : 
                          isVerified ? "bg-green-500/10" :
                          isRejected ? "bg-red-500/10" :
                          "bg-black group-hover:bg-white/5"
                        )}>
                          <Folder className={cn(
                            "w-6 h-6",
                            isSelected ? "text-blue-400" : 
                            isVerified ? "text-green-400" :
                            isRejected ? "text-red-400" :
                            "text-gray-600 group-hover:text-gray-400"
                          )} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className={cn(
                              "font-bold text-sm truncate transition-colors uppercase tracking-tight",
                              isSelected ? "text-white" : "text-gray-200 group-hover:text-white"
                          )}>
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{task.type}</p>
                             {isVerified && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                             {isRejected && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-all",
                          isSelected ? "text-blue-400 translate-x-1" : "text-gray-800 group-hover:text-gray-400"
                        )} />
                      </div>
                    </div>
                 );
              })}
            </div>
          </div>

          {/* Task Detail View */}
          <div className="lg:col-span-8">
            {selectedTask ? (
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8 shadow-2xl space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{selectedTask.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                        {selectedTask.type}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-widest border border-orange-500/20">
                        {selectedTask.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Time Tracker Mini */}
                  <div className="flex items-center gap-5 p-5 rounded-2xl bg-black border border-white/5 shadow-inner">
                    <div className="text-right">
                      <p className="text-xl font-mono font-black text-blue-400 tracking-tighter">{formatTime(time)}</p>
                      <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest text-right">Timer_Node_Active</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {!isRunning ? (
                          <button onClick={startTaskTimer} className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-all shadow-lg shadow-blue-600/20">
                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                          </button>
                       ) : (
                          <button onClick={handlePause} className="w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center transition-all shadow-lg shadow-orange-600/20">
                            <Pause className="w-5 h-5 fill-white text-white" />
                          </button>
                       )}
                       
                       {(isRunning || time > 0) && (
                          <button onClick={handleStop} className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-600/20">
                            <Square className="w-4 h-4 fill-white text-white" />
                          </button>
                       )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Job_Specification
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed bg-black/50 p-5 rounded-2xl border border-white/5 shadow-inner italic">
                         "{selectedTask.description}"
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                         <AlertCircle className="w-3.5 h-3.5" />
                        Critical_Notes
                      </h4>
                      <p className="text-xs text-orange-200/60 leading-relaxed bg-orange-500/5 p-5 rounded-2xl border border-orange-500/10 uppercase tracking-tight font-black">
                        {selectedTask.notes || 'No critical deviations logged.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Operation_Logs
                      </h4>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Manually log status..." 
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            className="flex-1 bg-black border border-white/5 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-blue-500/50 font-mono"
                          />
                          <button 
                            disabled={!statusInput}
                            onClick={async () => {
                              const timestamp = new Date().toLocaleString();
                              const newEntry = `[${timestamp}] ${statusInput}`;
                              const updatedLogs = selectedTask.admin_feedback 
                                ? `${newEntry}\n${selectedTask.admin_feedback}` 
                                : newEntry;

                              const { error } = await supabase
                                .from('tasks')
                                .update({ admin_feedback: updatedLogs })
                                .eq('id', selectedTask.id);

                              if (!error) {
                                setSelectedTask({...selectedTask, admin_feedback: updatedLogs});
                                setStatusInput('');
                                // Refresh tasks to persist sidebar state if needed, though local update handles view
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            Log
                          </button>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight sticky top-0 bg-[#161616] pb-2">Operation_Logs:</p>
                          {selectedTask.admin_feedback ? (
                              <div className="text-xs text-blue-400 space-y-1 whitespace-pre-line font-mono">
                                  {selectedTask.admin_feedback}
                              </div>
                          ) : (
                              <p className="text-xs text-gray-600 italic">Waiting for initial status log...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5" />
                        Result_Submission
                      </h4>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder={selectedTask.type === 'Development' ? "Live_URL_(Vercel/GitHub)" : "Asset_Archive_Link"} 
                          value={submissionLink}
                          onChange={(e) => setSubmissionLink(e.target.value)}
                          className="w-full bg-black border border-white/5 rounded-xl px-4 py-4 text-[10px] outline-none focus:border-blue-500/50 font-mono"
                        />
                        <button 
                          disabled={!submissionLink || selectedTask.status === 'completed'}
                          onClick={async () => {
                            const { error } = await supabase
                              .from('tasks')
                              .update({ 
                                submission_link: submissionLink,
                                status: 'completed'
                              })
                              .eq('id', selectedTask.id);
                            
                            
                            if (!error) {
                              alert('Work marked as completed. Pending Admin Verification.');
                              fetchTasks(selectedTask.assigned_to); // Refresh to remove from list if filtered
                              setSelectedTask({...selectedTask, status: 'completed', submission_link: submissionLink});
                            }
                          }}
                          className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-[10px] font-black transition-all shadow-xl shadow-green-600/20 uppercase tracking-[0.2em] disabled:opacity-50"
                        >
                          {selectedTask.status === 'completed' ? 'Awaiting_Verification' : 'Mark_As_Completed'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 border-2 border-dashed border-[#1f1f1f] rounded-3xl opacity-30 bg-black/50 group hover:border-blue-500/20 transition-all">
                <Folder className="w-20 h-20 text-gray-800 mb-6 group-hover:scale-110 transition-transform" />
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.4em]">Select_Project_Archive</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
