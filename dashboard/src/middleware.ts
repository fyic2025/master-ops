import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Custom middleware - NO NextAuth imports to avoid any side effects
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // DEBUG: Add header to track middleware execution
  const response = NextResponse.next()
  response.headers.set("X-Middleware-Matched", `true:${pathname}`)

  // === PAGE ROUTES ONLY - Check for session cookie ===
  const hasSession = request.cookies.has("authjs.session-token")
    || request.cookies.has("__Secure-authjs.session-token")

  if (!hasSession) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url))
    redirectResponse.headers.set("X-Middleware-Redirect", `true:${pathname}`)
    return redirectResponse
  }

  return response
}

// Use explicit paths only - NOT regex patterns
// API routes excluded by simply not listing them
export const config = {
  matcher: [
    // ONLY match root and business dashboards - nothing else
    "/",
    "/home",
    "/home/:path*",
    "/boo",
    "/boo/:path*",
    "/teelixir",
    "/teelixir/:path*",
    "/elevate",
    "/elevate/:path*",
    "/rhf",
    "/rhf/:path*",
    "/brandco",
    "/brandco/:path*",
  ],
}
