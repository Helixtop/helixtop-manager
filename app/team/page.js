"use client";

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Briefcase, 
  DollarSign, 
  Trash2, 
  CheckCircle2, 
  Clock,
  MoreVertical,
  Search,
  Filter,
  Loader2,
  Key,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { createEmployee, getEmployees, updateEmployeeSalary } from './actions';

export default function TeamPage() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  
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
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    salary: '',
    password: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const result = await getEmployees();
      
      if (result.success) {
        setEmployees(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Failed to load team data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const calculateSalary = (hourly, time) => hourly * time;

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
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl overflow-x-auto shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center p-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Synchronizing Vault...</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#1f1f1f] bg-white/5">
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-[250px]">Employee</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-[200px]">Role</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Rate</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Time</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Salary</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right whitespace-nowrap w-[150px]">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {employees.length > 0 ? employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center font-bold text-gray-400 group-hover:text-white group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all">
                        {emp.full_name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white truncate max-w-[150px]">{emp.full_name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 whitespace-nowrap">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-300">₹{emp.hourly_rate}/hr</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <p className="text-sm text-gray-300 font-mono">{emp.trackedTime}h</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm font-bold text-green-400">
                      ₹{calculateSalary(emp.hourly_rate, emp.trackedTime).toLocaleString('en-IN')}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full border w-fit",
                      emp.isPaid 
                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                        : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", emp.isPaid ? "bg-green-500" : "bg-orange-500")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {emp.isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {!emp.isPaid && (
                        <button 
                          onClick={async () => {
                            const amount = calculateSalary(emp.hourly_rate, emp.trackedTime);
                            if (amount <= 0) return alert('No tracked time to pay for.');
                            
                            if (confirm(`Approve payment of ₹${amount.toLocaleString('en-IN')} to ${emp.full_name}?`)) {
                               const { error } = await supabase.from('transactions').insert([{
                                  amount: amount,
                                  type: 'expense',
                                  category: `Payroll: ${emp.full_name}`,
                                  date: new Date().toISOString().split('T')[0],
                                  notes: `Payment for ${emp.trackedTime} hours @ ₹${emp.hourly_rate}/hr`
                               }]);
                               
                               if (!error) {
                                 alert('Payment processed and logged in Accounting.');
                                 fetchEmployees();
                               } else {
                                 alert('Payment error: ' + error.message);
                               }
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 hover:text-green-300 text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Pay
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingEmployee({ ...emp, newRate: emp.hourly_rate })}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                        title="Edit Salary"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {/* More button hidden for now to save space if unrelated */}
                      {/* <button className="p-2 rounded-lg hover:bg-white/10 text-gray-500 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button> */}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No employees found in database.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

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
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="number" 
                    required
                    value={editingEmployee.newRate}
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
