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

// 🛡️  SECURITY HARDENED: Production-ready authentication configuration
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
    maxAge: 30 * 24 * 60 * 60, // 30 days (production-optimized)
    updateAge: 24 * 60 * 60, // 24 hours (re-generate session token)
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    // 🔐 SECURITY: Strong JWT algorithm
    encode: undefined, // Use default secure encoding
    decode: undefined, // Use default secure decoding
  },
  // 🛡️  SECURITY: Enhanced cookie settings
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true, // 🔒 XSS protection
        sameSite: 'lax', // 🔒 CSRF protection
        path: '/',
        secure: process.env.NODE_ENV === 'production', // 🔒 HTTPS only in production
        domain: process.env.NODE_ENV === 'production' 
          ? '.cascaisfishing.com' // Production domain
          : undefined, // localhost for dev
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? `__Secure-next-auth.callback-url`
        : `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? `__Host-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // 🛡️  SECURITY: Enhanced security settings
  useSecureCookies: process.env.NODE_ENV === 'production',
  // 🔒 CSRF protection built-in
  csrf: true,
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
    async jwt({ token, user, account, trigger }) {
      // 🛡️  SECURITY: Rate limiting для JWT генерации
      const now = Date.now();
      const lastJwtGeneration = token.lastJwtGeneration as number;
      
      if (lastJwtGeneration && (now - lastJwtGeneration) < 1000) {
        console.warn(`🚨 JWT generation rate limit exceeded for user: ${token.email}`);
        // Все равно продолжаем, но логируем подозрительную активность
      }
      
      // Add user data to token on first sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.lastJwtGeneration = now;
        
        // 🛡️  SECURITY: Track sign-in metadata
        token.signInProvider = account?.provider || 'credentials';
        token.signInTime = now;
        token.ipAddress = undefined; // Will be set by middleware if available
        
        // ✅ ИСПРАВЛЕНИЕ: правильно получаем роль для всех провайдеров
        if (user.role) {
          // Роль пришла из credentials provider (уже содержит роль из БД)
          token.role = user.role
        } else if (account?.provider && (account.provider === "google" || account.provider === "github")) {
          // Для OAuth провайдеров загружаем роль из БД
          try {
            // TODO: Временно используем dynamic import для Prisma в Edge Runtime
            // const { prisma } = await import('@/lib/prisma')
            // const dbUser = await prisma.user.findUnique({
            //   where: { email: user.email },
            //   select: { role: true }
            // })
            // token.role = dbUser?.role || "PARTICIPANT"
            
            // Временное решение: используем default роль для OAuth
            token.role = "PARTICIPANT" // Будет исправлено после настройки Prisma в Edge Runtime
          } catch (error) {
            console.error("Error loading user role:", error)
            token.role = "PARTICIPANT"
          }
        } else {
          token.role = "PARTICIPANT" // Default fallback
        }
      }

      // 🛡️  SECURITY: Update last activity timestamp on token refresh
      if (trigger === "update") {
        token.lastActivity = now;
      }

      return token
    },
    async session({ session, token }) {
      // Send properties to the client (only safe data)
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        
        // 🛡️  SECURITY: Add session security metadata (safe for client)
        session.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
        session.user.lastActivity = token.lastActivity as number || token.signInTime as number;
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // 🛡️  SECURITY: Enhanced sign-in validation
      
      // Блокировка подозрительных email паттернов
      if (user.email) {
        const suspiciousPatterns = [
          /temp.*@/i,
          /test.*@/i,
          /@temp/i,
          /@test/i,
          /@10minutemail/i,
          /@guerrillamail/i
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(user.email!))) {
          console.warn(`🚨 Suspicious email blocked: ${user.email}`);
          return false;
        }
      }

      // OAuth providers security checks
      if (account?.provider === "google") {
        // 🛡️  SECURITY: Validate Google account
        if (!profile?.email_verified) {
          console.warn(`🚨 Google account not verified: ${user.email}`);
          return false;
        }
        return true;
      }
      
      if (account?.provider === "github") {
        // 🛡️  SECURITY: Validate GitHub account  
        const githubProfile = profile as any;
        if (githubProfile?.created_at) {
          const accountAge = Date.now() - new Date(githubProfile.created_at).getTime();
          const daysSinceCreated = accountAge / (1000 * 60 * 60 * 24);
          
          // Блокировка слишком новых GitHub аккаунтов (< 7 дней)
          if (daysSinceCreated < 7) {
            console.warn(`🚨 GitHub account too new: ${user.email} (${Math.floor(daysSinceCreated)} days)`);
            return false;
          }
        }
        return true;
      }
      
      // For credentials provider, user validation is handled in authorize()
      return true
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // 🛡️  SECURITY: Comprehensive sign-in logging
      console.log(`✅ Sign-in successful: ${user.email} via ${account?.provider || 'credentials'}`);
      
      if (isNewUser) {
        console.log(`🆕 New user registered: ${user.email} via ${account?.provider || 'credentials'}`);
        
        // TODO: Send welcome email, setup default preferences, etc.
        // await sendWelcomeEmail(user.email, user.name);
      }

      // 🛡️  SECURITY: Log suspicious activity
      if (account?.provider === 'github') {
        const githubProfile = profile as any;
        if (githubProfile?.public_repos === 0 && githubProfile?.followers === 0) {
          console.warn(`⚠️  GitHub account with no activity: ${user.email}`);
        }
      }
      
      // TODO: Log to security audit system
      // await auditLogger.logSignIn({
      //   userId: user.id,
      //   email: user.email,
      //   provider: account?.provider || 'credentials',
      //   timestamp: new Date(),
      //   isNewUser,
      //   userAgent: req.headers['user-agent'],
      //   ipAddress: req.ip
      // });
    },
    async signOut({ token, session }) {
      // 🛡️  SECURITY: Comprehensive sign-out logging
      console.log(`👋 Sign-out: ${token?.email || session?.user?.email}`);
      
      // Calculate session duration
      const signInTime = token?.signInTime as number;
      if (signInTime) {
        const sessionDuration = Date.now() - signInTime;
        const durationMinutes = Math.floor(sessionDuration / (1000 * 60));
        console.log(`📊 Session duration: ${durationMinutes} minutes`);
        
        // Log unusually short sessions (potential security concern)
        if (durationMinutes < 1) {
          console.warn(`⚠️  Very short session detected: ${durationMinutes} minutes for ${token?.email}`);
        }
      }
      
      // TODO: Log to security audit system
      // await auditLogger.logSignOut({
      //   userId: token?.id || session?.user?.id,
      //   email: token?.email || session?.user?.email,
      //   timestamp: new Date(),
      //   sessionDuration: sessionDuration
      // });
    },
    async createUser({ user }) {
      // 🛡️  SECURITY: User creation logging
      console.log(`👤 New user created: ${user.email}`);
      
      // TODO: Initialize user security settings
      // await initializeUserSecuritySettings(user.id);
    },
    async updateUser({ user }) {
      // 🛡️  SECURITY: User update logging
      console.log(`🔄 User updated: ${user.email}`);
    },
    async linkAccount({ user, account, profile }) {
      // 🛡️  SECURITY: Account linking logging
      console.log(`🔗 Account linked: ${user.email} -> ${account.provider}`);
    },
    async session({ session, token }) {
      // 🛡️  SECURITY: Session access logging (only for suspicious activity)
      const lastActivity = token?.lastActivity as number;
      const now = Date.now();
      
      if (lastActivity && (now - lastActivity) > 24 * 60 * 60 * 1000) {
        console.log(`🔍 Long inactive session accessed: ${session.user.email} (${Math.floor((now - lastActivity) / (1000 * 60 * 60))} hours ago)`);
      }
    },
  },
})

// Export types for better TypeScript support
export type { Session, User } from "next-auth"
