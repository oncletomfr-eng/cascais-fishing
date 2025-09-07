// Production-ready Prisma Client with PostgreSQL Adapter for Supabase
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
  connectionPool: Pool | undefined
}

// Production-ready Supabase connection URLs with optimized pooling
const getProductionDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  
  // For Supabase with connection pooling (transaction mode), ensure proper parameters
  if (process.env.NODE_ENV === 'production') {
    const url = new URL(dbUrl)
    
    // Ensure essential connection pooling parameters for Supabase Supavisor
    url.searchParams.set('pgbouncer', 'true')
    url.searchParams.set('connection_limit', '1') 
    url.searchParams.set('pool_timeout', '30')
    url.searchParams.set('connect_timeout', '30')
    
    return url.toString()
  }
  
  return dbUrl
}

// Create production-ready Prisma client with PostgreSQL adapter
const createPrismaClient = () => {
  const connectionString = getProductionDatabaseUrl()
  
  // Create PostgreSQL connection pool optimized for serverless
  const connectionPool = new Pool({
    connectionString,
    // Optimized for serverless functions
    max: 1, // Single connection for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  
  // Store connection pool globally to prevent recreation
  globalForPrisma.connectionPool = connectionPool
  
  // Create Prisma adapter for PostgreSQL
  const adapter = new PrismaPg(connectionPool)
  
  // Initialize Prisma Client with adapter (WASM-free with queryCompiler preview)
  console.log('🔧 Creating PrismaClient with PostgreSQL adapter - NO WASM FILES SHOULD BE LOADED')
  console.log('🔧 Adapter type:', adapter.constructor.name)
  console.log('🔧 Environment:', process.env.NODE_ENV)
  console.log('🔧 Database URL type:', typeof process.env.DATABASE_URL)
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
