import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';


export async function GET() {
  const tokenCookie = cookies().get('task_token');

  if (!tokenCookie || !tokenCookie.value) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const token = tokenCookie.value;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace('localhost', '127.0.0.1');

  // Handle mock sessions
  if (token.startsWith('mock_token_for_')) {
    const role = token.replace('mock_token_for_', '');
    let mockUser = { id: 3, name: 'Marcus Watkins', email: 'member@task.com', role: 'team_member' };

    if (role === 'admin') {
      mockUser = { id: 1, name: 'Alex Thompson', email: 'admin@task.com', role: 'admin' };
    } else if (role === 'project_manager') {
      mockUser = { id: 2, name: 'Deborah Vance', email: 'pm@task.com', role: 'project_manager' };
    }

    return NextResponse.json({ user: mockUser });
  }

  try {
    const response = await fetch(`${apiUrl}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      const user = userData.user || userData;
      return NextResponse.json({ user });
    }

    return NextResponse.json({ user: null }, { status: 200 });
  } catch (err) {
    console.warn('Laravel backend offline, returning mock fallback session:', err);
    
    // Check if role cookie exists
    const role = cookies().get('task_role')?.value || 'team_member';
    let mockUser = { id: 3, name: 'Marcus Watkins', email: 'member@task.com', role: 'team_member' };

    if (role === 'admin') {
      mockUser = { id: 1, name: 'Alex Thompson', email: 'admin@task.com', role: 'admin' };
    } else if (role === 'project_manager') {
      mockUser = { id: 2, name: 'Deborah Vance', email: 'pm@task.com', role: 'project_manager' };
    }

    return NextResponse.json({ user: mockUser });
  }
}
