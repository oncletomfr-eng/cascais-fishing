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
              // Default sources with canvas-confetti support
              "default-src 'self' blob:",
              // Scripts: self, Stripe, canvas-confetti blob support, and inline scripts (needed for Next.js)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://hooks.stripe.com",
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
    // Enable image optimization for production performance
    unoptimized: false,
    // Configure allowed external image domains
    domains: [
      'images.unsplash.com',
      'res.cloudinary.com', 
      'avatars.githubusercontent.com',
      'via.placeholder.com',
      'picsum.photos',
      'www.cascaisfishing.com'
    ],
    // Supported image formats (optimized order for performance)
    formats: ['image/webp', 'image/avif'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable placeholder blur data URLs
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    // Minimize layout shift with proper placeholder
    minimumCacheTTL: 31536000 // 1 year for static images
  },
  // Production optimizations for Vercel
  poweredByHeader: false,
  // Increase timeout for complex static generation
  staticPageGenerationTimeout: 300,
  // Disable preloading to reduce memory usage
  experimental: {
    // Disable preloading to reduce memory usage
    preloadEntriesOnStart: false,
    // Enable Webpack memory optimizations (Next.js v15.0.0+)
    webpackMemoryOptimizations: true,
    // Enable server components HMR cache for local development
    serverComponentsHmrCache: true,
    // Optimize package imports to reduce bundle size
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
    // Note: Turbopack is enabled via --turbo flag in dev command
    // Legacy experimental.turbo configuration removed (deprecated in Next.js 15+)
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

    // Minimal serverless optimization - keep it safe
    if (!dev && isServer) {
      // Only exclude obvious development files
      config.resolve.alias = {
        ...config.resolve.alias,
        '__tests__': false,
        'e2e-tests': false,
      };

      // 🔥 CRITICAL FIX: Prisma WASM files in Vercel serverless
      // Fixes: ENOENT: no such file or directory, open '.../query_compiler_bg.wasm'
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
        topLevelAwait: true
      };

      // Handle WASM files properly for serverless deployment
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/wasm/[name].[hash][ext]'
        }
      });

      // Ensure Prisma client is externalized correctly
      config.externals = [...(config.externals || []), '@prisma/client'];
    }

    // Tree shaking improvements
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
}

export default nextConfig
