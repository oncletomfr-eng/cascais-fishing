/**
 * Phase-Specific UI Components Types
 * Task 17.2: Phase-Specific UI Components
 */

import { ReactNode } from 'react'
import { 
  ChatPhase, 
  CustomMessageType,
  WeatherUpdatePayload,
  CatchPhotoPayload,
  LocationSharePayload,
  FishingTipPayload 
} from '@/lib/types/multi-phase-chat'

// Base interface for all phase components
export interface BasePhaseComponentProps {
  tripId: string
  tripDate: Date
  className?: string
  isActive?: boolean
  
  // Optional callbacks for parent integration
  onPhaseComplete?: () => void
  onFeatureUsed?: (feature: string, data?: any) => void
  onMessageSent?: (content: string, type?: CustomMessageType) => void
}

// Preparation phase specific props
export interface PreparationPhaseProps extends BasePhaseComponentProps {
  // Trip planning features
  tripDetails?: {
    destination?: string
    duration?: number
    maxParticipants?: number
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    requiredGear?: string[]
    meetingPoint?: string
    departureTime?: Date
  }
  
  // Checklist and planning
  onChecklistUpdate?: (checklist: ChecklistItem[]) => void
  onGearRecommendation?: (gear: GearItem[]) => void
  onWeatherRequest?: () => void
}

// Active trip phase specific props
export interface ActiveTripPhaseProps extends BasePhaseComponentProps {
  // Real-time features
  currentLocation?: {
    lat: number
    lng: number
    accuracy?: number
  }
  
  // Live features
  onLocationShare?: (location: LocationSharePayload) => void
  onCatchLog?: (catch: CatchPhotoPayload) => void
  onEmergencyAlert?: (alert: EmergencyAlert) => void
  onGroupCheck?: () => void
}

// Post-trip phase specific props
export interface PostTripPhaseProps extends BasePhaseComponentProps {
  // Review and sharing
  tripSummary?: {
    catches: CatchRecord[]
    photos: string[]
    highlights: string[]
    totalDistance?: number
    totalTime?: number
    weather?: WeatherSummary
  }
  
  // Sharing features
  onReviewSubmit?: (review: TripReview) => void
  onPhotoShare?: (photos: string[]) => void
  onNextTripPlan?: () => void
}

// Supporting types

export interface ChecklistItem {
  id: string
  title: string
  description?: string
  category: 'gear' | 'preparation' | 'safety' | 'documents'
  isCompleted: boolean
  isRequired: boolean
  priority: 'high' | 'medium' | 'low'
}

export interface GearItem {
  id: string
  name: string
  category: 'rod' | 'reel' | 'bait' | 'clothing' | 'safety' | 'other'
  isRequired: boolean
  isAvailable?: boolean
  recommendations?: string[]
}

export interface EmergencyAlert {
  type: 'medical' | 'weather' | 'equipment' | 'location' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  location?: {
    lat: number
    lng: number
  }
  timestamp: Date
}

export interface CatchRecord {
  id: string
  species: string
  size?: number
  weight?: number
  location?: {
    lat: number
    lng: number
    name?: string
  }
  technique?: string
  bait?: string
  time: Date
  photos?: string[]
  notes?: string
}

export interface WeatherSummary {
  averageTemp: number
  windSpeed: number
  waveHeight: number
  visibility: number
  conditions: string[]
}

export interface TripReview {
  id: string
  rating: number // 1-5
  title?: string
  highlights: string[]
  improvements: string[]
  wouldRecommend: boolean
  photos?: string[]
  catches: CatchRecord[]
  totalScore: {
    organization: number
    communication: number
    fishing: number
    weather: number
    overall: number
  }
}

// Common feature actions
export interface PhaseFeatureAction {
  id: string
  label: string
  icon: ReactNode
  type: CustomMessageType | 'ui_action'
  description?: string
  isEnabled: boolean
  isLoading?: boolean
  onClick: () => void
}

// Phase-specific feature sets
export interface PreparationFeatures {
  checklistManagement: boolean
  gearRecommendations: boolean
  weatherUpdates: boolean
  participantIntroduction: boolean
  tripPlanningTools: boolean
  safetyBriefing: boolean
}

export interface ActiveTripFeatures {
  locationSharing: boolean
  catchLogging: boolean
  realTimeChat: boolean
  emergencyAlerts: boolean
  groupCheckins: boolean
  weatherUpdates: boolean
  photoSharing: boolean
  fishingTips: boolean
}

export interface PostTripFeatures {
  tripReview: boolean
  photoGallery: boolean
  catchSummary: boolean
  socialSharing: boolean
  nextTripPlanning: boolean
  participantFeedback: boolean
}

// UI State management
export interface PhaseUIState {
  activeTab: string
  isExpanded: boolean
  showAdvancedFeatures: boolean
  notifications: PhaseNotification[]
  loading: {
    [key: string]: boolean
  }
  errors: {
    [key: string]: string | null
  }
}

export interface PhaseNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  autoHide?: boolean
  duration?: number
}

// Component layout configuration
export interface PhaseLayoutConfig {
  showHeader: boolean
  showSidebar: boolean
  sidebarWidth?: number
  headerHeight?: number
  containerPadding?: number
  responsiveBreakpoint?: number
}

// Phase transition data
export interface PhaseTransitionData {
  fromPhase: ChatPhase
  toPhase: ChatPhase
  transitionType: 'auto' | 'manual'
  dataToCarryOver?: {
    checklist?: ChecklistItem[]
    catches?: CatchRecord[]
    photos?: string[]
    notes?: string[]
  }
  preserveMessages: boolean
}

// Export types for external use
export type PhaseComponentProps = 
  | PreparationPhaseProps 
  | ActiveTripPhaseProps 
  | PostTripPhaseProps

export type PhaseFeatures = 
  | PreparationFeatures 
  | ActiveTripFeatures 
  | PostTripFeatures
