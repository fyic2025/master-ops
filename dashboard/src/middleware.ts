import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const isLoggedIn = !!req.auth
  const isLoginPage = pathname === "/login"

  // Allow all API routes EXCEPT auth routes to pass through without auth
  // Auth routes need session handling
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Redirect to login if not authenticated (for non-API routes)
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
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
