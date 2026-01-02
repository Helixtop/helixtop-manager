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
  Loader2
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import OverviewChart from '@/components/dashboard/OverviewChart';
import HeadManagerAI from '@/components/dashboard/HeadManagerAI';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import { ROLES } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getDashboardMetrics } from './actions';

import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { profile, isAdmin, effectiveRole } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingTasks: 0,
    completedWork: 0,
    monthlyProfit: 0
  });
  const [leads, setLeads] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [isAdmin]);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const { success, stats, leads, activeEmployees, error } = await getDashboardMetrics();
      
      if (!success) throw new Error(error);

      setStats(stats);
      setLeads(leads);
      setActiveEmployees(activeEmployees);

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
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
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20">
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
            />
            <StatCard 
              title="Pending Tasks" 
              value={stats.pendingTasks.toString()} 
              icon={Clock} 
              trend={-5} 
              color="orange"
              description="Requiring attention"
            />
            <StatCard 
              title="Completed Work" 
              value={stats.completedWork.toString()} 
              icon={CheckCircle2} 
              trend={24} 
              color="green"
              description="Lifetime total"
            />
            <StatCard 
              title="Monthly_Profit" 
              value={`₹${stats.monthlyProfit.toLocaleString('en-IN')}`} 
              icon={TrendingUp} 
              trend="+12.5%" 
              description="Net financial progress" 
              color="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2">
              <OverviewChart />
            </div>

            {/* AI Sidebar */}
            <div className="lg:col-span-1">
              <HeadManagerAI />
            </div>
          </div>

          {/* Recent Activity / Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lead Stats */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold">New Leads</h3>
                  <p className="text-sm text-gray-500">Pipeline growth this week</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              
              <div className="space-y-4">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center font-bold text-blue-400">
                        {lead.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-200 uppercase tracking-tight">{lead.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{lead.type} • {lead.stage}</p>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions / Active Members */}
            <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold">Team Overview</h3>
                  <p className="text-sm text-gray-500">Resource allocation status</p>
                </div>
                <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
              </div>

              <div className="space-y-4">
                {activeEmployees.map((emp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400">
                        {emp.full_name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{emp.full_name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{emp.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-green-400 animate-pulse uppercase font-black">Online</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {isAdmin ? <AdminView /> : <EmployeeDashboard />}
    </div>
  );
}
