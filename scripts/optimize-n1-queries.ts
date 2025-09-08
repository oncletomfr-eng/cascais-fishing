import { PrismaClient, BookingStatus, GroupTripStatus } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

/**
 * Оптимизированная версия group-trips query
 * Использует select вместо полных includes для уменьшения объема данных
 */
export async function getOptimizedGroupTrips(
  whereClause: any = {},
  limit = 50,
  offset = 0,
  includeCancelled = false
) {
  console.log('🚀 Running OPTIMIZED Group Trips Query...');
  
  const start = performance.now();
  
  const trips = await prisma.groupTrip.findMany({
    where: whereClause,
    select: {
      id: true,
      date: true,
      timeSlot: true,
      maxParticipants: true,
      minRequired: true,
      pricePerPerson: true,
      status: true,
      description: true,
      meetingPoint: true,
      specialNotes: true,
      createdAt: true,
      updatedAt: true,
      captainId: true,
      approvalMode: true,
      departureLocation: true,
      difficultyRating: true,
      equipment: true,
      estimatedFishCatch: true,
      eventType: true,
      fishingTechniques: true,
      fishingZones: true,
      maxGroupSize: true,
      minimumWeatherScore: true,
      recommendedFor: true,
      skillLevel: true,
      socialMode: true,
      targetSpecies: true,
      weatherDependency: true,
      
      // Optimized includes with selective fields
      bookings: {
        where: includeCancelled ? {} : {
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        },
        select: {
          id: true,
          participants: true,
          totalPrice: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
          status: true,
          paymentStatus: true,
          specialRequests: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          // Optimize user data - only essential fields
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              // Optimized fisher profile - only essential fields
              fisherProfile: {
                select: {
                  id: true,
                  experienceLevel: true,
                  rating: true,
                  completedTrips: true,
                  reliability: true,
                  isActive: true
                }
              }
            }
          }
        }
      },
      
      // Optimize captain data
      captain: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          fisherProfile: {
            select: {
              id: true,
              experienceLevel: true,
              rating: true,
              completedTrips: true,
              createdTrips: true,
              reliability: true,
              totalReviews: true,
              positiveReviews: true,
              isActive: true
            }
          }
        }
      },
      
      // Keep skill criteria as is (usually small amount of data)
      skillCriteria: {
        select: {
          id: true,
          criteriaType: true,
          minimumValue: true,
          requiredSkills: true,
          requiredSpecies: true,
          description: true,
          isRequired: true,
          weight: true
        }
      },
      
      // Optimize participant approvals
      participantApprovals: {
        select: {
          id: true,
          participantId: true,
          message: true,
          status: true,
          approvedBy: true,
          rejectedReason: true,
          processedAt: true,
          appliedAt: true,
          // Optimize participant data
          participant: {
            select: {
              id: true,
              name: true,
              fisherProfile: {
                select: {
                  id: true,
                  experienceLevel: true,
                  rating: true,
                  completedTrips: true,
                  reliability: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { timeSlot: 'asc' }
    ],
    take: limit,
    skip: offset
  });
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`✅ OPTIMIZED query completed in ${duration.toFixed(2)}ms`);
  console.log(`📊 Retrieved ${trips.length} trips`);
  
  return { trips, duration };
}

/**
 * Оптимизированная версия fishing-events query
 */
export async function getOptimizedFishingEvents(
  whereClause: any = {},
  limit = 50,
  offset = 0
) {
  console.log('🚀 Running OPTIMIZED Fishing Events Query...');
  
  const start = performance.now();
  
  const events = await prisma.groupTrip.findMany({
    where: whereClause,
    select: {
      id: true,
      date: true,
      timeSlot: true,
      maxParticipants: true,
      pricePerPerson: true,
      status: true,
      description: true,
      meetingPoint: true,
      difficultyRating: true,
      skillLevel: true,
      targetSpecies: true,
      fishingTechniques: true,
      
      // Optimized booking data for availability calculation
      bookings: {
        where: {
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        },
        select: {
          id: true,
          participants: true,
          status: true,
          // Minimal user data for display
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      
      // Essential captain info only
      captain: {
        select: {
          id: true,
          name: true,
          fisherProfile: {
            select: {
              rating: true,
              completedTrips: true,
              experienceLevel: true
            }
          }
        }
      },
      
      // Reviews summary for events display
      reviews: {
        select: {
          id: true,
          rating: true,
          verified: true,
          helpful: true,
          createdAt: true
        },
        where: {
          verified: true
        }
      }
    },
    orderBy: { date: 'asc' },
    take: limit,
    skip: offset
  });
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`✅ OPTIMIZED fishing events query completed in ${duration.toFixed(2)}ms`);
  console.log(`📊 Retrieved ${events.length} events`);
  
  return { events, duration };
}

/**
 * Оптимизированная версия review analytics query
 * Использует отдельные queries вместо deep nested includes
 */
export async function getOptimizedReviewAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  console.log('🚀 Running OPTIMIZED Review Analytics Query...');
  
  const start = performance.now();
  
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate
    },
    verified: true,
    ...(userId && { toUserId: userId })
  };
  
  // First, get reviews with minimal data
  const reviews = await prisma.review.findMany({
    where: whereClause,
    select: {
      id: true,
      tripId: true,
      fromUserId: true,
      toUserId: true,
      rating: true,
      comment: true,
      helpful: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });
  
  // Then, batch fetch related data if needed
  const userIds = [...new Set([
    ...reviews.map(r => r.fromUserId),
    ...reviews.map(r => r.toUserId)
  ].filter(Boolean))];
  
  const tripIds = [...new Set(reviews.map(r => r.tripId).filter(Boolean))];
  
  // Parallel fetch related data
  const [users, trips] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    }),
    prisma.groupTrip.findMany({
      where: { id: { in: tripIds } },
      select: {
        id: true,
        date: true,
        timeSlot: true,
        pricePerPerson: true,
        status: true,
        createdAt: true
      }
    })
  ]);
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`✅ OPTIMIZED review analytics query completed in ${duration.toFixed(2)}ms`);
  console.log(`📊 Retrieved ${reviews.length} reviews with ${users.length} users and ${trips.length} trips`);
  
  // Create lookup maps for efficient data access
  const userMap = new Map(users.map(u => [u.id, u]));
  const tripMap = new Map(trips.map(t => [t.id, t]));
  
  // Attach related data to reviews
  const enrichedReviews = reviews.map(review => ({
    ...review,
    fromUser: review.fromUserId ? userMap.get(review.fromUserId) : null,
    toUser: review.toUserId ? userMap.get(review.toUserId) : null,
    trip: review.tripId ? tripMap.get(review.tripId) : null
  }));
  
  return { reviews: enrichedReviews, duration };
}

/**
 * Comparison test between old and new approaches
 */
export async function compareQueryPerformance() {
  console.log('\n📊 COMPARING QUERY PERFORMANCE');
  console.log('==============================\n');
  
  const results: any[] = [];
  
  try {
    // Test 1: Group Trips comparison
    console.log('🔄 Testing Group Trips Query Performance...');
    
    const oldGroupTripsStart = performance.now();
    const oldTrips = await prisma.groupTrip.findMany({
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
          },
          include: { user: { include: { fisherProfile: true } } }
        },
        captain: { include: { fisherProfile: true } },
        skillCriteria: true,
        participantApprovals: {
          include: {
            participant: { include: { fisherProfile: true } }
          }
        }
      },
      take: 20
    });
    const oldGroupTripsDuration = performance.now() - oldGroupTripsStart;
    
    const { trips: optimizedTrips, duration: optimizedGroupTripsDuration } = 
      await getOptimizedGroupTrips({}, 20, 0);
    
    results.push({
      test: 'Group Trips Query',
      oldDuration: oldGroupTripsDuration,
      newDuration: optimizedGroupTripsDuration,
      improvement: ((oldGroupTripsDuration - optimizedGroupTripsDuration) / oldGroupTripsDuration * 100).toFixed(1),
      oldRecords: oldTrips.length,
      newRecords: optimizedTrips.length
    });
    
    // Test 2: Fishing Events comparison
    console.log('🔄 Testing Fishing Events Query Performance...');
    
    const oldEventsStart = performance.now();
    const oldEvents = await prisma.groupTrip.findMany({
      where: { status: GroupTripStatus.CONFIRMED },
      include: {
        bookings: {
          where: {
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
          },
          include: { user: { include: { fisherProfile: true } } }
        },
        captain: { include: { fisherProfile: true } },
        reviews: { include: { fromUser: true, toUser: true } }
      },
      take: 20
    });
    const oldEventsDuration = performance.now() - oldEventsStart;
    
    const { events: optimizedEvents, duration: optimizedEventsDuration } = 
      await getOptimizedFishingEvents({ status: GroupTripStatus.CONFIRMED }, 20, 0);
    
    results.push({
      test: 'Fishing Events Query',
      oldDuration: oldEventsDuration,
      newDuration: optimizedEventsDuration,
      improvement: ((oldEventsDuration - optimizedEventsDuration) / oldEventsDuration * 100).toFixed(1),
      oldRecords: oldEvents.length,
      newRecords: optimizedEvents.length
    });
    
    // Test 3: Review Analytics comparison
    console.log('🔄 Testing Review Analytics Query Performance...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldAnalyticsStart = performance.now();
    const oldReviews = await prisma.review.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, verified: true },
      include: {
        fromUser: { select: { id: true, name: true, createdAt: true } },
        toUser: { select: { id: true, name: true, createdAt: true } },
        trip: {
          select: {
            id: true, date: true, timeSlot: true, pricePerPerson: true, status: true, createdAt: true,
            bookings: { select: { id: true, status: true, participants: true, createdAt: true } }
          }
        }
      },
      take: 50
    });
    const oldAnalyticsDuration = performance.now() - oldAnalyticsStart;
    
    const { reviews: optimizedReviews, duration: optimizedAnalyticsDuration } = 
      await getOptimizedReviewAnalytics(thirtyDaysAgo, new Date());
    
    results.push({
      test: 'Review Analytics Query',
      oldDuration: oldAnalyticsDuration,
      newDuration: optimizedAnalyticsDuration,
      improvement: ((oldAnalyticsDuration - optimizedAnalyticsDuration) / oldAnalyticsDuration * 100).toFixed(1),
      oldRecords: oldReviews.length,
      newRecords: optimizedReviews.length
    });
    
    // Print results
    console.log('\n📈 PERFORMANCE COMPARISON RESULTS');
    console.log('==================================');
    
    results.forEach(result => {
      const improvementSign = parseFloat(result.improvement) > 0 ? '🟢' : '🔴';
      console.log(`\n${improvementSign} ${result.test}:`);
      console.log(`   Old Duration: ${result.oldDuration.toFixed(2)}ms`);
      console.log(`   New Duration: ${result.newDuration.toFixed(2)}ms`);
      console.log(`   Improvement: ${result.improvement}%`);
      console.log(`   Records: ${result.oldRecords} → ${result.newRecords}`);
    });
    
    const totalOldDuration = results.reduce((sum, r) => sum + r.oldDuration, 0);
    const totalNewDuration = results.reduce((sum, r) => sum + r.newDuration, 0);
    const overallImprovement = ((totalOldDuration - totalNewDuration) / totalOldDuration * 100).toFixed(1);
    
    console.log('\n🏆 OVERALL RESULTS:');
    console.log(`   Total Old Duration: ${totalOldDuration.toFixed(2)}ms`);
    console.log(`   Total New Duration: ${totalNewDuration.toFixed(2)}ms`);
    console.log(`   Overall Improvement: ${overallImprovement}%`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during performance comparison:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function runN1Optimization() {
  console.log('🔧 N+1 QUERY OPTIMIZATION ANALYSIS');
  console.log('===================================\n');
  
  try {
    await compareQueryPerformance();
    
    console.log('\n✅ N+1 Optimization analysis completed successfully!');
    console.log('\n🎯 OPTIMIZATION RECOMMENDATIONS:');
    console.log('1. Replace deep includes with selective field selection');
    console.log('2. Use separate queries + batch fetching for related data');
    console.log('3. Implement data mapping for efficient lookups');
    console.log('4. Consider implementing these optimizations in production API routes');
    
  } catch (error) {
    console.error('❌ Error during N+1 optimization analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
if (require.main === module) {
  runN1Optimization()
    .then(() => {
      console.log('🎉 N+1 optimization analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 N+1 optimization analysis failed:', error);
      process.exit(1);
    });
}

// Functions already exported above
