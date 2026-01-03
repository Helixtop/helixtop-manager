"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  List, 
  Loader2, 
  Search,
  Filter,
  AlertCircle,
  Activity,
  Megaphone,
  Calendar,
  Briefcase,
  Folder
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
// import { getPendingWorks } from './actions'; // Removed server action dependency
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import WorkList from '@/components/pending-works/WorkList';
import WorkKanban from '@/components/pending-works/WorkKanban';
import ProjectDetail from '@/components/projects/ProjectDetail';

export default function PendingWorksPage() {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Marketing', 'Meeting', 'Project'
  const [isMobile, setIsMobile] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [originalProjects, setOriginalProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    // Only run initial setup, preventing double fetch if auth changes
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('list');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchWorks = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Logic moved from Server Action to Client to utilize Auth Session directly
      // This allows it to work without SUPABASE_SERVICE_ROLE_KEY on the server
      
      let tasksQuery = supabase
        .from('tasks')
        .select('*, profiles:assigned_to(full_name)')
        .in('status', ['pending', 'in-progress', 'under-review', 'completed', 'rejected']);

      let marketingQuery = supabase
        .from('marketing_content')
        .select('*, profiles:assigned_to(full_name)')
        .in('status', ['planned', 'shot', 'edited', 'admin-review', 'rejected', 'under-review', 'completed', 'approved']);

      let leadsQuery = supabase
        .from('leads')
        .select('*, profiles:assigned_to(full_name)')
        .eq('stage', 'meeting-booked');

      let projectsQuery = supabase
        .from('projects')
        .select('*, profiles:assigned_to(full_name)')
        .in('status', ['pending', 'in-progress', 'on-hold', 'completed']);

      // Filter for non-admins (Employees)
      if (!isAdmin) {
        tasksQuery = tasksQuery.eq('assigned_to', user.id);
        marketingQuery = marketingQuery.eq('assigned_to', user.id);
        leadsQuery = leadsQuery.eq('assigned_to', user.id);
        projectsQuery = projectsQuery.eq('assigned_to', user.id);
      }

      const [
        { data: tasks, error: tasksError },
        { data: marketing, error: marketingError },
        { data: leads, error: leadsError },
        { data: projects, error: projectsError },
        { data: profiles, error: profilesError }
      ] = await Promise.all([
        tasksQuery,
        marketingQuery,
        leadsQuery,
        projectsQuery,
        supabase.from('profiles').select('id, full_name, role').order('full_name')
      ]);

      if (tasksError) throw tasksError;
      if (marketingError) throw marketingError;
      if (leadsError) throw leadsError;
      if (projectsError) throw projectsError;
      if (profilesError) throw profilesError;

      setOriginalProjects(projects || []);
      setEmployees(profiles || []);

      // Normalize data
      const normalizedTasks = (tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        type: 'Task',
        assigned_to: t.profiles?.full_name,
        deadline: t.deadline,
        created_at: t.created_at,
        original_type: 'task'
      }));

      const normalizedMarketing = (marketing || []).map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        type: 'Marketing',
        assigned_to: m.profiles?.full_name,
        deadline: m.scheduled_date,
        created_at: m.created_at,
        original_type: 'marketing'
      }));

      const normalizedLeads = (leads || []).map(l => ({
        id: l.id,
        title: l.name,
        description: l.description,
        status: 'Meeting',
        type: 'Meeting',
        assigned_to: l.profiles?.full_name,
        deadline: l.meeting_time,
        created_at: l.created_at,
        metadata: { budget: l.budget, contact: l.contact }
      }));

      const normalizedProjects = (projects || []).map(p => ({
        id: p.id,
        title: p.name,
        description: p.description,
        status: p.status,
        type: 'Project',
        assigned_to: p.profiles?.full_name,
        deadline: p.deadline,
        created_at: p.created_at,
      }));

      setWorks([
        ...normalizedTasks, 
        ...normalizedMarketing, 
        ...normalizedLeads,
        ...normalizedProjects
      ].sort((a, b) => 
        new Date(a.deadline || a.created_at) - new Date(b.deadline || b.created_at)
      ));

    } catch (error) {
      console.error("Error fetching works:", error);
      // alert("Failed to load works. Please checking your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchWorks();
    }
  }, [user, isAdmin, authLoading]);

  const filteredWorks = works.filter(work => {
    const matchesSearch = work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         work.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         work.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || work.type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', name: 'All_Flux', icon: Activity, color: 'text-blue-400' },
    { id: 'Project', name: 'Projects', icon: Folder, color: 'text-blue-400' },
    { id: 'Marketing', name: 'Growth', icon: Megaphone, color: 'text-orange-400' },
    { id: 'Meeting', name: 'Syncs', icon: Calendar, color: 'text-purple-400' },
    { id: 'Task', name: 'Tasks', icon: Briefcase, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">
            {isAdmin ? 'Pending Works' : 'My Activity'}
          </h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">
            {isAdmin ? 'Global Activity Stream' : 'Personal Performance Queue'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search activity..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl py-2.5 px-10 text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          {/* View Toggle - Hidden on Mobile */}
          {!isMobile && (
            <div className="flex p-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl">
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-tight",
                  viewMode === 'kanban' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-tight",
                  viewMode === 'list' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              categoryFilter === cat.id 
                ? "bg-blue-600/10 border-blue-600/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                : "bg-black border-[#1f1f1f] text-gray-500 hover:border-gray-700 hover:text-gray-300"
            )}
          >
            <cat.icon className={cn("w-3.5 h-3.5", categoryFilter === cat.id ? cat.color : "text-gray-600")} />
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-40 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] animate-pulse">Synchronizing Flux Integrations...</p>
        </div>
      ) : filteredWorks.length > 0 ? (
        viewMode === 'kanban' && !isMobile ? (
          <WorkKanban 
            works={filteredWorks} 
            isAdmin={isAdmin}
            onRefresh={fetchWorks}
            onViewDetail={(id) => {
              const proj = originalProjects.find(p => p.id === id);
              if (proj) setSelectedProject(proj);
            }}
          />
        ) : (
          <WorkList 
            works={filteredWorks} 
            isAdmin={isAdmin}
            onRefresh={fetchWorks}
            onViewDetail={(id) => {
              const proj = originalProjects.find(p => p.id === id);
              if (proj) setSelectedProject(proj);
            }}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-[#1f1f1f] rounded-3xl bg-[#0a0a0a]/50">
          <Activity className="w-12 h-12 text-gray-800 mb-4 opacity-20" />
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">No Flux Records Detected</p>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetail 
          project={selectedProject}
          employees={employees}
          onClose={() => setSelectedProject(null)}
          onRefresh={() => {
            fetchWorks();
            setSelectedProject(null);
          }}
          isAdmin={isAdmin}
          currentUser={user}
        />
      )}
    </div>
  );
}
