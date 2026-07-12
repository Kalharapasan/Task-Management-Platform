'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, User } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { 
  ChevronLeft, 
  FolderGit, 
  Users, 
  Calendar, 
  AlertCircle, 
  Plus, 
  Trash2, 
  KanbanSquare, 
  Lock 
} from 'lucide-react';
import Link from 'next/link';

/**
 * Project Detail & Roster View.
 * 
 * Context:
 * Exposes full project specs.
 * - Admin/Project Manager: Can add or remove team members from the project roster.
 * - Team Member: Read-only member roster.
 */
export default function ProjectDetail() {
  const { id: idStr } = useParams() as { id: string };
  const projectId = parseInt(idStr);
  
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

  // 1. Query Project (includes current members list)
  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: () => taskApi.getProject(projectId),
  });

  // 2. Query All Users (for adding new project members)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['usersRegistry'],
    queryFn: taskApi.getUsers,
    enabled: !!project && (user?.role === 'admin' || user?.role === 'project_manager'),
  });

  // 3. Member mutations
  const addMemberMutation = useMutation({
    mutationFn: (userId: number) => taskApi.addProjectMember(projectId, userId),
    onSuccess: (data) => {
      queryClient.setQueryData(['projectDetail', projectId], (prev: any) => ({
        ...prev,
        members: data.members,
      }));
      showToast('Team member added to project.', 'success');
      setSelectedUserId('');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to add member.', 'error');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => taskApi.removeProjectMember(projectId, userId),
    onSuccess: (data) => {
      queryClient.setQueryData(['projectDetail', projectId], (prev: any) => ({
        ...prev,
        members: data.members,
      }));
      showToast('Team member removed from project.', 'info');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to remove member.', 'error');
    },
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/3 skeleton-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-white border border-slate-200 rounded-xl skeleton-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl skeleton-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
        <AlertCircle size={18} />
        <span>Failed to locate project credentials. Return to dashboard.</span>
      </div>
    );
  }

  const canManageMembers = user.role === 'admin' || user.role === 'project_manager';

  // Filter out users who are already members
  const nonMemberUsers = allUsers.filter(
    (u) => !project.members.some((m) => m.id === u.id) && u.active !== false
  );

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    addMemberMutation.mutate(selectedUserId);
  };

  const handleRemoveMember = (userId: number, name: string) => {
    if (confirm(`Remove "${name}" from this project? they will lose access to associated tasks.`)) {
      removeMemberMutation.mutate(userId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'in_progress': return 'bg-sky-100 text-sky-800 border-sky-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link href="/projects" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all">
          <ChevronLeft size={16} />
          <span>Back to Projects</span>
        </Link>
        <Link
          href={`/projects/${project.id}/tasks`}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-xs font-bold rounded-lg hover:bg-primary-600 focus-ring shadow-sm transition-all"
        >
          <KanbanSquare size={16} />
          <span>View Kanban Task Board</span>
        </Link>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">ID: #{project.id}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{project.title}</h1>
        </div>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Detail card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Objective</h3>
              <p className="text-slate-700 text-sm mt-3 leading-relaxed whitespace-pre-line">{project.description}</p>
            </div>

            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Calendar size={18} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Launch Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Calendar size={18} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Deadline Target</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{new Date(project.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Members panel */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-primary-500" />
              <span>Project Members ({project.members.length})</span>
            </h3>

            {/* Add member form (Admin/PM only) */}
            {canManageMembers ? (
              <form onSubmit={handleAddMember} className="flex gap-2 border-b border-slate-100 pb-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus-ring bg-slate-50"
                >
                  <option value="">Choose team member...</option>
                  {nonMemberUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedUserId || addMemberMutation.isPending}
                  className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 focus-ring"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                <Lock size={12} />
                <span>Roster modification requires PM access.</span>
              </div>
            )}

            {/* Members Roster List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50/50 border border-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 uppercase">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{member.role.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {canManageMembers && member.id !== project.ownerId && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      disabled={removeMemberMutation.isPending}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-100 transition-all"
                      title="Remove Member"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
