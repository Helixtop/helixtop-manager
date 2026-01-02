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
  Briefcase
} from 'lucide-react';
import { getPendingWorks } from './actions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import WorkList from '@/components/pending-works/WorkList';
import WorkKanban from '@/components/pending-works/WorkKanban';

export default function PendingWorksPage() {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Marketing', 'Meeting', 'Project'
  const [isMobile, setIsMobile] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchWorks();
    
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
    const result = await getPendingWorks(isAdmin ? null : user.id);
    if (result.success) {
      setWorks(result.data);
    }
    setLoading(false);
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
    { id: 'Marketing', name: 'Growth', icon: Megaphone, color: 'text-orange-400' },
    { id: 'Meeting', name: 'Syncs', icon: Calendar, color: 'text-purple-400' },
    { id: 'Project', name: 'Tasks', icon: Briefcase, color: 'text-blue-400' },
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
          <WorkKanban works={filteredWorks} />
        ) : (
          <WorkList works={filteredWorks} />
        )
      ) : (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-[#1f1f1f] rounded-3xl bg-[#0a0a0a]/50">
          <Activity className="w-12 h-12 text-gray-800 mb-4 opacity-20" />
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">No Flux Records Detected</p>
        </div>
      )}
    </div>
  );
}
