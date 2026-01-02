"use client";

import React, { useState } from 'react';
import { 
  XCircle, 
  Calendar, 
  User, 
  FileText, 
  Type, 
  Briefcase,
  Loader2
} from 'lucide-react';
import { createTask } from '@/app/actions';

export default function CreateProjectModal({ isOpen, onClose, employees = [] }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const { success, error } = await createTask(formData);

    if (success) {
      alert('Project successfully initialized and assigned.');
      onClose();
      // Ideally trigger a refresh of stats or global callback, but page refresh works or next router refresh
      window.location.reload(); 
    } else {
      alert('Failed to create project: ' + error);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-[#0F0F0F] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden group">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-500/50 blur-[20px] rounded-full"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[50px] rounded-full pointer-events-none"></div>

        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
          <div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
              Create New Project
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1 ml-3">Assign tasks and define scope</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all -mr-2 -mt-2"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-[10px]">
              <Type className="w-3.5 h-3.5 text-blue-500" /> Project Title
            </label>
            <input 
              name="title" 
              required 
              placeholder="e.g. Q4 Brand Redesign" 
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:border-blue-500 focus:bg-black focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-700 text-white" 
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-[10px]">
              <FileText className="w-3.5 h-3.5 text-blue-500" /> Description
            </label>
            <textarea 
              name="description" 
              required 
              rows={3}
              placeholder="Detailed project requirements..." 
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:border-blue-500 focus:bg-black focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-700 text-white resize-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Deadline */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-[10px]">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Deadline
              </label>
              <input 
                name="deadline" 
                type="date"
                required 
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:border-blue-500 focus:bg-black outline-none transition-all text-gray-300 [color-scheme:dark]" 
              />
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 text-[10px]">
                <User className="w-3.5 h-3.5 text-blue-500" /> Assign To
              </label>
              <div className="relative">
                <select 
                  name="assigned_to" 
                  required 
                  defaultValue=""
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:border-blue-500 focus:bg-black outline-none transition-all appearance-none cursor-pointer text-white"
                >
                  <option value="" disabled>Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">
                      {emp.full_name}
                    </option>
                  ))}
                </select>
                <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3.5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
