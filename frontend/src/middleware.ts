import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

/**
 * Next.js Edge Middleware for Role-Based Access Gating.
 * 
 * Task Platform Security Context:
 * Since Sanctum access tokens are stored in secure httpOnly cookies (`task_token`),
 * the browser's JavaScript cannot read them. To enable lightweight routing authorization
 * at the Edge layer without calling the database on every asset request, the login BFF handler
 * sets a companion `task_role` cookie.
 * 
 * This middleware reads `task_token` to verify session existence and `task_role` to block
 * unauthorized routing actions (e.g. preventing a team_member from reading /admin/users).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve security cookies from request headers
  const token = request.cookies.get('task_token')?.value;
  const role = request.cookies.get('task_role')?.value;

  // Paths exempt from authentication checks
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isApiRoute = pathname.startsWith('/api');
  const isPublicAsset = pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico';

  if (isApiRoute || isPublicAsset) {
    return NextResponse.next();
  }

  // 1. Gating unauthenticated visitors
  if (!token) {
    if (!isAuthPage) {
      // Force redirect to login page
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Prevent authenticated users from visiting auth screen
  if (isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. Role Routing Gates
  // Admin routes access check
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      // Block access and redirect unauthorized roles back to the home dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Target specific route paths for evaluation
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
