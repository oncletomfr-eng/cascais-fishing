/** @type {import('next').NextConfig} */
const nextConfig = {
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
      'recharts',
      'react-use',
      'react-icons',
      'stream-chat',
      'stream-chat-react'
    ],
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
}

export default nextConfig
