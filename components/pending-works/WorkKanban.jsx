"use client";

import React from 'react';
import { 
  Clock, 
  User, 
  Megaphone, 
  Briefcase, 
  Calendar,
  Folder,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  History,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const COLUMNS = [
  { id: 'Project', title: 'Projects', color: 'blue' },
  { id: 'Task', title: 'Tasks', color: 'blue' },
  { id: 'Marketing', title: 'Marketing', color: 'orange' },
  { id: 'Meeting', title: 'Meetings', color: 'purple' },
];

export default function WorkKanban({ works, onViewDetail, isAdmin = false, onRefresh }) {
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
    <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8 scrollbar-hide">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-80 lg:w-96">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                column.color === 'blue' ? "bg-blue-500" :
                column.color === 'orange' ? "bg-orange-500" : "bg-purple-500"
              )} />
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{column.title}</h3>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-600">
                {works.filter(w => w.type === column.id).length}
              </span>
            </div>
          </div>

          <div className="space-y-4 bg-[#0a0a0a]/50 border border-[#1f1f1f]/50 rounded-2xl p-4 min-h-[600px]">
            {works
              .filter(work => work.type === column.id)
              .map((work) => (
                <div 
                  key={work.id}
                  onClick={() => {
                    if (work.type === 'Project' && onViewDetail) {
                      onViewDetail(work.id);
                    }
                  }}
                  className="group bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-5 hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden shadow-lg shadow-black/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "p-2 rounded-lg border",
                      work.type === 'Marketing' ? "bg-orange-500/5 border-orange-500/10 text-orange-400" :
                      work.type === 'Meeting' ? "bg-purple-500/5 border-purple-500/10 text-purple-400" :
                      "bg-blue-500/5 border-blue-500/10 text-blue-400"
                    )}>
                      {getIcon(work.type)}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isAdmin && (work.submission_link || work.drive_link) && (
                          <a 
                            href={work.submission_link || work.drive_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 px-2 rounded bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 transition-all flex items-center gap-1"
                            title="View Submission"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="text-[7px] font-black uppercase">Result</span>
                          </a>
                        )}
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border",
                          getStatusColor(work.status)
                        )}>
                          {work.status}
                        </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors uppercase tracking-tight mb-2 line-clamp-2 leading-tight">
                    {work.title}
                  </h4>
                  
                  <p className="text-[10px] text-gray-500 mb-4 line-clamp-2 leading-relaxed italic">
                    {work.description || 'No detailed specifications logged.'}
                  </p>

                  <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                    {/* Admin Actions */}
                    {isAdmin && (['under-review', 'completed', 'admin-review', 'approved'].includes(work.status)) && (
                      <div className="flex gap-2 mb-3">
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
                          className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
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
                            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20"
                          >
                            Approve
                          </button>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchLogs(work.original_type === 'marketing' ? null : work.id, work.original_type === 'marketing' ? work.id : null);
                            }}
                            className="flex-1 py-2 rounded-lg bg-purple-600/10 text-purple-400 hover:bg-purple-600/20 border border-purple-500/20 transition-all flex items-center justify-center gap-2"
                            title="View Progress Logs"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Logs</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[9px] font-bold text-blue-400 border border-blue-500/20">
                          {work.assigned_to?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[80px]">
                          {work.assigned_to || 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-gray-600">
                        <Clock className="w-3 h-3" />
                        {work.deadline ? new Date(work.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '---'}
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-600 transition-all" />
                </div>
              ))}
            
            {works.filter(w => w.type === column.id).length === 0 && (
              <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/20 opacity-30">
                <AlertCircle className="w-5 h-5 mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest">Queue Empty</p>
              </div>
            )}
          </div>
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
