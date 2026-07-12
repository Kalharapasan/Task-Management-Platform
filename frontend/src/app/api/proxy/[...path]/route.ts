import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ==========================================================================
// TASK MANAGEMENT PLATFORM IN-MEMORY MOCK DATABASE STATE
// Allows standalone testing and UI evaluations when Laravel is unreachable.
// ==========================================================================
let mockProjects = [
  { id: 1, title: 'Enterprise CRM Upgrade', description: 'Overhaul customer relationship management pipeline and integrate AI lead analysis.', status: 'in_progress', ownerId: 2, startDate: '2026-06-01', dueDate: '2026-08-30' },
  { id: 2, title: 'Mobile App Beta Launch', description: 'Compile and ship the iOS/Android client apps for closed-group customer feedback.', status: 'todo', ownerId: 2, startDate: '2026-07-01', dueDate: '2026-09-15' },
  { id: 3, title: 'Security Compliance Auditing', description: 'Perform annual infrastructure vulnerability scan and patch identity tokens handlers.', status: 'done', ownerId: 1, startDate: '2026-05-10', dueDate: '2026-07-10' }
];

let mockProjectMembers = [
  { projectId: 1, userId: 2 },
  { projectId: 1, userId: 3 },
  { projectId: 2, userId: 2 },
  { projectId: 2, userId: 3 },
  { projectId: 3, userId: 1 },
  { projectId: 3, userId: 2 }
];

let mockTasks = [
  { id: 101, projectId: 1, title: 'Setup Next.js 14 Boilerplate', description: 'Initialize repository, configure tailwind, and map basic route structures.', status: 'done', priority: 'high', assigneeId: 3, dueDate: '2026-07-15' },
  { id: 102, projectId: 1, title: 'Database Migration Schema', description: 'Establish users, projects, tasks, and comments SQL tables with foreign relationships.', status: 'in_review', priority: 'medium', assigneeId: 3, dueDate: '2026-07-18' },
  { id: 103, projectId: 1, title: 'Secure Sanctum Proxy BFF', description: 'Configure route handlers to set HttpOnly tokens cookies.', status: 'in_progress', priority: 'high', assigneeId: 3, dueDate: '2026-07-20' },
  { id: 104, projectId: 1, title: 'Kanban Board Drag Fallback', description: 'Provide custom dropdown task status controls for mobile accessibility.', status: 'todo', priority: 'low', assigneeId: 2, dueDate: '2026-07-25' },
  { id: 201, projectId: 2, title: 'Build React Native Bridges', description: 'Develop swift/kotlin abstractions for native device modules.', status: 'todo', priority: 'high', assigneeId: 3, dueDate: '2026-08-05' }
];

let mockComments = [
  { id: 501, taskId: 103, userId: 3, content: 'BFF auth setup is running locally. Ready to link with middleware.', timestamp: '2026-07-11T16:00:00Z' },
  { id: 502, taskId: 103, userId: 2, content: 'Excellent work. Ensure cookies configure Lax attributes.', timestamp: '2026-07-11T17:30:00Z' }
];

let mockUsers = [
  { id: 1, name: 'Alex Thompson', email: 'admin@task.com', role: 'admin', active: true },
  { id: 2, name: 'Deborah Vance', email: 'pm@task.com', role: 'project_manager', active: true },
  { id: 3, name: 'Marcus Watkins', email: 'member@task.com', role: 'team_member', active: true },
  { id: 4, name: 'Clara Oswald', email: 'clara@task.com', role: 'team_member', active: true },
  { id: 5, name: 'Sarah Jane', email: 'sarah@task.com', role: 'team_member', active: false }
];

async function handleProxy(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const method = request.method;
  const token = cookies().get('task_token')?.value;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const url = `${apiUrl}/${path}`;

  let requestBody: any = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      requestBody = await request.json();
    } catch (e) {
      requestBody = null;
    }
  }

  const searchParams = new URL(request.url).searchParams.toString();
  const targetUrl = searchParams ? `${url}?${searchParams}` : url;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (networkError) {
    console.warn(`Proxy failed (${method} ${path}). Serving in-memory mock database.`, networkError);

    // Mock API Route Mapping for Task Platform

    // 1. GET dashboard stats (Role aware stats)
    if (path === 'dashboard/stats' && method === 'GET') {
      const role = cookies().get('task_role')?.value || 'team_member';
      
      if (role === 'admin') {
        return NextResponse.json({
          totalUsers: mockUsers.length,
          totalProjects: mockProjects.length,
          totalTasks: mockTasks.length,
        });
      } else if (role === 'project_manager') {
        return NextResponse.json({
          myProjectsCount: mockProjects.filter(p => p.ownerId === 2).length,
          activeTasksCount: mockTasks.filter(t => t.status !== 'done').length,
          teamMembersCount: mockUsers.filter(u => u.role === 'team_member').length,
        });
      } else {
        // team_member
        const assignedTasks = mockTasks.filter(t => t.assigneeId === 3);
        return NextResponse.json({
          assignedTasksCount: assignedTasks.length,
          pendingTasksCount: assignedTasks.filter(t => t.status !== 'done').length,
          completedTasksCount: assignedTasks.filter(t => t.status === 'done').length,
          tasks: assignedTasks
        });
      }
    }

    // 2. GET & POST /projects
    if (path === 'projects' && method === 'GET') {
      return NextResponse.json(mockProjects);
    }

    if (path === 'projects' && method === 'POST') {
      const newProject = {
        id: Math.max(...mockProjects.map(p => p.id), 0) + 1,
        title: requestBody.title,
        description: requestBody.description,
        status: requestBody.status || 'todo',
        ownerId: 2, // Mock Owner: Deborah PM
        startDate: new Date().toISOString().split('T')[0],
        dueDate: requestBody.dueDate || '2026-12-31'
      };
      mockProjects.push(newProject);
      // Link owner and some default team members as project members
      mockProjectMembers.push({ projectId: newProject.id, userId: 2 });
      mockProjectMembers.push({ projectId: newProject.id, userId: 3 });
      return NextResponse.json(newProject, { status: 21 });
    }

    // 3. GET /projects/[id]
    if (path.startsWith('projects/') && path.split('/').length === 2 && method === 'GET') {
      const projectId = parseInt(path.split('/')[1]);
      const project = mockProjects.find(p => p.id === projectId);
      if (project) {
        // Load members list
        const memberIds = mockProjectMembers.filter(m => m.projectId === projectId).map(m => m.userId);
        const members = mockUsers.filter(u => memberIds.includes(u.id));
        return NextResponse.json({ ...project, members });
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // PUT /projects/[id]
    if (path.startsWith('projects/') && path.split('/').length === 2 && method === 'PUT') {
      const projectId = parseInt(path.split('/')[1]);
      const idx = mockProjects.findIndex(p => p.id === projectId);
      if (idx !== -1) {
        mockProjects[idx] = { ...mockProjects[idx], ...requestBody };
        return NextResponse.json(mockProjects[idx]);
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // DELETE /projects/[id]
    if (path.startsWith('projects/') && path.split('/').length === 2 && method === 'DELETE') {
      const projectId = parseInt(path.split('/')[1]);
      mockProjects = mockProjects.filter(p => p.id !== projectId);
      mockTasks = mockTasks.filter(t => t.projectId !== projectId);
      mockProjectMembers = mockProjectMembers.filter(m => m.projectId !== projectId);
      return NextResponse.json({ success: true, message: 'Project deleted.' });
    }

    // 4. GET & POST /projects/[id]/members
    if (path.startsWith('projects/') && path.endsWith('/members') && method === 'POST') {
      const projectId = parseInt(path.split('/')[1]);
      const { userId } = requestBody;
      const exists = mockProjectMembers.some(m => m.projectId === projectId && m.userId === userId);
      if (!exists) {
        mockProjectMembers.push({ projectId, userId });
      }
      const memberIds = mockProjectMembers.filter(m => m.projectId === projectId).map(m => m.userId);
      const members = mockUsers.filter(u => memberIds.includes(u.id));
      return NextResponse.json({ success: true, members });
    }

    if (path.startsWith('projects/') && path.endsWith('/members') && method === 'DELETE') {
      const projectId = parseInt(path.split('/')[1]);
      const { userId } = requestBody;
      mockProjectMembers = mockProjectMembers.filter(m => !(m.projectId === projectId && m.userId === userId));
      const memberIds = mockProjectMembers.filter(m => m.projectId === projectId).map(m => m.userId);
      const members = mockUsers.filter(u => memberIds.includes(u.id));
      return NextResponse.json({ success: true, members });
    }

    // 5. GET & POST /projects/[id]/tasks
    if (path.startsWith('projects/') && path.endsWith('/tasks') && method === 'GET') {
      const projectId = parseInt(path.split('/')[1]);
      const tasks = mockTasks.filter(t => t.projectId === projectId);
      return NextResponse.json(tasks);
    }

    if (path.startsWith('projects/') && path.endsWith('/tasks') && method === 'POST') {
      const projectId = parseInt(path.split('/')[1]);
      const newTask = {
        id: Math.max(...mockTasks.map(t => t.id), 0) + 1,
        projectId,
        title: requestBody.title,
        description: requestBody.description || '',
        status: requestBody.status || 'todo',
        priority: requestBody.priority || 'medium',
        assigneeId: requestBody.assigneeId || 3,
        dueDate: requestBody.dueDate || new Date().toISOString().split('T')[0]
      };
      mockTasks.push(newTask);
      return NextResponse.json(newTask, { status: 21 });
    }

    // 6. GET /tasks/[id]
    if (path.startsWith('tasks/') && path.split('/').length === 2 && method === 'GET') {
      const taskId = parseInt(path.split('/')[1]);
      const task = mockTasks.find(t => t.id === taskId);
      if (task) {
        const assignee = mockUsers.find(u => u.id === task.assigneeId);
        return NextResponse.json({ ...task, assignee });
      }
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // PUT /tasks/[id] (status transition/edits)
    if (path.startsWith('tasks/') && path.split('/').length === 2 && method === 'PUT') {
      const taskId = parseInt(path.split('/')[1]);
      const idx = mockTasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        mockTasks[idx] = { ...mockTasks[idx], ...requestBody };
        return NextResponse.json(mockTasks[idx]);
      }
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // DELETE /tasks/[id]
    if (path.startsWith('tasks/') && path.split('/').length === 2 && method === 'DELETE') {
      const taskId = parseInt(path.split('/')[1]);
      mockTasks = mockTasks.filter(t => t.id !== taskId);
      return NextResponse.json({ success: true, message: 'Task deleted.' });
    }

    // 7. GET & POST /tasks/[id]/comments
    if (path.startsWith('tasks/') && path.endsWith('/comments') && method === 'GET') {
      const taskId = parseInt(path.split('/')[1]);
      const comments = mockComments
        .filter(c => c.taskId === taskId)
        .map(c => {
          const author = mockUsers.find(u => u.id === c.userId);
          return { ...c, author };
        });
      return NextResponse.json(comments);
    }

    if (path.startsWith('tasks/') && path.endsWith('/comments') && method === 'POST') {
      const taskId = parseInt(path.split('/')[1]);
      const role = cookies().get('task_role')?.value || 'team_member';
      let activeUserId = 3;
      if (role === 'admin') activeUserId = 1;
      else if (role === 'project_manager') activeUserId = 2;

      const newComment = {
        id: Math.max(...mockComments.map(c => c.id), 0) + 1,
        taskId,
        userId: activeUserId,
        content: requestBody.content,
        timestamp: new Date().toISOString()
      };
      mockComments.push(newComment);
      const author = mockUsers.find(u => u.id === activeUserId);
      return NextResponse.json({ ...newComment, author }, { status: 21 });
    }

    // 8. GET, POST, PUT, DELETE /admin/users
    if (path === 'admin/users' && method === 'GET') {
      return NextResponse.json(mockUsers);
    }

    if (path === 'admin/users' && method === 'POST') {
      const newUser = {
        id: Math.max(...mockUsers.map(u => u.id), 0) + 1,
        name: requestBody.name,
        email: requestBody.email,
        role: requestBody.role || 'team_member',
        active: true
      };
      mockUsers.push(newUser);
      return NextResponse.json(newUser, { status: 21 });
    }

    if (path.startsWith('admin/users/') && method === 'PUT') {
      const userId = parseInt(path.split('/')[2]);
      const idx = mockUsers.findIndex(u => u.id === userId);
      if (idx !== -1) {
        mockUsers[idx] = { ...mockUsers[idx], ...requestBody };
        return NextResponse.json(mockUsers[idx]);
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (path.startsWith('admin/users/') && method === 'DELETE') {
      const userId = parseInt(path.split('/')[2]);
      const idx = mockUsers.findIndex(u => u.id === userId);
      if (idx !== -1) {
        mockUsers[idx].active = false; // Deactivate user
        return NextResponse.json({ success: true, user: mockUsers[idx] });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: `Laravel API offline. Mock route for "${path}" not configured.` },
      { status: 503 }
    );
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE, handleProxy as PATCH };
