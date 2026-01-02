"use client";

import React from 'react';
import { 
  Clock, 
  User, 
  Megaphone, 
  Briefcase, 
  Calendar,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { id: 'Task', title: 'Tasks', color: 'blue' },
  { id: 'Marketing', title: 'Marketing', color: 'orange' },
  { id: 'Meeting', title: 'Meetings', color: 'purple' },
];

export default function WorkKanban({ works }) {
  const getIcon = (type) => {
    switch (type) {
      case 'Marketing': return <Megaphone className="w-4 h-4" />;
      case 'Meeting': return <Calendar className="w-4 h-4" />;
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
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border",
                      getStatusColor(work.status)
                    )}>
                      {work.status}
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors uppercase tracking-tight mb-2 line-clamp-2 leading-tight">
                    {work.title}
                  </h4>
                  
                  <p className="text-[10px] text-gray-500 mb-4 line-clamp-2 leading-relaxed italic">
                    {work.description || 'No detailed specifications logged.'}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
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
    </div>
  );
}
