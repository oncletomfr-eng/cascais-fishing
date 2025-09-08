/**
 * NextAuth v5 Configuration for Cascais Fishing Platform
 * Production-ready authentication with multiple providers
 * Enhanced with OAuth configuration validation and error handling
 */

import NextAuth from "next-auth"
// Temporarily removed PrismaAdapter to fix Vercel Edge Runtime issue
// import { PrismaAdapter } from "@auth/prisma-adapter"
// import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"

// 🛡️ SECURITY: Validate OAuth configuration to prevent production failures
const validateOAuthConfig = () => {
  const requiredVars = [
    { key: 'GOOGLE_CLIENT_ID', value: process.env.GOOGLE_CLIENT_ID },
    { key: 'GOOGLE_CLIENT_SECRET', value: process.env.GOOGLE_CLIENT_SECRET },
    { key: 'GITHUB_CLIENT_ID', value: process.env.GITHUB_CLIENT_ID },
    { key: 'GITHUB_CLIENT_SECRET', value: process.env.GITHUB_CLIENT_SECRET },
    { key: 'NEXTAUTH_URL', value: process.env.NEXTAUTH_URL },
    { key: 'AUTH_SECRET', value: process.env.AUTH_SECRET }
  ];
  
  const missing = requiredVars.filter(({ value }) => !value || value.length < 5);
  const invalid = requiredVars.filter(({ value }) => value && (
    value.includes('demo') || 
    value.includes('please-configure') || 
    value.includes('your_') ||
    value === 'undefined'
  ));
  
  if (missing.length > 0) {
    console.error('🚨 MISSING OAuth Environment Variables:', missing.map(v => v.key));
    console.error('📋 OAuth authentication will fail until these are configured in Vercel dashboard');
  }
  
  if (invalid.length > 0) {
    console.error('⚠️  INVALID OAuth Environment Variables (demo/placeholder values):', invalid.map(v => v.key));
    console.error('🔧 Replace with actual OAuth credentials from Google/GitHub developer consoles');
  }
  
  return { missing: missing.length === 0, valid: invalid.length === 0 };
};

// Run validation in all environments to catch configuration issues early
const oauthStatus = validateOAuthConfig();

// 🛡️ Enhanced logging for OAuth debugging
if (process.env.NODE_ENV === 'production') {
  console.log('🔐 OAuth Configuration Status:', {
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    githubConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    nextauthConfigured: !!(process.env.NEXTAUTH_URL && process.env.AUTH_SECRET),
    allValid: oauthStatus.missing && oauthStatus.valid
  });
}

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
    // 🔐 SECURITY: NextAuth v5 uses secure JWT defaults automatically
    // Removed encode/decode undefined - causes "o.encode is not a function" error
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
  // 🔒 CSRF protection is built-in with NextAuth v5
  pages: {
    signIn: "/auth/signin",
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
          const authUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://www.cascaisfishing.com'
          const apiEndpoint = `${authUrl}/api/auth/verify-credentials`
          console.log(`🔍 [AUTH DEBUG] Attempting credentials verification:`)
          console.log(`🔍 [AUTH DEBUG] Email: ${credentials.email}`)
          console.log(`🔍 [AUTH DEBUG] AUTH_URL: ${authUrl}`)
          console.log(`🔍 [AUTH DEBUG] API Endpoint: ${apiEndpoint}`)
          
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          console.log(`🔍 [AUTH DEBUG] Response status: ${response.status}`)
          console.log(`🔍 [AUTH DEBUG] Response ok: ${response.ok}`)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.log(`🔍 [AUTH DEBUG] Error response: ${errorText}`)
            return null
          }

          const user = await response.json()
          console.log(`🔍 [AUTH DEBUG] User data received:`, JSON.stringify(user, null, 2))
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role || "PARTICIPANT", // Default role if not provided
          }
        } catch (error) {
          console.error("🔍 [AUTH DEBUG] Authentication error:", error)
          console.error("🔍 [AUTH DEBUG] Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined
          })
          return null
        }
      }
    }),

    // GitHub OAuth - Enhanced with configuration validation
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // 🛡️ SECURITY: Additional OAuth settings for production
      authorization: {
        params: {
          scope: "read:user user:email",
          // Add additional security parameters
          prompt: "consent",
        }
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          // 🛡️ SECURITY: Add GitHub-specific user data
          role: "PARTICIPANT", // Default role for OAuth users
          provider: "github"
        }
      }
    }),

    // Google OAuth - Enhanced with configuration validation
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // 🛡️ SECURITY: Additional OAuth settings for production
      authorization: {
        params: {
          scope: "openid email profile",
          // Force account selection for security
          prompt: "select_account",
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // 🛡️ SECURITY: Add Google-specific user data  
          role: "PARTICIPANT", // Default role for OAuth users
          provider: "google",
          emailVerified: profile.email_verified
        }
      }
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
        session.user.role = (token.role as string) as "PARTICIPANT" | "CAPTAIN" | "ADMIN"
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        
        // 🛡️  SECURITY: Session expiry handled automatically by NextAuth
        // Note: lastActivity removed as it's not part of User type
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // 🛡️  SECURITY: Enhanced sign-in validation with OAuth error handling
      
      try {
        // 🚨 CRITICAL: Enhanced OAuth error detection and logging
        if (account?.error) {
          console.error('🚨 OAuth Sign-in Error:', {
            provider: account.provider,
            error: account.error,
            errorDescription: account.error_description,
            email: user.email,
            timestamp: new Date().toISOString()
          });
          
          // Specific error handling for common OAuth issues
          const errorStr = String(account.error);
          if (errorStr.includes('invalid_client') || errorStr.includes('client_id')) {
            console.error('🚨 CRITICAL: OAuth client_id missing or invalid - check environment variables');
            console.error('📋 Required variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET');
            return false;
          }
          
          if (errorStr.includes('redirect_uri_mismatch')) {
            console.error('🚨 CRITICAL: OAuth redirect URI mismatch - check OAuth app configuration');
            console.error('📋 Expected: https://www.cascaisfishing.com/api/auth/callback/' + account.provider);
            return false;
          }
          
          if (errorStr.includes('access_denied')) {
            console.warn('👤 User denied OAuth authorization:', user.email);
            return false;
          }
        }
        
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
          
          // 🛡️ Log successful Google OAuth
          console.log(`✅ Google OAuth successful: ${user.email}`);
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
          
          // 🛡️ Log successful GitHub OAuth
          console.log(`✅ GitHub OAuth successful: ${user.email}`);
          return true;
        }
        
        // For credentials provider, user validation is handled in authorize()
        return true;
        
      } catch (error) {
        // 🚨 CRITICAL: Catch and log any unexpected sign-in errors
        console.error('🚨 CRITICAL Sign-in Error:', {
          error: error instanceof Error ? error.message : String(error),
          user: user.email,
          provider: account?.provider,
          timestamp: new Date().toISOString()
        });
        
        // Allow sign-in to continue unless it's a critical OAuth config error
        if (error instanceof Error && error.message.includes('client_id')) {
          return false;
        }
        
        return true;
      }
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
    async signOut(params) {
      // 🛡️  SECURITY: Comprehensive sign-out logging
      const token = 'token' in params ? params.token : null;
      const session = 'session' in params ? params.session : null;
      const userEmail = token ? (token.email as string) : 'unknown';
      console.log(`👋 Sign-out: ${userEmail}`);
      
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
