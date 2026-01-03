"use client";

import React, { useState, useEffect } from 'react';
import { 
  XCircle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  IndianRupee, 
  Briefcase,
  ExternalLink,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/roles';
import { getDetailedEmployeeTime, processSalaryPayment, updateEmployeeRole, scheduleMeeting } from '@/app/team/actions';
import { useActionState } from 'react';

export default function EmployeeDetail({ employee, onClose, onRefresh, onEditSalary }) {
  const [filterType, setFilterType] = useState('Month'); 
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7)); // Default to current month
  const [weekIndex, setWeekIndex] = useState(1);
  const [periodSeconds, setPeriodSeconds] = useState(0);
  const [loadingTime, setLoadingTime] = useState(false);
  const [showMeetForm, setShowMeetForm] = useState(false);

  const [roleState, roleAction, rolePending] = useActionState(updateEmployeeRole, null);
  const [meetState, meetAction, meetPending] = useActionState(scheduleMeeting, null);

  useEffect(() => {
    if (meetState?.success) {
      alert(meetState.message);
      setShowMeetForm(false);
    } else if (meetState?.message) {
      alert(meetState.message);
    }
  }, [meetState]);

  useEffect(() => {
    if (roleState?.message) {
      alert(roleState.message);
    }
  }, [roleState]);

  useEffect(() => {
    fetchDetailedTime();
  }, [filterType, filterValue, weekIndex]);

  const fetchDetailedTime = async () => {
    setLoadingTime(true);
    // If type is week, we need to pass weekIndex
    const res = await getDetailedEmployeeTime(employee.id, filterType, filterValue, weekIndex);
    if (res.success) setPeriodSeconds(res.totalSeconds);
    setLoadingTime(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0h';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header - Fixed */}
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-start shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center text-3xl font-black text-gray-500 shadow-xl">
              {employee.full_name?.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{employee.full_name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <form action={roleAction}>
                  <input type="hidden" name="userId" value={employee.id} />
                  <select
                    name="role"
                    defaultValue={employee.role}
                    onChange={(e) => e.target.form.requestSubmit()}
                    disabled={rolePending}
                    className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-blue-500 cursor-pointer appearance-none"
                  >
                    {Object.values(ROLES).map(role => (
                      <option key={role} value={role} className="bg-[#0a0a0a] text-white">{role}</option>
                    ))}
                  </select>
                </form>
                <span className="text-xs text-gray-500 font-mono">{employee.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-all">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Time Tracking Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Time_Audit_Protocol
              </h4>
              <div className="flex bg-black p-1 rounded-lg border border-white/5">
                {['Day', 'Week', 'Month'].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={cn(
                      "px-3 py-1 rounded text-[9px] font-bold uppercase transition-all tracking-widest",
                      filterType === t ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className={cn(
                 "p-5 rounded-2xl bg-black border border-white/5 flex items-center justify-between",
                 filterType === 'Week' ? "md:col-span-1" : "md:col-span-2"
               )}>
                  <div className="space-y-1 w-full">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                      {filterType === 'Week' ? 'Select_Month' : 'Select_Period'}
                    </p>
                    <input 
                      type={filterType === 'Day' ? 'date' : 'month'}
                      value={filterType === 'Day' ? filterValue : filterValue.substring(0, 7)}
                      onChange={(e) => setFilterValue(e.target.value)}
                      className="w-full bg-transparent border-none text-white text-sm font-bold focus:ring-0 outline-none p-0 cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                  <Calendar className="w-5 h-5 text-blue-500/50" />
               </div>

               {filterType === 'Week' && (
                 <div className="p-5 rounded-2xl bg-black border border-white/5 flex items-center justify-between">
                    <div className="space-y-1 w-full">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Select_Week</p>
                      <select 
                        value={weekIndex}
                        onChange={(e) => setWeekIndex(Number(e.target.value))}
                        className="w-full bg-transparent border-none text-white text-sm font-bold focus:ring-0 outline-none p-0 cursor-pointer appearance-none"
                      >
                        <option value={1} className="bg-[#0a0a0a]">1st Week (1-7)</option>
                        <option value={2} className="bg-[#0a0a0a]">2nd Week (8-14)</option>
                        <option value={3} className="bg-[#0a0a0a]">3rd Week (15-21)</option>
                        <option value={4} className="bg-[#0a0a0a]">4th Week (22-28)</option>
                        <option value={5} className="bg-[#0a0a0a]">5th Week (29+)</option>
                      </select>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-500/50 rotate-90" />
                 </div>
               )}

               <div className="p-5 rounded-2xl bg-blue-600/5 border border-blue-500/20 flex flex-col justify-center text-center">
                  <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Tracked_Duration</p>
                  <div className="flex items-center justify-center gap-2">
                    {loadingTime ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <p className="text-xl font-black text-white tracking-tighter">{formatDuration(periodSeconds)}</p>
                    )}
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Payment Summary */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Financial_Closure
               </h4>
               <div className="p-6 rounded-3xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 relative overflow-hidden">
                  <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest mb-1">Unpaid Balance</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    ₹{(employee.stats?.pendingPayment || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2 font-mono">
                    {formatDuration(employee.stats?.unpaidSeconds)} @ ₹{employee.hourly_rate}/hr
                  </p>
                  <button 
                    onClick={async () => {
                      const amount = employee.stats?.pendingPayment || 0;
                      if (amount <= 0) return alert('No pending balance to pay.');
                      const durationStr = formatDuration(employee.stats?.unpaidSeconds || 0);
                      if (confirm(`Process payment of ₹${amount.toLocaleString()} to ${employee.full_name}?`)) {
                          const res = await processSalaryPayment(employee.id, amount, durationStr);
                          if (res.success) {
                            alert(res.message);
                            onClose();
                            onRefresh();
                          } else alert(res.message);
                      }
                    }}
                    disabled={(employee.stats?.pendingPayment || 0) <= 0}
                    className="w-full mt-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-green-600/20"
                  >
                    Process_Execute_Payment
                  </button>

                  <button 
                    onClick={() => onEditSalary(employee)}
                    className="w-full mt-2 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-500 hover:text-white font-bold uppercase tracking-widest text-[9px] transition-all"
                  >
                    Adjust_Hourly_Rate
                  </button>
               </div>
            </div>

            {/* Lifetime Stats */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  Performance_Metrics
               </h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 rounded-2xl bg-black border border-white/5">
                   <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Total_Earnings</p>
                   <p className="text-lg font-black text-white tracking-tighter">₹{(employee.stats?.totalPaidEstimated || 0).toLocaleString()}</p>
                 </div>
                 <div className="p-5 rounded-2xl bg-black border border-white/5">
                   <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Finished_Tasks</p>
                   <p className="text-lg font-black text-white tracking-tighter">{employee.stats?.completedTasks || 0}</p>
                 </div>
               </div>

               {/* Schedule Meeting UI */}
                <div className="mt-4 p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                   {!showMeetForm ? (
                     <button 
                       onClick={() => setShowMeetForm(true)}
                       className="w-full py-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                     >
                       <Calendar className="w-4 h-4" />
                       Schedule_New_Meeting
                     </button>
                   ) : (
                     <form action={meetAction} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <input type="hidden" name="userId" value={employee.id} />
                        <div>
                          <input 
                            name="leadName" 
                            placeholder="Meeting Subject / Lead Name" 
                            required
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <input 
                              type="datetime-local" 
                              name="meetingTime" 
                              required
                              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 [color-scheme:dark]"
                           />
                           <button 
                             disabled={meetPending}
                             type="submit"
                             className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-50"
                           >
                             {meetPending ? 'Scheduling...' : 'Confirm_Schedule'}
                           </button>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setShowMeetForm(false)}
                          className="w-full py-1 text-[8px] text-gray-600 uppercase font-black hover:text-gray-400 transition-colors"
                        >
                          Cancel_Request
                        </button>
                     </form>
                   )}
                </div>
            </div>
          </div>

          {/* Major Project Assignments Section */}
          {employee.stats?.assignedProjects?.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Major_Project_Assignments
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2 custom-scrollbar">
                {employee.stats.assignedProjects.map(project => (
                  <div key={project.id} className="p-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                    <div className="relative z-10">
                       <p className="text-xs font-black text-white uppercase tracking-tight truncate">{project.name}</p>
                       <div className="flex items-center justify-between mt-2">
                          <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                             {project.status || 'Active'}
                          </span>
                       </div>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Briefcase className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects / Recent Activity Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Recent_Workstream
            </h4>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {employee.stats?.recentTasks?.length > 0 ? (
                employee.stats?.recentTasks.map(task => (
                  <div key={task.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all flex justify-between items-center group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          task.status === 'verified' ? "bg-green-500" : "bg-blue-500"
                        )} />
                        <p className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors uppercase tracking-tight">{task.title}</p>
                      </div>
                      <p className="text-[9px] text-gray-600 font-mono mt-1 ml-4.5 uppercase tracking-widest">{task.status || 'Active'}</p>
                    </div>
                    {task.submission_link && (
                      <a 
                        href={task.submission_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                      >
                         View_Work
                         <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Zero_Vectors_Found</p>
                </div>
              )}
            </div>
          </div>

          {/* Marketing Content Works Section */}
          {(employee.stats?.completedWorksCount > 0 || employee.stats?.pendingWorksCount > 0 || employee.stats?.rejectedWorksCount > 0) && (
            <div className="space-y-6">
              {/* Completed Works */}
              {employee.stats?.completedWorks?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed_Works ({employee.stats.completedWorks.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {employee.stats.completedWorks.map(work => (
                      <div key={work.id} className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all">
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

              {/* Pending Works */}
              {employee.stats?.pendingWorks?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pending_Works ({employee.stats.pendingWorks.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {employee.stats.pendingWorks.map(work => (
                      <div key={work.id} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all">
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

              {/* Rejected Works */}
              {employee.stats?.rejectedWorks?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Rejected_Works ({employee.stats.rejectedWorks.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {employee.stats.rejectedWorks.map(work => (
                      <div key={work.id} className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{work.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                              <span className="uppercase font-bold">{work.platform}</span>
                              <span>•</span>
                              <span>{new Date(work.scheduled_date).toLocaleDateString()}</span>
                            </div>
                            {work.admin_feedback && (
                              <p className="text-[9px] text-red-400 mt-1 line-clamp-2 italic">"{work.admin_feedback}"</p>
                            )}
                          </div>
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
