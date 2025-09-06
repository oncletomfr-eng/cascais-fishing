import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Production-ready Supabase connection URLs  
const getProductionDatabaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use Transaction pooler for serverless functions with pgbouncer=true to disable prepared statements
    return "postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true"
  }
  return process.env.DATABASE_URL
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
