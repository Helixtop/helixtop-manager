"use client";

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  User, 
  Phone, 
  Mail,
  Zap,
  CheckCircle2,
  XCircle,
  Briefcase,
  Loader2,
  IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeads, createLead, updateLeadStage, closeDeal } from './actions';

const COLUMNS = [
  { id: 'ad-leads', title: 'Ad Leads', color: 'blue' },
  { id: 'contacted', title: 'Contacted', color: 'purple' },
  { id: 'meeting-booked', title: 'Meeting Booked', color: 'orange' },
  { id: 'meeting-completed', title: 'Meeting Completed', color: 'green' },
  { id: 'win', title: 'Win', color: 'emerald' },
  { id: 'lose', title: 'Lose', color: 'red' },
];

function LeadCard({ lead, isOverlay }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30 p-4 mb-3 bg-[#111] border border-[#1f1f1f] rounded-xl h-24" />
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(
        "p-4 mb-3 bg-[#111] border border-[#1f1f1f] rounded-xl hover:border-blue-500/30 transition-all cursor-grab active:cursor-grabbing group shadow-lg",
        isOverlay && "border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/20"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border",
          lead.priority === 'high' ? "bg-red-500/10 text-red-400 border-red-500/20" : 
          lead.priority === 'medium' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
          "bg-white/5 text-gray-400 border-white/10"
        )}>
          {lead.priority}
        </span>
        <button className="text-gray-600 hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <h4 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{lead.name}</h4>
      <p className="text-[10px] text-gray-500 mt-1 uppercase font-medium">{lead.type}</p>
      
      {lead.meeting_time && (
        <div className="mt-3 flex items-center gap-1.5 p-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
          <Calendar className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] text-orange-400 font-bold">
            {new Date(lead.meeting_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      )}
    </div>
  );
}

export default function SalesPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await getLeads();
      if (error) throw new Error(error);
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLocalAndServerStage = async (id, newStage) => {
    try {
      const { success, error } = await updateLeadStage(id, newStage);
      if (!success) throw new Error(error);
    } catch (error) {
      console.error('Error updating lead stage:', error);
      fetchLeads(); // Rollback local state if error
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    setActiveLead(leads.find(l => l.id === active.id));
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    
    const activeLead = leads.find(l => l.id === active.id);
    const overId = over.id;

    // Check if dragging over a column or another lead
    const overColumn = COLUMNS.find(c => c.id === overId);
    
    if (overColumn && activeLead.stage !== overColumn.id) {
      if (overColumn.id === 'win') {
        setSelectedLead(activeLead);
        setShowWinModal(true);
      } else {
        setLeads(prev => prev.map(l => l.id === active.id ? { ...l, stage: overColumn.id } : l));
        updateLocalAndServerStage(active.id, overColumn.id);
      }
    } else {
      const overLead = leads.find(l => l.id === overId);
      if (overLead && activeLead.stage !== overLead.stage) {
        if (overLead.stage === 'win') {
            setSelectedLead(activeLead);
            setShowWinModal(true);
        } else {
            setLeads(prev => prev.map(l => l.id === active.id ? { ...l, stage: overLead.stage } : l));
            updateLocalAndServerStage(active.id, overLead.stage);
        }
      }
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    setActiveLead(null);
  };

  const [selectedLead, setSelectedLead] = useState(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winFormData, setWinFormData] = useState({
    total: '',
    advance: '',
    installments: '1',
    scope: '',
    assignee: ''
  });

  const handleWinSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await closeDeal(selectedLead.id, winFormData);
      
      if (!result.success) throw new Error(result.error);

      setShowWinModal(false);
      fetchLeads();
      alert('Project Win synchronized! Task created and income logged.');
    } catch (err) {
      alert('Win sync error: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Sales Pipeline</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Lead Acquisition Hub</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl py-2 px-10 text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Polling Pipeline...</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8 scrollbar-hide">
            {COLUMNS.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      column.color === 'blue' ? "bg-blue-500" :
                      column.color === 'purple' ? "bg-purple-500" :
                      column.color === 'orange' ? "bg-orange-500" :
                      column.color === 'green' ? "bg-green-500" :
                      column.color === 'emerald' ? "bg-emerald-500" : "bg-red-500"
                    )} />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{column.title}</h3>
                  </div>
                </div>

                <div className="bg-[#0a0a0a]/50 border border-[#1f1f1f]/50 rounded-2xl min-h-[600px] p-3">
                  <SortableContext
                    id={column.id}
                    items={leads.filter(l => l.stage === column.id).map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="min-h-full">
                      {leads
                        .filter(l => l.stage === column.id)
                        .map((lead) => (
                          <div key={lead.id} onClick={() => {
                            setSelectedLead(lead);
                            if (lead.stage === 'win' && !showWinModal) {
                                // Already a win, just show details
                            }
                          }}>
                             <LeadCard lead={lead} />
                          </div>
                        ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const { success, error } = await createLead(formData);

              if (success) {
                setShowAddModal(false);
                fetchLeads();
                alert('New lead acquired!');
              } else {
                alert('Lead creation error: ' + error);
              }
            }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Acquire New Lead</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Manual_Entry_Protocol</p>
              </div>
              <XCircle className="w-6 h-6 text-gray-700 cursor-pointer" onClick={() => setShowAddModal(false)} />
            </div>

            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lead / Client Name</label>
                <input name="name" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none" placeholder="e.g. Acme Corp" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Type / Source</label>
                   <select name="type" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-3 text-sm focus:border-blue-500/50 outline-none">
                     <option>Inbound Ad</option>
                     <option>Referral</option>
                     <option>Cold Outreach</option>
                     <option>Existing Client</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Priority</label>
                   <select name="priority" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-3 text-sm focus:border-blue-500/50 outline-none">
                     <option value="medium">Medium</option>
                     <option value="high">High</option>
                     <option value="low">Low</option>
                   </select>
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Contact Info (Email/Phone)</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                   <input name="contact" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none" placeholder="contact@example.com" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Assign Sales Rep (Optional ID)</label>
                <input name="assigned_to" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none" placeholder="Profile UUID" />
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Default Stage</p>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase border border-blue-500/20">Ad Leads</span>
              </div>
            </div>

            <div className="p-8 bg-white/5 flex gap-4">
               <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 border border-[#1f1f1f] rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
               <button type="submit" className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Create_Entity</button>
            </div>
          </form>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <form onSubmit={handleWinSubmit} className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Project Victory</h3>
                  <p className="text-[10px] text-emerald-400/70 font-black uppercase tracking-[0.3em]">Seal_The_Deal_Protocol</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Project Value</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input 
                      type="number" 
                      required
                      value={winFormData.total}
                      onChange={(e) => setWinFormData({...winFormData, total: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-emerald-500/50 outline-none font-mono" 
                      placeholder="0" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Advance Payment</label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input 
                      type="number" 
                      required
                      value={winFormData.advance}
                      onChange={(e) => setWinFormData({...winFormData, advance: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-emerald-500/50 outline-none font-mono" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Work Scope / Details</label>
                <textarea 
                  required
                  value={winFormData.scope}
                  onChange={(e) => setWinFormData({...winFormData, scope: e.target.value})}
                  className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 outline-none h-24 resize-none" 
                  placeholder="Describe the final agreed scope..." 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Allocate Lead Expert</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input 
                      type="text" 
                      placeholder="Enter Employee ID or Name"
                      value={winFormData.assignee}
                      onChange={(e) => setWinFormData({...winFormData, assignee: e.target.value})}
                      className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-emerald-500/50 outline-none" 
                    />
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/5 flex gap-4">
              <button 
                type="button"
                onClick={() => setShowWinModal(false)}
                className="flex-1 py-4 rounded-2xl border border-[#1f1f1f] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-gray-400"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 text-white"
              >
                Confirm_&_Provision_Tasks
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLead && !showWinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-2xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedLead.name}</h3>
                <div className="flex gap-2 mt-2">
                   <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase border border-blue-500/20">{selectedLead.type}</span>
                   <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-[9px] font-black uppercase border border-white/10">{selectedLead.stage}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-all">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                   <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Mail className="w-3.5 h-3.5" />
                     Contact_Info
                   </h4>
                   <p className="text-sm font-bold text-gray-300">{selectedLead.email || 'No email provided'}</p>
                   <p className="text-sm font-bold text-gray-300 mt-1">{selectedLead.phone || 'No phone provided'}</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Briefcase className="w-3.5 h-3.5" />
                     Project_Scope
                   </h4>
                   <p className="text-xs text-gray-400 leading-relaxed italic">
                     {selectedLead.description || 'No detailed scope recorded yet.'}
                   </p>
                </div>
              </div>
              <div className="space-y-6">
                 <div>
                   <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <Calendar className="w-3.5 h-3.5" />
                     Timeline_&_Events
                   </h4>
                   {selectedLead.meeting_time ? (
                     <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                        <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Meeting Booked</p>
                        <p className="text-sm font-mono font-bold text-gray-200">{new Date(selectedLead.meeting_time).toLocaleString()}</p>
                     </div>
                   ) : (
                     <p className="text-xs text-gray-600 font-bold uppercase italic">No meetings scheduled.</p>
                   )}
                 </div>
              </div>
            </div>

            <div className="p-8 bg-white/5 flex gap-4">
               <button className="flex-1 py-3 rounded-xl border border-[#1f1f1f] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all text-gray-400">Edit Details</button>
               {selectedLead.stage !== 'win' && selectedLead.stage !== 'lose' && (
                 <button 
                  onClick={() => {
                    const reason = prompt('Enter loss reason:');
                    if (reason) {
                        updateLocalAndServerStage(selectedLead.id, 'lose');
                        setSelectedLead(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-600/20 transition-all"
                 > Mark as Lost </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
