import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Production-ready Supabase connection URLs
const getProductionDatabaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use Transaction pooler for serverless functions (preferred)
    return "postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
  }
  return process.env.DATABASE_URL
}

const prismaConfig = process.env.NODE_ENV === 'production' 
  ? {
      datasources: {
        db: {
          url: getProductionDatabaseUrl()
        }
      }
    }
  : {}

export const prisma = globalForPrisma.prisma || new PrismaClient(prismaConfig)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
