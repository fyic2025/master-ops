import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple middleware that only protects page routes
// API routes are excluded via BOTH the matcher config AND explicit check below
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // CRITICAL: Explicitly skip ALL API routes (belt-and-suspenders with matcher)
  // This handles Edge Runtime quirks where matcher may not work as expected
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Skip auth check for login page and static assets
  if (pathname === "/login" || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  // Check for auth session cookie (NextAuth v5 uses authjs.session-token)
  const sessionToken = request.cookies.get("authjs.session-token")
    || request.cookies.get("__Secure-authjs.session-token")

  if (!sessionToken) {
    // Not authenticated, redirect to login
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Authenticated, allow through
  return NextResponse.next()
}

export const config = {
  // Match all routes - we handle exclusions explicitly in the middleware function
  // This is more reliable across different runtimes than complex regex patterns
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
