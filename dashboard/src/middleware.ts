// Official NextAuth v5 middleware pattern
// The authorized callback in auth.ts handles which routes require auth
export { auth as middleware } from "@/auth"

export const config = {
  // Match all routes except static assets
  // Auth logic (including API exclusion) is handled in the authorized callback
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
