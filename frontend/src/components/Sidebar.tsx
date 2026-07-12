'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  FolderKanban, 
  LayoutDashboard, 
  Users, 
  FolderGit, 
  FileBarChart, 
  Settings, 
  PlusCircle, 
  Briefcase, 
  CheckSquare, 
  LogOut, 
  User 
} from 'lucide-react';

/**
 * Sidebar / Bottom Navigation Component.
 * 
 * Context:
 * Employs responsive design:
 * 1. Desktop (>= 768px): Sidebar anchored to the left.
 * 2. Mobile (< 768px): Collapses into a persistent bottom navigation bar.
 * Gated links based on role types: admin, project_manager, team_member.
 */
export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isActive = (path: string) => pathname === path;

  // Define navigation items dynamically per role
  const getNavLinks = () => {
    switch (user.role) {
      case 'admin':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/admin/users', label: 'Users', icon: Users },
          { href: '/projects', label: 'Projects', icon: FolderGit },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      case 'project_manager':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/projects', label: 'My Projects', icon: Briefcase },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      case 'team_member':
      default:
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
          { href: '/projects', label: 'My Projects', icon: Briefcase },
          { href: '/profile', label: 'Profile', icon: User },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* DESKTOP SIDEBAR - Anchored Left */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-30">
        {/* Branding header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <FolderKanban className="text-primary-500" size={24} />
          <span className="text-lg font-bold text-slate-800 tracking-tight">CollabTask</span>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-500 font-bold flex items-center justify-center border border-primary-200 uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate" title={user.name}>{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  active 
                    ? 'bg-primary-50 text-primary-500' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Session */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50/50 transition-all"
          >
            <LogOut size={18} />
            <span>Secure Log Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR - collapses below 768px */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 justify-around items-center z-40 px-2 shadow-lg">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-bold ${
                active ? 'text-primary-500' : 'text-slate-500'
              }`}
            >
              <Icon size={20} className={active ? 'text-primary-500' : 'text-slate-400'} />
              <span>{link.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-bold text-rose-600"
          aria-label="Secure log out"
        >
          <LogOut size={20} className="text-rose-500" />
          <span>Log Out</span>
        </button>
      </nav>
    </>
  );
}
