import { PrismaClient, BookingStatus, GroupTripStatus } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

interface QueryProfileResult {
  operation: string;
  duration: number;
  recordCount: number;
  efficiency: number; // records per ms
  query: string;
  timestamp: string;
}

const queryResults: QueryProfileResult[] = [];

// Listen to query events for profiling
prisma.$on('query', (e) => {
  console.log(`🔍 Query: ${e.query}`);
  console.log(`⏱️  Duration: ${e.duration}ms`);
  console.log(`📊 Params: ${e.params}`);
  console.log('---');
});

/**
 * Profile Group Trips query with complex includes
 */
async function profileGroupTripsQuery(): Promise<QueryProfileResult> {
  console.log('\n🚀 Profiling Group Trips Query (Complex Includes)...');
  
  const start = performance.now();
  
  const trips = await prisma.groupTrip.findMany({
    include: {
      bookings: {
        where: {
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        },
        include: {
          user: {
            include: {
              fisherProfile: true
            }
          }
        }
      },
      captain: {
        include: {
          fisherProfile: true
        }
      },
      skillCriteria: true,
      participantApprovals: {
        include: {
          participant: {
            include: {
              fisherProfile: true
            }
          }
        }
      },
      reviews: {
        include: {
          fromUser: true,
          toUser: true
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { timeSlot: 'asc' }
    ],
    take: 50 // Limit for profiling
  });
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    operation: 'GroupTrips.findMany (Complex)',
    duration,
    recordCount: trips.length,
    efficiency: trips.length / duration,
    query: 'groupTrip.findMany with 5 includes',
    timestamp: new Date().toISOString()
  };
}

/**
 * Profile fishing events query (similar complexity)
 */
async function profileFishingEventsQuery(): Promise<QueryProfileResult> {
  console.log('\n🚀 Profiling Fishing Events Query...');
  
  const start = performance.now();
  
  const events = await prisma.groupTrip.findMany({
    where: {
      status: GroupTripStatus.CONFIRMED
    },
    include: {
      bookings: {
        where: {
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        },
        include: {
          user: {
            include: {
              fisherProfile: true
            }
          }
        }
      },
      captain: {
        include: {
          fisherProfile: true
        }
      },
      skillCriteria: true,
      participantApprovals: {
        include: {
          participant: {
            include: {
              fisherProfile: true
            }
          }
        }
      }
    },
    orderBy: { date: 'asc' },
    take: 50
  });
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    operation: 'FishingEvents.findMany',
    duration,
    recordCount: events.length,
    efficiency: events.length / duration,
    query: 'groupTrip.findMany with status filter + includes',
    timestamp: new Date().toISOString()
  };
}

/**
 * Profile Review Analytics (potentially complex aggregations)
 */
async function profileReviewAnalyticsQuery(): Promise<QueryProfileResult> {
  console.log('\n🚀 Profiling Review Analytics Query...');
  
  const start = performance.now();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const reviews = await prisma.review.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo
      },
      verified: true
    },
    include: {
      fromUser: {
        select: {
          id: true,
          name: true,
          createdAt: true
        }
      },
      toUser: {
        select: {
          id: true,
          name: true,
          createdAt: true
        }
      },
      trip: {
        select: {
          id: true,
          date: true,
          timeSlot: true,
          pricePerPerson: true,
          status: true,
          createdAt: true,
          bookings: {
            select: {
              id: true,
              status: true,
              participants: true,
              createdAt: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    operation: 'ReviewAnalytics.findMany',
    duration,
    recordCount: reviews.length,
    efficiency: reviews.length / duration,
    query: 'review.findMany with date filter + complex includes',
    timestamp: new Date().toISOString()
  };
}

/**
 * Profile Transactions query (complex search and sorting)
 */
async function profileTransactionsQuery(): Promise<QueryProfileResult> {
  console.log('\n🚀 Profiling Transactions Query...');
  
  const start = performance.now();
  
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      trip: {
        select: {
          id: true,
          description: true,
          date: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    operation: 'Transactions.findMany',
    duration,
    recordCount: payments.length,
    efficiency: payments.length / duration,
    query: 'payment.findMany with date filter + includes',
    timestamp: new Date().toISOString()
  };
}

/**
 * Profile Count queries (often overlooked but can be slow)
 */
async function profileCountQueries(): Promise<QueryProfileResult[]> {
  console.log('\n🚀 Profiling Count Queries...');
  
  const results: QueryProfileResult[] = [];
  
  // Group trips count
  const start1 = performance.now();
  const tripsCount = await prisma.groupTrip.count({
    where: { status: GroupTripStatus.CONFIRMED }
  });
  const end1 = performance.now();
  
  results.push({
    operation: 'GroupTrips.count',
    duration: end1 - start1,
    recordCount: tripsCount,
    efficiency: tripsCount / (end1 - start1),
    query: 'groupTrip.count with status filter',
    timestamp: new Date().toISOString()
  });
  
  // Bookings count
  const start2 = performance.now();
  const bookingsCount = await prisma.booking.count({
    where: {
      status: BookingStatus.CONFIRMED
    }
  });
  const end2 = performance.now();
  
  results.push({
    operation: 'Bookings.count',
    duration: end2 - start2,
    recordCount: bookingsCount,
    efficiency: bookingsCount / (end2 - start2),
    query: 'booking.count with status filter',
    timestamp: new Date().toISOString()
  });
  
  return results;
}

/**
 * Test for N+1 query problems by fetching groups then their related data
 */
async function profileN1Problems(): Promise<QueryProfileResult> {
  console.log('\n🚀 Profiling Potential N+1 Problems...');
  
  const start = performance.now();
  
  // First, get trips without includes (potential N+1 setup)
  const trips = await prisma.groupTrip.findMany({
    take: 20
  });
  
  // Then fetch related data for each trip (this would be N+1)
  const tripsWithData = [];
  for (const trip of trips) {
    const bookings = await prisma.booking.findMany({
      where: { tripId: trip.id }
    });
    
    const captain = await prisma.user.findUnique({
      where: { id: trip.captainId },
      include: { fisherProfile: true }
    });
    
    tripsWithData.push({
      ...trip,
      bookings,
      captain
    });
  }
  
  const end = performance.now();
  const duration = end - start;
  
  return {
    operation: 'N+1 Problem Example',
    duration,
    recordCount: trips.length,
    efficiency: trips.length / duration,
    query: `${trips.length + 1} separate queries instead of 1 with includes`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run comprehensive query profiling
 */
async function runQueryProfiling(): Promise<void> {
  console.log('🔍 DATABASE QUERY PROFILING STARTED');
  console.log('=====================================\n');
  
  try {
    // Profile main complex queries
    const groupTripsResult = await profileGroupTripsQuery();
    queryResults.push(groupTripsResult);
    
    const fishingEventsResult = await profileFishingEventsQuery();
    queryResults.push(fishingEventsResult);
    
    const reviewAnalyticsResult = await profileReviewAnalyticsQuery();
    queryResults.push(reviewAnalyticsResult);
    
    const transactionsResult = await profileTransactionsQuery();
    queryResults.push(transactionsResult);
    
    // Profile count queries
    const countResults = await profileCountQueries();
    queryResults.push(...countResults);
    
    // Profile N+1 problems
    const n1Result = await profileN1Problems();
    queryResults.push(n1Result);
    
    // Sort results by duration (slowest first)
    queryResults.sort((a, b) => b.duration - a.duration);
    
    // Generate report
    console.log('\n📊 QUERY PERFORMANCE ANALYSIS REPORT');
    console.log('====================================');
    console.log(`Total queries analyzed: ${queryResults.length}`);
    console.log(`Analysis timestamp: ${new Date().toISOString()}\n`);
    
    console.log('🐌 SLOWEST QUERIES (Top Performance Issues):');
    console.log('---------------------------------------------');
    
    queryResults.forEach((result, index) => {
      const status = result.duration > 1000 ? '🔴' : result.duration > 500 ? '🟡' : '🟢';
      console.log(`${index + 1}. ${status} ${result.operation}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`   Records: ${result.recordCount}`);
      console.log(`   Efficiency: ${result.efficiency.toFixed(2)} records/ms`);
      console.log(`   Query: ${result.query}`);
      console.log('');
    });
    
    // Identify critical issues
    const criticalQueries = queryResults.filter(q => q.duration > 1000);
    const slowQueries = queryResults.filter(q => q.duration > 500 && q.duration <= 1000);
    
    console.log('\n⚠️  CRITICAL ISSUES (>1000ms):');
    console.log('------------------------------');
    if (criticalQueries.length === 0) {
      console.log('✅ No critical query performance issues found!');
    } else {
      criticalQueries.forEach(q => {
        console.log(`🔴 ${q.operation}: ${q.duration.toFixed(2)}ms`);
      });
    }
    
    console.log('\n⚡ OPTIMIZATION OPPORTUNITIES (>500ms):');
    console.log('---------------------------------------');
    if (slowQueries.length === 0) {
      console.log('✅ No significant optimization opportunities found!');
    } else {
      slowQueries.forEach(q => {
        console.log(`🟡 ${q.operation}: ${q.duration.toFixed(2)}ms`);
      });
    }
    
    console.log('\n🎯 OPTIMIZATION RECOMMENDATIONS:');
    console.log('--------------------------------');
    console.log('1. Add database indexes for frequently queried fields');
    console.log('2. Optimize complex includes by reducing nested levels');
    console.log('3. Use pagination for large result sets');
    console.log('4. Consider caching for analytics queries');
    console.log('5. Replace N+1 patterns with proper includes');
    console.log('6. Add query-specific optimizations for slowest queries');
    
  } catch (error) {
    console.error('❌ Error during query profiling:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Query profiling completed and database connection closed.');
  }
}

// Run the profiling
if (require.main === module) {
  runQueryProfiling()
    .then(() => {
      console.log('🎉 Database query profiling completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Query profiling failed:', error);
      process.exit(1);
    });
}

export { runQueryProfiling, queryResults };
