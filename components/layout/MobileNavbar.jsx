"use client";

import React from 'react';
import { Menu, Search, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function MobileNavbar({ onMenuClick }) {
  const { profile } = useAuth();

  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-[#1f1f1f] flex items-center justify-between px-6 z-[120] backdrop-blur-xl bg-black/80">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-all"
        >
          <Menu className="w-6 h-6 text-gray-400" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black bg-gradient-to-r from-blue-500 to-green-400 bg-clip-text text-transparent uppercase tracking-tighter leading-none">
            Helixtop
          </h1>
          <p className="text-[8px] text-gray-600 uppercase tracking-widest font-bold">Suite</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-green-500 flex items-center justify-center text-white font-black text-[10px] shadow-lg border border-white/5">
          {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
        </div>
      </div>
    </nav>
  );
}
