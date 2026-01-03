"use client";

import React, { useState, useEffect } from 'react';
import { 
  XCircle, 
  Calendar, 
  Clock, 
  User, 
  Save, 
  History, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  Briefcase,
  Megaphone,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateProjectDetails, getProjectLogs } from '@/app/projects/actions';
import { supabase } from '@/lib/supabase';

export default function ProjectDetail({ project, employees, onClose, onRefresh, isAdmin = true, currentUser = null }) {
  const [activeTab, setActiveTab] = useState(!isAdmin ? 'works' : 'details'); // 'details', 'logs', or 'works'
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [works, setWorks] = useState({ tasks: [], marketing: [] });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(false);
  
  // Timer State
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [currentLogId, setCurrentLogId] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description,
    assigned_to: project.assigned_to,
    deadline: project.deadline,
    status: project.status,
    submission_link: project.submission_link || '',
    admin_feedback: project.admin_feedback || ''
  });
  const [statusInput, setStatusInput] = useState('');

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'works') fetchRelatedWorks();
  }, [activeTab]);

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - new Date(startTime)) / 1000);
        setElapsed(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const checkActiveSession = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('project_id', project.id)
      .is('end_time', null)
      .maybeSingle();
    
    if (data) {
      const start = new Date(data.start_time);
      setStartTime(start);
      setCurrentLogId(data.id);
      setIsRunning(true);
      setElapsed(Math.floor((new Date() - start) / 1000));
    }
  };

  const startTimer = async () => {
    if (!currentUser) return;
    try {
      const now = new Date();
      setIsRunning(true);
      setStartTime(now);
      
      const { data, error } = await supabase
        .from('time_logs')
        .insert([{
          project_id: project.id,
          start_time: now.toISOString(),
          user_id: currentUser.id,
          is_paid: false
        }])
        .select()
        .single();

      if (error) throw error;
      setCurrentLogId(data.id);
    } catch (err) {
      console.error("Timer Start Error:", err);
      setIsRunning(false);
    }
  };

  const stopTimer = async () => {
    if (!currentLogId) return;
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime - startTime) / 1000);
      
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: endTime.toISOString(),
          duration: duration
        })
        .eq('id', currentLogId);
      
      if (error) throw error;
      
      setIsRunning(false);
      setStartTime(null);
      setCurrentLogId(null);
      setElapsed(0);
      if (activeTab === 'logs') fetchLogs();
    } catch (err) {
      console.error("Timer Stop Error:", err);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const res = await getProjectLogs(project.id);
    if (res.success) setLogs(res.data);
    setLoadingLogs(false);
  };

  const fetchRelatedWorks = async () => {
    setLoadingWorks(true);
    try {
      const [tRes, mRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('project_id', project.id),
        supabase.from('marketing_content').select('*').eq('project_id', project.id)
      ]);
      setWorks({
        tasks: tRes.data || [],
        marketing: mRes.data || []
      });
    } catch (err) {
      console.error("Error fetching related works:", err);
    } finally {
      setLoadingWorks(false);
    }
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    const res = await updateProjectDetails(project.id, formData);
    if (res.success) {
      alert("Project parameters updated successfully.");
      onRefresh();
    } else {
      alert("Update Failed: " + res.error);
    }
    setLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatHMS = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1">{project.name}</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Project_Identity_Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isAdmin && (
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
                isRunning ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" : "bg-blue-600/10 border-blue-500/30 text-blue-400"
              )}>
                <span className="text-xs font-mono font-black">{formatHMS(elapsed)}</span>
                {isRunning ? (
                  <button onClick={stopTimer} className="hover:scale-110 transition-transform"><XCircle className="w-5 h-5" /></button>
                ) : (
                  <button onClick={startTimer} className="hover:scale-110 transition-transform"><Clock className="w-5 h-5" /></button>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-all">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-8 pt-4 gap-6 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('details')}
            className={cn(
              "pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
              activeTab === 'details' ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Config_Details
            {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
          </button>
          <button 
            onClick={() => setActiveTab('works')}
            className={cn(
              "pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
              activeTab === 'works' ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Related_Works
            {activeTab === 'works' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
              activeTab === 'logs' ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Chronos_Logs
            {activeTab === 'logs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Project Name */}
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-2">Nomenclature</label>
                    <input 
                      disabled={!isAdmin}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-3 px-5 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all disabled:opacity-70 disabled:grayscale"
                    />
                 </div>

                 {/* Status Selector */}
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-2">Current_Vector</label>
                    <select 
                      disabled={!isAdmin}
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-3 px-5 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all appearance-none disabled:opacity-70 disabled:grayscale"
                    >
                      <option value="pending">PENDING</option>
                      <option value="in-progress">IN_PROGRESS</option>
                      <option value="under-review">UNDER_REVIEW</option>
                      <option value="rejected">REJECTED</option>
                      <option value="on-hold">ON_HOLD</option>
                      <option value="completed">COMPLETED</option>
                      <option value="verified">VERIFIED</option>
                    </select>
                 </div>

                 {/* Assigned Employee */}
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-2">Lead_Architect</label>
                    <select 
                      disabled={!isAdmin}
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-3 px-5 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all appearance-none disabled:opacity-70 disabled:grayscale"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                 </div>

                 {/* Deadline */}
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-2">Target_Horizon</label>
                    <input 
                      disabled={!isAdmin}
                      type="date"
                      value={formData.deadline || ''}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-3 px-5 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all [color-scheme:dark] disabled:opacity-70 disabled:grayscale"
                    />
                 </div>
              </div>

              {/* Project Results Submission (Developer) */}
              {!isAdmin && (
                <div className="space-y-2 p-6 rounded-2xl bg-blue-600/5 border border-blue-500/10 mt-6">
                   <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                     <ExternalLink className="w-3 h-3" />
                     Final_Result_Submission
                   </label>
                   <div className="flex gap-2">
                     <input 
                       placeholder="Paste Vercel, GitHub, or Drive link..." 
                       value={formData.submission_link}
                       onChange={(e) => setFormData({...formData, submission_link: e.target.value})}
                       className="flex-1 bg-black border border-white/5 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-blue-500/50 font-mono text-white"
                     />
                     <button 
                       onClick={async () => {
                         if (!formData.submission_link) return alert("Link required");
                         setLoading(true);
                         const res = await updateProjectDetails(project.id, { 
                           submission_link: formData.submission_link,
                           status: 'under-review'
                         });
                         if (res.success) {
                           alert("Result submitted for Admin review!");
                           onRefresh();
                         }
                         setLoading(false);
                       }}
                       className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest transition-all"
                     >
                       Submit
                     </button>
                   </div>
                   <p className="text-[8px] text-gray-600 font-bold uppercase tracking-tight mt-1 ml-2">Submitting will set status to UNDER_REVIEW</p>
                </div>
              )}

              {/* Admin Review Controls */}
              {isAdmin && (formData.status === 'under-review' || formData.status === 'completed' || formData.status === 'verified') && (
                <div className="p-6 rounded-2xl bg-orange-600/5 border border-orange-500/10 space-y-4 mt-6">
                   <div className="flex justify-between items-center">
                     <label className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-2">Verification_Control</label>
                     {formData.submission_link && (
                       <a href={formData.submission_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
                         <ExternalLink className="w-3 h-3" />
                         <span className="text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-4">Open_Result</span>
                       </a>
                     )}
                   </div>
                   <div className="flex gap-3">
                     <button 
                       onClick={async () => {
                         const reason = prompt("Enter rejection feedback:");
                         if (reason === null) return;
                         
                         const timestamp = new Date().toLocaleString();
                         const newEntry = `[${timestamp}] REJECTED: ${reason}`;
                         const updatedLogs = formData.admin_feedback ? `${newEntry}\n${formData.admin_feedback}` : newEntry;
                         
                         setLoading(true);
                         const res = await updateProjectDetails(project.id, { 
                           status: 'rejected',
                           admin_feedback: updatedLogs
                         });
                         if (res.success) {
                           alert("Project Rejected");
                           onRefresh();
                         }
                         setLoading(false);
                       }}
                       className="flex-1 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                     >
                       Request_Revisions
                     </button>
                     <button 
                       onClick={async () => {
                         setLoading(true);
                         const res = await updateProjectDetails(project.id, { 
                           status: 'verified',
                           admin_feedback: null // Clear on approval
                         });
                         if (res.success) {
                           alert("Project Verified!");
                           onRefresh();
                         }
                         setLoading(false);
                       }}
                       className="flex-1 py-3 rounded-xl bg-green-600/10 border border-green-500/20 text-green-500 hover:bg-green-600 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                     >
                       Verify_&_Finalize
                     </button>
                   </div>
                </div>
              )}

              {/* Description & Logs Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-2">Scope_Definitions</label>
                  <textarea 
                    disabled={!isAdmin}
                    rows={8}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 px-6 text-xs font-medium text-gray-300 focus:border-blue-500/50 outline-none transition-all resize-none leading-relaxed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-2">Project_Operational_Logs</label>
                  {!isAdmin && (
                    <div className="flex gap-2 mb-3">
                      <input 
                        placeholder="Log current progress..." 
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        className="flex-1 bg-black border border-white/5 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-blue-500/50 font-mono text-white"
                      />
                      <button 
                        disabled={!statusInput || loading}
                        onClick={async () => {
                          const timestamp = new Date().toLocaleString();
                          const newEntry = `[${timestamp}] DEV: ${statusInput}`;
                          const updatedLogs = formData.admin_feedback ? `${newEntry}\n${formData.admin_feedback}` : newEntry;

                          setLoading(true);
                          const res = await updateProjectDetails(project.id, { admin_feedback: updatedLogs });
                          if (res.success) {
                            setFormData({...formData, admin_feedback: updatedLogs});
                            setStatusInput('');
                          }
                          setLoading(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  )}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 h-[160px] overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-2">
                    {formData.admin_feedback ? (
                      <div className="text-blue-400/80 whitespace-pre-line leading-relaxed italic">
                        {formData.admin_feedback}
                      </div>
                    ) : (
                      <p className="text-gray-700 italic">No operational logs recorded for this vector.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Save Action */}
              {isAdmin && (
                <div className="pt-4">
                  <button 
                    onClick={handleUpdate}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 group"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Deploy_Emergency_Update
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'works' ? (
            <div className="space-y-8">
              {loadingWorks ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Compiling_Flux_Assets...</p>
                </div>
              ) : (
                <>
                  {/* Tasks */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 px-2">
                       <Briefcase className="w-3.5 h-3.5" />
                       Linked_Tasks
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {works.tasks.length > 0 ? works.tasks.map(task => (
                        <div key={task.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 group hover:border-blue-500/20 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight truncate">{task.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded bg-white/5",
                                  task.status === 'completed' ? "text-green-400" : 
                                  task.status === 'rejected' ? "text-red-400" : 
                                  task.status === 'under-review' ? "text-orange-400" : "text-blue-400"
                                )}>{task.status}</span>
                                {task.deadline && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {task.deadline}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {task.description && (
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">Job_Description</p>
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">"{task.description}"</p>
                            </div>
                          )}

                          {task.admin_feedback && (
                            <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                                <p className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1.5">Revision_Required</p>
                                <p className="text-[11px] text-red-400/80 leading-relaxed italic font-medium">"{task.admin_feedback}"</p>
                            </div>
                          )}
                        </div>
                      )) : (
                        <p className="text-[10px] text-gray-700 italic px-4">No linked tasks discovered.</p>
                      )}
                    </div>
                  </div>

                  {/* Marketing Content */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2 px-2">
                       <Megaphone className="w-3.5 h-3.5" />
                       Marketing_Assets
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {works.marketing.length > 0 ? works.marketing.map(work => (
                        <div key={work.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 group hover:border-orange-500/20 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors uppercase tracking-tight truncate">{work.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                <span className="text-orange-400/80">{work.platform}</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/5">{work.status}</span>
                                {work.scheduled_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {work.scheduled_date}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {work.description && (
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">Asset_Brief</p>
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">"{work.description}"</p>
                            </div>
                          )}

                          {work.admin_feedback && (
                            <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
                                <p className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1.5">Modification_Note</p>
                                <p className="text-[11px] text-red-400/80 leading-relaxed italic font-medium">"{work.admin_feedback}"</p>
                            </div>
                          )}
                        </div>
                      )) : (
                        <p className="text-[10px] text-gray-700 italic px-4">No marketing assets designated.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
               {loadingLogs ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-3">
                   <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                   <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Scanning_Matrix_Streams...</p>
                 </div>
               ) : logs.length > 0 ? (
                 <div className="space-y-3">
                   {logs.map(log => (
                     <div key={log.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-[8px] font-black text-blue-400">
                             {log.profiles?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                           </div>
                           <div>
                              <p className="text-[11px] font-bold text-gray-200">
                                {log.profiles?.full_name}
                                {log.tasks?.title && (
                                  <span className="text-gray-400 font-bold ml-2 uppercase text-[8px] tracking-[0.2em] border-l border-white/10 pl-2">
                                    {log.tasks.title}
                                  </span>
                                )}
                              </p>
                              <p className="text-[9px] text-gray-600 font-mono mt-0.5">
                                {new Date(log.start_time).toLocaleDateString()} • {new Date(log.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {log.notes && (
                                <p className="text-[10px] text-blue-400/80 mt-2 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 italic">
                                  "{log.notes}"
                                </p>
                              )}
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-white tracking-tighter">
                             {log.end_time ? formatDuration(log.duration) : (
                               <span className="text-red-500 flex items-center gap-2 justify-end">
                                 <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                 ACTIVE_NOW
                               </span>
                             )}
                           </p>
                           <span className="text-[8px] font-bold text-blue-400/50 uppercase tracking-widest">
                             {log.end_time ? "Completed_Burst" : "Running_Session"}
                           </span>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                    <History className="w-10 h-10 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">No_Vectors_Found</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
