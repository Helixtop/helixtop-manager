"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronRight,
  TrendingUp,
  Target,
  DollarSign,
  Loader2,
  XCircle
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/roles';
import { useAuth } from '@/context/AuthContext';
import { getMarketingData, createContent, updateContentStatus, updateContentProgress, toggleWorkingDay } from './actions';
import './marketing.css';

export default function MarketingPage() {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('calendar');
  const [contentItems, setContentItems] = useState([]);
  const [adsData, setAdsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [workingDays, setWorkingDays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchMarketingData();
  }, [activeTab]);

  const handleToggleWorkingDay = async (selectedDate) => {
    if (profile?.role !== ROLES.ADMIN) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const isWorking = workingDays.includes(dateStr);

    const { success } = await toggleWorkingDay(dateStr, isWorking);
    if (success) {
        fetchMarketingData();
    }
  };

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      const { success, content, ads, workingDays: days, error } = await getMarketingData();
      
      if (!success) throw new Error(error);

      // Deserialize dates
      const parsedContent = content.map(item => ({
        ...item,
        date: new Date(item.scheduled_date)
      }));

      if (activeTab === 'calendar') {
        setContentItems(parsedContent);
      } else {
        setAdsData(ads);
      }
      setWorkingDays(days);

    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, feedback = '') => {
    try {
      const { success, error } = await updateContentStatus(id, newStatus, feedback);
      
      if (!success) throw new Error(error);
      
      fetchMarketingData();
      setSelectedItem(null);
    } catch (err) {
      alert('Marketing update error: ' + err.message);
    }
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const { success, error, newStatus } = await updateContentProgress(selectedItem.id, formData);
      if (!success) throw new Error(error);

      fetchMarketingData();
      setSelectedItem(null);
      alert(`Content updated! Status: ${newStatus}`);
    } catch (err) {
      alert('Submission error: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Marketing Suite</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Growth & Visibility</p>
        </div>
        <div className="flex gap-4">
          {profile?.role === ROLES.ADMIN && (
             <button 
               onClick={() => handleToggleWorkingDay(date)}
               className={cn(
                 "px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                 workingDays.includes(date.toISOString().split('T')[0])
                   ? "bg-green-600/10 border-green-500/20 text-green-400"
                   : "border-white/10 text-gray-500 hover:text-white"
               )}
             >
               {workingDays.includes(date.toISOString().split('T')[0]) ? 'Working_Day_Active' : 'Mark_As_Work_Day'}
             </button>
          )}
          <div className="flex bg-[#0a0a0a] p-1 border border-[#1f1f1f] rounded-xl shadow-xl">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'calendar' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              Calendar
            </button>
            <button 
              onClick={() => setActiveTab('ads')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'ads' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              Ads Tracker
            </button>
          </div>
          {activeTab === 'calendar' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Content
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Compiling Analytics...</p>
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl marketing-calendar">
              <Calendar 
                onChange={setDate} 
                value={date} 
                className="w-full bg-transparent border-none text-white"
                tileClassName={({ date: tileDate }) => {
                  const dateStr = tileDate.toISOString().split('T')[0];
                  const items = contentItems.filter(item => item.date.toDateString() === tileDate.toDateString());
                  let classes = [];
                  if (items.some(i => i.status === 'posted')) classes.push('is-posted');
                  if (items.some(i => i.status === 'admin-review')) classes.push('needs-review');
                  if (items.length > 0) classes.push('has-content');
                  if (workingDays.includes(dateStr)) classes.push('is-work-day');
                  return classes.join(' ');
                }}
              />
            </div>
            
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>
              </div>

              <div className="space-y-4">
                {contentItems.filter(item => item.date.toDateString() === date.toDateString()).map(item => (
                  <div key={item.id} onClick={() => setSelectedItem(item)} className="p-4 rounded-xl bg-white/5 border border-[#1f1f1f] hover:border-blue-500/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                            <ImageIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-200">{item.title}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{item.platform} • {item.status}</p>
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-gray-700 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
                {contentItems.filter(item => item.date.toDateString() === date.toDateString()).length === 0 && (
                   <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl text-center">
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Quiet_Day_Detected</p>
                   </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 relative overflow-hidden group shadow-2xl">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-[10px] uppercase tracking-widest text-blue-400">Content AI Helper</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
                  I'm ready to architect your next viral strategy. Feed me a topic.
                </p>
                <div className="space-y-3">
                  <input type="text" placeholder="Topic: SEO Tips for 2026" className="w-full bg-black border border-[#1f1f1f] rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500/50" />
                  <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20">Execute Generation</button>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-6">Pipeline Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center group">
                  <span className="text-xs text-gray-500 uppercase font-bold">Planned</span>
                  <span className="text-sm font-mono font-bold text-gray-200">{contentItems.filter(i => i.status === 'pending').length}</span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-xs text-gray-500 uppercase font-bold text-orange-400">In Review</span>
                  <span className="text-sm font-mono font-bold text-orange-400">{contentItems.filter(i => i.status === 'admin-review').length}</span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-xs text-gray-500 uppercase font-bold text-green-400">Posted</span>
                  <span className="text-sm font-mono font-bold text-green-400">{contentItems.filter(i => i.status === 'posted').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                 <DollarSign className="w-12 h-12" />
               </div>
               <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Quarterly Budget</p>
               <h3 className="text-3xl font-bold font-mono">$12,000</h3>
               <div className="mt-6 h-1 w-full bg-blue-500/10 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-2/3" />
               </div>
               <p className="text-[9px] text-gray-500 mt-3 font-bold uppercase tracking-tighter">66% Utilization Rate</p>
             </div>
             <div className="p-8 rounded-2xl border border-green-500/20 bg-green-500/5">
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">Aggregate Leads</p>
                <h3 className="text-3xl font-bold font-mono">1,240</h3>
                <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1 font-bold uppercase">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  +15% Growth Delta
                </p>
             </div>
             <div className="p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5">
               <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Optimized CPL</p>
               <h3 className="text-3xl font-bold font-mono">$4.25</h3>
               <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase">Cost per Acquisition</p>
             </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-[#1f1f1f]">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign_ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">State</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allocation</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">ROI_Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {adsData.map((ad) => (
                  <tr key={ad.id} className="hover:bg-white/5 transition-colors group text-gray-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Target className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold uppercase tracking-tight">{ad.campaign_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        ad.status === 'active' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-gray-500 border-white/5"
                      )}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400">${ad.budget?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-xs font-black text-green-400 font-mono">
                         {ad.spend > 0 ? Math.round((ad.leads_generated * 10) / ad.spend * 10) / 10 : 0}X
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
              <div>
                 <h3 className="text-xl font-black uppercase tracking-tighter text-white">{selectedItem.title}</h3>
                 <p className="text-[9px] text-blue-400 font-mono tracking-widest uppercase mt-1">Status: {selectedItem.status}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmission} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="is_shot" 
                            defaultChecked={selectedItem.is_shot} 
                            onChange={(e) => {
                                // If unchecking shot, also uncheck edited
                                if (!e.target.checked) {
                                    const editCb = document.querySelector('input[name="is_edited"]');
                                    if (editCb) editCb.checked = false;
                                }
                            }}
                            className="w-4 h-4 rounded border-gray-800 bg-black text-blue-600" 
                           />
                          <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-all uppercase tracking-tight">Content Shot</span>
                      </label>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="is_edited" 
                            defaultChecked={selectedItem.is_edited} 
                            className="w-4 h-4 rounded border-gray-800 bg-black text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" 
                            disabled={!selectedItem.is_shot && !document.querySelector('input[name="is_shot"]')?.checked}
                          />
                          <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-all uppercase tracking-tight">Edit Completed</span>
                      </label>
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Master File (Drive Link) {document.querySelector('input[name="is_edited"]')?.checked && <span className="text-red-500">*</span>}</label>
                  <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input 
                        type="url" 
                        name="drive_link"
                        defaultValue={selectedItem.drive_link}
                        required={document.querySelector('input[name="is_edited"]')?.checked}
                        placeholder="https://drive.google.com/..." 
                        className="w-full bg-black border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs font-mono outline-none focus:border-blue-500/50" 
                      />
                  </div>
              </div>

              {selectedItem.admin_feedback && (
                 <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-1">Admin Revision Note:</p>
                    <p className="text-xs text-gray-300 italic">"{selectedItem.admin_feedback}"</p>
                 </div>
              )}

              <div className="pt-4 flex gap-4">
                 {profile?.role === ROLES.ADMIN ? (
                   <>
                     <button type="button" onClick={() => {
                        const note = prompt('Enter rejection reason:');
                        if (note) handleStatusUpdate(selectedItem.id, 'rejected', note);
                     }} className="flex-1 py-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">Reject</button>
                     <button type="button" onClick={() => handleStatusUpdate(selectedItem.id, 'approved')} className="flex-1 py-4 rounded-2xl bg-green-600/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest hover:bg-green-600/20 transition-all">Approve</button>
                   </>
                 ) : (
                   <button type="submit" disabled={selectedItem.status === 'admin-review'} className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50">
                     {selectedItem.status === 'admin-review' ? 'AWAITING_VERIFICATION' : 'UPDATE_PROGRESS'}
                   </button>
                 )}
              </div>

              {selectedItem.status === 'approved' && profile?.role !== ROLES.ADMIN && (
                 <button type="button" onClick={() => handleStatusUpdate(selectedItem.id, 'posted')} className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest mt-2">Mark as Posted</button>
              )}
            </form>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              // Calculate correct date
              const offsetDate = new Date(date);
              offsetDate.setMinutes(offsetDate.getMinutes() - offsetDate.getTimezoneOffset());
              const scheduledDate = offsetDate.toISOString().split('T')[0];
              
              // Append properly formatted date
              formData.set('scheduled_date', scheduledDate);

              const { success, error } = await createContent(formData);

              if (success) {
                setShowAddModal(false);
                fetchMarketingData();
              } else {
                alert('Add content error: ' + error);
              }
            }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Plan New Deployment</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Marketing_Expansion_Unit</p>
              </div>
              <XCircle className="w-6 h-6 text-gray-700 cursor-pointer" onClick={() => setShowAddModal(false)} />
            </div>

            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Content Heading</label>
                <input name="title" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none" placeholder="The Future of Helixtop..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Platform</label>
                  <select name="platform" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-3 text-sm focus:border-blue-500/50 outline-none">
                    <option>Instagram</option>
                    <option>LinkedIn</option>
                    <option>YouTube</option>
                    <option>Twitter</option>
                  </select>
                </div>
                <div className="space-y-1 text-right">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Selected Date</label>
                   <p className="text-sm font-bold text-blue-400 mt-2">{date.toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Brief / Description</label>
                <textarea name="description" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none h-24 resize-none" placeholder="What is this content about?" />
              </div>
              
              <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 transition-all">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Get Gemini Suggestions</span>
                </div>
                <ChevronRight className="w-3 h-3 text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            <div className="p-8 bg-white/5 flex gap-4">
               <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 border border-[#1f1f1f] rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
               <button type="submit" className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Initialize_Deployment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
