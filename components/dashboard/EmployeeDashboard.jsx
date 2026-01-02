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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function EmployeeDashboard() {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [statusInput, setStatusInput] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      setSubmissionLink(selectedTask.submission_link || '');
      setStatusInput('');
    }
  }, [selectedTask]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const fetchTasks = async () => {
    setLoading(true);
    console.log('Fetching tasks from Supabase...');
    
    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(false);
      console.warn('Tasks fetch timed out.');
    }, 10000);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase tasks error:', error);
        throw error;
      }
      console.log('Tasks fetched successfully:', data?.length || 0);
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const startTaskTimer = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const stopTaskTimer = async () => {
    setIsRunning(false);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    try {
      const { error } = await supabase
        .from('time_logs')
        .insert([{
          task_id: selectedTask.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration: durationSeconds,
        }]);

      if (error) throw error;
      setTime(0);
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
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden shadow-xl",
                    selectedTask?.id === task.id 
                      ? "bg-blue-600/10 border-blue-500/30" 
                      : "bg-[#0a0a0a] border-[#1f1f1f] hover:border-gray-700"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-lg",
                      selectedTask?.id === task.id ? "bg-blue-500/20" : "bg-black group-hover:bg-white/5"
                    )}>
                      <Folder className={cn(
                        "w-6 h-6",
                        selectedTask?.id === task.id ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400"
                      )} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-sm text-gray-200 truncate group-hover:text-white transition-colors uppercase tracking-tight">
                        {task.title}
                      </h4>
                      <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">{task.type} • {task.deadline}</p>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 text-gray-800 transition-all",
                      selectedTask?.id === task.id ? "text-blue-400 translate-x-1" : "group-hover:text-gray-400"
                    )} />
                  </div>
                </div>
              ))}
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
                    <button 
                      onClick={isRunning ? stopTaskTimer : startTaskTimer}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl",
                        isRunning ? "bg-red-600 text-white shadow-red-600/20" : "bg-blue-600 text-white shadow-blue-600/20"
                      )}
                    >
                      {isRunning ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>
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
                              const { error } = await supabase
                                .from('tasks')
                                .update({ admin_feedback: statusInput }) // Using feedback or a new column for status? Prompt says dev typed.
                                .eq('id', selectedTask.id);
                              if (!error) {
                                setSelectedTask({...selectedTask, admin_feedback: statusInput});
                                setStatusInput('');
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            Log
                          </button>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Active_Status:</p>
                          <p className="text-xs text-blue-400 mt-1">{selectedTask.admin_feedback || 'Waiting for initial status log...'}</p>
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
                              alert('Task submitted for Admin verification.');
                              fetchTasks();
                              setSelectedTask({...selectedTask, status: 'completed', submission_link: submissionLink});
                            }
                          }}
                          className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-[10px] font-black transition-all shadow-xl shadow-green-600/20 uppercase tracking-[0.2em] disabled:opacity-50"
                        >
                          {selectedTask.status === 'completed' ? 'SUBMITTED_FOR_REVIEW' : 'Initialize_Approval_Flow'}
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
