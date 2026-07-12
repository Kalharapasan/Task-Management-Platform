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
    } catch (networkError: any) {
      console.error('Laravel API offline or connection failed:', networkError);
      return NextResponse.json(
        { error: 'API Gateway Error', details: networkError.message },
        { status: 503 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
