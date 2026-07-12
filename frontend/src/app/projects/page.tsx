'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, Project } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/app/providers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FolderGit, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Calendar, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  FolderOpen 
} from 'lucide-react';
import Link from 'next/link';

// ==========================================================================
// ZOD VALIDATION SCHEMA (Project Management)
// ==========================================================================
const projectSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().min(5, { message: 'Description must be at least 5 characters.' }),
  status: z.enum(['todo', 'in_progress', 'done']),
  dueDate: z.string().min(1, { message: 'Please select a due date.' }),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

/**
 * Projects Listing & Creation Page.
 * 
 * Context:
 * Exposes project boards.
 * - Admin/Project Manager: Can trigger modals to add/edit projects, and delete them.
 * - Team Member: Can view list of projects they belong to.
 */
export default function ProjectsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Search, Filter, Sort, Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal and Editing states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
  });

  // 1. Query Projects
  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projectsList'],
    queryFn: taskApi.getProjects,
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: taskApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectsList'] });
      showToast('Project created successfully.', 'success');
      closeModal();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create project.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) =>
      taskApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectsList'] });
      showToast('Project updated successfully.', 'success');
      closeModal();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update project.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: taskApi.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectsList'] });
      showToast('Project deleted and tasks flushed.', 'info');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete project.', 'error');
    },
  });

  const canManageProjects = user?.role === 'admin' || user?.role === 'project_manager';

  // Filter projects list
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const matchesSearch =
          project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' || project.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
  }, [projects, searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage]);

  const openCreateModal = () => {
    setEditingProject(null);
    reset({ title: '', description: '', status: 'todo', dueDate: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.preventDefault(); // Prevents card navigation click
    setEditingProject(project);
    reset({
      title: project.title,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevents card navigation click
    if (confirm('Are you sure you want to permanently delete this project? This will flush all associated tasks and milestones.')) {
      deleteMutation.mutate(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const onSubmit = (values: ProjectFormValues) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: values });
    } else {
      createMutation.mutate(values);
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Project Board</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, monitor, and configure client software projects</p>
        </div>
        {canManageProjects && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-600 focus-ring transition-all"
          >
            <Plus size={16} />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* FILTER CONTROL CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search project title or description..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus-ring bg-slate-50/50"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['all', 'todo', 'in_progress', 'done'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                statusFilter === status
                  ? 'bg-primary-50 text-primary-500 border-primary-100'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* PROJECTS GRID LIST */}
      {isLoading ? (
        // Grid Loading Skeletons
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="h-5 w-2/3 skeleton-pulse" />
              <div className="h-12 w-full skeleton-pulse" />
              <div className="h-4 w-1/2 skeleton-pulse" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>Failed to load projects. Verify connection to the API proxy database.</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <FolderOpen className="mx-auto text-slate-300 mb-3 animate-pulse" size={40} />
          <p className="text-base font-bold text-slate-700">No projects match your filter</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search filters or create a new project board.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  {/* Action buttons (Admin/PM only) */}
                  {canManageProjects && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditModal(project, e)}
                        className="p-1.5 text-slate-400 hover:text-primary-500 rounded hover:bg-slate-100"
                        title="Edit Project"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100"
                        title="Delete Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-800 group-hover:text-primary-500 transition-colors truncate">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Due Date Footer */}
              <div className="border-t border-slate-100 mt-4 pt-4 flex items-center gap-2 text-slate-500 text-xs">
                <Calendar size={14} />
                <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* PAGINATION PANEL */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-500">
            Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredProjects.length} total boards)
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="flex items-center justify-center p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="flex items-center justify-center p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl p-6 relative animate-zoom">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingProject ? 'Edit Project Settings' : 'Create New Project Board'}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Client App"
                  {...register('title')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                />
                {errors.title && <p className="text-xs text-rose-500 font-semibold">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Project Description</label>
                <textarea
                  placeholder="Describe project deliverables..."
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring"
                />
                {errors.description && <p className="text-xs text-rose-500 font-semibold">{errors.description.message}</p>}
              </div>

              {/* Status & Date grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Current Status</label>
                  <select {...register('status')} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus-ring">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
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

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-600 focus-ring transition-all"
                >
                  {editingProject ? 'Save Changes' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
