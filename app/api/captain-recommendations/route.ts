import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { CaptainRecommendationCategory, SkillLevelRequired, ModerationStatus } from '@prisma/client';

// GET - получить рекомендации от капитанов
export async function GET(req: NextRequest) {
  
  try {
    console.log('Captain recommendations API called');
    
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as CaptainRecommendationCategory | null;
    const skillLevel = searchParams.get('skillLevel') as SkillLevelRequired | null;
    const captainId = searchParams.get('captainId');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('Query params:', { category, skillLevel, captainId, limit });

    let where: any = {
      isActive: true,
      moderationStatus: 'APPROVED',
    };

    if (category) {
      where.category = category;
    }

    if (skillLevel) {
      where.OR = [
        { targetSkillLevel: { has: skillLevel } },
        { targetSkillLevel: { has: 'ANY' } },
      ];
    }

    if (captainId) {
      where.captainId = captainId;
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    const recommendations = await prisma.captainRecommendation.findMany({
      where,
      include: {
        captain: {
          select: {
            id: true,
            name: true,
            image: true,
            fisherProfile: {
              select: {
                completedTrips: true,
                rating: true,
              },
            },
          },
        },
      },
      orderBy: [
        { helpfulVotes: 'desc' },
        { endorsements: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    console.log('Found recommendations:', recommendations.length);

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });

  } catch (error) {
    console.error('Error fetching captain recommendations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch captain recommendations', error: error?.toString() },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - создать новую рекомендацию от капитана
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  
  try {
    // Проверяем, что пользователь является капитаном
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { fisherProfile: true },
    });

    if (!user || user.role !== 'CAPTAIN') {
      return NextResponse.json({ 
        message: 'Only captains can create recommendations' 
      }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      content,
      category,
      targetSkillLevel,
      targetSpecies,
      targetTechniques,
      seasonalContext,
      weatherContext,
      locationContext,
      relatedTripIds,
    } = body;

    if (!title || !content || !category) {
      return NextResponse.json({ 
        message: 'title, content, and category are required' 
      }, { status: 400 });
    }

    const recommendation = await prisma.captainRecommendation.create({
      data: {
        captainId: session.user.id,
        title,
        content,
        category: category as CaptainRecommendationCategory,
        targetSkillLevel: targetSkillLevel || [],
        targetSpecies: targetSpecies || [],
        targetTechniques: targetTechniques || [],
        seasonalContext: seasonalContext || [],
        weatherContext: weatherContext || null,
        locationContext: locationContext || null,
        relatedTripIds: relatedTripIds || [],
        moderationStatus: 'PENDING', // Требует модерации
      },
    });

    return NextResponse.json({
      success: true,
      recommendation,
    });

  } catch (error) {
    console.error('Error creating captain recommendation:', error);
    return NextResponse.json(
      { message: 'Failed to create recommendation', error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - обновить рекомендацию капитана
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Recommendation ID required' }, { status: 400 });
    }

    // Проверяем, что рекомендация принадлежит капитану
    const existingRecommendation = await prisma.captainRecommendation.findUnique({
      where: { id },
    });

    if (!existingRecommendation || existingRecommendation.captainId !== session.user.id) {
      return NextResponse.json({ 
        message: 'Recommendation not found or access denied' 
      }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      content,
      category,
      targetSkillLevel,
      targetSpecies,
      targetTechniques,
      seasonalContext,
      weatherContext,
      locationContext,
      relatedTripIds,
    } = body;

    const updatedRecommendation = await prisma.captainRecommendation.update({
      where: { id },
      data: {
        title: title || existingRecommendation.title,
        content: content || existingRecommendation.content,
        category: category || existingRecommendation.category,
        targetSkillLevel: targetSkillLevel !== undefined ? targetSkillLevel : existingRecommendation.targetSkillLevel,
        targetSpecies: targetSpecies !== undefined ? targetSpecies : existingRecommendation.targetSpecies,
        targetTechniques: targetTechniques !== undefined ? targetTechniques : existingRecommendation.targetTechniques,
        seasonalContext: seasonalContext !== undefined ? seasonalContext : existingRecommendation.seasonalContext,
        weatherContext: weatherContext !== undefined ? weatherContext : existingRecommendation.weatherContext,
        locationContext: locationContext !== undefined ? locationContext : existingRecommendation.locationContext,
        relatedTripIds: relatedTripIds !== undefined ? relatedTripIds : existingRecommendation.relatedTripIds,
        moderationStatus: 'PENDING', // Требует повторной модерации
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      recommendation: updatedRecommendation,
    });

  } catch (error) {
    console.error('Error updating captain recommendation:', error);
    return NextResponse.json(
      { message: 'Failed to update recommendation', error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
