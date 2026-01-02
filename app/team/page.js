"use client";

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Briefcase, 
  IndianRupee, 
  Trash2, 
  CheckCircle2, 
  Clock,
  MoreVertical,
  Search,
  Filter,
  Loader2,
  Key,
  Edit,
  Calendar,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { createEmployee, getEmployees, updateEmployeeSalary } from './actions';

export default function TeamPage() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    salary: '',
    password: ''
  });

  const fetchEmployees = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getEmployees();
      
      if (result.success) {
        setEmployees(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (!silent) alert('Failed to load team data: ' + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    const interval = setInterval(() => fetchEmployees(true), 60000);
    return () => clearInterval(interval);
  }, []);
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-40 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-gray-500 font-bold uppercase text-[9px] tracking-widest">Verifying Privileges...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-40 gap-6">
        <div className="p-10 bg-red-500/5 border border-red-500/10 rounded-[40px] flex flex-col items-center gap-6 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-xl shadow-red-500/10">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Access_Restricted</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 font-mono">
              Admin_Clearance_Required
            </p>
          </div>
        </div>
      </div>
    );
  }


  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('role', formData.role);
      data.append('hourly_rate', formData.salary);

      const result = await createEmployee(null, data);

      if (result.success) {
        setShowAddModal(false);
        setFormData({ name: '', email: '', role: 'Developer', salary: '', password: '' });
        alert(result.message);
        fetchEmployees();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('Provisioning Error: ' + error.message);
    }
  };

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      const data = new FormData();
      data.append('userId', editingEmployee.id);
      data.append('hourly_rate', editingEmployee.newRate);

      const result = await updateEmployeeSalary(null, data);

      if (result.success) {
        setEditingEmployee(null);
        alert(result.message);
        fetchEmployees();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      alert('Update Error: ' + error.message);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0h';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-tight">Team Management</h2>
          <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Network & Payroll</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-lg shadow-blue-600/20"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] text-sm text-gray-400 hover:text-white transition-all">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Employee List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
             Array(6).fill(0).map((_, i) => (
               <div key={i} className="h-48 rounded-3xl bg-[#0a0a0a] border border-[#1f1f1f] animate-pulse" />
             ))
        ) : employees.length > 0 ? employees.map((emp) => (
          <div 
            key={emp.id} 
            onClick={() => setSelectedEmployee(emp)}
            className="group bg-[#0a0a0a] border border-[#1f1f1f] hover:border-blue-500/50 rounded-3xl p-6 cursor-pointer transition-all hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-blue-400" />
               </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-[#333] flex items-center justify-center font-bold text-xl text-gray-400 group-hover:text-white group-hover:border-blue-500/50 transition-all shadow-inner">
                 {emp.full_name?.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                 <h3 className="font-bold text-white text-lg tracking-tight group-hover:text-blue-400 transition-colors">{emp.full_name}</h3>
                 <p className="text-xs text-gray-500 font-medium">{emp.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
               <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Weekly_Activity</p>
                  <p className="text-sm font-mono font-bold text-white">{formatDuration(emp.stats?.weeklySeconds)}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Unpaid_Balance</p>
                  <p className={cn("text-sm font-mono font-bold", (emp.stats?.pendingPayment || 0) > 0 ? "text-green-400" : "text-gray-600")}>
                     ₹{(emp.stats?.pendingPayment || 0).toLocaleString()}
                  </p>
               </div>
            </div>
            
            {(emp.stats?.pendingPayment || 0) > 0 && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500" />
            )}
          </div>
        )) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#1f1f1f] rounded-3xl">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No personnel found.</p>
          </div>
        )}
      </div>

      {/* Selected Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-start">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-black border border-white/10 flex items-center justify-center text-3xl font-black text-gray-500 shadow-xl">
                       {selectedEmployee.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                       <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedEmployee.full_name}</h2>
                       <div className="flex items-center gap-3 mt-2">
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                             {selectedEmployee.role}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">{selectedEmployee.email}</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setSelectedEmployee(null)} className="p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Left Column: Stats */}
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 rounded-2xl bg-black border border-white/5 space-y-2">
                          <Clock className="w-5 h-5 text-gray-600 mb-2" />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">This Week</p>
                          <p className="text-xl font-black text-white tracking-tighter">{formatDuration(selectedEmployee.stats?.weeklySeconds)}</p>
                       </div>
                       <div className="p-5 rounded-2xl bg-black border border-white/5 space-y-2">
                          <Calendar className="w-5 h-5 text-gray-600 mb-2" />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">This Month</p>
                          <p className="text-xl font-black text-white tracking-tighter">{formatDuration(selectedEmployee.stats?.monthlySeconds)}</p>
                       </div>
                       <div className="p-5 rounded-2xl bg-black border border-white/5 space-y-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500/50 mb-2" />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Completed</p>
                          <p className="text-2xl font-black text-white tracking-tighter">{selectedEmployee.stats?.completedTasks || 0}</p>
                       </div>
                       <div className="p-5 rounded-2xl bg-black border border-white/5 space-y-2">
                          <Loader2 className="w-5 h-5 text-orange-500/50 mb-2" />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pending</p>
                          <p className="text-2xl font-black text-white tracking-tighter">{selectedEmployee.stats?.pendingTasks || 0}</p>
                       </div>
                    </div>

                    {/* Amount Credited Box */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount Credited</p>
                           <p className="text-xs text-gray-600">Lifetime Earnings</p>
                        </div>
                        <p className="text-xl font-black text-green-400 tracking-tighter">
                           ₹{(selectedEmployee.stats?.totalPaidEstimated || 0).toLocaleString()}
                        </p>
                    </div>
                 </div>

                 {/* Right Column: Financials */}
                 <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-900/10 to-blue-900/5 border border-blue-500/20 text-center relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
                       <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Unpaid Balance</p>
                       <p className="text-4xl font-black text-white tracking-tighter">
                          ₹{(selectedEmployee.stats?.pendingPayment || 0).toLocaleString()}
                       </p>
                       <p className="text-[10px] text-blue-400/60 mt-2 font-mono">
                          {formatDuration(selectedEmployee.stats?.unpaidSeconds)} @ ₹{selectedEmployee.hourly_rate}/hr
                       </p>
                    </div>

                    <div className="space-y-3">
                       <button 
                         onClick={async () => {
                             const amount = selectedEmployee.stats?.pendingPayment || 0;
                             if (amount <= 0) return alert('No pending balance to pay.');
                             
                             if (confirm(`Process payment of ₹${amount.toLocaleString()} to ${selectedEmployee.full_name}?`)) {
                                 const { error } = await supabase.from('transactions').insert([{
                                    amount: amount,
                                    type: 'expense',
                                    category: `Payroll: ${selectedEmployee.full_name}`,
                                    date: new Date().toISOString().split('T')[0],
                                    notes: `Payroll Cleared: ${formatDuration(selectedEmployee.stats?.unpaidSeconds || 0)}`
                                 }]);
                                 // Update time_logs to is_paid=true
                                 await supabase.from('time_logs')
                                    .update({ is_paid: true })
                                    .eq('user_id', selectedEmployee.id)
                                    .eq('is_paid', false);

                                 if (!error) {
                                   alert('Payment processed successfully.');
                                   setSelectedEmployee(null);
                                   fetchEmployees();
                                 } else {
                                   alert('Error: ' + error.message);
                                 }
                             }
                         }}
                         disabled={(selectedEmployee.stats?.pendingPayment || 0) <= 0}
                         className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                       >
                         <IndianRupee className="w-4 h-4" />
                         Process Payment
                       </button>

                       <button 
                         onClick={() => {
                             setEditingEmployee({ ...selectedEmployee, newRate: selectedEmployee.hourly_rate });
                             // Ideally we keep selectedEmployee open or close it? 
                             // Let's close it to avoid modal stacking issues unless handled well
                             // Or just switch focus.
                         }}
                         className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white font-bold uppercase tracking-widest text-[10px] transition-all"
                       >
                         Adjust Hourly Rate
                       </button>
                    </div>
                 </div>
              </div>

              {/* Recent Works List */}
              <div className="p-8 border-t border-white/5 bg-black/20">
                 <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    Recent Activity
                 </h4>
                 <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedEmployee.stats?.recentTasks?.length > 0 ? (
                        selectedEmployee.stats?.recentTasks.map(task => {
                           const isVerified = task.status === 'verified';
                           const isRejected = task.status === 'rejected';
                           const isPending = !isVerified && !isRejected;

                           return (
                             <div key={task.id} className={cn(
                               "p-3 rounded-xl border flex justify-between items-center transition-all",
                               isVerified ? "bg-green-500/5 border-green-500/20 hover:border-green-500/30" : 
                               isRejected ? "bg-red-500/5 border-red-500/20 hover:border-red-500/30" :
                               "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/30"
                             )}>
                                <p className={cn("text-xs font-medium truncate max-w-[280px]", 
                                   isVerified ? "text-green-200" : 
                                   isRejected ? "text-red-200" : 
                                   "text-blue-200"
                                )}>{task.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border",
                                     isVerified ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                     isRejected ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                     "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  )}>
                                     {task.status || 'Pending'}
                                  </span>
                                </div>
                             </div>
                           );
                        })
                    ) : (
                        <div className="p-4 rounded-xl border border-dashed border-white/10 text-center">
                           <p className="text-xs text-gray-600 italic">No recent activity detected.</p>
                        </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleAddEmployee} className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#1f1f1f]">
              <h3 className="text-xl font-bold uppercase tracking-tight">Add New Employee</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Provision Network Access</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none" 
                    placeholder="John Doe" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none" 
                    placeholder="john@helixtop.com" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-2.5 px-3 text-sm focus:border-blue-500/50 outline-none appearance-none"
                  >
                    <option>Developer</option>
                    <option>Digital Content Creator</option>
                    <option>Salesman</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hourly Rate (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-2.5 px-3 text-sm focus:border-blue-500/50 outline-none" 
                    placeholder="500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initial Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none font-mono" 
                    placeholder="••••••••••••" 
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 flex gap-3">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#1f1f1f] text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-widest transition-all"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Edit Salary Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleUpdateSalary} className="bg-[#0a0a0a] border border-[#1f1f1f] w-full max-w-sm rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#1f1f1f]">
              <h3 className="text-xl font-bold uppercase tracking-tight">Edit Salary</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Update Hourly Compensation</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</label>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-sm font-bold text-white">{editingEmployee.full_name}</p>
                  <p className="text-xs text-gray-500">{editingEmployee.email}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">New Hourly Rate (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="number" 
                    required
                    value={editingEmployee.newRate || ''}
                    onChange={(e) => setEditingEmployee({...editingEmployee, newRate: e.target.value})}
                    className="w-full bg-black border border-[#1f1f1f] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-blue-500/50 outline-none" 
                    placeholder="500" 
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 flex gap-3">
              <button 
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="flex-1 py-3 rounded-xl border border-[#1f1f1f] text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-widest transition-all"
              >
                Update Rate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}