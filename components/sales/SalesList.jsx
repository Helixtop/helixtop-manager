"use client";

import React from 'react';
import { 
  MoreHorizontal, 
  Calendar, 
  Mail, 
  Phone,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SalesList({ leads, onSelectLead, onUpdateStage }) {
  const STAGES = [
    { id: 'ad-leads', title: 'Ad Leads' },
    { id: 'contacted', title: 'Contacted' },
    { id: 'meeting-booked', title: 'Meeting Booked' },
    { id: 'meeting-completed', title: 'Meeting Completed' },
    { id: 'win', title: 'Win' },
    { id: 'lose', title: 'Lose' },
  ];

  const getStageColor = (stage) => {
    switch (stage) {
      case 'ad-leads': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'contacted': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'meeting-booked': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'meeting-completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'win': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'lose': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <div 
          key={lead.id}
          className="group p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-xl"
        >
          <div 
            onClick={() => onSelectLead(lead)}
            className="flex items-center gap-5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 text-lg font-bold">
              {lead.name[0]}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  getPriorityColor(lead.priority)
                )}>
                  {lead.priority}
                </span>
                <h4 className="font-bold text-gray-200 truncate uppercase tracking-tight group-hover:text-white transition-colors">
                  {lead.name}
                </h4>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {lead.type}
                </span>
                {lead.contact && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5" />
                    {lead.contact}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 flex-shrink-0 relative z-10">
            <div className="flex flex-col items-end min-w-[140px]">
              <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Status_Node</span>
              <select 
                value={lead.stage}
                onChange={(e) => onUpdateStage(lead.id, e.target.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border outline-none focus:ring-0 cursor-pointer appearance-none",
                  getStageColor(lead.stage)
                )}
              >
                {STAGES.map(stage => (
                  <option key={stage.id} value={stage.id} className="bg-black text-white">{stage.title.replace(' ', '_')}</option>
                ))}
              </select>
            </div>

            {lead.meeting_time && (
              <div className="flex flex-col items-end min-w-[120px]">
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1">Scheduled</span>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-orange-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(lead.meeting_time).toLocaleDateString()}
                </div>
              </div>
            )}

            <div 
               onClick={() => onSelectLead(lead)}
               className="cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-600 transition-all rounded-l-2xl shadow-[0_0_15px_#3b82f6]" />
        </div>
      ))}
    </div>
  );
}
