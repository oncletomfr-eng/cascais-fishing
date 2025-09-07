/**
 * NextAuth v5 Configuration for Cascais Fishing Platform
 * Production-ready authentication with multiple providers
 */

import NextAuth from "next-auth"
// Temporarily removed PrismaAdapter to fix Vercel Edge Runtime issue
// import { PrismaAdapter } from "@auth/prisma-adapter"
// import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"

// Configure authentication
export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  // Temporarily removed adapter to fix Vercel Edge Runtime WASM issue
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Using JWT-only strategy for now
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email", 
          placeholder: "your@email.com" 
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Make request to our authentication API
          const response = await fetch(`${process.env.AUTH_URL || 'http://localhost:3000'}/api/auth/verify-credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const user = await response.json()
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    }),

    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
    }),

    // Google OAuth  
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Add user data to token on first sign in
      if (user) {
        token.id = user.id
        token.role = user.role || "PARTICIPANT" // Default role
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Allow sign in for OAuth providers (Google, GitHub)
      if (account?.provider === "google" || account?.provider === "github") {
        return true
      }
      
      // For credentials provider, user validation is handled in authorize()
      return true
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`)
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`)
    },
  },
})

// Export types for better TypeScript support
export type { Session, User } from "next-auth"
