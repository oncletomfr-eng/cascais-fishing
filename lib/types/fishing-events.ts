// 🎣 TypeScript types for enhanced FishingEvent system
// Extends GroupTrip with event-specific functionality

import { GroupTripDisplay, ParticipantDisplay, GroupTripUpdate } from './group-events';
import type {
  FishingEventType,
  SkillLevelRequired,
  FishingTechnique,
  FishSpecies,
  EquipmentType,
  SocialEventMode,
  ParticipantApprovalMode,
  SkillCriteriaType,
  FishingExperience
} from '@prisma/client';

// 🎯 Enhanced FishingEvent extending GroupTrip
export interface FishingEventDisplay extends GroupTripDisplay {
  // Core event classification
  eventType: FishingEventType;
  skillLevel: SkillLevelRequired;
  socialMode: SocialEventMode;
  
  // Fishing specifics
  fishingTechniques: FishingTechnique[];
  targetSpecies: FishSpecies[];
  equipment: EquipmentType;
  
  // Event configuration
  weatherDependency: boolean;
  difficultyRating: number; // 1-5 scale
  estimatedFishCatch?: number;
  maxGroupSize?: number;
  
  // Enhanced location data
  departureLocation?: string;
  fishingZones: string[];
  minimumWeatherScore: number;
  
  // Approval system
  approvalMode: ParticipantApprovalMode;
  skillCriteria: EventSkillCriteria[];
  
  // Enhanced metadata
  recommendedFor: string[];
}

// 🎯 Skill criteria for participant approval
export interface EventSkillCriteria {
  id: string;
  criteriaType: SkillCriteriaType;
  minimumValue?: number;
  requiredSkills: FishingTechnique[];
  requiredSpecies: FishSpecies[];
  description?: string;
  isRequired: boolean;
  weight: number;
}

// 🎯 Enhanced participant profile for fishing events
export interface FishingParticipantProfile extends ParticipantDisplay {
  // Fishing experience
  experience: FishingExperience;
  specialties: FishingTechnique[];
  completedTrips: number;
  
  // Species experience
  caughtSpecies: FishSpecies[];
  biggestCatch?: {
    species: FishSpecies;
    weight: number;
    location: string;
    date: Date;
  };
  
  // Equipment & skills
  ownEquipment: boolean;
  certifications: string[];
  languages: string[];
  
  // Social profile
  rating: number;
  reliability: number;
  totalReviews: number;
  badges: FishingBadge[];
}

// 🎯 Fishing achievements and badges
export interface FishingBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'species' | 'technique' | 'milestone' | 'social' | 'achievement';
  earnedAt: Date;
  metadata?: {
    species?: FishSpecies;
    technique?: FishingTechnique;
    count?: number;
    weight?: number;
  };
}

// 🎯 Enhanced filters for fishing events
export interface FishingEventFilters {
  // Basic filters
  experience?: SkillLevelRequired | 'any';
  timeSlot?: 'any' | 'morning' | 'afternoon';
  status?: 'any' | 'forming' | 'almost_full' | 'confirmed';
  spotsLeft?: number;
  dateRange?: { start: Date; end: Date };
  
  // Fishing-specific filters
  eventType?: FishingEventType | 'any';
  targetSpecies?: FishSpecies[];
  fishingTechniques?: FishingTechnique[];
  socialMode?: SocialEventMode | 'any';
  equipment?: EquipmentType | 'any';
  
  // Advanced filters
  difficultyRange?: { min: number; max: number };
  weatherDependency?: boolean | 'any';
  approvalMode?: ParticipantApprovalMode | 'any';
  priceRange?: { min: number; max: number };
  fishingZones?: string[];
  
  // Social filters
  minimumRating?: number;
  captainExperience?: FishingExperience | 'any';
  groupSize?: { min?: number; max?: number };
}

// 🎯 Enhanced sorting options for fishing events
export type FishingEventSortBy = 
  | 'chronological'
  | 'popularity'
  | 'almost_full'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'experience_required'
  | 'price_asc'
  | 'price_desc'
  | 'species_variety'
  | 'captain_rating'
  | 'weather_dependency';

// 🎯 Event creation and management
export interface CreateFishingEventRequest {
  // Basic trip info
  date: Date;
  timeSlot: 'MORNING_9AM' | 'AFTERNOON_2PM';
  maxParticipants: number;
  minRequired: number;
  pricePerPerson: number;
  description?: string;
  meetingPoint?: string;
  
  // Fishing event specifics
  eventType: FishingEventType;
  skillLevel: SkillLevelRequired;
  fishingTechniques: FishingTechnique[];
  targetSpecies: FishSpecies[];
  equipment: EquipmentType;
  socialMode: SocialEventMode;
  
  // Event configuration
  weatherDependency: boolean;
  difficultyRating: number;
  estimatedFishCatch?: number;
  maxGroupSize?: number;
  departureLocation?: string;
  fishingZones: string[];
  minimumWeatherScore: number;
  recommendedFor: string[];
  
  // Approval system
  approvalMode: ParticipantApprovalMode;
  skillCriteria?: Omit<EventSkillCriteria, 'id'>[];
}

// 🎯 Join event with enhanced participant data
export interface JoinFishingEventRequest {
  tripId: string;
  participants: number;
  contactInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  
  // Participant profile for approval
  participantProfile?: {
    experience: FishingExperience;
    specialties: FishingTechnique[];
    completedTrips: number;
    caughtSpecies: FishSpecies[];
    ownEquipment: boolean;
    certifications: string[];
    languages: string[];
    previousCaptainRating?: number;
  };
  
  specialRequests?: string;
  equipmentNeeds?: string;
  dietaryRestrictions?: string;
}

// 🎯 Enhanced WebSocket updates for fishing events
export interface FishingEventUpdate extends GroupTripUpdate {
  // Fishing-specific updates
  weatherUpdate?: {
    score: number;
    conditions: string;
    recommendation: 'proceed' | 'caution' | 'reschedule';
  };
  
  catchReport?: {
    species: FishSpecies;
    count: number;
    avgWeight?: number;
    location: string;
    timestamp: Date;
  };
  
  equipmentStatus?: {
    item: string;
    status: 'available' | 'reserved' | 'broken';
    cost?: number;
  };
  
  participantSkillUpdate?: {
    participantId: string;
    skill: FishingTechnique;
    level: 'beginner' | 'intermediate' | 'advanced';
  };
}

// 🎯 Captain dashboard analytics
export interface CaptainAnalytics {
  // Trip performance
  totalTrips: number;
  averageParticipants: number;
  completionRate: number;
  cancellationRate: number;
  
  // Participant satisfaction
  averageRating: number;
  totalReviews: number;
  repeatCustomers: number;
  
  // Fishing success
  successfulTrips: number; // With good catches
  speciesCaught: { species: FishSpecies; count: number }[];
  averageCatchPerTrip: number;
  
  // Financial
  totalRevenue: number;
  averageRevenue: number;
  seasonalTrends: { month: string; revenue: number; trips: number }[];
}

// 🎯 Event recommendations engine
export interface EventRecommendation {
  event: FishingEventDisplay;
  score: number; // 0-1 relevance score
  reasons: string[]; // Why recommended
  matchedCriteria: {
    experience: boolean;
    species: boolean;
    technique: boolean;
    schedule: boolean;
    price: boolean;
  };
}

// 🎯 Weather integration for fishing events
export interface FishingWeatherData {
  date: Date;
  location: { lat: number; lng: number };
  
  // Marine conditions
  waveHeight: number; // meters
  windSpeed: number; // km/h  
  windDirection: string;
  visibility: number; // km
  precipitation: number; // mm
  
  // Fishing conditions
  fishingScore: number; // 1-10
  barometricPressure: number;
  tideInfo: {
    high: Date[];
    low: Date[];
  };
  
  // Water conditions
  waterTemperature?: number;
  currentStrength?: number;
  
  // Recommendations
  bestTimes: Date[];
  techniques: FishingTechnique[];
  targetDepths: number[];
}

// 🎯 Community features
export interface FishingCommunityEvent {
  event: FishingEventDisplay;
  community: {
    organizer: FishingParticipantProfile;
    participants: FishingParticipantProfile[];
    chat: boolean;
    sharing: boolean;
    competition: boolean;
  };
  
  social: {
    likes: number;
    shares: number;
    comments: number;
    isPublic: boolean;
  };
}

// 🎯 Tournament specific features
export interface FishingTournament extends FishingEventDisplay {
  tournament: {
    rules: string[];
    prizes: {
      place: number;
      description: string;
      value?: number;
    }[];
    
    scoring: {
      method: 'weight' | 'count' | 'size' | 'points';
      species: FishSpecies[];
      multipliers?: { species: FishSpecies; multiplier: number }[];
    };
    
    leaderboard: {
      participantId: string;
      score: number;
      catches: {
        species: FishSpecies;
        weight: number;
        length?: number;
        timestamp: Date;
        verified: boolean;
      }[];
    }[];
  };
}

// 🎯 Learning event specific features  
export interface FishingLearningEvent extends FishingEventDisplay {
  learning: {
    instructor: FishingParticipantProfile;
    curriculum: {
      topics: string[];
      techniques: FishingTechnique[];
      species: FishSpecies[];
      duration: number; // minutes
    };
    
    materials: {
      provided: string[];
      recommended: string[];
      optional: string[];
    };
    
    certification?: {
      name: string;
      issuer: string;
      validFor: number; // months
      prerequisites?: string[];
    };
  };
}

// 🎯 Props for enhanced components
export interface FishingEventCardProps {
  event: FishingEventDisplay;
  onJoinRequest: (eventId: string, data: JoinFishingEventRequest) => void;
  showWeather?: boolean;
  showSkillMatch?: boolean;
  userProfile?: FishingParticipantProfile;
  className?: string;
}

export interface FishingEventsFeedProps {
  events: FishingEventDisplay[];
  filters?: FishingEventFilters;
  sortBy?: FishingEventSortBy;
  onEventSelect: (event: FishingEventDisplay) => void;
  userProfile?: FishingParticipantProfile;
  realTimeUpdates?: boolean;
  showWeatherInfo?: boolean;
  enableSocialProof?: boolean;
  enableRecommendations?: boolean;
  className?: string;
}
