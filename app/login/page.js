"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, Mail, Lock, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-[2000] p-4">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-green-600/10 blur-[100px] rounded-full" />

      <div className="w-full max-w-md relative animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-6 shadow-2xl shadow-blue-600/20">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Helixtop</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Agency_Access_Gateway</p>
        </div>

        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#1f1f1f] p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Sparkles className="w-16 h-16" />
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Identity_String (Email)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-800" 
                  placeholder="admin@helixtop.com" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Passphrase_Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-[#1f1f1f] rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-800 font-mono" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest animate-in slide-in-from-top-2">
                Authentication_Failure: {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Initialize_Session'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-[9px] text-gray-600 font-black uppercase tracking-[0.2em]">
          Strictly_Restricted_Asset • Helixtop_v2.0
        </p>
      </div>
    </div>
  );
}
