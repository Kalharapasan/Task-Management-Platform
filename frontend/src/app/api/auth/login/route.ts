import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }



    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace('localhost', '127.0.0.1');

    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Set secure session identification cookie
        cookies().set('task_token', data.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24, // 1 day
        });

        // Set standard role gating cookie readable by the Edge Middleware
        cookies().set('task_role', data.user.role, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        return NextResponse.json({ user: data.user });
      } else {
        return NextResponse.json(
          { error: data.message || 'Invalid credentials' },
          { status: response.status }
        );
      }
    } catch (networkError) {
      console.warn('Laravel API offline, returning mock fallback session:', networkError);

      // Validate mock credentials for three standard Task Management roles
      let mockUser = null;
      if (email === 'admin@task.com' && password === 'AdminPass123!') {
        mockUser = { id: 1, name: 'Alex Thompson', email, role: 'admin' };
      } else if (email === 'pm@task.com' && password === 'ManagerPass123!') {
        mockUser = { id: 2, name: 'Deborah Vance', email, role: 'project_manager' };
      } else if (email === 'member@task.com' && password === 'MemberPass123!') {
        mockUser = { id: 3, name: 'Marcus Watkins', email, role: 'team_member' };
      }

      if (mockUser) {
        cookies().set('task_token', `mock_token_for_${mockUser.role}`, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        cookies().set('task_role', mockUser.role, {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        return NextResponse.json({ user: mockUser });
      }

      return NextResponse.json(
        { error: 'Invalid credentials. Hint: use pm@task.com / ManagerPass123! or admin@task.com / AdminPass123! or member@task.com / MemberPass123!' },
        { status: 401 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
