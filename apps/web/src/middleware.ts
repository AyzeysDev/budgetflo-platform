// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get the JWT token from the request
  // The secret should be the same as your NEXTAUTH_SECRET environment variable
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("Middleware: NEXTAUTH_SECRET is not set. JWT verification will fail.");
    // Allow request to proceed without redirecting if secret is missing,
    // as auth pages might still need to function to show errors.
    // Or, you could throw an error or redirect to an error page.
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });

  // If the user is trying to access the landing page (root path)
  if (pathname === '/') {
    // And they are authenticated (token exists)
    if (token) {
      // Redirect them to the /home page
      const homeUrl = new URL('/home', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // If the user is trying to access an authenticated route (e.g., /home)
  // and they are NOT authenticated, redirect them to the landing page to sign in.
  // This part is already handled by your (app)/layout.tsx using getServerSession and redirect,
  // which is a good approach for protecting server-rendered authenticated pages.
  // Middleware can also do this, but for consistency with your existing (app)/layout.tsx,
  // we'll focus the middleware on the landing page redirect for now.
  // If you wanted to centralize all auth redirects here, you could add:
  /*
  const authenticatedRoutes = ['/home', '/settings', '/budgets']; // Add other protected routes
  if (authenticatedRoutes.some(route => pathname.startsWith(route)) && !token) {
    const landingUrl = new URL('/', req.url);
    // Optionally, pass a callbackUrl to return to the intended page after login
    landingUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(landingUrl);
  }
  */

  // Allow the request to proceed if no redirection is needed
  return NextResponse.next();
}

// Configure the matcher to specify which paths the middleware should run on.
// We want it to run on the root path '/' to check for authenticated users.
// If you also want it to protect other routes, add them here.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (your public assets folder if you have one)
     * - images (your public images folder if you have one)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|images).*)',
    // Specifically include the root path if the above pattern is too broad
    // or if you only want it for the root:
    // '/',
  ],
};
