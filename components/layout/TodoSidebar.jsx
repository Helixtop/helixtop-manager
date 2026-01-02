"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  X, 
  ChevronRight, 
  ListTodo,
  Users,
  Search,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { getUserTodos, getTeamTodos, addTodo, toggleTodo, deleteTodo } from '@/app/todos/actions';

export default function TodoSidebar() {
  const { user, profile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('personal'); // 'personal' or 'team'
  const [todos, setTodos] = useState([]);
  const [teamTodos, setTeamTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      fetchTodos();
      if (isAdmin) fetchAllTeamTodos();
    }
  }, [user, isAdmin]);

  // Lock body scroll when mobile todo sidebar is open
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }
    return () => {
      if (typeof window !== 'undefined') document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchTodos = async () => {
    setLoading(true);
    const res = await getUserTodos(user.id);
    if (res.success) setTodos(res.data);
    setLoading(false);
  };

  const fetchAllTeamTodos = async () => {
    const res = await getTeamTodos();
    if (res.success) setTeamTodos(res.data);
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const res = await addTodo(newTodo, user.id);
    if (res.success) {
      setTodos([res.data, ...todos]);
      setNewTodo('');
      if (isAdmin) fetchAllTeamTodos();
    }
  };

  const handleToggle = async (id, currentStatus) => {
    const res = await toggleTodo(id, !currentStatus);
    if (res.success) {
      setTodos(todos.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
      if (isAdmin) fetchAllTeamTodos();
    }
  };

  const handleDelete = async (id) => {
    const res = await deleteTodo(id);
    if (res.success) {
      setTodos(todos.filter(t => t.id !== id));
      if (isAdmin) fetchAllTeamTodos();
    }
  };

  // Group team todos by user
  const groupedTeamTodos = teamTodos.reduce((acc, todo) => {
    const userId = todo.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        name: todo.profiles?.full_name || 'Unknown',
        role: todo.profiles?.role || 'Developer',
        items: []
      };
    }
    acc[userId].items.push(todo);
    return acc;
  }, {});

  const filteredTeamUsers = Object.entries(groupedTeamTodos).filter(([_, data]) => 
    data.name.toLowerCase().includes(search.toLowerCase()) || 
    data.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#0a0a0a] border-l border-y border-white/5 p-3 rounded-l-2xl shadow-2xl hover:bg-white/5 transition-all group",
          isOpen && "opacity-0 pointer-events-none"
        )}
      >
        <ListTodo className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Sidebar Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Content */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-sm bg-[#050505] border-l border-white/5 z-50 shadow-2xl transition-transform duration-500 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Daily_Tasks</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global Workflow</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/5 rounded-xl transition-all"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {isAdmin && (
            <div className="flex bg-black p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setView('personal')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  view === 'personal' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                )}
              >
                My_List
              </button>
              <button 
                onClick={() => setView('team')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  view === 'team' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Team_Oversight
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {view === 'personal' ? (
            <div className="space-y-6">
              {/* Add Todo */}
              <form onSubmit={handleAddTodo} className="relative">
                <input 
                  type="text" 
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Allocate new task..."
                  className="w-full bg-black border border-white/5 rounded-xl py-4 pl-4 pr-12 text-xs outline-none focus:border-blue-500/50 transition-all font-mono"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Personal List */}
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : todos.length > 0 ? (
                  todos.map(todo => (
                    <div 
                      key={todo.id}
                      className={cn(
                        "group flex items-center justify-between p-4 rounded-xl border transition-all",
                        todo.completed ? "bg-black border-transparent opacity-60" : "bg-white/5 border-white/5 hover:border-blue-500/20"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <button 
                          onClick={() => handleToggle(todo.id, todo.completed)}
                          className="transition-transform active:scale-95"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-600 group-hover:text-blue-400" />
                          )}
                        </button>
                        <span className={cn(
                          "text-xs font-medium tracking-tight",
                          todo.completed ? "line-through text-gray-500" : "text-gray-200"
                        )}>
                          {todo.text}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDelete(todo.id)}
                        className="p-1 px-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl text-center opacity-30">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Zero_Vectors_Found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Team Oversight View */
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by Employee..."
                  className="w-full bg-black border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-6">
                {filteredTeamUsers.map(([userId, data]) => (
                  <div key={userId} className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                       <div>
                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{data.name}</h4>
                          <p className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">{data.role}</p>
                       </div>
                       <span className="text-[9px] font-mono text-gray-700 bg-white/5 px-2 py-0.5 rounded">
                         {data.items.filter(i => i.completed).length}/{data.items.length}
                       </span>
                    </div>
                    <div className="space-y-2">
                      {data.items.map(todo => (
                        <div 
                          key={todo.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border text-[10px]",
                            todo.completed ? "bg-black border-transparent opacity-40" : "bg-white/[0.02] border-white/5"
                          )}
                        >
                          {todo.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <Circle className="w-3.5 h-3.5 text-gray-800" />}
                          <span className={cn(todo.completed && "line-through")}>{todo.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 border-t border-white/5 bg-black/50 space-y-4">
           {/* Mobile Close Button */}
           <button 
             onClick={() => setIsOpen(false)}
             className="w-full lg:hidden py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2"
           >
             <X className="w-3.5 h-3.5" />
             Close_Menu
           </button>
           
           <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-600">
             <span>Status: Online_Protocol</span>
             <span>Sync: V{new Date().getHours()}.{new Date().getMinutes()}</span>
           </div>
        </div>
      </div>
    </>
  );
}
