import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import type { NextAuthConfig } from "next-auth"



const config: NextAuthConfig = {
  // Temporarily disabled for testing
  // adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Default role for regular users
          role: "PARTICIPANT" as const,
        }
      },
    }),
    // Временная аутентификация для тестирования админ панели
    Credentials({
      name: "credentials",
      credentials: {
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Простая проверка для admin demo (НЕ для продакшена!)
        if (credentials?.password === "qwerty123") {
          return {
            id: "admin-user-id",
            name: "Admin User", 
            email: "admin@cascaisfishing.com",
            role: "ADMIN" as const
          }
        }
        return null
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.sub!
        session.user.role = (token.role as any) || "PARTICIPANT"
      }
      return session
    },
    jwt({ user, token }) {
      if (user) {
        token.role = (user as any).role || "PARTICIPANT"
        token.sub = user.id
      }
      return token
    },
    async signIn({ user, account, profile }) {
      // NOTE: Prisma operations moved to API routes to avoid Edge Runtime issues
      // Auto-create fisher profile for new users will be handled in separate API calls
      
      // For now, just allow sign in
      console.log('✅ User signed in:', user.email, 'Provider:', account?.provider)
      return true
    },
  },
  // Используем встроенные NextAuth страницы: /api/auth/signin, /api/auth/error
  // pages: {
  //   signIn: '/auth/signin',
  //   error: '/auth/error', 
  // },
  session: {
    strategy: "jwt", // Используем JWT для совместимости с middleware Edge Runtime
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)

// Type declarations
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "PARTICIPANT" | "CAPTAIN" | "ADMIN"
    } & DefaultSession["user"]
  }
  
  interface User {
    role: "PARTICIPANT" | "CAPTAIN" | "ADMIN"
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: "PARTICIPANT" | "CAPTAIN" | "ADMIN"
  }
}