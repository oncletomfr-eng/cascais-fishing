/**
 * Basic Auth Module - Placeholder for authentication functionality
 * This module provides basic authentication utilities for the Cascais Fishing platform
 */

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface Session {
  user?: User;
  expires: string;
}

/**
 * Mock authentication function
 * In a real implementation, this would handle actual authentication logic
 */
export async function auth(): Promise<Session | null> {
  // Mock session for development
  return {
    user: {
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@cascaisfishing.com',
      image: null
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  };
}

/**
 * Mock sign in function
 * In a real implementation, this would handle sign in logic
 */
export async function signIn(provider?: string, options?: any): Promise<void> {
  console.log('Mock signIn called with provider:', provider, 'options:', options);
  // In a real app, this would redirect to authentication provider
}

/**
 * Mock sign out function
 */
export async function signOut(): Promise<void> {
  console.log('Mock signOut called');
  // In a real app, this would handle sign out logic
}

/**
 * NextAuth handlers
 * Mock handlers for development
 */
export const handlers = {
  GET: async (request: Request) => {
    return new Response(JSON.stringify({ message: 'Mock GET handler' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  },
  POST: async (request: Request) => {
    return new Response(JSON.stringify({ message: 'Mock POST handler' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Re-export common auth utilities
export { auth as default };
