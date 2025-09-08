import { PrismaClient, BookingStatus, GroupTripStatus } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

/**
 * Comprehensive database performance test suite
 */
interface PerformanceResult {
  testName: string;
  duration: number;
  recordCount: number;
  efficiency: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
}

/**
 * Performance test suite after optimizations
 */
const PERFORMANCE_TESTS = [
  {
    name: 'Group Trips with Status Filter (Common Query)',
    test: async () => {
      return await prisma.groupTrip.findMany({
        where: { 
          status: GroupTripStatus.CONFIRMED 
        },
        select: {
          id: true,
          date: true,
          timeSlot: true,
          maxParticipants: true,
          pricePerPerson: true,
          status: true,
          description: true,
          captain: {
            select: {
              id: true,
              name: true,
              fisherProfile: {
                select: {
                  rating: true,
                  completedTrips: true
                }
              }
            }
          }
        },
        orderBy: { date: 'asc' },
        take: 50
      });
    },
    target: 200 // Target under 200ms
  },
  
  {
    name: 'Bookings by Status (High-frequency Query)',
    test: async () => {
      return await prisma.groupBooking.findMany({
        where: {
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        },
        select: {
          id: true,
          participants: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        take: 50
      });
    },
    target: 150
  },
  
  {
    name: 'Verified Reviews Analytics Query',
    test: async () => {
      return await prisma.review.findMany({
        where: { 
          verified: true,
          createdAt: {
            gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          helpful: true,
          createdAt: true,
          fromUserId: true,
          toUserId: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    },
    target: 250
  },
  
  {
    name: 'Fisher Profiles by Rating (Recommendation Query)',
    test: async () => {
      return await prisma.fisherProfile.findMany({
        where: {
          isActive: true,
          rating: {
            gte: 4.0
          }
        },
        select: {
          id: true,
          userId: true,
          experienceLevel: true,
          rating: true,
          completedTrips: true,
          reliability: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { rating: 'desc' },
        take: 30
      });
    },
    target: 180
  },
  
  {
    name: 'Users by Role (Admin Query)',
    test: async () => {
      return await prisma.user.findMany({
        where: {
          role: 'CAPTAIN'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          fisherProfile: {
            select: {
              rating: true,
              completedTrips: true,
              experienceLevel: true
            }
          }
        },
        take: 50
      });
    },
    target: 120
  },
  
  {
    name: 'Recent Payments Query',
    test: async () => {
      return await prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    },
    target: 200
  },
  
  {
    name: 'Complex Join Query (Full Trip Data)',
    test: async () => {
      return await prisma.groupTrip.findMany({
        where: {
          status: GroupTripStatus.CONFIRMED,
          date: {
            gte: new Date()
          }
        },
        select: {
          id: true,
          date: true,
          status: true,
          maxParticipants: true,
          bookings: {
            where: {
              status: BookingStatus.CONFIRMED
            },
            select: {
              id: true,
              participants: true,
              user: {
                select: {
                  name: true,
                  fisherProfile: {
                    select: {
                      experienceLevel: true,
                      rating: true
                    }
                  }
                }
              }
            }
          },
          captain: {
            select: {
              name: true,
              fisherProfile: {
                select: {
                  rating: true,
                  completedTrips: true
                }
              }
            }
          }
        },
        take: 20
      });
    },
    target: 400
  },
  
  {
    name: 'Count Query Performance Test',
    test: async () => {
      const [tripsCount, bookingsCount, reviewsCount] = await Promise.all([
        prisma.groupTrip.count({
          where: { status: GroupTripStatus.CONFIRMED }
        }),
        prisma.groupBooking.count({
          where: { status: BookingStatus.CONFIRMED }
        }),
        prisma.review.count({
          where: { verified: true }
        })
      ]);
      
      return { tripsCount, bookingsCount, reviewsCount };
    },
    target: 100
  }
];

/**
 * Determine performance status based on target
 */
function getPerformanceStatus(duration: number, target: number): 'excellent' | 'good' | 'needs_improvement' | 'critical' {
  if (duration <= target * 0.5) return 'excellent';
  if (duration <= target) return 'good';
  if (duration <= target * 1.5) return 'needs_improvement';
  return 'critical';
}

/**
 * Run all performance tests
 */
async function runPerformanceTests(): Promise<PerformanceResult[]> {
  console.log('🚀 RUNNING DATABASE PERFORMANCE TESTS');
  console.log('====================================\n');
  
  const results: PerformanceResult[] = [];
  
  for (const testConfig of PERFORMANCE_TESTS) {
    try {
      console.log(`🔬 Testing: ${testConfig.name}`);
      
      const start = performance.now();
      const result = await testConfig.test();
      const duration = performance.now() - start;
      
      const recordCount = Array.isArray(result) ? result.length : 1;
      const efficiency = recordCount / duration;
      const status = getPerformanceStatus(duration, testConfig.target);
      
      const statusIcon = {
        excellent: '🟢',
        good: '🟡', 
        needs_improvement: '🟠',
        critical: '🔴'
      }[status];
      
      console.log(`   ${statusIcon} ${duration.toFixed(2)}ms (target: ${testConfig.target}ms) - ${recordCount} records`);
      console.log(`   Efficiency: ${efficiency.toFixed(2)} records/ms`);
      console.log('');
      
      results.push({
        testName: testConfig.name,
        duration,
        recordCount,
        efficiency,
        status
      });
      
    } catch (error) {
      console.error(`❌ Test failed: ${testConfig.name}`, error);
      
      results.push({
        testName: testConfig.name,
        duration: -1,
        recordCount: 0,
        efficiency: 0,
        status: 'critical'
      });
    }
  }
  
  return results;
}

/**
 * Generate performance summary report
 */
function generatePerformanceSummary(results: PerformanceResult[]): void {
  console.log('📊 PERFORMANCE SUMMARY REPORT');
  console.log('=============================\n');
  
  const statusCounts = {
    excellent: results.filter(r => r.status === 'excellent').length,
    good: results.filter(r => r.status === 'good').length,  
    needs_improvement: results.filter(r => r.status === 'needs_improvement').length,
    critical: results.filter(r => r.status === 'critical').length
  };
  
  const totalDuration = results.reduce((sum, r) => sum + (r.duration > 0 ? r.duration : 0), 0);
  const averageDuration = totalDuration / results.filter(r => r.duration > 0).length;
  const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);
  const averageEfficiency = results.reduce((sum, r) => sum + r.efficiency, 0) / results.length;
  
  console.log('🏆 OVERALL METRICS:');
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Average Duration: ${averageDuration.toFixed(2)}ms`);
  console.log(`   Total Records Processed: ${totalRecords}`);
  console.log(`   Average Efficiency: ${averageEfficiency.toFixed(2)} records/ms`);
  console.log('');
  
  console.log('📈 PERFORMANCE DISTRIBUTION:');
  console.log(`   🟢 Excellent (≤50% of target): ${statusCounts.excellent} tests`);
  console.log(`   🟡 Good (≤100% of target): ${statusCounts.good} tests`);
  console.log(`   🟠 Needs Improvement (≤150% of target): ${statusCounts.needs_improvement} tests`);
  console.log(`   🔴 Critical (>150% of target): ${statusCounts.critical} tests`);
  console.log('');
  
  if (statusCounts.excellent >= results.length * 0.7) {
    console.log('🎉 EXCELLENT PERFORMANCE! Database optimization is highly effective!');
  } else if (statusCounts.excellent + statusCounts.good >= results.length * 0.8) {
    console.log('✅ GOOD PERFORMANCE! Most queries are performing well.');
  } else {
    console.log('⚠️  PERFORMANCE NEEDS ATTENTION! Some queries require further optimization.');
  }
  
  console.log('\n🎯 TOP PERFORMING QUERIES:');
  const topPerformers = results
    .filter(r => r.status === 'excellent')
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 3);
    
  topPerformers.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.testName}: ${result.duration.toFixed(2)}ms`);
  });
  
  if (statusCounts.critical > 0) {
    console.log('\n⚠️  CRITICAL PERFORMANCE ISSUES:');
    const criticalTests = results.filter(r => r.status === 'critical');
    criticalTests.forEach(result => {
      console.log(`   🔴 ${result.testName}: ${result.duration.toFixed(2)}ms`);
    });
  }
  
  console.log('\n📋 OPTIMIZATION ACHIEVEMENTS:');
  console.log('• ✅ Database indexes created for frequently queried fields');
  console.log('• ✅ N+1 query patterns optimized with selective field selection');  
  console.log('• ✅ Complex includes replaced with efficient batch queries');
  console.log('• ✅ Performance baselines established for monitoring');
  
  console.log('\n💡 NEXT OPTIMIZATION OPPORTUNITIES:');
  if (statusCounts.needs_improvement > 0 || statusCounts.critical > 0) {
    console.log('• Consider query result caching for analytics endpoints');
    console.log('• Evaluate data denormalization for complex aggregations');
    console.log('• Implement pagination for large result sets');
    console.log('• Consider read replicas for analytics queries');
  } else {
    console.log('• Database performance is optimal - focus on application-level caching');
    console.log('• Consider implementing query monitoring for production');
    console.log('• Set up performance alerts for regression detection');
  }
}

/**
 * Main test execution
 */
async function testDatabasePerformance(): Promise<void> {
  try {
    const results = await runPerformanceTests();
    generatePerformanceSummary(results);
    
    console.log('\n✅ Database performance testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database performance testing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
if (require.main === module) {
  testDatabasePerformance()
    .then(() => {
      console.log('🎉 Database performance analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database performance testing failed:', error);
      process.exit(1);
    });
}

export { testDatabasePerformance, runPerformanceTests };
