import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Route Handler: POST /api/auth/logout
 * 
 * Security context:
 * Clears the secure session identification cookies.
 */
export async function POST() {
  const token = cookies().get('task_token')?.value;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  // Expire cookies immediately
  cookies().set('task_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  cookies().set('task_role', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  if (token && !token.startsWith('mock_')) {
    try {
      await fetch(`${apiUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      console.error('Failed to revoke session on server, cleared locally.', err);
    }
  }

  return NextResponse.json({ success: true, message: 'Logged out successfully.' });
}
