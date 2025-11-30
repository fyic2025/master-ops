import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// DO NOT use NextAuth middleware wrapper for API routes
// This custom middleware only checks cookie for page routes
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // === API ROUTES: COMPLETELY SKIP ALL AUTH ===
  // Just pass through with no modifications
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // === PUBLIC ROUTES ===
  if (pathname === "/login" || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  // === PAGE ROUTES: Check for session cookie ===
  const hasSession = request.cookies.has("authjs.session-token")
    || request.cookies.has("__Secure-authjs.session-token")

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

// CRITICAL: Exclude API routes entirely from matcher
// Using simple static paths to avoid regex Edge Runtime issues
export const config = {
  matcher: [
    // Match everything EXCEPT api, _next, and favicon
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
