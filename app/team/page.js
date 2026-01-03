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
import { createEmployee, getEmployees, updateEmployeeSalary, processSalaryPayment } from './actions';
import EmployeeDetail from '@/components/team/EmployeeDetail';

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

            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
               <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Weekly_Activity</p>
                  <p className="text-xs font-mono font-bold text-white">{formatDuration(emp.stats?.weeklySeconds)}</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active Projects</p>
                  <p className="text-xs font-bold text-blue-400">{emp.stats?.projectCount || 0}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Unpaid_Balance</p>
                  <p className={cn("text-xs font-mono font-bold", (emp.stats?.pendingPayment || 0) > 0 ? "text-green-400" : "text-gray-600")}>
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
        <EmployeeDetail 
          employee={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)}
          onRefresh={fetchEmployees}
          onEditSalary={(emp) => setEditingEmployee({ ...emp, newRate: emp.hourly_rate })}
        />
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