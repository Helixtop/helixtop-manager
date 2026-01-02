"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  List, 
  Loader2, 
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import { getPendingWorks } from './actions';
import { cn } from '@/lib/utils';
import WorkList from '@/components/pending-works/WorkList';
import WorkKanban from '@/components/pending-works/WorkKanban';

export default function PendingWorksPage() {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchWorks();
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setViewMode('list');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchWorks = async () => {
    setLoading(true);
    const result = await getPendingWorks();
    if (result.success) {
      setWorks(result.data);
    }
    setLoading(false);
  };

  const filteredWorks = works.filter(work => 
    work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    work.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    work.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Pending Works</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Global Activity Stream</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search activity..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl py-2 px-10 text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {!isMobile && (
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
          )}
        </div>
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
          <AlertCircle className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">No Pending Activity Detected</p>
        </div>
      )}
    </div>
  );
}
