/**
 * API Client wrapper for the Task Management Platform.
 * 
 * Enforces type safety across user roles (admin, project_manager, team_member),
 * projects, tasks, and comment logs.
 */

export type UserRole = 'admin' | 'project_manager' | 'team_member';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active?: boolean;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  ownerId: number;
  startDate: string;
  dueDate: string;
  members?: User[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: number;
  dueDate: string;
  assignee?: User;
}

export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  content: string;
  timestamp: string;
  author?: User;
}

export interface DashboardStats {
  // admin stats
  totalUsers?: number;
  totalProjects?: number;
  totalTasks?: number;

  // PM stats
  myProjectsCount?: number;
  activeTasksCount?: number;
  teamMembersCount?: number;

  // Developer stats
  assignedTasksCount?: number;
  pendingTasksCount?: number;
  completedTasksCount?: number;
  tasks?: Task[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchClient<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch (_) {}
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export const taskApi = {
  // Auth Handlers
  login: (credentials: Record<string, string>) =>
    fetchClient<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: Record<string, string>) =>
    fetchClient<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    fetchClient<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    fetchClient<{ user: User }>('/api/auth/me', {
      method: 'GET',
    }),

  // Dashboard Stats
  getDashboardStats: () =>
    fetchClient<DashboardStats>('/api/proxy/dashboard/stats', {
      method: 'GET',
    }),

  // Projects CRUD
  getProjects: () =>
    fetchClient<Project[]>('/api/proxy/projects', {
      method: 'GET',
    }),

  getProject: (id: number) =>
    fetchClient<Project & { members: User[] }>(`/api/proxy/projects/${id}`, {
      method: 'GET',
    }),

  createProject: (data: Omit<Project, 'id' | 'ownerId'>) =>
    fetchClient<Project>('/api/proxy/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: number, data: Partial<Project>) =>
    fetchClient<Project>(`/api/proxy/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: number) =>
    fetchClient<{ success: boolean }>(`/api/proxy/projects/${id}`, {
      method: 'DELETE',
    }),

  // Project Members management
  addProjectMember: (projectId: number, userId: number) =>
    fetchClient<{ success: boolean; members: User[] }>(`/api/proxy/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeProjectMember: (projectId: number, userId: number) =>
    fetchClient<{ success: boolean; members: User[] }>(`/api/proxy/projects/${projectId}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  // Project Tasks
  getProjectTasks: (projectId: number) =>
    fetchClient<Task[]>(`/api/proxy/projects/${projectId}/tasks`, {
      method: 'GET',
    }),

  createProjectTask: (projectId: number, taskData: Omit<Task, 'id' | 'projectId'>) =>
    fetchClient<Task>(`/api/proxy/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    }),

  // Tasks CRUD
  getTask: (id: number) =>
    fetchClient<Task & { assignee: User }>(`/api/proxy/tasks/${id}`, {
      method: 'GET',
    }),

  updateTask: (id: number, taskData: Partial<Task>) =>
    fetchClient<Task>(`/api/proxy/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    }),

  deleteTask: (id: number) =>
    fetchClient<{ success: boolean }>(`/api/proxy/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Task Comments
  getTaskComments: (taskId: number) =>
    fetchClient<Comment[]>(`/api/proxy/tasks/${taskId}/comments`, {
      method: 'GET',
    }),

  createTaskComment: (taskId: number, content: string) =>
    fetchClient<Comment>(`/api/proxy/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Admin User CRUD
  getUsers: () =>
    fetchClient<User[]>('/api/proxy/admin/users', {
      method: 'GET',
    }),

  createUser: (userData: Omit<User, 'id'>) =>
    fetchClient<User>('/api/proxy/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUser: (id: number, userData: Partial<User>) =>
    fetchClient<User>(`/api/proxy/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  deactivateUser: (id: number) =>
    fetchClient<{ success: boolean; user: User }>(`/api/proxy/admin/users/${id}`, {
      method: 'DELETE',
    }),
};
