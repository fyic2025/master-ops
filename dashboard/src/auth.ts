import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { isEmailAllowed, getUserPermissions, type UserRole } from "@/lib/user-permissions"

// Extend session types to include role
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: UserRole
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_AUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow specific emails from permissions list
      return isEmailAllowed(user.email)
    },
    async session({ session }) {
      // Attach user role to session for client-side access control
      if (session.user?.email) {
        const permissions = getUserPermissions(session.user.email)
        if (permissions) {
          session.user.role = permissions.role
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
