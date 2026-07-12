'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderKanban, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

// Schema: Onboarding credentials checks
const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'A valid email address is required.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter.' })
    .regex(/[a-z]/, { message: 'Must contain at least one lowercase letter.' })
    .regex(/[0-9]/, { message: 'Must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character.' }),
  password_confirmation: z.string().min(1, { message: 'Confirmation password is required.' }),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords do not match.',
  path: ['password_confirmation'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Platform Onboarding / Registration Gateway.
 * 
 * Context:
 * Validates new profiles before forwarding registers to the BFF proxy.
 * Successful registrations default to the `team_member` role type in mock modes.
 */
export default function RegisterPage() {
  const { registerUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
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
            Create Onboarding Profile
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="John Doe"
                {...register('name')}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
              />
            </div>
            {errors.name && <p className="text-xs text-rose-500 font-semibold">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                placeholder="developer@task.com"
                {...register('email')}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
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
                className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
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

          {/* Password Confirmation */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password_confirmation')}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
              />
            </div>
            {errors.password_confirmation && (
              <p className="text-xs text-rose-500 font-semibold">{errors.password_confirmation.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md transition-all focus-ring"
          >
            {submitting ? 'Registering details...' : 'Create Account'}
          </button>
        </form>

        {/* Redirect */}
        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-500 font-bold hover:underline">
            Log In
          </Link>
        </p>

      </div>
    </div>
  );
}
