// Use NextAuth's auth middleware with the authorized callback from auth.ts
// The authorized callback allows API routes through and protects pages
export { auth as middleware } from "@/auth"

export const config = {
  // Match all routes except static files and _next
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
