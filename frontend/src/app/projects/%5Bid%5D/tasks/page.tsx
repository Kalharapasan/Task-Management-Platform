'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, Task, TaskStatus, TaskPriority } from '@/lib/api-client';
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
  CheckSquare 
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

const STATUS_COLUMNS: { key: TaskStatus; label: string; bg: string; text: string }[] = [
  { key: 'todo', label: 'To Do', bg: 'bg-slate-100/80', text: 'text-slate-800' },
  { key: 'in_progress', label: 'In Progress', bg: 'bg-sky-50/60', text: 'text-sky-800' },
  { key: 'in_review', label: 'In Review', bg: 'bg-indigo-50/60', text: 'text-indigo-800' },
  { key: 'done', label: 'Completed', bg: 'bg-emerald-50/60', text: 'text-emerald-800' },
];

/**
 * Project Kanban Task Board.
 * 
 * Context:
 * Features a visual column layout (Todo, In Progress, In Review, Done).
 * Implements React Query Optimistic Updates during status alterations to ensure
 * instantaneous card movement before database confirmations are resolved.
 */
export default function KanbanBoard() {
  const { id: idStr } = useParams() as { id: string };
  const projectId = parseInt(idStr);

  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Filters and Modals states
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Query Project Metadata
  const { data: project } = useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: () => taskApi.getProject(projectId),
  });

  // 2. Query Project Tasks
  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => taskApi.getProjectTasks(projectId),
  });

  // 3. Form initialization
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium' }
  });

  // 4. Mutation for Creating Tasks
  const createTaskMutation = useMutation({
    mutationFn: (data: Omit<Task, 'id' | 'projectId'>) => 
      taskApi.createProjectTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
      showToast('Task added to project backlog.', 'success');
      closeTaskModal();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create task.', 'error');
    },
  });

  // 5. Mutation for Task Status Transitions (Optimistic Updates)
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      taskApi.updateTask(taskId, { status }),
    
    // Core Optimistic Update Handlers
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['projectTasks', projectId] });

      // Snapshot cached tasks
      const previousTasks = queryClient.getQueryData<Task[]>(['projectTasks', projectId]);

      // Optimistically modify the task's status
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          ['projectTasks', projectId],
          previousTasks.map((t) => (t.id === taskId ? { ...t, status } : t))
        );
      }

      // Return context snapshot to rollback on error
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback cache if mutation fails
      if (context?.previousTasks) {
        queryClient.setQueryData(['projectTasks', projectId], context.previousTasks);
      }
      showToast('Failed to change task status.', 'error');
    },
    onSuccess: () => {
      showToast('Task status updated.', 'success');
    },
    onSettled: () => {
      // Refetch from server to confirm sync
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
    },
  });

  const canManageTasks = user?.role === 'admin' || user?.role === 'project_manager';

  // Apply filters locally
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesAssignee =
        filterAssignee === 'all' || t.assigneeId === parseInt(filterAssignee);
      const matchesPriority =
        filterPriority === 'all' || t.priority === filterPriority;
      return matchesAssignee && matchesPriority;
    });
  }, [tasks, filterAssignee, filterPriority]);

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    updateStatusMutation.mutate({ taskId, status: newStatus });
  };

  const openCreateModal = () => {
    reset({ title: '', description: '', priority: 'medium', assigneeId: '', dueDate: '' });
    setIsModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsModalOpen(false);
  };

  const onSubmit = (values: TaskFormValues) => {
    createTaskMutation.mutate({
      title: values.title,
      description: values.description || '',
      priority: values.priority,
      status: 'todo',
      assigneeId: Number(values.assigneeId),
      dueDate: values.dueDate,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
          >
            <ChevronLeft size={16} />
            <span>Back to Project Detail</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {project?.title ? `${project.title} Tasks` : 'Kanban Board'}
          </h1>
        </div>

        {canManageTasks && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-600 focus-ring transition-all"
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* FILTER CONTROL CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold flex-shrink-0">
          <SlidersHorizontal size={16} />
          <span>Filters:</span>
        </div>

        {/* Assignee select */}
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus-ring bg-slate-50 w-full sm:w-44"
        >
          <option value="all">All Assignees</option>
          {project?.members?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Priority select */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs focus-ring bg-slate-50 w-full sm:w-44"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
      </div>

      {/* KANBAN GRID COLUMNS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-xl p-4 h-96 skeleton-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>Failed to load project backlog. Connect database.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            
            return (
              <div key={col.key} className={`rounded-xl border border-slate-200/60 p-4 flex flex-col gap-3 min-h-[500px] ${col.bg}`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/40">
                  <h3 className={`text-sm font-extrabold ${col.text}`}>{col.label}</h3>
                  <span className="text-[10px] font-bold bg-white text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                {colTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                    <CheckSquare size={18} className="mb-1" />
                    <span>Backlog Empty</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {colTasks.map((task) => (
                      <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <Link href={`/tasks/${task.id}`} className="text-slate-400 hover:text-primary-500 p-0.5" title="View details">
                            <ArrowRight size={14} />
                          </Link>
                        </div>

                        <Link href={`/tasks/${task.id}`} className="block text-xs font-bold text-slate-800 hover:text-primary-500 transition-colors">
                          {task.title}
                        </Link>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1 font-semibold">
                            <Calendar size={12} />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          
                          {/* Quick Status Control Dropdown */}
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-bold focus-ring text-slate-600 cursor-pointer"
                          >
                            <option value="todo">Todo</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-zoom">
            <button onClick={closeTaskModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Backlog Task</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Code auth proxies"
                  {...register('title')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                />
                {errors.title && <p className="text-xs text-rose-500 font-semibold">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Task Description</label>
                <textarea
                  placeholder="Provide details about task objective..."
                  {...register('description')}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                />
              </div>

              {/* Priority & Assignee & Date */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Priority</label>
                    <select {...register('priority')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Due Date</label>
                    <input
                      type="date"
                      {...register('dueDate')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                    />
                    {errors.dueDate && <p className="text-xs text-rose-500 font-semibold">{errors.dueDate.message}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Assignee</label>
                  <select {...register('assigneeId')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring">
                    <option value="">Choose team member...</option>
                    {project?.members?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {errors.assigneeId && <p className="text-xs text-rose-500 font-semibold">{errors.assigneeId.message}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-600 focus-ring transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
