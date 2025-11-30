import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Allowed email addresses - strict whitelist
const ALLOWED_EMAILS = [
  "peter@teelixir.com",
  "jayson@teelixir.com",
  "jayson@fyic.com.au",
  "ops@growthcohq.com",
]

function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  return ALLOWED_EMAILS.includes(email.toLowerCase())
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_AUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Allow all requests through middleware - we handle auth redirects manually
    authorized: () => true,
    async signIn({ user }) {
      // Only allow specific emails/domains
      return isEmailAllowed(user.email)
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
