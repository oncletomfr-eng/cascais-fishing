// Экспорт всех компонентов системы отслеживания прогресса и уровней
// Task 11: Progress Tracking & Leveling

export { CircularProgress } from './CircularProgress'
export { LevelProgress } from './LevelProgress'
export { ExperienceTracker } from './ExperienceTracker'
export { StreakCounter } from './StreakCounter'
export { MilestoneCelebration } from './MilestoneCelebration'
export { ProgressComparison } from './ProgressComparison'
export { ChallengeTracker } from './ChallengeTracker'

// Типы для использования в других компонентах
export type {
  CircularProgressProps
} from './CircularProgress'

export type {
  LevelProgressProps
} from './LevelProgress'

export type {
  ExperienceTrackerProps
} from './ExperienceTracker'

export type {
  StreakCounterProps
} from './StreakCounter'

export type {
  MilestoneCelebrationProps,
  Milestone
} from './MilestoneCelebration'

export type {
  ProgressComparisonProps,
  UserProgress
} from './ProgressComparison'

export type {
  ChallengeTrackerProps,
  Challenge
} from './ChallengeTracker'
