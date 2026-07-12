'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderKanban, Lock, Mail, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// Strict password validation rules matching backend schemas
const loginSchema = z.object({
  email: z.string().email({ message: 'A valid email address is required.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Platform Authenticate Gateway.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(data);
    } catch (err) {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
        
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary-500">
            <FolderKanban size={36} />
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">CollabTask</span>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Workspace Login Portal
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                placeholder="developer@task.com"
                {...register('email')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 font-semibold">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-500 font-semibold">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md transition-all focus-ring"
          >
            {submitting ? 'Authenticating session...' : 'Sign In'}
          </button>
        </form>

        {/* Redirect */}
        <p className="text-center text-xs text-slate-500">
          No account setup?{' '}
          <Link href="/register" className="text-primary-500 font-bold hover:underline">
            Create an Account
          </Link>
        </p>

      </div>
    </div>
  );
}
