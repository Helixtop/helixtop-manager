"use client";

import React, { useState } from 'react';
import Sidebar from "@/components/layout/Sidebar";
import TodoSidebar from "@/components/layout/TodoSidebar";
import MobileNavbar from "@/components/layout/MobileNavbar";
import { cn } from '@/lib/utils';

export default function ClientLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Lock body scroll when mobile sidebar is open
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (isSidebarOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }
  }, [isSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-black text-white relative">
      {/* Sidebar with mobile drawer logic */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Mobile Header */}
        <MobileNavbar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <div className={cn(
          "flex-1 p-4 md:p-8 pt-20 lg:pt-8 w-full max-w-[1920px] mx-auto transition-all duration-300",
          isSidebarOpen ? "blur-sm lg:blur-none opacity-50 lg:opacity-100" : ""
        )}>
          {children}
        </div>
        
        <TodoSidebar />
        
        {/* Background decorative elements */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-10 rounded-full" />
        <div className="fixed bottom-0 left-64 w-[400px] h-[400px] bg-green-600/5 blur-[100px] -z-10 rounded-full hidden lg:block" />
      </main>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
