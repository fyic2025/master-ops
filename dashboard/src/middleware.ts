import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // For protected pages, check authentication
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  })

  const isLoggedIn = !!token
  const isLoginPage = pathname === "/login"

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
  // ONLY match page routes - explicitly list them
  // Never match /api/* routes
  matcher: [
    "/",
    "/login",
    "/teelixir/:path*",
    "/boo/:path*",
    "/elevate/:path*",
    "/rhf/:path*",
  ],
}
