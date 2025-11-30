import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLoginPage = req.nextUrl.pathname === "/login"
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/")

  // Allow auth routes and API routes (API routes handle their own auth if needed)
  if (isAuthRoute || isApiRoute) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Redirect to home if already logged in and on login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Only run middleware on specific paths:
  // - Dashboard pages (excluding api routes)
  // - Auth API routes only
  matcher: [
    // Dashboard pages
    "/",
    "/login",
    "/:business/:path*",
    // Auth API only
    "/api/auth/:path*",
  ],
}
