import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'noviq_session';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'noviq-ai-super-secret-auth-key-change-in-production-min32chars';
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public asset or auth API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      const secret = getJwtSecret();
      const { payload } = await jwtVerify(sessionCookie, secret);
      if (payload.sub) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  const isAuthPage = pathname === '/login' || pathname === '/register';

  // If authenticated and visiting /login or /register, redirect to dashboard /
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If not authenticated and visiting protected pages, redirect to /login
  if (!isAuthPage && !isAuthenticated) {
    // If it's an API route, return 401 instead of redirecting HTML
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
