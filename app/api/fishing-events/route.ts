'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformTripToDisplay } from '@/lib/utils/group-trips-utils';
import { 
  GroupTripStatus, 
  BookingStatus, 
  FishingEventType,
  SkillLevelRequired,
  FishingTechnique,
  FishSpecies,
  EquipmentType,
  SocialEventMode,
  ParticipantApprovalMode
} from '@prisma/client';
import { broadcastGroupTripUpdate } from '../group-trips/ws/route';
import type { CreateFishingEventRequest, FishingEventFilters } from '@/lib/types/fishing-events';

// GET endpoint для получения FishingEvents с расширенной фильтрацией
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'chronological';
    
    // Basic filters
    const status = searchParams.get('status');
    const timeSlot = searchParams.get('timeSlot');
    
    // FishingEvent specific filters
    const eventType = searchParams.get('eventType');
    const skillLevel = searchParams.get('skillLevel');
    const socialMode = searchParams.get('socialMode');
    const equipment = searchParams.get('equipment');
    const targetSpecies = searchParams.get('targetSpecies');
    const fishingTechniques = searchParams.get('fishingTechniques');
    const weatherDependency = searchParams.get('weatherDependency');
    const minDifficulty = searchParams.get('minDifficulty');
    const maxDifficulty = searchParams.get('maxDifficulty');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const approvalMode = searchParams.get('approvalMode');
    const fishingZones = searchParams.get('fishingZones');
    const captainExperience = searchParams.get('captainExperience');

    // Build where clause
    const whereClause: any = {
      date: { gte: new Date() },
      status: { not: GroupTripStatus.CANCELLED }
    };

    // Apply filters
    if (status && status !== 'any') {
      whereClause.status = status.toUpperCase();
    }

    if (timeSlot && timeSlot !== 'any') {
      whereClause.timeSlot = timeSlot.toUpperCase();
    }

    if (eventType && eventType !== 'any') {
      whereClause.eventType = eventType.toUpperCase() as FishingEventType;
    }

    if (skillLevel && skillLevel !== 'any') {
      whereClause.skillLevel = skillLevel.toUpperCase() as SkillLevelRequired;
    }

    if (socialMode && socialMode !== 'any') {
      whereClause.socialMode = socialMode.toUpperCase() as SocialEventMode;
    }

    if (equipment && equipment !== 'any') {
      whereClause.equipment = equipment.toUpperCase() as EquipmentType;
    }

    if (approvalMode && approvalMode !== 'any') {
      whereClause.approvalMode = approvalMode.toUpperCase() as ParticipantApprovalMode;
    }

    if (targetSpecies) {
      const speciesArray = targetSpecies.split(',')
        .map(s => s.trim().toUpperCase() as FishSpecies);
      whereClause.targetSpecies = { hasSome: speciesArray };
    }

    if (fishingTechniques) {
      const techniquesArray = fishingTechniques.split(',')
        .map(t => t.trim().toUpperCase() as FishingTechnique);
      whereClause.fishingTechniques = { hasSome: techniquesArray };
    }

    if (fishingZones) {
      const zonesArray = fishingZones.split(',').map(z => z.trim().toLowerCase());
      whereClause.fishingZones = { hasSome: zonesArray };
    }

    if (weatherDependency === 'true' || weatherDependency === 'false') {
      whereClause.weatherDependency = weatherDependency === 'true';
    }

    if (minDifficulty || maxDifficulty) {
      whereClause.difficultyRating = {};
      if (minDifficulty) whereClause.difficultyRating.gte = parseInt(minDifficulty);
      if (maxDifficulty) whereClause.difficultyRating.lte = parseInt(maxDifficulty);
    }

    if (minPrice || maxPrice) {
      whereClause.pricePerPerson = {};
      if (minPrice) whereClause.pricePerPerson.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.pricePerPerson.lte = parseFloat(maxPrice);
    }

    // Captain experience filter
    if (captainExperience && captainExperience !== 'any') {
      whereClause.captain = {
        fisherProfile: {
          experience: captainExperience.toUpperCase()
        }
      };
    }

    // Build order by
    let orderBy: any[] = [];
    switch (sortBy) {
      case 'chronological':
        orderBy = [{ date: 'asc' }, { timeSlot: 'asc' }];
        break;
      case 'popularity':
        orderBy = [{ bookings: { _count: 'desc' } }];
        break;
      case 'difficulty_asc':
        orderBy = [{ difficultyRating: 'asc' }];
        break;
      case 'difficulty_desc':
        orderBy = [{ difficultyRating: 'desc' }];
        break;
      case 'price_asc':
        orderBy = [{ pricePerPerson: 'asc' }];
        break;
      case 'price_desc':
        orderBy = [{ pricePerPerson: 'desc' }];
        break;
      case 'captain_rating':
        orderBy = [{ captain: { fisherProfile: { rating: 'desc' } } }];
        break;
      default:
        orderBy = [{ date: 'asc' }, { timeSlot: 'asc' }];
    }

    // Fetch trips with full FishingEvent data
    const trips = await prisma.groupTrip.findMany({
      where: whereClause,
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
      orderBy,
      take: limit,
      skip: offset
    });

    // Filter available trips
    const availableTrips = trips.filter(trip => {
      const currentParticipants = trip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );
      return currentParticipants < trip.maxParticipants;
    });

    // Transform to display format
    const displayTrips = availableTrips.map(trip => transformTripToDisplay(trip));

    // Get total count
    const totalCount = await prisma.groupTrip.count({
      where: whereClause
    });

    // Enhanced statistics for fishing events
    const stats = await getEnhancedFishingEventStats(whereClause);

    return NextResponse.json({
      success: true,
      data: {
        events: displayTrips,
        stats,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching fishing events:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fishing events'
    }, { status: 500 });
  }
}

// POST endpoint для создания FishingEvent
export async function POST(request: NextRequest) {
  try {
    const body: CreateFishingEventRequest = await request.json();
    
    // Validate required fields
    if (!body.date || !body.timeSlot) {
      return NextResponse.json({
        success: false,
        error: 'Date and timeSlot are required'
      }, { status: 400 });
    }

    if (body.difficultyRating < 1 || body.difficultyRating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Difficulty rating must be between 1 and 5'
      }, { status: 400 });
    }

    if (body.minimumWeatherScore < 1 || body.minimumWeatherScore > 10) {
      return NextResponse.json({
        success: false,
        error: 'Weather score must be between 1 and 10'
      }, { status: 400 });
    }

    // Create fishing event with all enhanced fields
    const newEvent = await prisma.groupTrip.create({
      data: {
        // Basic trip data
        date: new Date(body.date),
        timeSlot: body.timeSlot,
        maxParticipants: body.maxParticipants,
        minRequired: body.minRequired,
        pricePerPerson: body.pricePerPerson,
        description: body.description || 'Fishing event at Cascais',
        meetingPoint: body.meetingPoint || 'Cascais Marina',
        status: GroupTripStatus.FORMING,
        
        // FishingEvent specific data
        eventType: body.eventType,
        skillLevel: body.skillLevel,
        fishingTechniques: body.fishingTechniques,
        targetSpecies: body.targetSpecies,
        equipment: body.equipment,
        socialMode: body.socialMode,
        weatherDependency: body.weatherDependency,
        difficultyRating: body.difficultyRating,
        estimatedFishCatch: body.estimatedFishCatch,
        maxGroupSize: body.maxGroupSize,
        departureLocation: body.departureLocation || body.meetingPoint,
        fishingZones: body.fishingZones,
        minimumWeatherScore: body.minimumWeatherScore,
        recommendedFor: body.recommendedFor,
        approvalMode: body.approvalMode,
        
        // Create skill criteria if provided
        skillCriteria: body.skillCriteria && body.skillCriteria.length > 0 ? {
          create: body.skillCriteria.map((criteria) => ({
            criteriaType: criteria.criteriaType,
            minimumValue: criteria.minimumValue,
            requiredSkills: criteria.requiredSkills || [],
            requiredSpecies: criteria.requiredSpecies || [],
            description: criteria.description,
            isRequired: criteria.isRequired ?? true,
            weight: criteria.weight ?? 1
          }))
        } : undefined
      },
      include: {
        bookings: {
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
      }
    });

    // Transform to display format
    const displayEvent = transformTripToDisplay(newEvent);

    // Broadcast WebSocket update
    try {
      await broadcastGroupTripUpdate({
        tripId: newEvent.id,
        type: 'status_changed',
        currentParticipants: 0,
        status: 'forming',
        timestamp: new Date(),
        spotsRemaining: newEvent.maxParticipants,
        maxParticipants: newEvent.maxParticipants
      });
      console.log('📡 Broadcasted new fishing event creation:', newEvent.id);
    } catch (wsError) {
      console.error('❌ WebSocket broadcast failed:', wsError);
    }

    return NextResponse.json({
      success: true,
      data: displayEvent
    });

  } catch (error) {
    console.error('Error creating fishing event:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create fishing event'
    }, { status: 500 });
  }
}

// Helper function to get enhanced stats for fishing events
async function getEnhancedFishingEventStats(whereClause: any) {
  const [
    totalTrips,
    confirmedTrips,
    totalParticipants,
    eventTypeStats,
    skillLevelStats,
    averageRating
  ] = await Promise.all([
    prisma.groupTrip.count({ where: whereClause }),
    
    prisma.groupTrip.count({ 
      where: { ...whereClause, status: GroupTripStatus.CONFIRMED }
    }),
    
    prisma.groupBooking.aggregate({
      where: {
        trip: whereClause,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] }
      },
      _sum: { participants: true }
    }),
    
    prisma.groupTrip.groupBy({
      by: ['eventType'],
      where: whereClause,
      _count: { eventType: true }
    }),
    
    prisma.groupTrip.groupBy({
      by: ['skillLevel'],
      where: whereClause,
      _count: { skillLevel: true }
    }),
    
    prisma.groupTrip.aggregate({
      where: whereClause,
      _avg: { difficultyRating: true }
    })
  ]);

  return {
    totalEvents: totalTrips,
    confirmedEvents: confirmedTrips,
    formingEvents: totalTrips - confirmedTrips,
    totalParticipants: totalParticipants._sum.participants || 0,
    averageParticipants: totalTrips > 0 ? (totalParticipants._sum.participants || 0) / totalTrips : 0,
    averageDifficulty: averageRating._avg.difficultyRating || 3,
    eventTypeDistribution: eventTypeStats.reduce((acc, stat) => {
      acc[stat.eventType.toLowerCase()] = stat._count.eventType;
      return acc;
    }, {} as Record<string, number>),
    skillLevelDistribution: skillLevelStats.reduce((acc, stat) => {
      acc[stat.skillLevel.toLowerCase()] = stat._count.skillLevel;
      return acc;
    }, {} as Record<string, number>)
  };
}
