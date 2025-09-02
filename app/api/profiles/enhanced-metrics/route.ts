import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// Enhanced Profile Metrics API
// Part of Task 15: Profile Statistics & Metrics

interface ProfileCompletionMetrics {
  overall: number
  sections: {
    basic: { completed: boolean; weight: number; label: string }
    experience: { completed: boolean; weight: number; label: string }
    specialties: { completed: boolean; weight: number; label: string }
    bio: { completed: boolean; weight: number; label: string }
    location: { completed: boolean; weight: number; label: string }
    preferences: { completed: boolean; weight: number; label: string }
    achievements: { completed: boolean; weight: number; label: string }
  }
  trends: Array<{
    date: string
    completion: number
  }>
}

interface ReliabilityBreakdown {
  overall: number
  factors: {
    tripCompletion: { score: number; weight: number; label: string; impact: string }
    punctuality: { score: number; weight: number; label: string; impact: string }
    communication: { score: number; weight: number; label: string; impact: string }
    preparedness: { score: number; weight: number; label: string; impact: string }
    teamwork: { score: number; weight: number; label: string; impact: string }
  }
  history: Array<{
    date: string
    score: number
    incidents: number
  }>
  recommendations: string[]
}

interface PeerComparison {
  userRank: number
  totalUsers: number
  percentile: number
  similarProfiles: Array<{
    id: string
    name: string
    experience: string
    rating: number
    completedTrips: number
    reliability: number
    isAnonymous: boolean
  }>
  competitiveMetrics: {
    rating: { user: number; peers: number; rank: number }
    trips: { user: number; peers: number; rank: number }  
    reliability: { user: number; peers: number; rank: number }
    achievements: { user: number; peers: number; rank: number }
  }
}

interface HistoricalAnalysis {
  trends: {
    rating: Array<{ date: string; value: number; change: number }>
    activity: Array<{ date: string; bookings: number; completed: number }>
    reliability: Array<{ date: string; score: number; incidents: number }>
    achievements: Array<{ date: string; earned: number; total: number }>
  }
  milestones: Array<{
    date: string
    type: 'rating' | 'trips' | 'achievement' | 'reliability'
    title: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
  seasonalPatterns: {
    bestMonths: string[]
    activityPeaks: Array<{ month: string; activity: number }>
    performanceVariation: { min: number; max: number; avg: number }
  }
}

interface SmartRecommendations {
  priority: 'high' | 'medium' | 'low'
  categories: {
    profile: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
    activity: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
    skills: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
    social: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
  }
  personalized: Array<{
    id: string
    title: string
    description: string
    reason: string
    steps: string[]
    timeframe: string
    expectedOutcome: string
  }>
}

interface EnhancedProfileMetrics {
  completion: ProfileCompletionMetrics
  reliability: ReliabilityBreakdown  
  peerComparison: PeerComparison
  historicalAnalysis: HistoricalAnalysis
  recommendations: SmartRecommendations
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id
    const timeframe = searchParams.get('timeframe') || '3months'

    // In a real implementation, this would query the database
    // For now, we'll return enhanced mock data
    const enhancedMetrics = await generateEnhancedMetrics(userId, timeframe)

    return NextResponse.json({
      success: true,
      data: enhancedMetrics
    })

  } catch (error) {
    console.error('Enhanced metrics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate enhanced metrics (would be real DB queries in production)
async function generateEnhancedMetrics(userId: string, timeframe: string): Promise<EnhancedProfileMetrics> {
  // This would be replaced with actual database queries
  // For now, generating realistic mock data based on timeframe
  
  const now = new Date()
  const months = getMonthsForTimeframe(timeframe)
  
  return {
    completion: generateCompletionMetrics(months),
    reliability: generateReliabilityBreakdown(months),
    peerComparison: generatePeerComparison(),
    historicalAnalysis: generateHistoricalAnalysis(months),
    recommendations: generateSmartRecommendations(userId)
  }
}

function getMonthsForTimeframe(timeframe: string): string[] {
  const now = new Date()
  const months: string[] = []
  
  let monthCount = 3
  switch (timeframe) {
    case '1month': monthCount = 1; break
    case '3months': monthCount = 3; break
    case '6months': monthCount = 6; break
    case '1year': monthCount = 12; break
    case 'all': monthCount = 24; break
  }
  
  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toISOString().substring(0, 7))
  }
  
  return months
}

function generateCompletionMetrics(months: string[]): ProfileCompletionMetrics {
  // Simulate progressive completion over time
  const baseCompletion = 45
  const growthRate = 8 // per month
  
  return {
    overall: Math.min(100, baseCompletion + (months.length * growthRate)),
    sections: {
      basic: { completed: true, weight: 20, label: 'Basic Info' },
      experience: { completed: true, weight: 15, label: 'Experience Level' },
      specialties: { completed: true, weight: 15, label: 'Specialties' },
      bio: { completed: months.length >= 2, weight: 10, label: 'Bio' },
      location: { completed: true, weight: 10, label: 'Location' },
      preferences: { completed: months.length >= 3, weight: 15, label: 'Preferences' },
      achievements: { completed: months.length >= 1, weight: 15, label: 'Achievements' }
    },
    trends: months.map((month, index) => ({
      date: month,
      completion: Math.min(100, baseCompletion + (index * growthRate))
    }))
  }
}

function generateReliabilityBreakdown(months: string[]): ReliabilityBreakdown {
  const baseScore = 82
  const improvement = months.length * 1.5 // gradual improvement over time
  
  return {
    overall: Math.min(100, baseScore + improvement),
    factors: {
      tripCompletion: { 
        score: Math.min(100, 88 + improvement), 
        weight: 30, 
        label: 'Trip Completion', 
        impact: 'High positive impact on overall reputation' 
      },
      punctuality: { 
        score: Math.min(100, 85 + improvement * 0.8), 
        weight: 20, 
        label: 'Punctuality', 
        impact: 'Medium positive impact on group dynamics' 
      },
      communication: { 
        score: Math.min(100, 90 + improvement * 0.5), 
        weight: 20, 
        label: 'Communication', 
        impact: 'High positive impact on team coordination' 
      },
      preparedness: { 
        score: Math.min(100, 78 + improvement * 1.2), 
        weight: 15, 
        label: 'Preparedness', 
        impact: 'Medium impact on trip success rate' 
      },
      teamwork: { 
        score: Math.min(100, 86 + improvement * 0.9), 
        weight: 15, 
        label: 'Teamwork', 
        impact: 'High positive impact on participant satisfaction' 
      }
    },
    history: months.map((month, index) => ({
      date: month,
      score: Math.min(100, baseScore + (index * 1.5)),
      incidents: Math.max(0, 2 - index) // fewer incidents over time
    })),
    recommendations: [
      'Consider adding equipment preparation checklist to reduce setup time',
      'Improve pre-trip communication timing - send updates 24 hours before departure',
      'Join captain mentorship program to enhance leadership skills'
    ].slice(0, Math.max(1, 3 - Math.floor(months.length / 2))) // fewer recommendations as performance improves
  }
}

function generatePeerComparison(): PeerComparison {
  return {
    userRank: 142,
    totalUsers: 1250,
    percentile: 88,
    similarProfiles: [
      { 
        id: '1', 
        name: 'Alex M.', 
        experience: 'INTERMEDIATE', 
        rating: 4.8, 
        completedTrips: 25, 
        reliability: 92, 
        isAnonymous: true 
      },
      { 
        id: '2', 
        name: 'Sarah K.', 
        experience: 'INTERMEDIATE', 
        rating: 4.6, 
        completedTrips: 28, 
        reliability: 89, 
        isAnonymous: true 
      },
      { 
        id: '3', 
        name: 'Mike R.', 
        experience: 'INTERMEDIATE', 
        rating: 4.5, 
        completedTrips: 22, 
        reliability: 85, 
        isAnonymous: true 
      }
    ],
    competitiveMetrics: {
      rating: { user: 4.7, peers: 4.3, rank: 145 },
      trips: { user: 22, peers: 18, rank: 180 },
      reliability: { user: 87, peers: 82, rank: 120 },
      achievements: { user: 15, peers: 12, rank: 95 }
    }
  }
}

function generateHistoricalAnalysis(months: string[]): HistoricalAnalysis {
  const baseRating = 4.2
  const baseActivity = 6
  const baseReliability = 80
  const baseAchievements = 8
  
  return {
    trends: {
      rating: months.map((month, index) => {
        const value = Math.min(5.0, baseRating + (index * 0.08))
        const change = index > 0 ? ((value - (baseRating + ((index - 1) * 0.08))) / (baseRating + ((index - 1) * 0.08))) * 100 : 0
        return { date: month, value: Number(value.toFixed(1)), change: Number(change.toFixed(1)) }
      }),
      activity: months.map((month, index) => ({
        date: month,
        bookings: baseActivity + index + Math.floor(Math.random() * 3),
        completed: baseActivity + index + Math.floor(Math.random() * 2)
      })),
      reliability: months.map((month, index) => ({
        date: month,
        score: Math.min(100, baseReliability + (index * 1.5)),
        incidents: Math.max(0, 2 - Math.floor(index / 2))
      })),
      achievements: months.map((month, index) => ({
        date: month,
        earned: Math.floor(Math.random() * 3) + (index > 2 ? 1 : 0), // more achievements over time
        total: baseAchievements + Math.floor(index * 1.2)
      }))
    },
    milestones: [
      {
        date: months.length >= 3 ? months[2] : months[months.length - 1],
        type: 'achievement',
        title: 'Expert Angler Badge',
        description: 'Earned Expert Angler badge for consistent high performance',
        impact: 'positive'
      },
      {
        date: months.length >= 2 ? months[1] : months[0],
        type: 'rating',
        title: '4.5 Rating Milestone',
        description: 'Achieved and maintained 4.5+ star rating',
        impact: 'positive'
      }
    ].slice(0, Math.min(3, months.length)),
    seasonalPatterns: {
      bestMonths: ['June', 'July', 'August', 'September'],
      activityPeaks: [
        { month: 'July', activity: 92 },
        { month: 'August', activity: 88 },
        { month: 'September', activity: 85 }
      ],
      performanceVariation: { 
        min: Number((baseRating - 0.3).toFixed(1)), 
        max: Number((baseRating + 0.6).toFixed(1)), 
        avg: Number((baseRating + 0.15).toFixed(1)) 
      }
    }
  }
}

function generateSmartRecommendations(userId: string): SmartRecommendations {
  return {
    priority: 'medium',
    categories: {
      profile: [
        { 
          id: 'p1', 
          title: 'Complete Your Bio', 
          description: 'Add personal bio to increase booking conversion rate', 
          effort: 'Low', 
          impact: 'Medium' 
        },
        { 
          id: 'p2', 
          title: 'Add Profile Photos', 
          description: 'Upload fishing photos to showcase your experience', 
          effort: 'Low', 
          impact: 'High' 
        }
      ],
      activity: [
        { 
          id: 'a1', 
          title: 'Increase Trip Frequency', 
          description: 'Aim for 2-3 trips per month to improve visibility', 
          effort: 'Medium', 
          impact: 'High' 
        },
        { 
          id: 'a2', 
          title: 'Try New Locations', 
          description: 'Explore different fishing spots to expand your network', 
          effort: 'Medium', 
          impact: 'Medium' 
        }
      ],
      skills: [
        { 
          id: 's1', 
          title: 'Learn Deep Sea Techniques', 
          description: 'Expand to deep sea fishing to access premium trips', 
          effort: 'High', 
          impact: 'High' 
        },
        { 
          id: 's2', 
          title: 'Get Certification', 
          description: 'Obtain advanced fishing certifications', 
          effort: 'High', 
          impact: 'Medium' 
        }
      ],
      social: [
        { 
          id: 'so1', 
          title: 'Engage in Community', 
          description: 'Participate in forum discussions and events', 
          effort: 'Low', 
          impact: 'Medium' 
        },
        { 
          id: 'so2', 
          title: 'Mentor New Fishers', 
          description: 'Help beginners to build reputation as an expert', 
          effort: 'Medium', 
          impact: 'High' 
        }
      ]
    },
    personalized: [
      {
        id: 'pers1',
        title: 'Optimize Your Summer Performance',
        description: 'Based on your seasonal patterns, summer is your peak performance period',
        reason: 'Historical data shows 15% better performance and 25% higher booking rates in summer months',
        steps: [
          'Book 2-3 additional summer trips in advance',
          'Share summer fishing tips in community forums',
          'Build relationships with other active summer fishers',
          'Offer to mentor beginners during peak season'
        ],
        timeframe: '2-3 months (June-August)',
        expectedOutcome: 'Potential 0.2-0.3 rating increase and 20-30% more bookings'
      },
      {
        id: 'pers2',
        title: 'Leverage Your Reliability Strength',
        description: 'Your reliability score is above average - use this as a competitive advantage',
        reason: 'You rank in top 25% for reliability, which is highly valued by trip organizers',
        steps: [
          'Highlight reliability in your profile description',
          'Request testimonials from past trip participants',
          'Apply for premium trips that value dependable participants',
          'Maintain current punctuality and communication standards'
        ],
        timeframe: '1-2 months',
        expectedOutcome: 'Access to higher-rated trips and potential premium bookings'
      }
    ]
  }
}
