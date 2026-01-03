"use client";

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Plus, 
  ArrowUpRight,
  Target,
  Zap,
  UserCircle,
  Loader2,
  Megaphone,
  ChevronRight,
  Edit,
  Trash2,
  X,
  Save,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/dashboard/StatCard';
import HeadManagerAI from '@/components/dashboard/HeadManagerAI';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import { ROLES } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getDashboardMetrics, verifyTask, deleteMarketingContent, updateMarketingContentDetails } from './actions';

import CreateProjectModal from '@/components/dashboard/CreateProjectModal';
import IncomeGraph from '@/components/dashboard/IncomeGraph';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { profile, isAdmin, effectiveRole } = useAuth();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingTasks: 0,
    completedWork: 0,
    monthlyProfit: 0
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [marketingReview, setMarketingReview] = useState([]);
  const [reviewTasks, setReviewTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingContent, setEditingContent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [isAdmin]);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      // Parallel fetch for speed
      const [
        { data: projects, error: pError },
        { data: tasks, error: tError },
        { data: marketing, error: mError },
        { data: transactions, error: txError },
        { data: profiles, error: profError }
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*, profiles:assigned_to(full_name)'),
        supabase.from('marketing_content').select('*, profiles:assigned_to(full_name)'),
        supabase.from('transactions').select('*'),
        supabase.from('profiles').select('*, time_logs(*)')
      ]);

      if (pError) throw pError;
      if (tError) throw tError;
      if (mError) throw mError;

      // 1. Basic Stats
      const totalProjects = projects?.length || 0;
      const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
      const completedWork = (tasks?.filter(t => t.status === 'verified').length || 0) + 
                            (marketing?.filter(m => m.status === 'verified').length || 0);
      
      // Monthly Profit calculation
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const monthlyProfit = transactions
        ?.filter(tx => new Date(tx.created_at) >= startOfMonth)
        ?.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0) || 0;

      setStats({
        totalProjects,
        pendingTasks,
        completedWork,
        monthlyProfit
      });

      // 2. Review Items
      setMarketingReview(marketing?.filter(m => m.status === 'pending_admin') || []);
      setReviewTasks(tasks?.filter(t => t.status === 'completed') || []);

      // 3. Team Highlights
      const members = profiles?.map(p => {
        const weeklySeconds = p.time_logs
          ?.filter(log => {
             const logDate = new Date(log.created_at);
             const now = new Date();
             const weekAgo = new Date(now.setDate(now.getDate() - 7));
             return logDate >= weekAgo;
          })
          ?.reduce((sum, log) => sum + (log.duration || 0), 0) || 0;

        return {
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          weeklySeconds,
          projectCount: projects?.filter(proj => proj.assigned_to === p.id).length || 0,
          assignedProjects: projects?.filter(proj => proj.assigned_to === p.id).map(proj => ({ name: proj.name })),
          workStats: {
            completed: (tasks?.filter(t => t.assigned_to === p.id && t.status === 'verified').length || 0) + 
                       (marketing?.filter(m => m.assigned_to === p.id && m.status === 'verified').length || 0),
            pending: (tasks?.filter(t => t.assigned_to === p.id && (t.status === 'pending' || t.status === 'in_progress')).length || 0),
            rejected: tasks?.filter(t => t.assigned_to === p.id && t.status === 'rejected').length || 0
          }
        };
      }) || [];
      
      setTeamMembers(members);

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!confirm('Are you sure you want to delete this marketing content?')) return;
    
    try {
      const { success, error } = await deleteMarketingContent(contentId);
      if (!success) throw new Error(error);
      
      fetchAdminStats();
    } catch (error) {
      alert('Failed to delete content: ' + error.message);
    }
  };

  const handleEditContent = (content) => {
    setEditingContent(content.id);
    setEditFormData({
      title: content.title,
      description: content.description,
      platform: content.platform,
      scheduled_date: content.scheduled_date
    });
  };

  const handleSaveEdit = async (contentId) => {
    try {
      const formData = new FormData();
      Object.keys(editFormData).forEach(key => {
        formData.append(key, editFormData[key]);
      });
      
      const { success, error } = await updateMarketingContentDetails(contentId, formData);
      if (!success) throw new Error(error);
      
      setEditingContent(null);
      setEditFormData({});
      fetchAdminStats();
    } catch (error) {
      alert('Failed to update content: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingContent(null);
    setEditFormData({});
  };

  const AdminView = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Admin Overview</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Main Controlling Hub</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-medium">
            Generate Report
          </button>
          <button 
            onClick={() => setShowProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Aggregating Global Flux...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Projects" 
              value={stats.totalProjects.toString()} 
              icon={Briefcase} 
              trend={12} 
              color="blue"
              description="Across all departments"
              onClick={() => router.push('/projects')}
            />
            <StatCard 
              title="Pending Tasks" 
              value={stats.pendingTasks.toString()} 
              icon={Clock} 
              trend={-5} 
              color="orange"
              description="Requiring attention"
              onClick={() => router.push('/pending-works')}
            />
            <StatCard 
              title="Completed Work" 
              value={stats.completedWork.toString()} 
              icon={CheckCircle2} 
              trend={24} 
              color="green"
              description="Lifetime total"
              onClick={() => router.push('/projects')}
            />
            <StatCard 
              title="Monthly_Profit" 
              value={`₹${stats.monthlyProfit.toLocaleString('en-IN')}`} 
              icon={TrendingUp} 
              trend="+12.5%" 
              description="Net financial progress" 
              color="blue"
              onClick={() => router.push('/accounting')}
            />
          </div>


          <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
             <IncomeGraph />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Task Approval Suite */}
            <div className="lg:col-span-2">
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-6 shadow-2xl h-full min-h-[400px]">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Task_Approval_Suite</h3>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mt-1">Audit_Protocol_Active</p>
                  </div>
                  {(reviewTasks.length > 0 || marketingReview.length > 0) && (
                    <span className="px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
                      {reviewTasks.length + marketingReview.length} Pending_Audits
                    </span>
                  )}
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Marketing Review Items */}
                  {marketingReview.map((item) => (
                    <div key={item.id} className="p-6 bg-orange-600/5 border border-orange-500/20 rounded-2xl group hover:border-orange-500/40 transition-all cursor-pointer" onClick={() => router.push('/marketing')}>
                      <div className="flex justify-between items-start gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase tracking-tighter flex items-center gap-1">
                              <Megaphone className="w-3 h-3" />
                              Marketing_Content
                            </span>
                            <h4 className="font-bold text-gray-200 group-hover:text-white transition-colors">{item.title}</h4>
                          </div>
                          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-4">Awaiting Review • {item.platform}</p>
                          
                          <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-600">
                            <span className="flex items-center gap-2">
                              <UserCircle className="w-3.5 h-3.5 text-orange-500/50" />
                              {item.profiles?.full_name || 'Assigned Creator'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-orange-800 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}

                  {/* General Task Items */}
                  {reviewTasks.map((task) => (
                    <div key={task.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
                      <div className="flex justify-between items-start gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-tighter">
                              {task.type || 'General'}
                            </span>
                            <h4 className="font-bold text-gray-200 group-hover:text-white transition-colors">{task.title}</h4>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">{task.description || 'No description provided.'}</p>
                          
                          <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-600">
                            <span className="flex items-center gap-2">
                              <UserCircle className="w-3.5 h-3.5 text-blue-500/50" />
                              {task.profiles?.full_name}
                            </span>
                            {task.submission_link && (
                              <a href={task.submission_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300">
                                <Briefcase className="w-3.5 h-3.5" />
                                View_Deliverable
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              const { success } = await verifyTask(task.id, 'verified');
                              if (success) fetchAdminStats();
                            }}
                            className="px-6 py-2.5 rounded-xl bg-green-600/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-600/10"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              const reason = prompt('Specify rejection parameters:');
                              if (reason) {
                                const { success } = await verifyTask(task.id, 'rejected', reason);
                                if (success) fetchAdminStats();
                              }
                            }}
                            className="px-6 py-2.5 rounded-xl bg-red-600/5 border border-red-500/10 text-red-500/50 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {reviewTasks.length === 0 && marketingReview.length === 0 && (
                    <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-[#1f1f1f] rounded-2xl bg-black/50">
                      <CheckCircle2 className="w-12 h-12 text-gray-800 mb-4 opacity-20" />
                      <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Global Queue Clear</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Sidebar & Notifications */}
            <div className="lg:col-span-1 space-y-6">

              <HeadManagerAI />
            </div>
          </div>

          {/* Team Overview Section */}
          <div className="grid grid-cols-1 gap-8">
            <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold">Team Overview</h3>
                  <p className="text-sm text-gray-500">Working hours & project allocation</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <UserCircle className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              <div className="space-y-4">
                {teamMembers.length > 0 ? teamMembers.map((member, idx) => {
                  const hours = Math.floor(member.weeklySeconds / 3600);
                  const minutes = Math.floor((member.weeklySeconds % 3600) / 60);
                  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                  
                  return (
                    <div key={idx} onClick={() => router.push('/team')} className="group p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-sm text-blue-400 group-hover:scale-110 transition-transform">
                            {member.full_name?.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-white">{member.full_name}</p>
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                                {member.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-green-500" />
                                <span className="font-bold text-green-400">{timeDisplay}</span>
                                <span className="uppercase font-medium tracking-wider">This Week</span>
                              </div>
                              {member.projectCount > 0 && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1.5">
                                    <Briefcase className="w-3 h-3 text-blue-500" />
                                    <span className="font-bold text-blue-400">{member.projectCount}</span>
                                    <span className="uppercase font-medium tracking-wider">Active {member.projectCount === 1 ? 'Project' : 'Projects'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Work Statistics */}
                            {member.workStats && (member.workStats.completed > 0 || member.workStats.pending > 0 || member.workStats.rejected > 0) && (
                              <div className="mt-2 flex items-center gap-3 text-[9px]">
                                {member.workStats.completed > 0 && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                    <span className="font-bold text-green-400">{member.workStats.completed}</span>
                                    <span className="text-gray-500 uppercase font-medium">Done</span>
                                  </div>
                                )}
                                {member.workStats.pending > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-orange-400" />
                                    <span className="font-bold text-orange-400">{member.workStats.pending}</span>
                                    <span className="text-gray-500 uppercase font-medium">Pending</span>
                                  </div>
                                )}
                                {member.workStats.rejected > 0 && (
                                  <div className="flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-400" />
                                    <span className="font-bold text-red-400">{member.workStats.rejected}</span>
                                    <span className="text-gray-500 uppercase font-medium">Rejected</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {member.assignedProjects && member.assignedProjects.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {member.assignedProjects.slice(0, 3).map((proj, pidx) => (
                                  <span key={pidx} className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[9px] font-medium text-gray-300 uppercase tracking-wide">
                                    {proj.name}
                                  </span>
                                ))}
                                {member.assignedProjects.length > 3 && (
                                  <span className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-[9px] font-medium text-gray-500 uppercase tracking-wide">
                                    +{member.assignedProjects.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center border-2 border-dashed border-[#1f1f1f] rounded-2xl">
                    <UserCircle className="w-12 h-12 text-gray-800 mb-4 mx-auto opacity-20" />
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No team members found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <CreateProjectModal 
        isOpen={showProjectModal} 
        onClose={() => setShowProjectModal(false)} 
        employees={teamMembers} 
      />
    </div>
  );

  return (
    <div className="space-y-8 min-h-screen">
      {isAdmin ? <AdminView /> : <EmployeeDashboard />}
    </div>
  );
}
