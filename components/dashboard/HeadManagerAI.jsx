"use client";

import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, AlertTriangle, TrendingDown, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function HeadManagerAI() {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [personaMessage, setPersonaMessage] = useState("");

  useEffect(() => {
    fetchAIAudit();
  }, []);

  const fetchAIAudit = async () => {
    setLoading(true);
    try {
      const [
        { data: pendingTasks },
        { data: unassignedLeads },
        { data: txs },
        { data: rejectedContent }
      ] = await Promise.all([
        supabase.from('tasks').select('title, deadline, status').in('status', ['pending', 'in-progress']),
        supabase.from('leads').select('*').eq('stage', 'ad-leads'),
        supabase.from('transactions').select('*'),
        supabase.from('marketing_content').select('*').eq('status', 'rejected')
      ]);

      const newReports = [];
      const now = new Date();

      // 1. Analyze Task Delays
      pendingTasks?.forEach(task => {
        const deadline = new Date(task.deadline);
        if (deadline < now) {
          newReports.push({
            type: 'delay',
            icon: Clock,
            text: `DEVIATION DETECTED: '${task.title}' is PAST DEADLINE.`,
            severity: 'critical'
          });
        }
      });

      // 2. Analyze Unassigned Leads
      if (unassignedLeads?.length > 0) {
        newReports.push({
          type: 'task',
          icon: AlertTriangle,
          text: `RESOURCE WASTE: ${unassignedLeads.length} leads sitting in 'Ad Leads' gathering dust.`,
          severity: 'warning'
        });
      }

      // 3. Analyze Accounting Flux
      const income = txs?.filter(t => t.type === 'income').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
      const expense = txs?.filter(t => t.type === 'expense').reduce((acc, curr) => acc + parseFloat(curr.amount), 0) || 0;
      const profit = income - expense;

      if (profit < 50000 && income > 0) {
        newReports.push({
          type: 'accounting',
          icon: TrendingDown,
          text: `MARGIN CRISIS: Profit is sitting at ₹${profit.toLocaleString('en-IN')}.`,
          severity: 'critical'
        });
      }

      // 4. Analyze Marketing Rejections
      if (rejectedContent?.length > 0) {
        newReports.push({
          type: 'marketing',
          icon: Bot,
          text: `QUALITY FAILURE: ${rejectedContent.length} items REJECTED by Admin.`,
          severity: 'warning'
        });
      }

      setReports(newReports);

      // Aggressive Persona Logic Enhanced
      if (newReports.length > 5) {
        setPersonaMessage("THIS IS A DISASTER. I'm seeing total systemic failure. Margin crisis, delayed tasks, unassigned leads... are you trying to go bankrupt? FIX THIS BEFORE I LOCK THE VAULT.");
      } else if (newReports.length > 2) {
        setPersonaMessage("I'm not here to hold hands. I see multiple flags. Every minute you spend reading this is a minute you're losing money. Get to work.");
      } else if (newReports.length > 0) {
        setPersonaMessage("I've spotted some slack. I don't tolerate slack. Neutralize the deviations listed below immediately.");
      } else {
        setPersonaMessage("Systems are stable. Don't let it get to your head. I'm watching.");
      }

    } catch (error) {
      console.error('AI Audit Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full group">
      <div 
        className="p-4 bg-gradient-to-r from-blue-600/10 to-green-600/10 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a] animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-200">Head Manager AI</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Strict_Supervisor_v2</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-12 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Scanning_Infractions...</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                    <p className="text-xs text-red-400 font-bold leading-relaxed italic">
                      "{personaMessage}"
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {reports.length > 0 ? reports.map((report, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex gap-3 p-3 rounded-xl border transition-all hover:bg-white/5 shadow-sm",
                          report.severity === 'critical' ? "border-red-500/30 bg-red-500/5" : 
                          report.severity === 'warning' ? "border-orange-500/30 bg-orange-500/5" : 
                          "border-white/5 bg-white/5"
                        )}
                      >
                        <report.icon className={cn(
                          "w-4 h-4 flex-shrink-0 mt-0.5",
                          report.severity === 'critical' ? "text-red-400" : 
                          report.severity === 'warning' ? "text-orange-400" : 
                          "text-blue-400"
                        )} />
                        <p className="text-[11px] text-gray-300 leading-relaxed font-bold uppercase tracking-tight">
                          {report.text}
                        </p>
                      </div>
                    )) : (
                      <div className="p-8 text-center border border-dashed border-white/5 rounded-xl">
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No Deviations Detected</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={fetchAIAudit}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                  >
                    Recalibrate_Status
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
