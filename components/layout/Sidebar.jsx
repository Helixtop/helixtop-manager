"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Briefcase, 
  Calculator, 
  Clock, 
  Sparkles, 
  Lock,
  Settings,
  LogOut,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';
import { cn } from '@/lib/utils';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Team', icon: Users, href: '/team', adminOnly: true },
  { name: 'Marketing', icon: Megaphone, href: '/marketing' },
  { name: 'Pending Works', icon: ClipboardList, href: '/pending-works' },
  { name: 'Sales', icon: Briefcase, href: '/sales' },
  { name: 'Accounting', icon: Calculator, href: '/accounting', adminOnly: true },
  { name: 'Time Tracker', icon: Clock, href: '/time-tracker' },
  { name: 'AI Pricing', icon: Sparkles, href: '/ai-pricing' },
  { name: 'Vault', icon: Lock, href: '/vault', adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut, isAdmin, effectiveRole } = useAuth();

  if (!user && pathname === '/login') return null;

  const filteredMenuItems = menuItems.filter(item => {
      // 1. Check Admin Only
      if (item.adminOnly && !isAdmin) return false;
      
      // 2. Check Developer Restrictions
      if ((effectiveRole === 'Developer' || profile?.role === 'Developer') && !isAdmin) {
          const hiddenItems = ['Marketing', 'Sales', 'AI Pricing', 'Accounting'];
          if (hiddenItems.includes(item.name)) return false;
      }
      
      return true;
  });

  return (
    <aside className="w-64 h-[100dvh] bg-black border-r border-[#1f1f1f] flex flex-col fixed left-0 top-0 z-[100] overflow-hidden select-none">
      <div className="p-6 shrink-0 bg-black/50 backdrop-blur-sm relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-green-400 bg-clip-text text-transparent uppercase tracking-tighter">
          Helixtop
        </h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-black">Management Suite</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-blue-400" : "group-hover:text-blue-400 transition-colors"
              )} />
              <span className="font-bold text-xs uppercase tracking-tight">{item.name}</span>
              {isActive && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1f1f1f] space-y-1">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm font-medium">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
        <button 
          onClick={() => {
            if (confirm('Are you sure you want to logout?')) signOut();
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded-xl transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout_System</span>
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-900/20 to-green-900/20 border border-white/5 shadow-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-green-500 flex items-center justify-center text-white font-black text-xs shadow-lg">
            {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white truncate uppercase tracking-tighter">
              {profile?.full_name || user?.email?.split('@')[0] || 'Helixtop User'}
            </p>
            <p className={cn(
               "text-[10px] uppercase font-black tracking-tighter flex items-center gap-1",
               profile ? "text-blue-400" : "text-gray-500"
            )}>
              {effectiveRole}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
