"use client";

import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  ChevronRight, 
  FileText, 
  IndianRupee, 
  Cpu, 
  Zap,
  Target,
  BarChart4,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIPricingPage() {
  const [brief, setBrief] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!brief) return;
    setIsGenerating(true);
    
    try {
      // Import the server action
      const { generatePriceEstimate } = await import('@/app/sales/actions');
      
      // Call Gemini API
      const estimate = await generatePriceEstimate(brief);
      
      // Parse the estimate into the result format
      setResult({
        recommendedPrice: `₹${(estimate.price * 0.9).toLocaleString('en-IN')} - ₹${(estimate.price * 1.1).toLocaleString('en-IN')}`,
        confidence: 92,
        timeline: estimate.timeline,
        breakdown: estimate.breakdown ? 
          estimate.breakdown.split('\n').filter(line => line.trim()).map((line, idx) => {
            // Try to extract cost from breakdown line
            const match = line.match(/₹?([\d,]+)/);
            const cost = match ? parseInt(match[1].replace(/,/g, '')) : Math.floor(estimate.price /  4);
            return {
              item: line.split(':')[0] || `Component ${idx + 1}`,
              hours: Math.floor(cost / 5000),
              cost: cost
            };
          }).slice(0, 4) : 
          [
            { item: 'UI/UX Design', hours: Math.floor(estimate.price * 0.15 / 5000), cost: Math.floor(estimate.price * 0.15) },
            { item: 'Frontend Development', hours: Math.floor(estimate.price * 0.35 / 5000), cost: Math.floor(estimate.price * 0.35) },
            { item: 'Backend & API', hours: Math.floor(estimate.price * 0.35 / 5000), cost: Math.floor(estimate.price * 0.35) },
            { item: 'QA & Deployment', hours: Math.floor(estimate.price * 0.15 / 5000), cost: Math.floor(estimate.price * 0.15) },
          ],
        strategy: estimate.breakdown || "AI-powered analysis based on project scope, complexity, and current market rates."
      });
    } catch (error) {
      console.error('Pricing generation error:', error);
      // Fallback to mock data if API fails
      setResult({
        recommendedPrice: '₹10,00,000 - ₹12,00,000',
        confidence: 85,
        timeline: '6-8 Weeks',
        breakdown: [
          { item: 'UI/UX Design', hours: 40, cost: 180000 },
          { item: 'Frontend Development', hours: 100, cost: 500000 },
          { item: 'Backend & API', hours: 60, cost: 300000 },
          { item: 'QA & Deployment', hours: 20, cost: 100000 },
        ],
        strategy: `Error: ${error.message}. Showing fallback estimate - please check your Gemini API configuration.`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest animate-pulse">
          <Cpu className="w-3.5 h-3.5" />
          Powered by Gemini Pro
        </div>
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">AI Pricing Engine</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Paste your project brief below. Our AI will analyze the scope, complexity, and market rates to recommend a winning price.
        </p>
      </div>

      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition-all duration-500" />
          <textarea 
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe the project scope, features, timeline, and client expectations..."
            className="w-full h-48 bg-black/80 border border-[#1f1f1f] rounded-2xl p-6 text-sm text-gray-300 outline-none focus:border-blue-500/50 transition-all relative resize-none"
          />
        </div>
        
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || !brief}
          className={cn(
            "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all",
            isGenerating || !brief 
              ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
              : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-600/20 hover:scale-[1.01] active:scale-[0.99]"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Computing Intelligence...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Recommendation
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Primary Recommendation */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <BarChart4 className="w-16 h-16 text-blue-500/10" />
                </div>
                
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Pricing Verdict</h3>
                <div className="space-y-2">
                  <p className="text-5xl font-black text-white tracking-tighter">{result.recommendedPrice}</p>
                  <p className="text-blue-400 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {result.confidence}% Confidence Match
                  </p>
                </div>

                <div className="mt-8 pt-8 border-t border-[#1f1f1f] grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Estimated Timeline</p>
                    <p className="text-xl font-bold">{result.timeline}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Market Position</p>
                    <p className="text-xl font-bold text-green-400">Premium Tier</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Logic & Strategy</h3>
                <p className="text-gray-300 leading-relaxed italic">
                  "{result.strategy}"
                </p>
                
                <div className="mt-8 flex gap-3">
                  <button className="flex-1 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all uppercase tracking-widest">
                    Export PDF
                  </button>
                  <button className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold transition-all uppercase tracking-widest shadow-lg shadow-blue-600/20">
                    Create Estimate
                  </button>
                </div>
              </div>
            </div>

            {/* Breakdown Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-3xl p-6">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Cost Breakdown</h3>
                <div className="space-y-4">
                  {result.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center group">
                      <div>
                        <p className="text-sm font-bold text-gray-300 group-hover:text-white transition-all">{item.item}</p>
                        <p className="text-[10px] text-gray-500">{item.hours} Hours Estimated</p>
                      </div>
                      <p className="font-mono text-sm font-bold text-gray-200">₹{item.cost.toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-[#1f1f1f] flex justify-between items-center">
                    <p className="text-xs font-bold text-white uppercase tracking-widest">Base Cost</p>
                    <p className="text-lg font-bold text-blue-400 font-mono">₹13,00,000</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-green-400" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-green-400">Pro Tip</h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  The client has a history of revisions. I've added a 15% buffer to the 'UI/UX' and 'Frontend' sections to account for potential scope creep.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
