'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, User, UserRole } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  UserPlus, 
  Pencil, 
  Trash2, 
  X, 
  Lock, 
  AlertCircle, 
  CheckCircle, 
  ShieldAlert 
} from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Must be a valid email address.' }),
  role: z.enum(['admin', 'project_manager', 'team_member'], {
    errorMap: () => ({ message: 'Please choose an authorized role.' }),
  }),
});

type UserFormValues = z.infer<typeof userSchema>;

/**
 * User Provisioning & Deactivation (Admin Only).
 * 
 * Context:
 * - Admin: Full access to add, edit, and deactivate accounts.
 * - Project Manager/Member: Blocked by middleware. If bypass attempted, rendered with lock screen.
 */
export default function UserAdminPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  // 1. Query System Users
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['usersList'],
    queryFn: taskApi.getUsers,
    enabled: currentUser?.role === 'admin',
  });

  // 2. Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: Omit<User, 'id'>) => taskApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      showToast('New user account provisioned.', 'success');
      closeModal();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create account.', 'error');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
      taskApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      showToast('User profile settings updated.', 'success');
      closeModal();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update user.', 'error');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: taskApi.deactivateUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      showToast(`Account for ${data.user.name} has been DEACTIVATED.`, 'warning');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to deactivate account.', 'error');
    },
  });

  if (!currentUser) return null;

  // Gating access checks
  if (currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center shadow-md space-y-4">
          <Lock className="text-rose-500 mx-auto" size={44} />
          <h2 className="text-lg font-bold text-slate-800">Admin Clearance Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your login role does not possess administrative privileges. User directory edits are restricted.
          </p>
        </div>
      </div>
    );
  }

  const openCreateModal = () => {
    setEditingUser(null);
    reset({ name: '', email: '', role: 'team_member' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    reset({ name: user.name, email: user.email, role: user.role });
    setIsModalOpen(true);
  };

  const handleDeactivate = (user: User) => {
    if (user.id === currentUser.id) {
      showToast('You cannot deactivate your own account.', 'warning');
      return;
    }
    if (confirm(`Deactivate access token and login rights for "${user.name}"?`)) {
      deactivateMutation.mutate(user.id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: values });
    } else {
      createUserMutation.mutate(values);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'project_manager': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'project_manager': return 'Project Manager';
      case 'team_member': return 'Team Member';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">System Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system accounts, authority scopes, and login credentials</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-600 focus-ring transition-all"
        >
          <UserPlus size={16} />
          <span>Provision User</span>
        </button>
      </div>

      {/* TABLE DATA LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-full skeleton-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-rose-600 text-sm font-semibold flex items-center justify-center gap-1.5">
            <ShieldAlert size={18} />
            <span>Failed to load user directory logs.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Account Profile</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider">AML Access Role</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 font-extrabold text-slate-500 flex items-center justify-center uppercase text-xs">
                          {item.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${getRoleBadgeColor(item.role)}`}>
                        {getRoleLabel(item.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.active !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold">
                          <CheckCircle size={14} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-primary-500 rounded hover:bg-slate-100"
                          title="Modify Profile"
                        >
                          <Pencil size={14} />
                        </button>
                        {item.active !== false && (
                          <button
                            onClick={() => handleDeactivate(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100"
                            title="Suspend User"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-zoom">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingUser ? 'Edit User Credentials' : 'Provision User Account'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                />
                {errors.name && <p className="text-xs text-rose-500 font-semibold">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john@task.com"
                  {...register('email')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                />
                {errors.email && <p className="text-xs text-rose-500 font-semibold">{errors.email.message}</p>}
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">System Role Scope</label>
                <select {...register('role')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring">
                  <option value="team_member">Team Member (Task Assignee)</option>
                  <option value="project_manager">Project Manager (Board Owner)</option>
                  <option value="admin">Administrator (Global Access)</option>
                </select>
                {errors.role && <p className="text-xs text-rose-500 font-semibold">{errors.role.message}</p>}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-600 focus-ring transition-all"
                >
                  {editingUser ? 'Save Updates' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
