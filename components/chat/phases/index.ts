/**
 * Phase-Specific UI Components Exports
 * Task 17.2: Phase-Specific UI Components
 */

// Component exports
export { PreparationPhase } from './PreparationPhase'
export { ActiveTripPhase } from './ActiveTripPhase'
export { PostTripPhase } from './PostTripPhase'

// Type exports
export type {
  // Base types
  BasePhaseComponentProps,
  PhaseComponentProps,
  PhaseFeatures,
  PhaseFeatureAction,
  PhaseUIState,
  PhaseNotification,
  PhaseLayoutConfig,
  PhaseTransitionData,
  
  // Phase-specific props
  PreparationPhaseProps,
  ActiveTripPhaseProps,
  PostTripPhaseProps,
  
  // Phase-specific features
  PreparationFeatures,
  ActiveTripFeatures,
  PostTripFeatures,
  
  // Supporting types
  ChecklistItem,
  GearItem,
  EmergencyAlert,
  CatchRecord,
  WeatherSummary,
  TripReview
} from './types'
