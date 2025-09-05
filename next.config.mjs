/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production Environment Variables for WebSocket and API URLs
  env: {
    NEXT_PUBLIC_WS_URL_PRODUCTION: 'wss://www.cascaisfishing.com/api/group-trips/ws',
    NEXT_PUBLIC_API_URL_PRODUCTION: 'https://www.cascaisfishing.com',
  },
  // Content Security Policy Headers for Stripe Integration
  // Task 5.1: Implement CSP headers for security
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Default sources
              "default-src 'self'",
              // Scripts: self, Stripe, and inline scripts (needed for Next.js)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://hooks.stripe.com",
              // Styles: self, inline styles, and Stripe
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self, data, blob, and common image CDNs
              "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://avatars.githubusercontent.com",
              // Fonts: self and Google Fonts
              "font-src 'self' https://fonts.gstatic.com data:",
              // Connections: self, Stripe APIs, and WebSocket connections
              "connect-src 'self' https://api.stripe.com https://checkout.stripe.com wss:",
              // Frames: Stripe checkout and payment pages
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://pay.stripe.com",
              // Child sources for Stripe embedded components
              "child-src 'self' https://js.stripe.com",
              // Form actions: self and Stripe
              "form-action 'self' https://checkout.stripe.com",
              // Media: self
              "media-src 'self'",
              // Workers: self
              "worker-src 'self' blob:",
              // Manifest: self
              "manifest-src 'self'",
              // Base URI: self
              "base-uri 'self'",
            ].join('; ')
          },
          // Additional security headers
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)'
          }
        ]
      }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable preloading to reduce memory usage
  experimental: {
    preloadEntriesOnStart: false,
    // Enable Webpack memory optimizations (Next.js v15.0.0+)
    webpackMemoryOptimizations: true,
    // Enable server components HMR cache for local development
    serverComponentsHmrCache: true,
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash-es',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      'recharts',
      'react-use',
      'react-icons',
      'stream-chat',
      'stream-chat-react',
      'framer-motion',
      '@prisma/client',
      'stripe'
    ],
    // Turbopack is now enabled via --turbo flag in dev command
    // Removed complex turbo rules configuration (deprecated in Next.js 15+)
  },
  // On-demand entries optimization for dev server
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Enhanced logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Webpack optimizations for reducing bundle size
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer for debugging (only in development)
    if (!dev && !isServer) {
      // Optimize for smaller bundle sizes
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate vendor bundle for large libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 200000, // 200KB max per chunk
          },
          // Separate MUI bundle
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            priority: 10,
            maxSize: 200000,
          },
          // Separate Prisma bundle
          prisma: {
            test: /[\\/]node_modules[\\/]@prisma[\\/]|[\\/]node_modules[\\/]\.prisma[\\/]/,
            name: 'prisma',
            chunks: 'all',
            priority: 15,
            maxSize: 200000,
          },
          // Icons bundle
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|react-icons|@mui\/icons-material)[\\/]/,
            name: 'icons',
            chunks: 'all',
            priority: 12,
            maxSize: 200000,
          },
        },
      };
    }

    // ULTRA-AGGRESSIVE exclusion for serverless functions
    if (!dev && isServer) {
      // Exclude ALL non-essential paths from serverless bundles
      config.resolve.alias = {
        ...config.resolve.alias,
        // Test and development files
        '__tests__': false,
        'e2e-tests': false,
        'test-results': false,
        'scripts': false,
        'docs': false,
        'tmp': false,
        // Debug files
        'debug-module-resolution': false,
        'debug-filesystem': false, 
        'debug-webpack-resolution': false,
        'run-debug-analysis': false,
        // Large development dependencies
        '@types/node': false,
        'typescript': false,
      };

      // Add webpack rules to ignore large files
      config.module.rules.push({
        test: /\.(md|txt|log|map)$/,
        type: 'asset/resource',
        generator: {
          emit: false,
        },
      });
      
      // Optimize chunk size limits
      if (config.optimization) {
        config.optimization.splitChunks = {
          ...config.optimization.splitChunks,
          maxSize: 200000, // 200KB max per chunk
          minChunks: 2,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            default: false,
            vendors: false,
            // More aggressive chunking
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
              maxSize: 150000,
            },
          },
        };
      }
    }

    // Tree shaking improvements
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
}

export default nextConfig
