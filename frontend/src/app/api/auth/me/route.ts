import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const tokenCookie = cookies().get('task_token');

  if (!tokenCookie || !tokenCookie.value) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const token = tokenCookie.value;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace('localhost', '127.0.0.1');

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
    console.error('Failed to fetch user from backend:', err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
