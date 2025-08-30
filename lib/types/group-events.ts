// TypeScript types are inferred from Prisma schema
export type GroupTripStatus = 'ACTIVE' | 'CONFIRMED' | 'CANCELLED';
export type TimeSlot = 'MORNING_9AM' | 'AFTERNOON_2PM';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

// WebSocket Message Types
export interface GroupTripUpdate {
  tripId: string;
  type: 'participant_joined' | 'participant_left' | 'status_changed' | 'confirmed' | 
        'weather_changed' | 'bite_report' | 'route_changed' | 'participant_cancelled';
  currentParticipants: number;
  status: 'forming' | 'almost_full' | 'confirmed' | 'cancelled';
  timestamp: Date;
  participantName?: string;
  spotsRemaining: number;
  maxParticipants: number;
  
  // 🎣 FISHING EVENT DATA for WebSocket updates
  eventType?: 'COMMERCIAL' | 'COMMUNITY' | 'TOURNAMENT' | 'LEARNING';
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'ANY';
  socialMode?: 'COMPETITIVE' | 'COLLABORATIVE' | 'EDUCATIONAL' | 'RECREATIONAL' | 'FAMILY';
  fishingTechniques?: string[];
  targetSpecies?: string[];
  equipment?: 'PROVIDED' | 'BRING_OWN' | 'RENTAL_AVAILABLE' | 'PARTIALLY_PROVIDED';
  weatherDependency?: boolean;
  difficultyRating?: number;
  pricePerPerson?: number;

  // 🌤️ WEATHER EVENT DATA
  weatherData?: {
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
    windSpeed: number; // km/h
    waveHeight: number; // meters
    temperature: number; // celsius
    visibility: number; // km
    weatherScore: number; // 1-10 scale
    forecast: string;
    alertLevel?: 'info' | 'warning' | 'danger';
    alertMessage?: string;
  };

  // 🐟 BITE REPORT DATA  
  biteReport?: {
    species: string;
    size?: number; // cm
    weight?: number; // kg
    location: string;
    technique: string;
    baitUsed?: string;
    depth?: number; // meters
    time: Date;
    reporterName: string;
    confidence: 'low' | 'medium' | 'high';
    photos?: string[];
  };

  // 🗺️ ROUTE CHANGE DATA
  routeChange?: {
    newLocation: string;
    reason: string;
    estimatedArrival?: Date;
    coordinates?: {
      lat: number;
      lng: number;
    };
    changedBy: string; // captain name
    announcement?: string;
  };

  // 🚫 CANCELLATION DATA
  cancellationData?: {
    participantName: string;
    reason?: string;
    refundStatus?: 'pending' | 'processed' | 'denied';
    spotsFreed: number;
  };
}

export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'heartbeat' | 'subscribe_events' | 'unsubscribe_events';
  tripIds?: string[];
  eventTypes?: ('participant_joined' | 'participant_left' | 'status_changed' | 'confirmed' | 
               'weather_changed' | 'bite_report' | 'route_changed' | 'participant_cancelled')[];
  // Дополнительные параметры для фильтрации событий
  filters?: {
    weatherAlertsOnly?: boolean; // только критические погодные оповещения
    biteReportsMinConfidence?: 'low' | 'medium' | 'high'; // минимальная достоверность отчетов о клеве
    routeChangesOnly?: boolean; // только изменения маршрута
  };
}

// Enhanced Group Trip Display with Real-time features and FishingEvent fields
export interface GroupTripDisplay {
  tripId: string;
  date: Date;
  timeSlot: 'MORNING_9AM' | 'AFTERNOON_2PM';
  timeDisplay: string; // Formatted time for UI
  
  // Trip Configuration
  maxParticipants: number;
  minRequired: number;
  pricePerPerson: number;
  
  // Current State
  currentParticipants: number;
  spotsRemaining: number; // Instead of availableSpots
  status: 'forming' | 'almost_full' | 'confirmed' | 'cancelled';
  
  // Social Proof Elements
  participants: ParticipantDisplay[];
  socialProof?: string;
  recentActivity?: string;
  
  // UX Psychology Elements
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Trip Details
  meetingPoint?: string;
  description?: string;
  specialNotes?: string;
  
  // 🎣 FISHING EVENT FIELDS
  eventType: 'COMMERCIAL' | 'COMMUNITY' | 'TOURNAMENT' | 'LEARNING';
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | 'ANY';
  socialMode: 'COMPETITIVE' | 'COLLABORATIVE' | 'EDUCATIONAL' | 'RECREATIONAL' | 'FAMILY';
  fishingTechniques: string[]; // Array of technique names
  targetSpecies: string[]; // Array of species names
  equipment: 'PROVIDED' | 'BRING_OWN' | 'RENTAL_AVAILABLE' | 'PARTIALLY_PROVIDED';
  weatherDependency: boolean;
  difficultyRating: number; // 1-5 scale
  estimatedFishCatch?: number;
  maxGroupSize?: number;
  departureLocation?: string;
  fishingZones: string[];
  minimumWeatherScore: number;
  recommendedFor: string[];
  approvalMode: 'AUTO' | 'MANUAL' | 'SKILL_BASED' | 'HYBRID';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Participant display for UI
export interface ParticipantDisplay {
  id: string;
  name: string;
  avatar: string; // Initials or image URL
  country?: string;
  joinedAt: Date;
  isReal: boolean; // True for real participants, false for demo
}

export interface ParticipantAvatar {
  id: string;
  initials: string;
  name: string;
  avatar?: string;
  country?: string;
  joinedAt: Date;
}

export interface RecentActivity {
  id: string;
  type: 'joined' | 'left';
  participantName: string;
  timestamp: Date;
  participantCount?: number;
}

// Filters for TripsFeed (Enhanced for FishingEvent compatibility)
export interface TripFilters {
  experience: 'any' | 'beginner' | 'intermediate' | 'expert' | 'advanced';
  timeSlot: 'any' | 'morning' | 'afternoon';
  status: 'any' | 'forming' | 'almost_full' | 'confirmed';
  spotsLeft: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  // 🎣 NEW FISHING EVENT FILTERS
  eventType?: 'any' | 'commercial' | 'community' | 'tournament' | 'learning';
  targetSpecies?: string[];
  fishingTechniques?: string[];
  socialMode?: 'any' | 'competitive' | 'collaborative' | 'educational' | 'recreational' | 'family';
  equipment?: 'any' | 'provided' | 'bring_own' | 'rental_available' | 'partially_provided';
  difficultyRange?: { min: number; max: number };
  weatherDependency?: boolean | 'any';
  priceRange?: { min: number; max: number };
}

// Sort options for trips feed (Enhanced for FishingEvent)
export type TripSortBy = 
  | 'chronological' 
  | 'popularity' 
  | 'almost_full' 
  | 'urgency_desc'
  | 'participants_asc'
  | 'participants_desc'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'experience_required'
  | 'price_asc'
  | 'price_desc'
  | 'species_variety'
  | 'captain_rating'
  | 'weather_dependency';

// Props for TripsFeed component
export interface TripsFeedProps {
  trips: GroupTripDisplay[];
  filters?: TripFilters;
  sortBy?: TripSortBy;
  onTripSelect: (trip: GroupTripDisplay) => void;
  realTimeUpdates?: boolean;
  showWeatherInfo?: boolean;
  enableSocialProof?: boolean;
  className?: string;
}

// Props for GroupTripCard component  
export interface GroupTripCardProps {
  trip: GroupTripDisplay;
  onJoinRequest: (tripId: string) => void;
  showParticipants?: boolean;
  showWeather?: boolean;
  urgencyLevel?: 'low' | 'medium' | 'high';
  className?: string;
}

// WebSocket Hook return type
export interface UseGroupTripsWebSocket {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate?: GroupTripUpdate;
  subscribe: (tripIds: string[]) => void;
  unsubscribe: (tripIds: string[]) => void;
  isSubscribed: (tripId: string) => boolean;
  error?: Error;
}

// Enhanced stats for group trips
export interface GroupTripsStats {
  totalActiveTrips: number;
  totalParticipants: number;
  confirmedTrips: number;
  formingTrips: number;
  averageParticipants: number;
  countriesRepresented: number;
  urgentTrips: number; // almost full trips
}

// Fisher Profile for social features (Phase 2)
export interface FisherProfile {
  id: string;
  name: string;
  avatar?: string;
  
  // Experience and expertise
  experience: 'beginner' | 'intermediate' | 'expert';
  specialties: Array<'deep-sea' | 'shore' | 'fly-fishing' | 'sport-fishing'>;
  
  // Reputation system
  rating: number; // 1.0 - 5.0 stars
  completedTrips: number;
  reliability: number; // percentage of confirmed trips
  
  // Social activity
  reviews: Review[];
  badges: Badge[];
  joinedAt: Date;
  lastActive: Date;
}

export interface Review {
  id: string;
  fromParticipant: string;
  tripId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  verified: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

// Participant approval system (Phase 2)
export interface ParticipantApproval {
  participantId: string;
  tripId: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  participantProfile: FisherProfile;
  message?: string;
  approvedBy?: string;
  rejectedReason?: string;
  processedAt?: Date;
}

// Utility types for real-time updates
export type WebSocketReadyState = 
  | 'CONNECTING'
  | 'OPEN' 
  | 'CLOSING'
  | 'CLOSED';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  heartbeat: {
    message: string;
    returnMessage: string;
    timeout: number;
    interval: number;
  };
  reconnectAttempts: number;
  reconnectInterval: number;
}

// Stats Interface для useGroupTrips
export interface GroupTripStats {
  totalActiveTrips: number;
  totalParticipants: number;
  confirmedTrips: number;
  formingTrips: number;
  averageParticipants: number;
  countriesRepresented: number;
}

// Hook Return Type для useGroupTrips
export interface UseGroupTripsReturn {
  // Данные
  trips: GroupTripDisplay[];
  stats: GroupTripStats;
  
  // Состояние загрузки
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  
  // Действия
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  invalidateGroupTrips: () => Promise<void>;
  
  // Фильтры и сортировка
  filters: TripFilters;
  setFilters: (filters: TripFilters) => void;
  sortBy: TripSortBy;
  setSortBy: (sortBy: TripSortBy) => void;
  
  // Пагинация
  hasMore: boolean;
  isLoadingMore: boolean;
}
