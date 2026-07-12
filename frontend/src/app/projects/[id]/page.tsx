'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, User } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import {
  ChevronLeft,
  FolderKanban,
  Users,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  KanbanSquare,
  Pencil,
  X,
  CheckCircle,
  Clock,
  PauseCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const editProjectSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  dueDate: z.string().min(1, { message: 'Due date is required.' }),
});
type EditProjectForm = z.infer<typeof editProjectSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  todo: { label: 'Planning', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Clock size={13} /> },
  in_progress: { label: 'Active', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <KanbanSquare size={13} /> },
  done: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={13} /> },
  on_hold: { label: 'On Hold', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <PauseCircle size={13} /> },
};

/**
 * Project Detail & Roster View.
 * Shows project description, status, dates, and member roster.
 * Admin/PM: can add/remove members, edit project details.
 * Team Member: read-only view.
 */
export default function ProjectDetail() {
  const { id: idStr } = useParams() as { id: string };
  const projectId = parseInt(idStr);
  const router = useRouter();

  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // 1. Query Project
  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: () => taskApi.getProject(projectId),
  });

  // 2. Query All Users for member picker
  const { data: allUsers = [] } = useQuery({
    queryKey: ['usersRegistry'],
    queryFn: taskApi.getUsers,
    enabled: !!project && (user?.role === 'admin' || user?.role === 'project_manager'),
  });

  // Edit form
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditProjectForm>({ resolver: zodResolver(editProjectSchema) });

  // 3. Mutations
  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<typeof project>) => taskApi.updateProject(projectId, data as any),
    onSuccess: (updated) => {
      queryClient.setQueryData(['projectDetail', projectId], (prev: any) => ({ ...prev, ...updated }));
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('Project updated successfully.', 'success');
      setIsEditModalOpen(false);
    },
    onError: (err: any) => showToast(err.message || 'Failed to update project.', 'error'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => taskApi.addProjectMember(projectId, userId),
    onSuccess: (data) => {
      queryClient.setQueryData(['projectDetail', projectId], (prev: any) => ({ ...prev, members: data.members }));
      showToast('Team member added to project.', 'success');
      setSelectedUserId('');
    },
    onError: (err: any) => showToast(err.message || 'Failed to add member.', 'error'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => taskApi.removeProjectMember(projectId, userId),
    onSuccess: (data) => {
      queryClient.setQueryData(['projectDetail', projectId], (prev: any) => ({ ...prev, members: data.members }));
      showToast('Team member removed.', 'info');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => showToast(err.message || 'Failed to remove member.', 'error'),
  });

  const isAdminOrPM = user?.role === 'admin' || user?.role === 'project_manager';

  const openEditModal = () => {
    if (!project) return;
    resetEdit({
      title: project.title,
      description: project.description || '',
      status: (project.status as any) || 'todo',
      dueDate: project.dueDate || '',
    });
    setIsEditModalOpen(true);
  };

  const nonMembers = allUsers.filter(
    (u) => !project?.members?.some((m) => m.id === u.id)
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-white border border-slate-200 rounded-2xl" />
          <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
        <AlertCircle size={18} />
        <span>Project not found. It may have been deleted or you lack access.</span>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG['todo'];

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
        >
          <ChevronLeft size={16} />
          <span>All Projects</span>
        </Link>
        {isAdminOrPM && (
          <button
            onClick={openEditModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Pencil size={13} />
            Edit Project
          </button>
        )}
      </div>

      {/* Project Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0">
              <FolderKanban size={22} className="text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">{project.title}</h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {project.description || 'No description provided for this project.'}
              </p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}</span>
            </div>
          </div>
          <Link
            href={`/projects/${projectId}/tasks`}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <KanbanSquare size={14} />
            Open Kanban Board
          </Link>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-primary-500" />
            Team Members
            <span className="ml-1 text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {project.members?.length || 0}
            </span>
          </h2>
        </div>

        {/* Member Add Row — PM/Admin only */}
        {isAdminOrPM && nonMembers.length > 0 && (
          <div className="mb-5 flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : '')}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50 font-medium"
            >
              <option value="">Select a user to add...</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedUserId && addMemberMutation.mutate(selectedUserId as number)}
              disabled={!selectedUserId || addMemberMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        )}

        {/* Members List */}
        {!project.members || project.members.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <Users size={28} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold">No team members assigned yet.</p>
            {isAdminOrPM && <p className="text-xs mt-0.5">Use the selector above to add team members.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center text-sm border border-primary-200 uppercase flex-shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{member.role.replace('_', ' ')}</p>
                  </div>
                </div>
                {isAdminOrPM && (
                  <>
                    {confirmDeleteId === member.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                          className="px-2 py-1 bg-rose-500 text-white rounded text-[10px] font-bold hover:bg-rose-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(member.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Remove from project"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-800">Edit Project</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form
              onSubmit={handleEditSubmit((data) => updateProjectMutation.mutate(data as any))}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Project Name</label>
                <input
                  {...registerEdit('title')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                  placeholder="Enter project name..."
                />
                {editErrors.title && <p className="text-rose-500 text-xs mt-1">{editErrors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                <textarea
                  {...registerEdit('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring resize-none"
                  placeholder="Project description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status</label>
                  <select {...registerEdit('status')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50">
                    <option value="todo">Planning</option>
                    <option value="in_progress">Active</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    {...registerEdit('dueDate')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50"
                  />
                  {editErrors.dueDate && <p className="text-rose-500 text-xs mt-1">{editErrors.dueDate.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProjectMutation.isPending}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
