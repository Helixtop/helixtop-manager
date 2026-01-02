"use client";

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  // defaultDropAnimationSideEffects, // Not used but imported in original?
  useDroppable,
  DragOverlay
} from '@dnd-kit/core';
import { 
  // arrayMove, // Not used
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  LayoutGrid, 
  List
} from 'lucide-react';
import SalesList from '@/components/sales/SalesList';
import { 
  Plus, 
  Search, 
  // Filter, // Not used
  MoreHorizontal, 
  Calendar, 
  User, 
  // Phone, // Not used
  Mail,
  Zap,
  CheckCircle2,
  XCircle,
  Briefcase,
  Loader2,
  IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeads, createLead, updateLeadStage, closeDeal, updateLead, generatePriceEstimate, addPayment } from './actions';

const Confetti = () => (
  <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden flex justify-between items-end px-20 pb-0">
    <div className="relative">
       <div className="text-[100px] animate-bounce origin-bottom -rotate-12">🎉</div>
       {/* Simple particle simulation using CSS dots */}
       <div className="absolute top-0 left-1/2 -ml-1 w-2 h-2 bg-red-500 rounded-full animate-[ping_1s_ease-out_infinite]" />
       <div className="absolute top-0 left-1/2 ml-4 w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite]" />
    </div>
    <div className="relative">
       <div className="text-[100px] animate-bounce origin-bottom rotate-12">🎉</div>
    </div>
  </div>
);

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

function DroppableColumn({ id, children, className }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

export default function SalesPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [showConfetti, setShowConfetti] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isGeneratingPrice, setIsGeneratingPrice] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);


  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  useEffect(() => {
    if (selectedLead) {
        setEditFormData({
            name: selectedLead.name || '',
            company: selectedLead.company || '',
            email: selectedLead.email || '',
            phone: selectedLead.phone || '',
            description: selectedLead.description || '',
            // If contact field was used as fallback
            contact: selectedLead.contact || '',
            budget: selectedLead.budget || ''
        });
    }
  }, [selectedLead]);

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
    
    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeLead = leads.find(l => l.id === activeId);
    if (!activeLead) return;

    // Determine the container (stage) being hovered
    const overColumn = COLUMNS.find(c => c.id === overId);
    const overLead = leads.find(l => l.id === overId);
    const newStage = overColumn ? overColumn.id : (overLead ? overLead.stage : null);

    if (newStage && activeLead.stage !== newStage) {
      setLeads(prev => prev.map(l => l.id === activeId ? { ...l, stage: newStage } : l));
    }
  };

  const handleDragEnd = ({ active, over }) => {
    if (over) {
      const activeId = active.id;
      const overId = over.id;
      
      const activeLead = leads.find(l => l.id === activeId);
      if (activeLead) {
        // If it's a 'win', show modal, otherwise update server
        if (activeLead.stage === 'win') {
          setShowConfetti(true);
          updateLocalAndServerStage(activeId, 'win');
        } else {
          updateLocalAndServerStage(activeId, activeLead.stage);
        }
      }
    } else {
      // Revert if dropped outside? Optional, but fetchLeads handles it if server was never updated
      fetchLeads();
    }

    setActiveId(null);
    setActiveLead(null);
  };



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Sales Pipeline</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Lead Acquisition Hub</p>
        </div>
        <div className="flex gap-4 items-center">
           <div className="flex p-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl">
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-tight",
                  viewMode === 'kanban' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-tight",
                  viewMode === 'list' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
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
      ) : viewMode === 'list' ? (
        <SalesList 
          leads={leads} 
          onSelectLead={(lead) => {
             setSelectedLead(lead);
             if (lead.stage === 'win') {
                 // Already a win, just show details
             }
          }} 
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
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

                <DroppableColumn 
                  id={column.id} 
                  className="bg-[#0a0a0a]/50 border border-[#1f1f1f]/50 rounded-2xl min-h-[600px] p-3"
                >
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
                            if (lead.stage === 'win') {
                                // Already a win, just show details
                            }
                          }}>
                             <LeadCard lead={lead} />
                          </div>
                        ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
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

      {/* Win Modal Removed */}

      {/* Confetti Overlay */}
      {showConfetti && <Confetti />}

      {/* Editable Detail Modal */}
      {/* Editable Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#09090b] border border-[#27272a] w-full max-w-4xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="sticky top-0 z-10 p-6 border-b border-[#27272a] flex justify-between items-center bg-[#09090b]/95 backdrop-blur">
               <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Lead Details</h3>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest mt-0.5">Edit_Metadata</p>
               </div>
               <button onClick={() => setSelectedLead(null)} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 transition-all">
                 <XCircle className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Left Column: Basic Info */}
               <div className="space-y-6">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Client Name</label>
                      <input 
                        value={editFormData.name} 
                        onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500/50 focus:bg-zinc-900 outline-none text-white font-medium transition-all"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Company</label>
                      <input 
                        value={editFormData.company} 
                        onChange={e => setEditFormData({...editFormData, company: e.target.value})}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500/50 focus:bg-zinc-900 outline-none text-zinc-300 transition-all"
                        placeholder="Organization Name"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone</label>
                          <input 
                            value={editFormData.phone} 
                            onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500/50 focus:bg-zinc-900 outline-none font-mono text-zinc-400 Transition-all"
                            placeholder="+91..."
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email</label>
                          <input 
                            value={editFormData.email} 
                            onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500/50 focus:bg-zinc-900 outline-none font-mono text-zinc-400 Transition-all"
                            placeholder="client@mail.com"
                          />
                       </div>
                   </div>

                   {/* Financials moved to Left Column bottom or separate? Let's keep it here for balance if Scope is long. 
                       Actually, let's put Financials on the RIGHT, and Scope on the LEFT (swapped)? 
                       No, keep Scope prominent. Let's put Financials below Basic Info. */}
                   
                   <div className="pt-6 border-t border-zinc-800">
                     <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" /> Financial Overview
                     </h4>
                     <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-zinc-600 uppercase">Total Budget</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                                <input 
                                  value={editFormData.budget} 
                                  onChange={e => setEditFormData({...editFormData, budget: e.target.value})}
                                  className="w-full bg-black border border-zinc-800 rounded-lg py-2 pl-7 pr-3 text-sm font-mono text-white outline-none focus:border-green-500/50"
                                  placeholder="0.00"
                                />
                              </div>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-zinc-600 uppercase">Collected</label>
                              <div className="w-full bg-green-500/10 border border-green-500/20 rounded-lg py-2 px-3 text-sm font-mono text-green-400">
                                ₹{(selectedLead.payment_structure?.total_collected || 0).toLocaleString()}
                              </div>
                           </div>
                        </div>

                        {/* Add Payment Mini-Form */}
                        <div className="flex gap-2 items-center pt-2">
                           <input 
                             value={paymentAmount}
                             onChange={e => setPaymentAmount(e.target.value)}
                             placeholder="Amt"
                             className="w-24 bg-black border border-zinc-800 rounded-lg py-2 px-3 text-xs outline-none focus:border-green-500/50 font-mono"
                             type="number"
                           />
                           <input 
                             value={paymentNote}
                             onChange={e => setPaymentNote(e.target.value)}
                             placeholder="Note (e.g. Advance)"
                             className="flex-1 bg-black border border-zinc-800 rounded-lg py-2 px-3 text-xs outline-none focus:border-green-500/50"
                           />
                           <button 
                             onClick={async () => {
                               if (!paymentAmount) return;
                               const { success, totalCombined } = await addPayment(selectedLead.id, paymentAmount, paymentNote);
                               if (success) {
                                  alert('Payment recorded.');
                                  setPaymentAmount('');
                                  setPaymentNote('');
                                  const updatedStructure = { ...(selectedLead.payment_structure || {}), total_collected: totalCombined };
                                  setSelectedLead({ ...selectedLead, payment_structure: updatedStructure });
                                  fetchLeads();
                               }
                             }}
                             className="h-full px-4 rounded-lg bg-zinc-800 hover:bg-green-600 hover:text-white text-zinc-400 text-[10px] font-bold uppercase transition-all"
                           >
                             Log
                           </button>
                        </div>
                     </div>
                   </div>
               </div>

               {/* Right Column: Project Scope (Full Height) */}
               <div className="flex flex-col h-full space-y-2">
                   <div className="flex justify-between items-center mb-1">
                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Project Scope & Requirements</label>
                     <button 
                       onClick={async () => {
                          if (!editFormData.description) return alert('Enter scope first');
                          setIsGeneratingPrice(true);
                          const estimate = await generatePriceEstimate(editFormData.description);
                          setIsGeneratingPrice(false);
                          alert(`Suggested: ₹${estimate.price}\nTimeline: ${estimate.timeline}`);
                       }}
                       disabled={isGeneratingPrice}
                       className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-bold uppercase hover:bg-purple-500 hover:text-white transition-all"
                     >
                       {isGeneratingPrice ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                       AI_Estimate
                     </button>
                   </div>
                   <textarea 
                     value={editFormData.description} 
                     onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                     className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-300 outline-none focus:border-blue-500/50 resize-none leading-relaxed min-h-[300px]"
                     placeholder="Detailed project scope, deliverables, and technical requirements..."
                   />
               </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#27272a] bg-[#09090b]/50">
               {selectedLead.stage !== 'win' && selectedLead.stage !== 'lose' && (
                 <button 
                  onClick={() => {
                    const reason = prompt('Loss reason?');
                    if (reason) {
                        updateLocalAndServerStage(selectedLead.id, 'lose');
                        setSelectedLead(null);
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-red-500 text-xs font-bold uppercase hover:bg-red-500/10 transition-all opacity-60 hover:opacity-100"
                 > 
                   Mark as Lost
                 </button>
               )}
               <button 
                  onClick={async () => {
                     const { success } = await updateLead(selectedLead.id, editFormData);
                     if (success) {
                         fetchLeads();
                         setSelectedLead(null);
                     }
                  }}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all uppercase tracking-wide"
               >
                  Save Changes
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
