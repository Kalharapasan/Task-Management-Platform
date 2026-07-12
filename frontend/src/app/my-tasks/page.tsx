'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, Task, TaskStatus } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import {
  CheckSquare,
  Calendar,
  AlertCircle,
  ArrowRight,
  Clock,
  Flag,
  Loader2,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_SECTIONS: { key: TaskStatus | 'all'; label: string; color: string }[] = [
  { key: 'in_progress', label: 'In Progress', color: 'border-sky-200 bg-sky-50' },
  { key: 'in_review', label: 'In Review', color: 'border-indigo-200 bg-indigo-50' },
  { key: 'todo', label: 'To Do', color: 'border-slate-200 bg-slate-50' },
  { key: 'done', label: 'Completed', color: 'border-emerald-200 bg-emerald-50' },
];

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-rose-100 text-rose-700 border-rose-200',
};

const STATUS_BADGE: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-sky-100 text-sky-700',
  in_review: 'bg-indigo-100 text-indigo-700',
  done: 'bg-emerald-100 text-emerald-700',
};

/**
 * My Tasks — Team Member Dashboard.
 * Lists all tasks assigned to the currently authenticated user.
 * Grouped by status with due-date highlighting.
 */
export default function MyTasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Fetch all projects to find assigned tasks
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: taskApi.getProjects,
    enabled: !!user,
  });

  // Fetch dashboard stats which includes assigned tasks for team_member
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats', user?.role],
    queryFn: taskApi.getDashboardStats,
    enabled: !!user && user.role === 'team_member',
  });

  const isLoading = isLoadingStats;

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      taskApi.updateTask(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      showToast('Task status updated.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to update status.', 'error'),
  });

  if (!user) return null;

  const allTasks: Task[] = stats?.tasks || [];

  const filteredTasks = allTasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  const isDueSoon = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  };

  const isOverdue = (dateStr: string) => new Date(dateStr).getTime() < Date.now();

  const totalPending = allTasks.filter((t) => t.status !== 'done').length;
  const totalDone = allTasks.filter((t) => t.status === 'done').length;
  const totalOverdue = allTasks.filter(
    (t) => t.dueDate && isOverdue(t.dueDate) && t.status !== 'done'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Tasks
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          All tasks assigned to you across all projects.
        </p>
      </div>

      {/* Stats Summary */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-slate-800">{totalPending}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Pending</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{totalDone}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Completed</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-rose-600">{totalOverdue}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Overdue</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Filter size={12} className="text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-semibold text-slate-600 bg-transparent border-none outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Flag size={12} className="text-slate-400" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs font-semibold text-slate-600 bg-transparent border-none outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allTasks.length === 0 && (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
          <CheckSquare size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-bold text-slate-600">No tasks assigned to you yet.</p>
          <p className="text-sm text-slate-400 mt-1">Check back later or ask your project manager.</p>
        </div>
      )}

      {/* Task Sections by Status */}
      {!isLoading && allTasks.length > 0 && (
        <div className="space-y-6">
          {STATUS_SECTIONS.filter((section) =>
            filterStatus === 'all' || filterStatus === section.key
          ).map((section) => {
            const sectionTasks = getTasksByStatus(section.key as TaskStatus);
            if (sectionTasks.length === 0) return null;
            return (
              <div key={section.key}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border mb-3 ${section.color}`}>
                  <span className="text-xs font-extrabold text-slate-700">{section.label}</span>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {sectionTasks.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {sectionTasks.map((task) => {
                    const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'done';
                    const dueSoon = task.dueDate && isDueSoon(task.dueDate) && task.status !== 'done';
                    return (
                      <div
                        key={task.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${PRIORITY_BADGE[task.priority]}`}>
                                {task.priority}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[task.status]}`}>
                                {STATUS_SECTIONS.find((s) => s.key === task.status)?.label || task.status}
                              </span>
                              {overdue && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
                                  <Clock size={10} /> Overdue
                                </span>
                              )}
                            </div>
                            <Link href={`/tasks/${task.id}`}>
                              <p className="text-sm font-bold text-slate-800 hover:text-primary-600 transition-colors">
                                {task.title}
                              </p>
                            </Link>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {/* Status dropdown for team members */}
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({ taskId: task.id, status: e.target.value as TaskStatus })
                              }
                              className="text-[10px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="in_review">In Review</option>
                              <option value="done">Done</option>
                            </select>
                            <Link
                              href={`/tasks/${task.id}`}
                              className="flex items-center gap-1 text-[10px] font-bold text-primary-500 hover:text-primary-700 transition-colors"
                            >
                              View details <ArrowRight size={10} />
                            </Link>
                          </div>
                        </div>

                        <div className={`flex items-center gap-1.5 mt-3 text-[10px] font-semibold ${
                          overdue ? 'text-rose-600' : dueSoon ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          <Calendar size={11} />
                          <span>
                            {overdue ? 'Overdue — ' : dueSoon ? 'Due soon — ' : 'Due: '}
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
