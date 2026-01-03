"use client";

import React from 'react';
import { 
  Clock, 
  User, 
  ChevronRight, 
  Megaphone, 
  Briefcase, 
  Calendar,
  AlertCircle,
  Folder,
  ExternalLink,
  History,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function WorkList({ works, onViewDetail, isAdmin = false, onRefresh }) {
  const getIcon = (type) => {
    switch (type) {
      case 'Marketing': return <Megaphone className="w-4 h-4" />;
      case 'Meeting': return <Calendar className="w-4 h-4" />;
      case 'Project': return <Folder className="w-4 h-4" />;
      default: return <Briefcase className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-progress': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'admin-review': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  const [selectedLogs, setSelectedLogs] = React.useState(null);
  const [loadingLogs, setLoadingLogs] = React.useState(false);

  const fetchLogs = async (taskId, marketingId) => {
    setLoadingLogs(true);
    try {
        let query = supabase.from('time_logs').select('*, profiles(full_name)');
        if (taskId) query = query.eq('task_id', taskId);
        else if (marketingId) query = query.eq('marketing_content_id', marketingId);
        
        const { data, error } = await query.order('start_time', { ascending: false });
        if (error) throw error;
        setSelectedLogs(data || []);
    } catch (err) {
        console.error("Error fetching logs:", err);
    } finally {
        setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-4">
      {works.map((work) => (
        <div 
          key={work.id}
          className={cn(
            "group p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl",
            work.type === 'Project' ? "hover:border-blue-500/30 cursor-pointer" : "hover:border-blue-500/10"
          )}
          onClick={() => {
            if (work.type === 'Project' && onViewDetail) {
              onViewDetail(work.id);
            }
          }}
        >
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
              work.type === 'Marketing' ? "bg-orange-600/10 text-orange-400" :
              work.type === 'Meeting' ? "bg-purple-600/10 text-purple-400" :
              work.type === 'Project' ? "bg-blue-600/10 text-blue-500" :
              "bg-blue-600/10 text-blue-400"
            )}>
              {getIcon(work.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">[{work.type}]</span>
                <h4 className="font-bold text-gray-200 truncate uppercase tracking-tight group-hover:text-white transition-colors">
                  {work.title}
                </h4>
              </div>
              <p className="text-xs text-gray-500 line-clamp-1 max-w-2xl leading-relaxed italic">
                {work.description || 'No detailed specifications logged.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Assigned_To</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-blue-500/20 uppercase">
                  {work.assigned_to?.split(' ').map(n => n[0]).join('') || '?'}
                </div>
                <span className="text-xs font-bold text-gray-400">{work.assigned_to || 'Unassigned'}</span>
              </div>
            </div>

            <div className="flex flex-col items-end min-w-[120px]">
              <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Timeline_Node</span>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-300">
                <Clock className="w-3.5 h-3.5 text-blue-500/50" />
                {work.deadline ? new Date(work.deadline).toLocaleDateString() : 'N/A'}
              </div>
            </div>

            <div className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
              getStatusColor(work.status)
            )}>
              {work.status}
            </div>

            {/* Submission Link & Logs */}
            {isAdmin && (work.submission_link || work.drive_link) && (
              <a 
                href={work.submission_link || work.drive_link} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 transition-all flex items-center gap-2"
                title="View Submission"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-widest hidden lg:block">Result</span>
              </a>
            )}

            {isAdmin && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLogs(work.original_type === 'marketing' ? null : work.id, work.original_type === 'marketing' ? work.id : null);
                }}
                className="p-2 rounded-lg bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 border border-purple-500/20 transition-all flex items-center gap-2"
                title="View Progress Logs"
              >
                <History className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-widest hidden lg:block">Logs</span>
              </button>
            )}

            {/* Admin Actions */}
            {isAdmin && (['under-review', 'completed', 'admin-review', 'approved'].includes(work.status)) && (
              <div className="flex gap-2 border-l border-white/5 pl-4 ml-4">
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const reason = prompt("Enter feedback/reason for rejection:");
                    if (reason === null) return;
                    
                    const timestamp = new Date().toLocaleString();
                    const newEntry = `[${timestamp}] ADMIN_REJECTION: ${reason}`;
                    const updatedLogs = work.admin_feedback 
                      ? `${newEntry}\n${work.admin_feedback}` 
                      : newEntry;

                    const table = work.original_type === 'marketing' ? 'marketing_content' : 'tasks';
                    const { error } = await supabase.from(table).update({ 
                      status: 'rejected',
                      admin_feedback: updatedLogs
                    }).eq('id', work.id);
                    
                    if (!error) {
                      onRefresh();
                      alert("Work Rejected with Feedback.");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                >
                  Reject
                </button>
                {(work.status === 'under-review' || work.status === 'admin-review') && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      const table = work.original_type === 'marketing' ? 'marketing_content' : 'tasks';
                      const { error } = await supabase.from(table).update({ 
                        status: work.original_type === 'marketing' ? 'approved' : 'completed',
                        admin_feedback: null // Clear feedback on approval
                      }).eq('id', work.id);
                      
                      if (!error) {
                        onRefresh();
                        alert("Work Approved!");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20"
                  >
                    Approve
                  </button>
                )}
              </div>
            )}

            <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>

          <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-600 transition-all rounded-l-2xl shadow-[0_0_15px_#3b82f6]" />
        </div>
      ))}

      {/* Progress Logs Modal */}
      {selectedLogs !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-xl rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col p-8">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center">
                    <History className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Progress Logs</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Vector_Audit_Trail</p>
                  </div>
               </div>
               <button onClick={() => setSelectedLogs(null)} className="p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                 <XCircle className="w-6 h-6" />
               </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar pr-2">
               {loadingLogs ? (
                 <div className="flex flex-col items-center justify-center py-10 gap-2">
                   <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                   <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest font-mono">Scanning_Matrix...</p>
                 </div>
               ) : selectedLogs.length > 0 ? (
                 selectedLogs.map(log => (
                   <div key={log.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 border-l-4 border-l-purple-500/30">
                     <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                       <span className="text-purple-400">{new Date(log.start_time).toLocaleDateString()}</span>
                       <span className="text-gray-600">Duration: {Math.floor(log.duration / 60)}m</span>
                     </div>
                     <p className="text-xs text-gray-300 leading-relaxed italic">
                       "{log.notes || 'No session notes provided.'}"
                     </p>
                   </div>
                 ))
               ) : (
                 <div className="py-10 text-center opacity-30 border-2 border-dashed border-white/5 rounded-2xl">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No_Logs_Found</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
