'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '@/lib/api-client';
import { UserCheck, ShieldAlert, Key } from 'lucide-react';

// Schema 1: Profile Information
const infoSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Must be a valid email address.' }),
});

// Schema 2: Password Update (Compliance strength password)
const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  password: z
    .string()
    .min(8, { message: 'New password must be at least 8 characters long.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' }),
  passwordConfirmation: z.string().min(1, { message: 'Confirmation is required.' }),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'New passwords do not match.',
  path: ['passwordConfirmation'],
});

type InfoFormValues = z.infer<typeof infoSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

/**
 * User Profile & Security Settings Page.
 * 
 * Context:
 * Enables users to review their credentials and change security codes.
 * Forms are separated to prevent accidental password submissions.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Form 1: Profile info
  const {
    register: registerInfo,
    handleSubmit: handleInfoSubmit,
    formState: { errors: infoErrors },
  } = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  // Form 2: Password
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  // Info Mutation
  const updateInfoMutation = useMutation({
    mutationFn: (data: InfoFormValues) => 
      taskApi.updateUser(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
      showToast('Profile information updated successfully.', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update info.', 'error');
    },
  });

  // Password Mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => 
      taskApi.updateTask(user!.id, { ...data, change_password: true }), // Simulated trigger
    onSuccess: () => {
      showToast('Password changed successfully.', 'success');
      resetPassword({ currentPassword: '', password: '', passwordConfirmation: '' });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to change password.', 'error');
    },
  });

  if (!user) return null;

  const onInfoSubmit = (values: InfoFormValues) => {
    updateInfoMutation.mutate(values);
  };

  const onPasswordSubmit = (values: PasswordFormValues) => {
    updatePasswordMutation.mutate(values);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure profile details and manage secure login tokens</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: GENERAL PROFILE INFORMATION */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck size={18} className="text-primary-500" />
            <span>Profile Information</span>
          </h3>

          <form onSubmit={handleInfoSubmit(onInfoSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Display Name</label>
              <input
                type="text"
                {...registerInfo('name')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
              />
              {infoErrors.name && <p className="text-xs text-rose-500 font-semibold">{infoErrors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
              <input
                type="email"
                {...registerInfo('email')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
              />
              {infoErrors.email && <p className="text-xs text-rose-500 font-semibold">{infoErrors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={updateInfoMutation.isPending}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-bold hover:bg-primary-600 focus-ring shadow-sm transition-all"
            >
              Update Information
            </button>
          </form>
        </div>

        {/* CARD 2: PASSWORD MODIFICATION */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 h-fit">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Key size={18} className="text-amber-500" />
            <span>Security Passkey</span>
          </h3>

          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...registerPassword('currentPassword')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-rose-500 font-semibold">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...registerPassword('password')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
              />
              {passwordErrors.password && (
                <p className="text-xs text-rose-500 font-semibold">{passwordErrors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...registerPassword('passwordConfirmation')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
              />
              {passwordErrors.passwordConfirmation && (
                <p className="text-xs text-rose-500 font-semibold">{passwordErrors.passwordConfirmation.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={updatePasswordMutation.isPending}
              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold focus-ring shadow-sm transition-all"
            >
              Update Security Credentials
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
