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
  Megaphone,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { updateContentProgress } from '@/app/marketing/actions';

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

  const { user, profile, effectiveRole, refreshProfile } = useAuth();
  const isContentCreator = effectiveRole === 'Digital Content Creator';

  useEffect(() => {
    // Force a profile refresh on mount to catch any recent role changes
    if (user) refreshProfile(true);
  }, []);

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
      let query = supabase
        .from('marketing_content')
        .select('*')
        .order('scheduled_date', { ascending: true });

      // Only restrict by assignee if NOT a Content Creator
      if (!isContentCreator) {
          query = query.eq('assigned_to', userId);
      }

      const { data, error } = await query;
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
      </div>

      {/* Work Statistics for Content Creators */}
      {isContentCreator && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-green-600/10 to-green-900/5 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Completed Works</p>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-black text-white font-mono">
              {marketingWork.filter(w => w.status === 'posted' || w.status === 'approved').length}
            </p>
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-1">Successfully delivered</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-600/10 to-orange-900/5 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Pending Works</p>
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-3xl font-black text-white font-mono">
              {marketingWork.filter(w => !['posted', 'approved', 'rejected'].includes(w.status)).length}
            </p>
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-1">In progress</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-red-600/10 to-red-900/5 border border-red-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Rejected Works</p>
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-black text-white font-mono">
              {marketingWork.filter(w => w.status === 'rejected').length}
            </p>
            <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-1">Needs revision</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Provisioning Tasks...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending/New Works Section - Middle */}
          {marketingWork.filter(w => !['posted', 'approved', 'rejected'].includes(w.status)).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Pending Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketingWork.filter(w => !['posted', 'approved', 'rejected'].includes(w.status)).map(work => (
                  <div key={work.id} className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all group cursor-pointer" onClick={() => setSelectedTask(work)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{work.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                          <span className="uppercase font-bold">{work.platform}</span>
                          <span>•</span>
                          <span>{new Date(work.scheduled_date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="text-blue-400 uppercase font-black">{work.status.replace('-', ' ')}</span>
                        </div>
                      </div>
                      <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Works Section */}
          {marketingWork.filter(w => w.status === 'rejected').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Rejected Works - Needs Revision
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketingWork.filter(w => w.status === 'rejected').map(work => (
                  <div key={work.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all group cursor-pointer" onClick={() => setSelectedTask(work)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{work.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                          <span className="uppercase font-bold">{work.platform}</span>
                          <span>•</span>
                          <span>{new Date(work.scheduled_date).toLocaleDateString()}</span>
                        </div>
                        {work.admin_feedback && (
                          <p className="text-[9px] text-red-400 mt-1 line-clamp-1 italic">"{work.admin_feedback}"</p>
                        )}
                      </div>
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Works Section - Bottom */}
          {marketingWork.filter(w => w.status === 'posted' || w.status === 'approved').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketingWork.filter(w => w.status === 'posted' || w.status === 'approved').map(work => (
                  <div key={work.id} className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all group cursor-pointer" onClick={() => setSelectedTask(work)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{work.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                          <span className="uppercase font-bold">{work.platform}</span>
                          <span>•</span>
                          <span>{new Date(work.scheduled_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Detail View - Only shown when selectedTask exists */}
          {selectedTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8 shadow-2xl space-y-8 animate-in slide-in-from-right-4 duration-300 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{selectedTask.title}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                        {selectedTask.type || selectedTask.platform}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-widest border border-orange-500/20">
                        {selectedTask.status}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <XCircle className="w-6 h-6 text-gray-500" />
                  </button>
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
                        {selectedTask.notes || selectedTask.admin_feedback || 'No critical deviations logged.'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                  <div className="space-y-6">
                    {selectedTask.platform ? (
                      /* Marketing Specific Controls */
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            Production_Progress
                          </h4>
                          <div className="space-y-4 bg-black/50 p-6 rounded-2xl border border-white/5">
                            <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent hover:border-blue-500/20 cursor-pointer transition-all">
                              <span className="text-xs font-bold text-gray-300 uppercase tracking-tight">Content_Shot</span>
                              <input 
                                type="checkbox" 
                                checked={selectedTask.is_shot} 
                                onChange={async (e) => {
                                  const formData = new FormData();
                                  formData.set('is_shot', e.target.checked ? 'on' : 'off');
                                  formData.set('is_edited', selectedTask.is_edited ? 'on' : 'off');
                                  formData.set('drive_link', selectedTask.drive_link || '');
                                  const res = await updateContentProgress(selectedTask.id, formData);
                                  if (res.success) {
                                    setSelectedTask({ ...selectedTask, is_shot: e.target.checked, status: res.newStatus });
                                    fetchMarketingWork(user.id);
                                  }
                                }}
                                className="w-5 h-5 rounded-lg bg-black border-white/10 text-blue-600 focus:ring-0" 
                              />
                            </label>

                            <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent hover:border-blue-500/20 cursor-pointer transition-all">
                              <span className="text-xs font-bold text-gray-300 uppercase tracking-tight">Edit_Finalized</span>
                              <input 
                                type="checkbox" 
                                checked={selectedTask.is_edited} 
                                onChange={async (e) => {
                                  if (e.target.checked && !selectedTask.drive_link) {
                                    alert('Please provide a Drive Link before marking as Edited.');
                                    return;
                                  }
                                  const formData = new FormData();
                                  formData.set('is_shot', selectedTask.is_shot ? 'on' : 'off');
                                  formData.set('is_edited', e.target.checked ? 'on' : 'off');
                                  formData.set('drive_link', selectedTask.drive_link || '');
                                  const res = await updateContentProgress(selectedTask.id, formData);
                                  if (res.success) {
                                    setSelectedTask({ ...selectedTask, is_edited: e.target.checked, status: res.newStatus });
                                    fetchMarketingWork(user.id);
                                  }
                                }}
                                className="w-5 h-5 rounded-lg bg-black border-white/10 text-blue-600 focus:ring-0" 
                              />
                            </label>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Final_Master_Link
                          </h4>
                          <div className="space-y-3">
                            <input 
                              type="text" 
                              placeholder="Google Drive Link..." 
                              value={selectedTask.drive_link || ''}
                              onChange={(e) => setSelectedTask({...selectedTask, drive_link: e.target.value})}
                              onBlur={async () => {
                                const formData = new FormData();
                                formData.set('is_shot', selectedTask.is_shot ? 'on' : 'off');
                                formData.set('is_edited', selectedTask.is_edited ? 'on' : 'off');
                                formData.set('drive_link', selectedTask.drive_link || '');
                                await updateContentProgress(selectedTask.id, formData);
                              }}
                              className="w-full bg-black border border-white/5 rounded-xl px-4 py-4 text-[10px] outline-none focus:border-blue-500/50 font-mono"
                            />
                            <p className="text-[9px] text-gray-600 uppercase font-black px-2">Auto-saves on blur</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Development controls */
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
                                  fetchTasks(selectedTask.assigned_to);
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
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
