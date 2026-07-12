'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, TaskStatus, TaskPriority } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import {
  ChevronLeft,
  Calendar,
  MessageSquare,
  AlertCircle,
  Send,
  Lock,
  Trash2,
  Loader2,
  Flag,
  User as UserIcon,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-rose-100 text-rose-700 border-rose-200',
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-sky-100 text-sky-700',
  in_review: 'bg-indigo-100 text-indigo-700',
  done: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

/**
 * Task Detail — Description, Status/Priority controls, and Comment Thread.
 * - Admin/PM: Can edit priority and status, delete task.
 * - Assignee: Can update status only.
 * - All users: Can read and post comments.
 */
export default function TaskDetail() {
  const { id: idStr } = useParams() as { id: string };
  const taskId = parseInt(idStr);
  const router = useRouter();

  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch Task Detail
  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['taskDetail', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  // Fetch Task Comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => taskApi.getTaskComments(taskId),
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: (data: { status?: TaskStatus; priority?: TaskPriority }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['taskDetail', taskId], (prev: any) => ({ ...prev, ...updatedTask }));
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      showToast('Task updated successfully.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to update task.', 'error'),
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: () => taskApi.deleteTask(taskId),
    onSuccess: () => {
      showToast('Task deleted.', 'info');
      if (task?.projectId) {
        router.push(`/projects/${task.projectId}/tasks`);
      } else {
        router.push('/projects');
      }
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete task.', 'error'),
  });

  // Post Comment Mutation
  const postCommentMutation = useMutation({
    mutationFn: (content: string) => taskApi.createTaskComment(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      setCommentText('');
      showToast('Comment posted.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to post comment.', 'error'),
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-1/4 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white border border-slate-200 rounded-2xl" />
          <div className="h-72 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
        <AlertCircle size={18} />
        <span>Task not found. It may have been deleted or you may not have access.</span>
      </div>
    );
  }

  const isAdminOrPM = user.role === 'admin' || user.role === 'project_manager';
  const isAssignee = user.id === task.assigneeId;
  const canEditStatus = isAdminOrPM || isAssignee;
  const canEditPriority = isAdminOrPM;
  const canDelete = isAdminOrPM;

  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'done';

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={task.projectId ? `/projects/${task.projectId}/tasks` : '/projects'}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
        >
          <ChevronLeft size={16} />
          <span>Back to Kanban Board</span>
        </Link>
        {canDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <span className="text-xs text-rose-700 font-semibold">Delete this task?</span>
              <button
                onClick={() => deleteTaskMutation.mutate()}
                disabled={deleteTaskMutation.isPending}
                className="text-xs font-bold px-2.5 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {deleteTaskMutation.isPending ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all"
            >
              <Trash2 size={13} />
              Delete Task
            </button>
          )
        )}
      </div>

      {/* Page header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Task #{task.id}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          {isOverdue && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
              <Clock size={10} /> Overdue
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{task.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Description + Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-slate-700 text-sm leading-relaxed">
                {task.description || 'No description provided for this task.'}
              </p>
            </div>

            {/* Status + Priority Controls */}
            <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase">
                  Status
                  {!canEditStatus && <Lock size={11} className="text-slate-400" />}
                </label>
                <select
                  value={task.status}
                  onChange={(e) => updateTaskMutation.mutate({ status: e.target.value as TaskStatus })}
                  disabled={!canEditStatus || updateTaskMutation.isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-600 uppercase">
                  Priority
                  {!canEditPriority && <Lock size={11} className="text-slate-400" />}
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => updateTaskMutation.mutate({ priority: e.target.value as TaskPriority })}
                  disabled={!canEditPriority || updateTaskMutation.isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            {/* Meta: Due date + Assignee */}
            <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-slate-400" />
                <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                  Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center uppercase text-[10px] border border-primary-200">
                  {task.assignee?.name?.charAt(0) || '?'}
                </div>
                <span>Assigned to: {task.assignee?.name || `User #${task.assigneeId}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Comment Thread */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[520px]">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-4 border-b border-slate-100 flex-shrink-0">
            <MessageSquare size={16} className="text-primary-500" />
            Comments
            <span className="ml-auto text-xs font-bold text-slate-400">{comments.length}</span>
          </h3>

          {/* Scrollable comments list */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {isCommentsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-1.5 animate-pulse">
                  <div className="h-3 w-1/4 bg-slate-200 rounded" />
                  <div className="h-10 w-full bg-slate-100 rounded-lg" />
                </div>
              ))
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No comments yet.</p>
                <p className="text-xs mt-0.5">Start the discussion below.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-[9px] uppercase border border-primary-200">
                        {comment.author?.name?.charAt(0) || '?'}
                      </div>
                      <span className="font-bold text-slate-800">{comment.author?.name || 'Unknown'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(comment.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-6">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentText.trim()) return;
              postCommentMutation.mutate(commentText);
            }}
            className="flex gap-2 border-t border-slate-100 pt-3 flex-shrink-0"
          >
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus-ring bg-slate-50"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || postCommentMutation.isPending}
              className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus-ring transition-all disabled:opacity-50 flex items-center justify-center"
              aria-label="Post comment"
            >
              {postCommentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
