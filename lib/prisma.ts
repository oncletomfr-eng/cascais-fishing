import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Production-ready Supabase connection URLs  
const getProductionDatabaseUrl = () => {
  // Always use environment variable for maximum security and flexibility
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  
  // For production, ensure pgbouncer is enabled for serverless compatibility
  if (process.env.NODE_ENV === 'production' && !dbUrl.includes('pgbouncer=true')) {
    const separator = dbUrl.includes('?') ? '&' : '?'
    return `${dbUrl}${separator}pgbouncer=true`
  }
  
  return dbUrl
}

// Create PostgreSQL adapter for QueryCompiler + driverAdapters
const createPrismaClient = () => {
  const connectionString = getProductionDatabaseUrl()
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }
  
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
