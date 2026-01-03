"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  User, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
  Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';
import { getProjects, createProject, deleteProject, updateProjectStatus } from './actions';
import { migrateTasksToProjects } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import ProjectDetail from '@/components/projects/ProjectDetail';

export default function ProjectsPage() {
  const { isAdmin, profile, loading: authLoading, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [marketingWorks, setMarketingWorks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let projectsData;
      if (isAdmin) {
        const res = await getProjects();
        projectsData = res.success ? res.data : [];
      } else {
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles:assigned_to(full_name)')
          .eq('assigned_to', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        projectsData = data;
      }
      
      const [eRes, mRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role').order('full_name'),
        supabase.from('marketing_content').select('*, profiles:assigned_to(full_name)').order('scheduled_date', { ascending: false })
      ]);

      setProjects(projectsData || []);
      if (!eRes.error) setEmployees(eRes.data);
      if (!mRes.error) setMarketingWorks(mRes.data || []);

    } catch (error) {
      console.error('Fetch Projects Data Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, isAdmin, fetchData]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);
    const res = await createProject(formData);
    if (res.success) {
      setShowAddModal(false);
      fetchData();
    } else {
      alert(res.error);
    }
    setIsSubmitting(false);
  };

  const handleDeleteProject = async (id, name) => {
    if (confirm(`Are you sure you want to delete Project: ${name}?`)) {
      const res = await deleteProject(id);
      if (res.success) fetchData();
      else alert(res.error);
    }
  };

  const handleStatusChange = async (id, status) => {
    const res = await updateProjectStatus(id, status);
    if (res.success) fetchData();
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">
            {isAdmin ? 'Project Registry' : 'My Projects'}
          </h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">
            {isAdmin ? 'Master Project Controller' : 'Operational Workspace'}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Filter Registry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all w-64"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Initialize Project
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-40 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-[9px] tracking-[0.3em] animate-pulse">Synchronizing Registry Vectors...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all shadow-2xl relative">
              {/* Status Indicator */}
              <div className={cn(
                "absolute top-0 left-0 w-full h-1",
                project.status === 'completed' ? "bg-green-500" :
                project.status === 'in-progress' ? "bg-blue-500" :
                project.status === 'on-hold' ? "bg-orange-500" : "bg-gray-700"
              )} />

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight line-clamp-1">{project.name}</h3>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">ID: {project.id.split('-')[0]}</p>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-700 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 h-8 leading-relaxed">
                  {project.description || 'No conceptual overview provided for this project.'}
                </p>

                <div className="pt-4 border-t border-[#1f1f1f] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-black text-[10px] text-blue-400">
                      {project.profiles?.full_name?.split(' ').map(n => n[0]).join('') || '??'}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Assigned Architect</p>
                      <p className="text-[11px] font-bold text-white">{project.profiles?.full_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Timeline_Target</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-gray-400">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      {project.deadline || 'OPEN'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <select 
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value)}
                    className="bg-black border border-[#1f1f1f] rounded-lg py-2 px-3 text-[9px] font-black uppercase tracking-widest outline-none focus:border-blue-500/50 transition-all cursor-pointer text-gray-400 hover:text-white"
                  >
                    <option value="pending">PENDING</option>
                    <option value="in-progress">IN_PROGRESS</option>
                    <option value="on-hold">ON_HOLD</option>
                    <option value="completed">COMPLETED</option>
                    <option value="verified">VERIFIED</option>
                  </select>
                  <button 
                    onClick={() => setSelectedProject(project)}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg py-2 px-3 text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    View_Detail
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-[#1f1f1f] rounded-3xl bg-black/20">
              <Briefcase className="w-12 h-12 text-gray-800 mb-4 opacity-20" />
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-6">No Projects Registered in Current Filter</p>
              <button 
                onClick={async () => {
                  setLoading(true);
                  const res = await migrateTasksToProjects();
                  if (res.success) {
                    alert(`Migration successful! ${res.count} projects imported from tasks.`);
                    fetchData();
                  } else {
                    alert('Migration failed: ' + res.error);
                  }
                  setLoading(false);
                }}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 text-blue-400 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Sync Historical_Tasks
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
            
            <div className="p-10 relative">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Initialize Project</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Registry_Entry_Protocol</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-full hover:bg-white/5 text-gray-500 transition-colors"
                >
                  <Plus className="rotate-45 w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Project_Nomenclature</label>
                  <input 
                    name="name"
                    required
                    placeholder="e.g. Operation_Aura_Redesign"
                    className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 px-6 text-sm font-bold focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Objective_Parameters</label>
                  <textarea 
                    name="description"
                    rows={4}
                    placeholder="Define project scope and technical requirements..."
                    className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 px-6 text-sm font-medium focus:border-blue-500/50 outline-none transition-all resize-none placeholder:text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Architect_Assignment</label>
                    <select 
                      name="assigned_to"
                      required
                      className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 px-6 text-sm font-bold focus:border-blue-500/50 outline-none transition-all appearance-none text-gray-400"
                    >
                      <option value="">Select Developer</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Deadline_Vector</label>
                    <input 
                      name="deadline"
                      type="date"
                      className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 px-6 text-sm font-bold focus:border-blue-500/50 outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 border border-[#1f1f1f] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    Abort_Process
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Commit_to_Registry
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetail 
          project={selectedProject}
          employees={employees}
          isAdmin={isAdmin}
          currentUser={user}
          onClose={() => setSelectedProject(null)}
          onRefresh={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
