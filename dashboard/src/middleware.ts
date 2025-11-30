import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple middleware that only protects page routes
// API routes are completely excluded via the matcher config
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip auth check for login page
  if (pathname === "/login") {
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
  // ONLY match page routes - explicitly exclude api, static, and image routes
  // This is the official NextAuth v5 recommended pattern
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
