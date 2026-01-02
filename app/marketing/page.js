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
  IndianRupee,
  Loader2,
  XCircle,
  Play,
  Pause,
  MoreHorizontal,
  X
} from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/roles';
import { useAuth } from '@/context/AuthContext';
import { 
  getMarketingData, 
  createContent, 
  updateContentStatus, 
  updateContentProgress, 
  toggleWorkingDay,
  getContentCreators,
  assignContentToCreator,
  updateMarketingConfig,
  createAdCampaign,
  addLeadFromCampaign,
  updateAdCampaign,
  logAdSpend
} from './actions';
import { supabase } from '@/lib/supabase';
import './marketing.css';

export default function MarketingPage() {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('calendar');
  const [contentItems, setContentItems] = useState([]);
  const [adsData, setAdsData] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [workingDays, setWorkingDays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [configs, setConfigs] = useState({});
  const [creators, setCreators] = useState([]);
  
  // Timer State
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (profile) {
        if (profile.role === ROLES.ADMIN) {
            fetchCreators();
        }
        fetchMarketingData();
    }
  }, [profile, activeTab]);

  const fetchCreators = async () => {
    const { success, data } = await getContentCreators();
    if (success) setCreators(data);
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const startTimer = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const stopTimer = async () => {
    setIsRunning(false);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    try {
      const { error } = await supabase
        .from('time_logs')
        .insert([{
          user_id: profile.id,
          marketing_content_id: selectedItem.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration: durationSeconds,
        }]);

      if (error) throw error;
      setTime(0);
      alert('Time log saved successfully.');
    } catch (error) {
      console.error('Error saving time log:', error);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
    if (!profile) return;
    setLoading(true);
    try {
      const { success, content, ads, workingDays: days, configs: cfg, leads: serverLeads, error } = await getMarketingData(profile.id, profile.role);
      
      if (!success) throw new Error(error);

      // Deserialize dates
      const parsedContent = content.map(item => ({
        ...item,
        date: new Date(item.scheduled_date)
      }));

      setContentItems(parsedContent);
      setAdsData(ads);
      setLeads(serverLeads || []);
      setWorkingDays(days);
      setConfigs(cfg || {});

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
    
    // Client-side validation for link requirement
    const isEdited = formData.get('is_edited') === 'on';
    const driveLink = formData.get('drive_link');
    
    if (isEdited && (!driveLink || driveLink.trim() === '')) {
        alert('CRITICAL: Master File (Drive Link) is mandatory when marking Edit as Completed.');
        return;
    }

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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Marketing Suite</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Growth & Visibility</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {(profile?.role === ROLES.ADMIN || profile?.role === ROLES.CONTENT_CREATOR) && (
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
                "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tight",
                activeTab === 'calendar' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              Calendar
            </button>
            <button 
              onClick={() => setActiveTab('ads')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tight",
                activeTab === 'ads' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              Ads Tracker
            </button>
          </div>
          {activeTab === 'calendar' ? (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" />
              Add Content
            </button>
          ) : (profile?.role === ROLES.ADMIN || profile?.role === ROLES.CONTENT_CREATOR) && (
            <div className="flex gap-3">
               <button 
                onClick={() => setShowBudgetModal(true)}
                className="px-4 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-[10px] font-black tracking-widest transition-all flex items-center gap-2 uppercase"
              >
                <IndianRupee className="w-4 h-4" />
                Set Budget
              </button>
              <button 
                onClick={() => setShowCampaignModal(true)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2 uppercase"
              >
                <Play className="w-4 h-4" />
                Start Campaign
              </button>
            </div>
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
                  if (items.some(i => i.status === 'rejected')) classes.push('is-rejected');
                  if (items.some(i => i.status === 'approved')) classes.push('is-approved');
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
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)} 
                    className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer group",
                        item.status === 'rejected' ? "bg-red-500/10 border-red-500/30 hover:border-red-500" : "bg-white/5 border-[#1f1f1f] hover:border-blue-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                              item.status === 'rejected' ? "bg-red-500/20" : "bg-blue-500/10 group-hover:bg-blue-500/20"
                          )}>
                            <ImageIcon className={cn("w-5 h-5", item.status === 'rejected' ? "text-red-400" : "text-blue-400")} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-gray-200">{item.title}</p>
                                {item.status === 'approved' && (
                                    <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[8px] font-black uppercase">Ready_to_Post</span>
                                )}
                            </div>
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
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-400 mb-6">Workflow Pipeline</h3>
              <div className="relative space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#1f1f1f]">
                {[
                  { label: 'Planned', count: contentItems.filter(i => i.status === 'planned' && i.date.toDateString() === date.toDateString()).length, color: 'text-gray-500', bg: 'bg-gray-500/10' },
                  { label: 'Shot', count: contentItems.filter(i => i.status === 'shot' && i.date.toDateString() === date.toDateString()).length, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                  { label: 'Edited', count: contentItems.filter(i => i.status === 'edited' && i.date.toDateString() === date.toDateString()).length, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
                  { label: 'Review', count: contentItems.filter(i => i.status === 'admin-review' && i.date.toDateString() === date.toDateString()).length, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                  { label: 'Approved', count: contentItems.filter(i => i.status === 'approved' && i.date.toDateString() === date.toDateString()).length, color: 'text-green-400', bg: 'bg-green-400/10' },
                  { label: 'Posted', count: contentItems.filter(i => i.status === 'posted' && i.date.toDateString() === date.toDateString()).length, color: 'text-purple-400', bg: 'bg-purple-400/10' }
                ].map((step, idx) => (
                  <div key={idx} className="relative pl-8 group">
                    <div className={cn("absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-[#1f1f1f] bg-[#0a0a0a] transition-all", step.count > 0 && "border-blue-500 bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
                    <div className="flex justify-between items-center">
                      <span className={cn("text-[10px] font-black uppercase tracking-widest transition-all", step.count > 0 ? step.color : "text-gray-600")}>{step.label}</span>
                      <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold", step.count > 0 ? step.bg + " " + step.color : "bg-white/5 text-gray-700")}>{step.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                 <IndianRupee className="w-12 h-12" />
               </div>
               <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Remaining Ad Budget</p>
               <h3 className="text-3xl font-bold font-mono">
                 ₹{Math.max(0, (parseFloat(configs.ad_budget || 0) - adsData.reduce((acc, ad) => acc + (ad.budget || 0), 0))).toLocaleString()}
               </h3>
               <div className="mt-6 h-1.5 w-full bg-blue-500/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-blue-500 transition-all duration-1000" 
                   style={{ width: `${Math.min(100, (adsData.reduce((acc, ad) => acc + (ad.budget || 0), 0) / (parseFloat(configs.ad_budget) || 1)) * 100)}%` }} 
                 />
               </div>
               <div className="flex justify-between items-center mt-3">
                 <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">
                   ₹{adsData.reduce((acc, ad) => acc + (ad.budget || 0), 0).toLocaleString()} Allocated
                 </p>
                 <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">
                   {Math.round((adsData.reduce((acc, ad) => acc + (ad.budget || 0), 0) / (parseFloat(configs.ad_budget) || 1)) * 100)}% Used
                 </p>
               </div>
               {adsData.reduce((acc, ad) => acc + (ad.spend || 0), 0) > 0 && (
                 <p className="text-[8px] text-gray-600 mt-2 font-bold uppercase tracking-tighter text-right">
                   ₹{adsData.reduce((acc, ad) => acc + (ad.spend || 0), 0).toLocaleString()} Spent Utilization
                 </p>
               )}
             </div>
             <div className="p-8 rounded-2xl border border-green-500/20 bg-green-500/5">
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">Aggregate Leads</p>
                <h3 className="text-3xl font-bold font-mono">{adsData.reduce((acc, ad) => acc + (ad.leads_generated || 0), 0)}</h3>
                <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1 font-bold uppercase">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  Total Campaign Acquisitions
                </p>
             </div>
             <div className="p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5">
               <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">Optimized CPL</p>
               <h3 className="text-3xl font-bold font-mono">
                 ₹{adsData.reduce((acc, ad) => acc + (ad.spend || 0), 0) > 0 
                    ? Math.round(adsData.reduce((acc, ad) => acc + (ad.spend || 0), 0) / (adsData.reduce((acc, ad) => acc + (ad.leads_generated || 0), 0) || 1)) 
                    : 0}
               </h3>
               <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase">Avg Cost per Lead</p>
             </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-[#1f1f1f]">
                    <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign_ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">State</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allocation</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">ROI_Delta</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
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
                        <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400">₹{ad.budget?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-green-400 font-mono">
                            {ad.spend > 0 ? Math.round((ad.leads_generated * 100) / ad.spend * 10) / 10 : 0}X
                        </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <button 
                            onClick={() => setSelectedCampaign(ad)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
              <div>
                 <h3 className="text-xl font-black uppercase tracking-tighter text-white">{selectedItem.title}</h3>
                 <div className="flex items-center gap-3 mt-1">
                    <p className="text-[9px] text-blue-400 font-mono tracking-widest uppercase">Status: {selectedItem.status}</p>
                    {selectedItem.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[8px] font-black uppercase border border-green-500/20 tracking-tighter animate-pulse">Ready_to_Post_Archive</span>
                    )}
                 </div>
              </div>
              <div className="flex items-center gap-4">
                {profile?.role !== ROLES.ADMIN && (
                   <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-black border border-white/5">
                      <p className="text-sm font-mono font-black text-blue-400">{formatTime(time)}</p>
                      <button 
                        type="button" 
                        onClick={isRunning ? stopTimer : startTimer}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                            isRunning ? "bg-red-600 shadow-lg shadow-red-600/20" : "bg-blue-600 shadow-lg shadow-blue-600/20"
                        )}
                      >
                        {isRunning ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
                      </button>
                   </div>
                )}
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmission} className="p-8 space-y-6">
              {profile?.role === ROLES.ADMIN && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Re-assign Creator</label>
                  <select 
                    value={selectedItem.assigned_to || ""} 
                    onChange={async (e) => {
                       const { success } = await assignContentToCreator(selectedItem.id, e.target.value);
                       if (success) {
                           fetchMarketingData();
                           setSelectedItem(prev => ({ ...prev, assigned_to: e.target.value }));
                       }
                    }}
                    className="w-full bg-black border border-white/5 rounded-xl py-3 px-3 text-xs focus:border-blue-500/50 outline-none"
                  >
                    <option value="">Unassigned</option>
                    {creators.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-4 rounded-xl border transition-all", selectedItem.is_shot ? "bg-blue-600/10 border-blue-600/20" : "bg-white/5 border-white/5")}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="is_shot" 
                            defaultChecked={selectedItem.is_shot} 
                            disabled={profile?.role === ROLES.ADMIN}
                            className="w-4 h-4 rounded border-gray-800 bg-black text-blue-600" 
                           />
                          <span className={cn("text-xs font-bold uppercase tracking-tight", selectedItem.is_shot ? "text-blue-400" : "text-gray-500")}>Content Shot</span>
                      </label>
                  </div>
                  <div className={cn("p-4 rounded-xl border transition-all", selectedItem.is_edited ? "bg-cyan-600/10 border-cyan-600/20" : "bg-white/5 border-white/5")}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            name="is_edited" 
                            defaultChecked={selectedItem.is_edited} 
                            disabled={profile?.role === ROLES.ADMIN}
                            className="w-4 h-4 rounded border-gray-800 bg-black text-blue-600" 
                          />
                          <span className={cn("text-xs font-bold uppercase tracking-tight", selectedItem.is_edited ? "text-cyan-400" : "text-gray-500")}>Edit Completed</span>
                      </label>
                  </div>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Master File (Drive Link)</label>
                  <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input 
                        type="url" 
                        name="drive_link"
                        defaultValue={selectedItem.drive_link}
                        readOnly={profile?.role === ROLES.ADMIN}
                        placeholder="Pending Submission..." 
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
                     }} className="flex-1 py-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-600/20 transition-all">Reject Work</button>
                     <button type="button" onClick={() => handleStatusUpdate(selectedItem.id, 'approved')} className="flex-1 py-4 rounded-2xl bg-green-600/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest hover:bg-green-600/20 transition-all">Approve & Release</button>
                   </>
                 ) : (
                   <button type="submit" disabled={selectedItem.status === 'admin-review'} className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50">
                     {selectedItem.status === 'admin-review' ? 'AWAITING_VERIFICATION' : 'UPDATE_PROGRESS'}
                   </button>
                 )}
              </div>

              {selectedItem.status === 'approved' && profile?.role !== ROLES.ADMIN && (
                 <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex flex-col gap-3 mt-2">
                    <p className="text-[9px] text-purple-400 font-black uppercase tracking-widest text-center">Work Approved - Ready for Deployment</p>
                    <button type="button" onClick={() => handleStatusUpdate(selectedItem.id, 'posted')} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-600/20">Mark as Posted / Live</button>
                 </div>
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
              const offsetDate = new Date(date);
              offsetDate.setMinutes(offsetDate.getMinutes() - offsetDate.getTimezoneOffset());
              const scheduledDate = offsetDate.toISOString().split('T')[0];
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
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Assign Content Creator</label>
                <select name="assigned_to" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-3 text-sm focus:border-blue-500/50 outline-none">
                  <option value="">Unassigned</option>
                  {creators.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
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
      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const amount = new FormData(e.target).get('ad_budget');
              const { success } = await updateMarketingConfig('ad_budget', amount);
              if (success) {
                setShowBudgetModal(false);
                fetchMarketingData();
              }
            }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-sm rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-tighter">Set Marketing Budget</h3>
              <XCircle className="w-5 h-5 text-gray-700 cursor-pointer" onClick={() => setShowBudgetModal(false)} />
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Ad Budget (Monthly)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input name="ad_budget" type="number" defaultValue={configs.ad_budget || 0} required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none font-mono" />
                </div>
              </div>
            </div>
            <div className="p-8 bg-white/5 flex gap-4">
               <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Save_Configuration</button>
            </div>
          </form>
        </div>
      )}

      {/* Start Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const { success } = await createAdCampaign(new FormData(e.target));
              if (success) {
                setShowCampaignModal(false);
                fetchMarketingData();
              }
            }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tighter">Initialize New Campaign</h3>
              <XCircle className="w-6 h-6 text-gray-700 cursor-pointer" onClick={() => setShowCampaignModal(false)} />
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Campaign Name</label>
                <input name="campaign_name" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Allocation Budget</label>
                <input name="budget" type="number" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Start Date</label>
                  <input name="start_date" type="date" required onClick={(e) => e.target.showPicker?.()} className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs focus:border-blue-500/50 outline-none text-white transition-all hover:border-blue-500/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">End Date</label>
                  <input name="end_date" type="date" onClick={(e) => e.target.showPicker?.()} className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs focus:border-blue-500/50 outline-none text-white transition-all hover:border-blue-500/30" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description / Strategy</label>
                <textarea name="description" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none h-20 resize-none" />
              </div>
            </div>
            <div className="p-8 bg-white/5 flex gap-4">
               <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Launch_Campaign</button>
            </div>
          </form>
        </div>
      )}

      {selectedCampaign && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-[#1f1f1f] flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">{selectedCampaign.campaign_name}</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Campaign Analytics & Leads</p>
              </div>
              <XCircle className="w-7 h-7 text-gray-700 cursor-pointer hover:text-white transition-all" onClick={() => setSelectedCampaign(null)} />
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Total Budget</p>
                      <p className="text-xl font-mono font-bold">₹{selectedCampaign.budget?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Actual Spend</p>
                      <p className="text-xl font-mono font-bold text-gray-400">₹{selectedCampaign.spend?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Log Additional Spend</h4>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const { success, error } = await logAdSpend(selectedCampaign.id, formData.get('amount'), formData.get('note'));
                        if (success) { e.target.reset(); fetchMarketingData(); alert('Ad spend logged!'); }
                        else alert('Error: ' + error);
                      }} className="p-6 bg-gradient-to-br from-red-600/5 to-transparent border border-red-500/10 rounded-2xl space-y-4">
                       <div className="flex gap-4">
                          <div className="flex-1 space-y-1">
                             <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Amount (₹)</label>
                             <input name="amount" type="number" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs focus:border-red-500/50 outline-none" placeholder="0" />
                          </div>
                          <div className="flex-1 space-y-1">
                             <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Note</label>
                             <input name="note" className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs focus:border-red-500/50 outline-none" placeholder="Details..." />
                          </div>
                       </div>
                       <button type="submit" className="w-full py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all">Submit_Financial_Flux</button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Acquire New Lead</h4>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const { success } = await addLeadFromCampaign(selectedCampaign.id, { name: formData.get('name'), contact: formData.get('contact') });
                        if (success) { e.target.reset(); fetchMarketingData(); }
                      }} className="space-y-4 p-6 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Lead Name</label>
                        <input name="name" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs focus:border-blue-500/50 outline-none" placeholder="Target Name" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Contact Info</label>
                        <input name="contact" required className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-xs focus:border-blue-500/50 outline-none" placeholder="Phone or Email" />
                      </div>
                      <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all">Record_Ad_Inquiry</button>
                    </form>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Captured Leadstream</h4>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{leads.filter(l => l.campaign_id === selectedCampaign.id).length} Leads</span>
                   </div>
                   <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {leads.filter(l => l.campaign_id === selectedCampaign.id).length === 0 ? (
                        <div className="text-center py-20 opacity-20">
                           <Target className="w-10 h-10 mx-auto mb-3" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No leads captured yet</p>
                        </div>
                      ) : (
                        leads.filter(l => l.campaign_id === selectedCampaign.id).map((lead, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{lead.name}</p>
                                   <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase">{lead.contact}</p>
                                </div>
                                <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase">Ad Leads</div>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
