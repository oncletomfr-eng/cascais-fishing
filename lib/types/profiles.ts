// TypeScript interfaces for Fisher Profiles and Review System (Phase 2)

export interface FisherProfile {
  id: string
  userId: string
  
  // Experience and expertise
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'
  specialties: ('DEEP_SEA' | 'SHORE' | 'FLY_FISHING' | 'SPORT_FISHING')[]
  bio?: string
  
  // Reputation system
  rating: number // 1.0 - 5.0 stars
  completedTrips: number
  reliability: number // percentage 0-100
  totalReviews: number
  
  // Status
  isActive: boolean
  lastActiveAt: Date
  
  // Location (optional)
  country?: string
  city?: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  
  // Relations (populated when needed)
  user?: {
    id: string
    name?: string
    email: string
    image?: string
    role: 'PARTICIPANT' | 'CAPTAIN' | 'ADMIN'
  }
  badges?: FisherBadge[]
}

export interface Review {
  id: string
  
  // Trip reference
  tripId: string
  
  // From and To users
  fromUserId: string
  toUserId: string
  
  // Review content
  rating: number // 1-5 stars
  comment?: string
  
  // Verification
  verified: boolean // Only from trip participants
  helpful: number // Helpful votes
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  
  // Relations (populated when needed)
  fromUser?: {
    id: string
    name?: string
    image?: string
    fisherProfile?: Pick<FisherProfile, 'experience' | 'completedTrips' | 'rating'>
  }
  toUser?: {
    id: string
    name?: string
    image?: string
  }
  trip?: {
    id: string
    date: Date
    description?: string
  }
}

export interface FisherBadge {
  id: string
  profileId: string
  
  // Badge details
  name: string
  description?: string
  icon: string // Icon name or URL
  category: 'ACHIEVEMENT' | 'MILESTONE' | 'SPECIAL' | 'SEASONAL'
  
  // Requirements
  requiredValue?: number
  
  // Timestamps
  earnedAt: Date
}

export interface ParticipantApproval {
  id: string
  
  // Trip and participant
  tripId: string
  participantId: string
  
  // Application details
  message?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  
  // Captain decision
  approvedBy?: string // Captain user ID
  rejectedReason?: string
  processedAt?: Date
  
  // Timestamps
  appliedAt: Date
  updatedAt: Date
  
  // Relations (populated when needed)
  participant?: {
    id: string
    name?: string
    image?: string
    fisherProfile?: Pick<FisherProfile, 'experience' | 'rating' | 'completedTrips' | 'reliability'>
  }
  trip?: {
    id: string
    date: Date
    description?: string
    maxParticipants: number
    currentParticipants?: number
  }
}

// Captain dashboard data
export interface CaptainDashboardData {
  captainProfile: FisherProfile
  
  // Trip statistics
  myTrips: {
    total: number
    upcoming: number
    completed: number
    cancelled: number
  }
  
  // Pending approvals
  pendingApprovals: ParticipantApproval[]
  
  // Recent reviews
  recentReviews: Review[]
  
  // Performance metrics
  metrics: {
    averageRating: number
    totalReviews: number
    tripCompletionRate: number
    participantSatisfaction: number
  }
}

// Review submission interface
export interface ReviewSubmission {
  tripId: string
  toUserId: string
  rating: number
  comment?: string
}

// Profile update interface
export interface ProfileUpdateData {
  experience?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'
  specialties?: ('DEEP_SEA' | 'SHORE' | 'FLY_FISHING' | 'SPORT_FISHING')[]
  bio?: string
  country?: string
  city?: string
}

// Participant application interface
export interface ParticipantApplication {
  tripId: string
  message?: string
}

// Search and filter interfaces
export interface ProfileFilters {
  experience?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT'
  specialties?: ('DEEP_SEA' | 'SHORE' | 'FLY_FISHING' | 'SPORT_FISHING')[]
  minRating?: number
  minCompletedTrips?: number
  location?: string
}

export interface ReviewFilters {
  rating?: number
  verified?: boolean
  tripId?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Badge definitions
export interface BadgeDefinition {
  name: string
  description: string
  icon: string
  category: 'ACHIEVEMENT' | 'MILESTONE' | 'SPECIAL' | 'SEASONAL'
  requirements: {
    type: 'trips' | 'rating' | 'reviews' | 'special'
    value: number
    description: string
  }
}

// Predefined badge definitions
export const PREDEFINED_BADGES: BadgeDefinition[] = [
  {
    name: 'First Trip',
    description: 'Completed your first fishing trip',
    icon: '🎣',
    category: 'MILESTONE',
    requirements: {
      type: 'trips',
      value: 1,
      description: 'Complete 1 trip'
    }
  },
  {
    name: 'Experienced Fisher',
    description: 'Completed 10 fishing trips',
    icon: '🏆',
    category: 'ACHIEVEMENT',
    requirements: {
      type: 'trips',
      value: 10,
      description: 'Complete 10 trips'
    }
  },
  {
    name: 'Master Angler',
    description: 'Completed 25 fishing trips',
    icon: '👑',
    category: 'ACHIEVEMENT',
    requirements: {
      type: 'trips',
      value: 25,
      description: 'Complete 25 trips'
    }
  },
  {
    name: 'Five Star Captain',
    description: 'Maintained 5-star rating with 10+ reviews',
    icon: '⭐',
    category: 'ACHIEVEMENT',
    requirements: {
      type: 'rating',
      value: 5,
      description: 'Maintain 5.0 rating with 10+ reviews'
    }
  },
  {
    name: 'Reliable Partner',
    description: '100% trip completion rate with 5+ trips',
    icon: '✅',
    category: 'ACHIEVEMENT',
    requirements: {
      type: 'special',
      value: 100,
      description: '100% reliability with 5+ completed trips'
    }
  }
]
