'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
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
  Unlock 
} from 'lucide-react';
import Link from 'next/link';

/**
 * Task Detailed Auditing & Discussions.
 * 
 * Context:
 * - Admin/Project Manager: Can edit priority and status.
 * - Task Assignee: Can edit status only.
 * - Other users: Read-only access to values.
 * - Everyone: Can review and submit comments.
 */
export default function TaskDetail() {
  const { id: idStr } = useParams() as { id: string };
  const taskId = parseInt(idStr);

  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');

  // 1. Fetch Task Detail
  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['taskDetail', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  // 2. Fetch Task Comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => taskApi.getTaskComments(taskId),
  });

  // 3. Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: (data: { status?: TaskStatus; priority?: TaskPriority }) =>
      taskApi.updateTask(taskId, data),
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['taskDetail', taskId], (prev: any) => ({
        ...prev,
        ...updatedTask,
      }));
      queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
      showToast('Task settings updated.', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update task settings.', 'error');
    },
  });

  // 4. Create Comment Mutation
  const postCommentMutation = useMutation({
    mutationFn: (content: string) => taskApi.createTaskComment(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      setCommentText('');
      showToast('Comment posted.', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to post comment.', 'error');
    },
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/4 skeleton-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white border border-slate-200 rounded-xl skeleton-pulse" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl skeleton-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
        <AlertCircle size={18} />
        <span>Failed to locate task. Return to project boards.</span>
      </div>
    );
  }

  // Permission Gating Logic
  const isOwnerOrPM = user.role === 'admin' || user.role === 'project_manager';
  const isAssignee = user.id === task.assigneeId;

  const canEditPriority = isOwnerOrPM;
  const canEditStatus = isOwnerOrPM || isAssignee;

  const handleStatusChange = (status: TaskStatus) => {
    updateTaskMutation.mutate({ status });
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    updateTaskMutation.mutate({ priority });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    postCommentMutation.mutate(commentText);
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={`/projects/${task.projectId}/tasks`}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
        >
          <ChevronLeft size={16} />
          <span>Back to Kanban Board</span>
        </Link>
      </div>

      {/* Header title */}
      <div className="border-b border-slate-200 pb-5">
        <span className="text-[10px] text-slate-400 font-bold uppercase">Task ID: #{task.id}</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{task.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: DESCRIPTION & PERMISSION-GATED SELECTORS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Details details */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h3>
              <p className="text-slate-700 text-sm mt-3 leading-relaxed">
                {task.description || 'No description provided for this task.'}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Status Select controls */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <span>Task Status</span>
                  {!canEditStatus && <Lock size={11} className="text-slate-400" />}
                </label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={!canEditStatus || updateTaskMutation.isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50 disabled:opacity-75 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              {/* Priority Select controls */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <span>Priority Tier</span>
                  {!canEditPriority && <Lock size={11} className="text-slate-400" />}
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  disabled={!canEditPriority || updateTaskMutation.isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50 disabled:opacity-75 disabled:cursor-not-allowed font-semibold"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            {/* Information card footer */}
            <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 font-semibold">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-slate-400" />
                <span>Due Date Target: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center uppercase text-[10px] border border-primary-200">
                  {task.assignee?.name.charAt(0)}
                </div>
                <span>Assigned to: {task.assignee?.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DISCUSSION BOARD / COMMENTS */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-[500px]">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-4 border-b border-slate-100 flex-shrink-0">
              <MessageSquare size={18} className="text-primary-500" />
              <span>Comments ({comments.length})</span>
            </h3>

            {/* Scrollable comments stream */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {isCommentsLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-1/4 skeleton-pulse" />
                    <div className="h-10 w-full skeleton-pulse" />
                  </div>
                ))
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <p>No comments logged yet.</p>
                  <p className="mt-0.5">Start the discussion below.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                        <span className="text-slate-800 font-bold">{comment.author?.name}</span>
                        <span>{new Date(comment.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-medium">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission input */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 border-t border-slate-100 pt-4 flex-shrink-0">
              <input
                type="text"
                placeholder="Write a message..."
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
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
