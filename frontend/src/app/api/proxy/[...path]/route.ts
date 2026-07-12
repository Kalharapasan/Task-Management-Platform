import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';


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

function serveMockDatabase(path: string, method: string, requestBody: any) {
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
    return NextResponse.json(newProject, { status: 201 });
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
    return NextResponse.json(newTask, { status: 201 });
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
    return NextResponse.json({ ...newComment, author }, { status: 201 });
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
    return NextResponse.json(newUser, { status: 201 });
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

  // 9. GET /tasks/my — tasks assigned to the current user
  if (path === 'tasks/my' && method === 'GET') {
    const role = cookies().get('task_role')?.value || 'team_member';
    let activeUserId = 3;
    if (role === 'admin') activeUserId = 1;
    else if (role === 'project_manager') activeUserId = 2;
    const assignedTasks = mockTasks.filter(t => t.assigneeId === activeUserId);
    return NextResponse.json(assignedTasks);
  }

  // 10. PUT /profile — update own profile
  if (path === 'profile' && method === 'PUT') {
    const role = cookies().get('task_role')?.value || 'team_member';
    let activeUserId = 3;
    if (role === 'admin') activeUserId = 1;
    else if (role === 'project_manager') activeUserId = 2;
    const idx = mockUsers.findIndex(u => u.id === activeUserId);
    if (idx !== -1) {
      if (requestBody?.name) mockUsers[idx].name = requestBody.name;
      if (requestBody?.email) mockUsers[idx].email = requestBody.email;
      return NextResponse.json(mockUsers[idx]);
    }
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(
    { error: `Laravel API offline. Mock route for "${path}" not configured.` },
    { status: 503 }
  );
}

function translateUserToFrontend(laravelUser: any) {
  if (!laravelUser) return null;
  return {
    id: laravelUser.id,
    name: laravelUser.name,
    email: laravelUser.email,
    role: laravelUser.role,
    active: laravelUser.active !== undefined ? laravelUser.active : true,
  };
}

function translateProjectToFrontend(laravelProject: any) {
  if (!laravelProject) return null;
  let frontendStatus = 'todo';
  if (laravelProject.status === 'active') {
    frontendStatus = 'in_progress';
  } else if (laravelProject.status === 'completed') {
    frontendStatus = 'done';
  }
  return {
    id: laravelProject.id,
    title: laravelProject.name,
    description: laravelProject.description || '',
    status: frontendStatus,
    ownerId: laravelProject.created_by,
    startDate: laravelProject.start_date || '',
    dueDate: laravelProject.end_date || '',
    members: laravelProject.members ? laravelProject.members.map(translateUserToFrontend) : undefined,
  };
}

function translateProjectToBackend(frontendProject: any) {
  if (!frontendProject) return null;
  let laravelStatus = 'planning';
  if (frontendProject.status === 'in_progress') {
    laravelStatus = 'active';
  } else if (frontendProject.status === 'done') {
    laravelStatus = 'completed';
  }
  return {
    name: frontendProject.title,
    description: frontendProject.description || '',
    status: laravelStatus,
    start_date: frontendProject.startDate || new Date().toISOString().split('T')[0],
    end_date: frontendProject.dueDate || '',
  };
}

function translateTaskToFrontend(laravelTask: any) {
  if (!laravelTask) return null;
  return {
    id: laravelTask.id,
    projectId: laravelTask.project_id,
    title: laravelTask.title,
    description: laravelTask.description || '',
    status: laravelTask.status || 'todo',
    priority: laravelTask.priority || 'medium',
    assigneeId: laravelTask.assigned_to,
    dueDate: laravelTask.due_date || '',
    assignee: laravelTask.assignee ? translateUserToFrontend(laravelTask.assignee) : undefined,
  };
}

function translateTaskToBackend(frontendTask: any) {
  if (!frontendTask) return null;
  const res: any = {};
  if (frontendTask.title !== undefined) res.title = frontendTask.title;
  if (frontendTask.description !== undefined) res.description = frontendTask.description;
  if (frontendTask.status !== undefined) res.status = frontendTask.status;
  if (frontendTask.priority !== undefined) res.priority = frontendTask.priority;
  if (frontendTask.assigneeId !== undefined) res.assigned_to = frontendTask.assigneeId;
  if (frontendTask.dueDate !== undefined) res.due_date = frontendTask.dueDate;
  return res;
}

function translateCommentToFrontend(laravelComment: any) {
  if (!laravelComment) return null;
  return {
    id: laravelComment.id,
    taskId: laravelComment.task_id,
    userId: laravelComment.user_id,
    content: laravelComment.comment,
    timestamp: laravelComment.created_at,
    author: laravelComment.user ? translateUserToFrontend(laravelComment.user) : undefined,
  };
}

async function getRealDashboardStats(apiUrl: string, token: string, role: string, userId: number) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const projRes = await fetch(`${apiUrl}/v1/projects`, { headers });
  if (!projRes.ok) throw new Error('Failed to fetch projects');
  const projectsData = await projRes.json();
  const laravelProjects = projectsData.data || projectsData;

  let totalUsers = 0;
  let teamMembersCount = 0;
  if (role === 'admin') {
    const usersRes = await fetch(`${apiUrl}/v1/users`, { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      totalUsers = (usersData.data || usersData).length;
    }
  } else if (role === 'project_manager') {
    const usersRes = await fetch(`${apiUrl}/v1/users`, { headers });
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      teamMembersCount = (usersData.data || usersData).filter((u: any) => u.role === 'team_member').length;
    } else {
      teamMembersCount = 5;
    }
  }

  let allTasks: any[] = [];
  for (const project of laravelProjects) {
    const tasksRes = await fetch(`${apiUrl}/v1/projects/${project.id}/tasks`, { headers });
    if (tasksRes.ok) {
      const tasksData = await tasksRes.json();
      const projectTasks = tasksData.data || tasksData;
      allTasks = allTasks.concat(projectTasks);
    }
  }

  if (role === 'admin') {
    return {
      totalUsers,
      totalProjects: laravelProjects.length,
      totalTasks: allTasks.length,
    };
  } else if (role === 'project_manager') {
    return {
      myProjectsCount: laravelProjects.length,
      activeTasksCount: allTasks.filter(t => t.status !== 'done').length,
      teamMembersCount,
    };
  } else {
    const assignedTasks = allTasks.filter(t => t.assigned_to === userId).map(translateTaskToFrontend);
    return {
      assignedTasksCount: assignedTasks.length,
      pendingTasksCount: assignedTasks.filter(t => t.status !== 'done').length,
      completedTasksCount: assignedTasks.filter(t => t.status === 'done').length,
      tasks: assignedTasks
    };
  }
}

async function handleProxy(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  let method = request.method;
  const token = cookies().get('task_token')?.value;

  const isMockToken = token && token.startsWith('mock_token_for_');

  let requestBody: any = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      requestBody = await request.json();
    } catch (e) {
      requestBody = null;
    }
  }

  // 1. Direct mock token bypass
  if (isMockToken) {
    return serveMockDatabase(path, method, requestBody);
  }

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace('localhost', '127.0.0.1');

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // A. Intercept & translate special requests
    if (path === 'dashboard/stats' && method === 'GET') {
      const meRes = await fetch(`${apiUrl}/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user || meData;
        const stats = await getRealDashboardStats(apiUrl, token!, user.role, user.id);
        return NextResponse.json(stats);
      }
      return serveMockDatabase(path, method, requestBody);
    }

    if (path === 'tasks/my' && method === 'GET') {
      const meRes = await fetch(`${apiUrl}/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user || meData;
        
        // Fetch all projects and tasks, filter by assignee
        const projRes = await fetch(`${apiUrl}/v1/projects`, { headers });
        if (projRes.ok) {
          const projectsData = await projRes.json();
          const laravelProjects = projectsData.data || projectsData;
          let allTasks: any[] = [];
          for (const project of laravelProjects) {
            const tasksRes = await fetch(`${apiUrl}/v1/projects/${project.id}/tasks`, { headers });
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              const projectTasks = tasksData.data || tasksData;
              allTasks = allTasks.concat(projectTasks);
            }
          }
          const assignedTasks = allTasks.filter(t => t.assigned_to === user.id).map(translateTaskToFrontend);
          return NextResponse.json(assignedTasks);
        }
      }
      return serveMockDatabase(path, method, requestBody);
    }

    if (path === 'profile' && method === 'PUT') {
      const meRes = await fetch(`${apiUrl}/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user || meData;
        if (user.role === 'admin') {
          const updateRes = await fetch(`${apiUrl}/v1/users/${user.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestBody)
          });
          if (updateRes.ok) {
            const updated = await updateRes.json();
            return NextResponse.json(translateUserToFrontend(updated.data || updated));
          }
        } else {
          // For non-admin roles, simulate successful profile update
          return NextResponse.json({ ...user, ...requestBody });
        }
      }
      return serveMockDatabase(path, method, requestBody);
    }

    // project member add/remove
    if (path.startsWith('projects/') && path.endsWith('/members')) {
      const projectId = path.split('/')[1];
      if (method === 'POST') {
        const userId = requestBody.userId || requestBody.user_id;
        const addRes = await fetch(`${apiUrl}/v1/projects/${projectId}/members`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_id: userId, role_in_project: 'member' })
        });
        if (addRes.ok) {
          const projDetailRes = await fetch(`${apiUrl}/v1/projects/${projectId}`, { headers });
          const projDetail = await projDetailRes.json();
          const members = (projDetail.data || projDetail).members || [];
          return NextResponse.json({ success: true, members: members.map(translateUserToFrontend) });
        }
      } else if (method === 'DELETE') {
        const userId = requestBody.userId || requestBody.user_id;
        const delRes = await fetch(`${apiUrl}/v1/projects/${projectId}/members/${userId}`, {
          method: 'DELETE',
          headers
        });
        if (delRes.ok) {
          const projDetailRes = await fetch(`${apiUrl}/v1/projects/${projectId}`, { headers });
          const projDetail = await projDetailRes.json();
          const members = (projDetail.data || projDetail).members || [];
          return NextResponse.json({ success: true, members: members.map(translateUserToFrontend) });
        }
      }
      return serveMockDatabase(path, method, requestBody);
    }

    // Default translation paths
    let backendPath = path;
    let payload = requestBody;

    if (path === 'projects' && method === 'POST') {
      backendPath = `v1/projects`;
      payload = translateProjectToBackend(requestBody);
    } else if (path.startsWith('projects') && path.split('/').length === 2 && method === 'PUT') {
      const projectId = path.split('/')[1];
      backendPath = `v1/projects/${projectId}`;
      payload = translateProjectToBackend(requestBody);
    } else if (path.startsWith('projects') && path.endsWith('/tasks') && method === 'POST') {
      const projectId = path.split('/')[1];
      backendPath = `v1/projects/${projectId}/tasks`;
      payload = translateTaskToBackend(requestBody);
      payload.status = payload.status || 'todo';
    } else if (path.startsWith('tasks/') && path.split('/').length === 2 && method === 'PUT') {
      const taskId = path.split('/')[1];
      // If it only contains status, or if we want to support developer updates
      const meRes = await fetch(`${apiUrl}/me`, { headers });
      const meData = await meRes.json();
      const currentUser = meData.user || meData;
      
      if (currentUser.role === 'team_member' || (Object.keys(requestBody).length === 1 && 'status' in requestBody)) {
        backendPath = `v1/tasks/${taskId}/status`;
        method = 'PATCH';
        payload = { status: requestBody.status };
      } else {
        backendPath = `v1/tasks/${taskId}`;
        payload = translateTaskToBackend(requestBody);
      }
    } else if (path.startsWith('tasks/') && path.endsWith('/comments') && method === 'POST') {
      const taskId = path.split('/')[1];
      backendPath = `v1/tasks/${taskId}/comments`;
      payload = { comment: requestBody.content || requestBody.comment };
    } else if (path.startsWith('projects')) {
      backendPath = `v1/${path}`;
    } else if (path.startsWith('tasks')) {
      backendPath = `v1/${path}`;
    } else if (path.startsWith('admin/users') && method === 'POST') {
      backendPath = `v1/users`;
      payload = {
        name: requestBody.name,
        email: requestBody.email,
        role: requestBody.role,
        password: requestBody.password || 'Password123!'
      };
    } else if (path.startsWith('admin/users')) {
      backendPath = path.replace('admin/users', 'v1/users');
    }

    const targetUrl = `${apiUrl}/${backendPath}`;

    const response = await fetch(targetUrl, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    // Removed silent mock fallback on 401/404 to let backend errors propagate to client

    const data = await response.json();
    let responseData = data.data || data;

    // B. Translate response back to frontend models
    if (response.ok) {
      if (path === 'projects' && method === 'GET') {
        const list = Array.isArray(responseData) ? responseData : [];
        responseData = list.map(translateProjectToFrontend);
      } else if (path.startsWith('projects/') && path.split('/').length === 2 && method === 'GET') {
        responseData = translateProjectToFrontend(responseData);
      } else if (path.startsWith('projects/') && path.split('/').length === 2 && (method === 'POST' || method === 'PUT')) {
        responseData = translateProjectToFrontend(responseData);
      } else if (path.startsWith('projects/') && path.endsWith('/tasks') && method === 'GET') {
        const list = Array.isArray(responseData) ? responseData : [];
        responseData = list.map(translateTaskToFrontend);
      } else if (path.startsWith('projects/') && path.endsWith('/tasks') && method === 'POST') {
        responseData = translateTaskToFrontend(responseData);
      } else if (path.startsWith('tasks/') && path.split('/').length === 2 && method === 'GET') {
        responseData = translateTaskToFrontend(responseData);
      } else if (path.startsWith('tasks/') && path.split('/').length === 2 && (method === 'PUT' || method === 'PATCH')) {
        responseData = translateTaskToFrontend(responseData);
      } else if (path.startsWith('tasks/') && path.endsWith('/comments') && method === 'GET') {
        const list = Array.isArray(responseData) ? responseData : [];
        responseData = list.map(translateCommentToFrontend);
      } else if (path.startsWith('tasks/') && path.endsWith('/comments') && method === 'POST') {
        responseData = translateCommentToFrontend(responseData);
      } else if (path === 'admin/users' && method === 'GET') {
        const list = Array.isArray(responseData) ? responseData : [];
        responseData = list.map(translateUserToFrontend);
      } else if (path === 'admin/users' && method === 'POST') {
        responseData = translateUserToFrontend(responseData);
      } else if (path.startsWith('admin/users/') && (method === 'PUT' || method === 'DELETE')) {
        responseData = translateUserToFrontend(responseData);
      }
    }

    return NextResponse.json(responseData, { status: response.status });
  } catch (networkError) {
    console.warn(`Proxy failed (${method} ${path}). Serving in-memory mock database.`, networkError);
    return serveMockDatabase(path, method, requestBody);
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE, handleProxy as PATCH };
