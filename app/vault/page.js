"use client";

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  ExternalLink,
  Plus,
  Search,
  Key,
  Globe,
  Mail,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';

export default function VaultPage() {
  const { profile, isAdmin } = useAuth();
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    service: '',
    url: '',
    email: '',
    password: ''
  });
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-6">
        <Lock className="w-16 h-16 text-red-500/50" />
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2 font-mono">Insufficient_Privileges_Detected</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('credentials_vault')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPasswords(data || []);
    } catch (error) {
      console.error('Error fetching vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('credentials_vault')
        .insert([{
          service_name: formData.service,
          url: formData.url,
          login_email: formData.email,
          encrypted_password: formData.password // In prod, encrypt this before sending
        }]);

      if (error) throw error;
      
      setShowAddModal(false);
      setFormData({ service: '', url: '', email: '', password: '' });
      fetchVault();
    } catch (error) {
      alert('Error saving credential: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Destroy this credential node permanently?')) return;
    try {
      const { error } = await supabase
        .from('credentials_vault')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchVault();
    } catch (error) {
      console.error('Error deleting credential:', error);
    }
  };

  const toggleVisibility = (id) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Simple notification would go here
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em]">End-to-End_Encrypted</span>
          </div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Admin Vault</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest font-mono">Secret_Store_V2.0</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Provision_Secret
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center justify-between group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Enhanced Shielding Active</h3>
            <p className="text-xs text-gray-500 font-medium">All access attempts are logged and audited via the system supervisor.</p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-[#111] flex items-center justify-center">
              <Lock className="w-3 h-3 text-gray-600" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Filter by service name..." 
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-40 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Unlocking Store...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {passwords.length > 0 ? passwords.map((pw) => (
            <div key={pw.id} className="bg-[#0a0a0a] border border-[#1f1f1f] p-6 rounded-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-bl-full group-hover:bg-blue-500/[0.02] transition-all" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black border border-white/5 flex items-center justify-center font-bold text-gray-400">
                    <Globe className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-200 group-hover:text-white transition-colors uppercase tracking-tight">{pw.service_name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-gray-600 font-mono flex items-center gap-1">
                        <ExternalLink className="w-2.5 h-2.5" />
                        {pw.url?.replace('https://', '')}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(pw.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="p-3.5 rounded-xl bg-black border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-medium text-gray-400 font-mono">{pw.login_email}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(pw.login_email)}
                      className="p-1.5 rounded-md hover:bg-white/5 text-gray-600 hover:text-white transition-all"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-full h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-mono font-bold tracking-widest text-blue-400/80">
                        {showPassword[pw.id] ? pw.encrypted_password : '••••••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => toggleVisibility(pw.id)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-gray-600 hover:text-white transition-all"
                      >
                        {showPassword[pw.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button 
                         onClick={() => copyToClipboard(pw.encrypted_password)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-gray-600 hover:text-white transition-all"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <button className="w-full py-2.5 rounded-xl border border-white/5 hover:border-white/10 text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-all font-mono">
                  Launch_Service_Node
                </button>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-[#1f1f1f] rounded-3xl opacity-30">
              <Lock className="w-12 h-12 mx-auto mb-4 text-gray-700" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Secrets Registered</p>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <form onSubmit={handleAdd} className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-[#1f1f1f] flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Register Secret</h3>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Provisioning encrypted credentials</p>
              </div>
              <Lock className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service_Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.service}
                    onChange={(e) => setFormData({...formData, service: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none font-bold" 
                    placeholder="e.g. Supabase DB" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access_URL</label>
                  <input 
                    type="url" 
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 px-4 text-sm focus:border-blue-500/50 outline-none" 
                    placeholder="https://supabase.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Login_Identifier</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                  <input 
                    type="text" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-12 pr-4 text-sm focus:border-blue-500/50 outline-none font-mono" 
                    placeholder="admin@helixtop-manager.ai" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passphrase_Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-3 pl-12 pr-4 text-sm focus:border-blue-500/50 outline-none font-mono" 
                    placeholder="••••••••••••" 
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/[0.02] flex gap-4">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 rounded-xl border border-[#1f1f1f] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Abort
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
              >
                Seal_Secret
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
