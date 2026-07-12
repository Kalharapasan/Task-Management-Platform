'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';

/**
 * LayoutWrapper Component.
 * 
 * Context:
 * Performs route gating on client mount. If an unauthorized analyst tries to bypass the UI,
 * this wrapper blocks rendering and forces a redirect to `/login`.
 * Excludes both `/login` and `/register` paths from sidebar layouts.
 */
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !isAuthRoute) {
        router.replace('/login');
      } else if (isAuthenticated && isAuthRoute) {
        router.replace('/dashboard');
      }
    }
  }, [loading, isAuthenticated, isAuthRoute, router]);

  // Render loading state screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading workspace credentials...</p>
      </div>
    );
  }

  // Hide children if redirecting
  if (!isAuthenticated && !isAuthRoute) {
    return null;
  }

  // Render auth screens standalone
  if (isAuthRoute) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content body */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
