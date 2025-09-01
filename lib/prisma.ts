import { PrismaClient } from '@prisma/client'

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

export const prisma = globalForPrisma.prisma || 
  (process.env.NODE_ENV === 'production' 
    ? new PrismaClient({
        datasources: {
          db: {
            url: getProductionDatabaseUrl()
          }
        }
      })
    : new PrismaClient()
  )

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
