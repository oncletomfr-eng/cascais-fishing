import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

/**
 * Performance-critical database indexes based on query profiling results
 */
const RECOMMENDED_INDEXES = [
  // Group Trips - most queried table
  {
    table: 'group_trips',
    fields: ['status'],
    reason: 'Frequently filtered by status in group-trips and fishing-events APIs'
  },
  {
    table: 'group_trips',
    fields: ['date', 'status'],
    reason: 'Compound index for date filtering with status'
  },
  {
    table: 'group_trips',
    fields: ['captainId', 'status'],
    reason: 'Captain-specific trip queries with status filtering'
  },
  
  // Group Bookings - heavy joins in queries
  {
    table: 'group_bookings',
    fields: ['status'],
    reason: 'Frequently filtered by booking status (PENDING, CONFIRMED)'
  },
  {
    table: 'group_bookings',
    fields: ['userId', 'status'],
    reason: 'User-specific booking queries with status filtering'
  },
  
  // Users - basic user queries
  {
    table: 'users',
    fields: ['role'],
    reason: 'Role-based filtering in admin and authorization queries'
  },
  {
    table: 'users',
    fields: ['createdAt'],
    reason: 'User registration date filtering and analytics'
  },
  
  // Fisher Profiles - complex profile queries
  {
    table: 'fisher_profiles',
    fields: ['experienceLevel'],
    reason: 'Filtering by experience level in matching queries'
  },
  {
    table: 'fisher_profiles',
    fields: ['rating'],
    reason: 'Sorting and filtering by rating in recommendations'
  },
  {
    table: 'fisher_profiles',
    fields: ['isActive'],
    reason: 'Active profile filtering in user searches'
  },
  {
    table: 'fisher_profiles',
    fields: ['userId', 'isActive'],
    reason: 'Compound index for active user profile lookups'
  },
  
  // Reviews - analytics heavy
  {
    table: 'reviews',
    fields: ['verified'],
    reason: 'Filtering by verified reviews in analytics'
  },
  {
    table: 'reviews',
    fields: ['tripId'],
    reason: 'Trip-specific review queries'
  },
  {
    table: 'reviews',
    fields: ['fromUserId'],
    reason: 'Reviews given by user queries'
  },
  {
    table: 'reviews',
    fields: ['toUserId'],
    reason: 'Reviews received by user queries'
  },
  {
    table: 'reviews',
    fields: ['createdAt', 'verified'],
    reason: 'Time-based verified review analytics'
  },
  
  // Payments - transaction queries
  {
    table: 'payments',
    fields: ['status'],
    reason: 'Payment status filtering in transaction queries'
  },
  {
    table: 'payments',
    fields: ['type'],
    reason: 'Payment type filtering'
  },
  {
    table: 'payments',
    fields: ['userId', 'status'],
    reason: 'User-specific payment queries with status'
  },
  {
    table: 'payments',
    fields: ['createdAt', 'status'],
    reason: 'Time-based payment analytics with status filtering'
  },
  
  // Participant Approvals - approval system
  {
    table: 'participant_approvals',
    fields: ['status'],
    reason: 'Approval status filtering'
  },
  {
    table: 'participant_approvals',
    fields: ['participantId'],
    reason: 'Participant-specific approval queries'
  },
  {
    table: 'participant_approvals',
    fields: ['tripId', 'status'],
    reason: 'Trip approval status queries'
  }
];

/**
 * Check which indexes already exist in the database
 */
async function checkExistingIndexes(): Promise<Set<string>> {
  console.log('🔍 Checking existing database indexes...');
  
  const existingIndexes = new Set<string>();
  
  try {
    // Query PostgreSQL system tables for existing indexes
    const indexes = await prisma.$queryRaw<Array<{
      schemaname: string;
      tablename: string;
      indexname: string;
      indexdef: string;
    }>>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    console.log(`📊 Found ${indexes.length} existing indexes`);
    
    indexes.forEach(index => {
      const key = `${index.tablename}:${index.indexname}`;
      existingIndexes.add(key);
      console.log(`   📋 ${index.tablename}.${index.indexname}`);
    });
    
    return existingIndexes;
    
  } catch (error) {
    console.error('❌ Error checking existing indexes:', error);
    return existingIndexes;
  }
}

/**
 * Generate index names based on table and fields
 */
function generateIndexName(table: string, fields: string[]): string {
  const fieldStr = fields.join('_');
  return `idx_${table}_${fieldStr}`;
}

/**
 * Create missing indexes
 */
async function createMissingIndexes(): Promise<void> {
  console.log('\n🏗️  Creating missing performance indexes...');
  
  const existingIndexes = await checkExistingIndexes();
  const createIndexPromises: Array<Promise<void>> = [];
  const indexesToCreate: typeof RECOMMENDED_INDEXES = [];
  
  // Check which indexes need to be created
  for (const indexConfig of RECOMMENDED_INDEXES) {
    const indexName = generateIndexName(indexConfig.table, indexConfig.fields);
    const indexKey = `${indexConfig.table}:${indexName}`;
    
    if (!existingIndexes.has(indexKey)) {
      indexesToCreate.push(indexConfig);
      console.log(`📝 Planned: ${indexName} on ${indexConfig.table}(${indexConfig.fields.join(', ')})`);
    } else {
      console.log(`✅ Exists: Index on ${indexConfig.table}(${indexConfig.fields.join(', ')})`);
    }
  }
  
  if (indexesToCreate.length === 0) {
    console.log('🎉 All recommended indexes already exist!');
    return;
  }
  
  console.log(`\n🚀 Creating ${indexesToCreate.length} new indexes...\n`);
  
  // Create indexes sequentially to avoid connection issues
  for (const indexConfig of indexesToCreate) {
    const indexName = generateIndexName(indexConfig.table, indexConfig.fields);
    const fieldsStr = indexConfig.fields.join(', ');
    
    try {
      const start = performance.now();
      
      console.log(`🔨 Creating index ${indexName}...`);
      
      // Create the index using raw SQL
      await prisma.$executeRaw`
        CREATE INDEX CONCURRENTLY ${indexName} 
        ON ${indexConfig.table} (${fieldsStr})
      `.catch(async () => {
        // Fallback without CONCURRENTLY if it fails
        console.log(`   ⚠️  CONCURRENTLY failed, creating without CONCURRENTLY...`);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX ${indexName} 
          ON ${indexConfig.table} (${fieldsStr})
        `);
      });
      
      const duration = performance.now() - start;
      
      console.log(`   ✅ Created in ${duration.toFixed(2)}ms - ${indexConfig.reason}`);
      
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`   ℹ️  Index ${indexName} already exists`);
      } else {
        console.error(`   ❌ Failed to create ${indexName}:`, error.message);
      }
    }
  }
}

/**
 * Test index performance improvement
 */
async function testIndexPerformance(): Promise<void> {
  console.log('\n🧪 Testing index performance improvements...');
  
  const tests = [
    {
      name: 'Group Trips by Status',
      query: () => prisma.groupTrip.findMany({
        where: { status: 'CONFIRMED' },
        take: 50
      })
    },
    {
      name: 'Bookings by Status',
      query: () => prisma.groupBooking.findMany({
        where: { status: 'CONFIRMED' },
        take: 50
      })
    },
    {
      name: 'Verified Reviews',
      query: () => prisma.review.findMany({
        where: { verified: true },
        take: 50
      })
    },
    {
      name: 'Active Fisher Profiles',
      query: () => prisma.fisherProfile.findMany({
        where: { isActive: true },
        take: 50
      })
    },
    {
      name: 'Recent Payments',
      query: () => prisma.payment.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    }
  ];
  
  for (const test of tests) {
    try {
      const start = performance.now();
      const result = await test.query();
      const duration = performance.now() - start;
      
      console.log(`📊 ${test.name}: ${duration.toFixed(2)}ms (${result.length} records)`);
      
    } catch (error) {
      console.error(`❌ Test failed for ${test.name}:`, error);
    }
  }
}

/**
 * Generate Prisma schema updates for the indexes
 */
function generateSchemaUpdates(): void {
  console.log('\n📝 PRISMA SCHEMA UPDATES NEEDED:');
  console.log('================================');
  console.log('Add these @@index declarations to your Prisma schema:\n');
  
  const groupedByTable = RECOMMENDED_INDEXES.reduce((acc, index) => {
    if (!acc[index.table]) acc[index.table] = [];
    acc[index.table].push(index);
    return acc;
  }, {} as Record<string, typeof RECOMMENDED_INDEXES>);
  
  Object.entries(groupedByTable).forEach(([table, indexes]) => {
    console.log(`// ${table} model`);
    indexes.forEach(index => {
      const fieldsStr = index.fields.length === 1 
        ? index.fields[0] 
        : `[${index.fields.join(', ')}]`;
      console.log(`@@index(${fieldsStr}) // ${index.reason}`);
    });
    console.log('');
  });
}

/**
 * Main execution function
 */
async function addDatabaseIndexes(): Promise<void> {
  console.log('🏗️  DATABASE INDEXES OPTIMIZATION');
  console.log('==================================\n');
  
  try {
    await createMissingIndexes();
    await testIndexPerformance();
    generateSchemaUpdates();
    
    console.log('\n✅ Database indexes optimization completed!');
    console.log('\n🎯 PERFORMANCE IMPACT:');
    console.log('• Faster WHERE clause filtering');
    console.log('• Improved JOIN performance');
    console.log('• Better ORDER BY execution');
    console.log('• Reduced query execution time for high-frequency operations');
    console.log('\n⚠️  Remember to update your Prisma schema with the @@index declarations above!');
    
  } catch (error) {
    console.error('❌ Error during database indexes optimization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the optimization
if (require.main === module) {
  addDatabaseIndexes()
    .then(() => {
      console.log('🎉 Database indexes optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database indexes optimization failed:', error);
      process.exit(1);
    });
}

export { addDatabaseIndexes, RECOMMENDED_INDEXES };
