import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
      teamMembersCount = 5; // Fallback or could fetch real project team members
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
      activeTasksCount: allTasks.filter((t: any) => t.status !== 'done').length,
      teamMembersCount,
    };
  } else {
    const assignedTasks = allTasks.filter((t: any) => t.assigned_to === userId).map(translateTaskToFrontend);
    return {
      assignedTasksCount: assignedTasks.length,
      pendingTasksCount: assignedTasks.filter((t: any) => t.status !== 'done').length,
      completedTasksCount: assignedTasks.filter((t: any) => t.status === 'done').length,
      tasks: assignedTasks
    };
  }
}

async function handleProxy(request: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  let method = request.method;
  const token = cookies().get('task_token')?.value;

  let requestBody: any = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      requestBody = await request.json();
    } catch (e) {
      requestBody = null;
    }
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

    if (path === 'dashboard/stats' && method === 'GET') {
      const meRes = await fetch(`${apiUrl}/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user || meData;
        const stats = await getRealDashboardStats(apiUrl, token!, user.role, user.id);
        return NextResponse.json(stats);
      }
      return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
    }

    if (path === 'tasks/my' && method === 'GET') {
      const meRes = await fetch(`${apiUrl}/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        const user = meData.user || meData;
        
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
          const assignedTasks = allTasks.filter((t: any) => t.assigned_to === user.id).map(translateTaskToFrontend);
          return NextResponse.json(assignedTasks);
        }
      }
      return NextResponse.json({ error: 'Failed to fetch my tasks' }, { status: 500 });
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
          return NextResponse.json({ ...user, ...requestBody });
        }
      }
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

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
      return NextResponse.json({ error: 'Failed to update project members' }, { status: 500 });
    }

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

    const data = await response.json();
    let responseData = data.data || data;

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
  } catch (networkError: any) {
    console.error(`Proxy failed (${method} ${path}).`, networkError);
    return NextResponse.json(
      { error: 'API Gateway Error', details: networkError.message },
      { status: 503 }
    );
  }
}

export { handleProxy as GET, handleProxy as POST, handleProxy as PUT, handleProxy as DELETE, handleProxy as PATCH };
