'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, Task, TaskStatus, TaskPriority, User } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  Plus,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
  X,
  ArrowRight,
  Trash2,
  User as UserIcon,
  Flag,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

// Zod validation for Task Creation
const taskSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeId: z.string().min(1, { message: 'Please select an assignee.' }),
  dueDate: z.string().min(1, { message: 'Please specify a due date.' }),
});
type TaskFormValues = z.infer<typeof taskSchema>;

const STATUS_COLUMNS: { key: TaskStatus; label: string; headerBg: string; cardBg: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', headerBg: 'bg-slate-100 border-slate-200', cardBg: 'bg-white', dot: 'bg-slate-400' },
  { key: 'in_progress', label: 'In Progress', headerBg: 'bg-sky-50 border-sky-200', cardBg: 'bg-white', dot: 'bg-sky-500' },
  { key: 'in_review', label: 'In Review', headerBg: 'bg-indigo-50 border-indigo-200', cardBg: 'bg-white', dot: 'bg-indigo-500' },
  { key: 'done', label: 'Done', headerBg: 'bg-emerald-50 border-emerald-200', cardBg: 'bg-white', dot: 'bg-emerald-500' },
];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-rose-100 text-rose-700 border-rose-200',
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

/**
 * Project Kanban Task Board.
 * Four status columns with per-card dropdown status transitions.
 * Create Task modal for admin/PM roles.
 * Filter by assignee and priority.
 */
export default function KanbanBoard() {
  const { id: idStr } = useParams() as { id: string };
  const projectId = parseInt(idStr);

  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<number | null>(null);

  const { data: project } = useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: () => taskApi.getProject(projectId),
  });

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => taskApi.getProjectTasks(projectId),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['usersRegistry'],
    queryFn: taskApi.getUsers,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium' },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: Omit<Task, 'id' | 'projectId'>) =>
      taskApi.createProjectTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
      showToast('Task added to project.', 'success');
      reset();
      setIsModalOpen(false);
    },
    onError: (err: any) => showToast(err.message || 'Failed to create task.', 'error'),
  });

  // Status update mutation (optimistic)
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      taskApi.updateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['projectTasks', projectId] });
      const prev = queryClient.getQueryData<Task[]>(['projectTasks', projectId]);
      queryClient.setQueryData<Task[]>(['projectTasks', projectId], (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['projectTasks', projectId], ctx.prev);
      showToast('Failed to update status.', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => taskApi.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
      showToast('Task deleted.', 'info');
      setConfirmDeleteTaskId(null);
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete task.', 'error'),
  });

  const isAdminOrPM = user?.role === 'admin' || user?.role === 'project_manager';

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterAssignee !== 'all' && String(t.assigneeId) !== filterAssignee) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterAssignee, filterPriority]);

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  const getAssigneeName = (assigneeId: number) =>
    allUsers.find((u) => u.id === assigneeId)?.name || `User #${assigneeId}`;

  const isDueSoon = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  };

  const isOverdue = (dateStr: string) => new Date(dateStr).getTime() < Date.now();

  const onSubmit = (data: TaskFormValues) => {
    createTaskMutation.mutate({
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      status: 'todo',
      assigneeId: parseInt(data.assigneeId),
      dueDate: data.dueDate,
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all mb-2"
          >
            <ChevronLeft size={15} />
            <span>Project Overview</span>
          </Link>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {project?.title || 'Kanban Board'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{filteredTasks.length} tasks total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <SlidersHorizontal size={12} className="text-slate-400" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-xs font-semibold text-slate-600 bg-transparent border-none outline-none"
            >
              <option value="all">All Assignees</option>
              {allUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
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
          {isAdminOrPM && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
            >
              <Plus size={14} />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary-400" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          Failed to load tasks. Please try again.
        </div>
      )}

      {/* Kanban Board */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const columnTasks = getTasksByStatus(col.key);
            return (
              <div key={col.key} className="flex flex-col gap-3">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-extrabold text-slate-700">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div className="flex flex-col gap-2.5 min-h-[80px]">
                  {columnTasks.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl py-6 text-center text-xs text-slate-400 font-semibold">
                      No tasks here
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const overdue = isOverdue(task.dueDate) && task.status !== 'done';
                      const dueSoon = isDueSoon(task.dueDate) && task.status !== 'done';
                      return (
                        <div
                          key={task.id}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
                        >
                          {/* Priority Badge */}
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${PRIORITY_BADGE[task.priority]}`}>
                              {task.priority}
                            </span>
                            {isAdminOrPM && (
                              confirmDeleteTaskId === task.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                    className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-500 text-white rounded"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteTaskId(null)}
                                    className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteTaskId(task.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </div>

                          {/* Title */}
                          <Link href={`/tasks/${task.id}`}>
                            <p className="text-sm font-bold text-slate-800 hover:text-primary-600 transition-colors leading-snug line-clamp-2">
                              {task.title}
                            </p>
                          </Link>

                          {/* Due Date */}
                          <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${
                            overdue ? 'text-rose-600' : dueSoon ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            <Calendar size={10} />
                            <span>
                              {overdue ? 'Overdue: ' : dueSoon ? 'Due soon: ' : ''}
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Assignee + Status Dropdown */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                              <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-[9px] uppercase border border-primary-200">
                                {getAssigneeName(task.assigneeId).charAt(0)}
                              </div>
                              <span className="truncate max-w-[80px]">{getAssigneeName(task.assigneeId)}</span>
                            </div>

                            {/* Status change dropdown */}
                            {(isAdminOrPM || user.id === task.assigneeId) ? (
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  updateStatusMutation.mutate({ taskId: task.id, status: e.target.value as TaskStatus })
                                }
                                className="text-[10px] font-bold border border-slate-200 rounded-lg px-1.5 py-1 bg-slate-50 outline-none focus:ring-1 focus:ring-primary-400 cursor-pointer"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            ) : (
                              <Link href={`/tasks/${task.id}`} className="flex items-center gap-1 text-[10px] font-bold text-primary-500 hover:text-primary-700">
                                View <ArrowRight size={10} />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-800">Add New Task</h2>
              <button
                onClick={() => { setIsModalOpen(false); reset(); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Task Title *</label>
                <input
                  {...register('title')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                  placeholder="Enter task title..."
                />
                {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring resize-none"
                  placeholder="Describe what needs to be done..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Priority</label>
                  <select {...register('priority')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Due Date *</label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
                  />
                  {errors.dueDate && <p className="text-rose-500 text-xs mt-1">{errors.dueDate.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assign To *</label>
                <select {...register('assigneeId')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50">
                  <option value="">Select assignee...</option>
                  {(project?.members || allUsers).map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </select>
                {errors.assigneeId && <p className="text-rose-500 text-xs mt-1">{errors.assigneeId.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {createTaskMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
