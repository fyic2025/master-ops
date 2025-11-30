// Use NextAuth's auth middleware with the authorized callback from auth.ts
// The authorized callback protects pages but allows API routes through
export { auth as middleware } from "@/auth"

export const config = {
  // IMPORTANT: Exclude /api routes from middleware entirely
  // The official NextAuth v5 docs recommend this pattern
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
