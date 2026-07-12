import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Route Handler: POST /api/auth/register
 * 
 * Security context:
 * Proxies registration fields to the Laravel database and logs in the session.
 */
export async function POST(request: Request) {
  try {
    const { name, email, password, password_confirmation } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace('localhost', '127.0.0.1');

    try {
      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Set session cookie
        cookies().set('task_token', data.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        // Set standard role cookie (New registrations default to 'team_member')
        cookies().set('task_role', data.user.role || 'team_member', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        return NextResponse.json({ user: data.user });
      } else {
        return NextResponse.json(
          { error: data.message || 'Registration failed' },
          { status: response.status }
        );
      }
    } catch (networkError) {
      console.warn('Laravel API offline. Returning mock registered account:', networkError);

      const mockNewUser = {
        id: 99,
        name,
        email,
        role: 'team_member', // Default signup role
      };

      cookies().set('task_token', `mock_token_for_team_member`, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      cookies().set('task_role', 'team_member', {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      return NextResponse.json({ user: mockNewUser });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'An unexpected onboarding error occurred.' },
      { status: 500 }
    );
  }
}
