import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip all API routes except /api/auth - they're public or handle their own auth
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // For protected pages, check authentication
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  })

  const isLoggedIn = !!token
  const isLoginPage = pathname === "/login"
  const isAuthRoute = pathname.startsWith("/api/auth")

  // Allow auth routes always
  if (isAuthRoute) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to home if already logged in and on login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only protect page routes - exclude all /api routes
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
