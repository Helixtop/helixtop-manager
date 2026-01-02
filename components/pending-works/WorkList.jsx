"use client";

import React from 'react';
import { 
  Clock, 
  User, 
  ChevronRight, 
  Megaphone, 
  Briefcase, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WorkList({ works }) {
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
    <div className="space-y-4">
      {works.map((work) => (
        <div 
          key={work.id}
          className="group p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
              work.type === 'Marketing' ? "bg-orange-600/10 text-orange-400" :
              work.type === 'Meeting' ? "bg-purple-600/10 text-purple-400" :
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

            <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>

          <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-600 transition-all rounded-l-2xl shadow-[0_0_15px_#3b82f6]" />
        </div>
      ))}
    </div>
  );
}
