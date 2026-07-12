'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  FolderGit, 
  CheckSquare, 
  Calendar, 
  AlertCircle, 
  PlusCircle, 
  ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

/**
 * Role-Aware Main Dashboard Page.
 * 
 * Context:
 * Adjusts layout dynamically:
 * - Admin: Global statistics (system user and project sizes).
 * - Project Manager: Active project counts, team members count, and task totals.
 * - Team Member: List of assigned tasks with clear due dates.
 */
export default function Dashboard() {
  const { user } = useAuth();

  // Fetch role-specific statistics and tasks
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats', user?.role],
    queryFn: taskApi.getDashboardStats,
    enabled: !!user,
  });

  if (!user) return null;

  const isDueSoon = (dateStr: string) => {
    const dueDate = new Date(dateStr);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-100 text-emerald-800';
      case 'in_review': return 'bg-indigo-100 text-indigo-800';
      case 'in_progress': return 'bg-sky-100 text-sky-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome back, {user.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Here is what is happening across your workspaces today.
        </p>
      </div>

      {isLoading ? (
        // Loading state skeletons
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div className="h-4 w-1/3 skeleton-pulse" />
                <div className="h-8 w-2/3 skeleton-pulse" />
              </div>
            ))}
          </div>
          {user.role === 'team_member' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="h-6 w-1/4 skeleton-pulse" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 w-full skeleton-pulse" />
              ))}
            </div>
          )}
        </div>
      ) : isError || !stats ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>Failed to load dashboard workspace metrics. Verify your API backend connection.</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ==========================================
              ADMIN DASHBOARD VIEW
              ========================================== */}
          {user.role === 'admin' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stat Card 1 */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total System Users</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalUsers}</p>
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <FolderGit size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Projects</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalProjects}</p>
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks Audited</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalTasks}</p>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              PROJECT MANAGER DASHBOARD VIEW
              ========================================== */}
          {user.role === 'project_manager' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stat Card 1 */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                  <FolderGit size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Managed Projects</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.myProjectsCount}</p>
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Tasks Queue</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.activeTasksCount}</p>
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Directory</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.teamMembersCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              DEVELOPER / TEAM MEMBER DASHBOARD VIEW
              ========================================== */}
          {user.role === 'team_member' && (
            <div className="space-y-6">
              {/* Key numbers grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Assigned Tasks</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.assignedTasksCount}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Action</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pendingTasksCount}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.completedTasksCount}</p>
                </div>
              </div>

              {/* Assigned Tasks Detail Roster */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">My Task Roster</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Tasks explicitly assigned to your email credentials</p>
                </div>

                {!stats.tasks || stats.tasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <CheckSquare className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-sm font-semibold">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-0.5">No tasks are currently assigned to you.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {stats.tasks.map((task) => (
                      <div key={task.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                          <Link href={`/tasks/${task.id}`} className="block text-sm font-bold text-slate-800 hover:text-primary-500 transition-all">
                            {task.title}
                          </Link>
                          <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0 text-slate-500">
                          {/* Calendar due alerts */}
                          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                            isDueSoon(task.dueDate) && task.status !== 'done'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : 'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            <Calendar size={14} />
                            <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                          
                          <Link href={`/tasks/${task.id}`} className="text-slate-400 hover:text-primary-500 p-1">
                            <ArrowRight size={18} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
