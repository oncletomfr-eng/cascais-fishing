/**
 * Phase Transition Container with Smooth Animations
 * Task 17.3: Phase Transition Logic - UI Animations
 */

'use client'

import React, { useState, useEffect, useRef, ReactNode } from 'react'
import { AnimatePresence, motion, Variants } from 'framer-motion'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { 
  usePhaseTransition, 
  TransitionResult 
} from '@/lib/transition/usePhaseTransition'
import { 
  TransitionAnimation, 
  PhaseTransition 
} from '@/lib/transition/phase-transition-types'
import { cn } from '@/lib/utils'

// Animation variants for different transition types
const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
}

const fadeVariants: Variants = {
  enter: {
    opacity: 0
  },
  center: {
    opacity: 1
  },
  exit: {
    opacity: 0
  }
}

const scaleVariants: Variants = {
  enter: {
    scale: 0.8,
    opacity: 0
  },
  center: {
    scale: 1,
    opacity: 1
  },
  exit: {
    scale: 1.2,
    opacity: 0
  }
}

const flipVariants: Variants = {
  enter: {
    rotateY: -90,
    opacity: 0
  },
  center: {
    rotateY: 0,
    opacity: 1
  },
  exit: {
    rotateY: 90,
    opacity: 0
  }
}

// Transition progress indicator
interface TransitionProgressProps {
  isTransitioning: boolean
  currentTransition: PhaseTransition | null
  duration: number
}

function TransitionProgress({ 
  isTransitioning, 
  currentTransition, 
  duration 
}: TransitionProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isTransitioning || !currentTransition) {
      setProgress(0)
      return
    }

    const startTime = currentTransition.triggeredAt.getTime()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progressPercent = Math.min((elapsed / duration) * 100, 100)
      setProgress(progressPercent)
      
      if (progressPercent >= 100) {
        clearInterval(interval)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [isTransitioning, currentTransition, duration])

  if (!isTransitioning) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
      <motion.div
        className="h-full bg-blue-500"
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </div>
  )
}

// Phase indicator component
interface PhaseIndicatorProps {
  currentPhase: ChatPhase
  targetPhase?: ChatPhase
  isTransitioning: boolean
  className?: string
}

function PhaseIndicator({ 
  currentPhase, 
  targetPhase, 
  isTransitioning, 
  className 
}: PhaseIndicatorProps) {
  const phases: { phase: ChatPhase; label: string; icon: string }[] = [
    { phase: 'preparation', label: 'Подготовка', icon: '🎣' },
    { phase: 'live', label: 'Процесс', icon: '🚤' },
    { phase: 'debrief', label: 'Итоги', icon: '🌅' }
  ]

  return (
    <div className={cn('flex items-center space-x-4 p-4 bg-white border-b', className)}>
      {phases.map((phaseInfo, index) => {
        const isActive = phaseInfo.phase === currentPhase
        const isTarget = phaseInfo.phase === targetPhase
        const isPassed = phases.findIndex(p => p.phase === currentPhase) > index
        
        return (
          <React.Fragment key={phaseInfo.phase}>
            <div className="flex items-center space-x-2">
              <motion.div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isActive && !isTransitioning && 'bg-blue-500 text-white',
                  isActive && isTransitioning && 'bg-orange-500 text-white',
                  isTarget && isTransitioning && 'bg-green-500 text-white',
                  isPassed && 'bg-green-500 text-white',
                  !isActive && !isTarget && !isPassed && 'bg-gray-200 text-gray-600'
                )}
                animate={isActive && isTransitioning ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {phaseInfo.icon}
              </motion.div>
              <div className="text-sm">
                <div className={cn(
                  'font-medium',
                  isActive && 'text-blue-600',
                  isTarget && isTransitioning && 'text-green-600',
                  isPassed && 'text-green-600',
                  !isActive && !isTarget && !isPassed && 'text-gray-600'
                )}>
                  {phaseInfo.label}
                </div>
                {isActive && isTransitioning && (
                  <div className="text-xs text-orange-600">Переход...</div>
                )}
              </div>
            </div>
            
            {index < phases.length - 1 && (
              <motion.div
                className={cn(
                  'h-0.5 w-8 transition-colors',
                  isPassed && 'bg-green-500',
                  !isPassed && 'bg-gray-300'
                )}
                animate={
                  isActive && isTransitioning ? 
                  { backgroundColor: ['#d1d5db', '#10b981', '#d1d5db'] } : 
                  {}
                }
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Main transition container component
interface PhaseTransitionContainerProps {
  children: ReactNode
  className?: string
  animation?: TransitionAnimation
  showProgress?: boolean
  showPhaseIndicator?: boolean
  onTransitionStart?: () => void
  onTransitionComplete?: () => void
  onTransitionError?: (error: any) => void
}

export function PhaseTransitionContainer({
  children,
  className,
  animation,
  showProgress = true,
  showPhaseIndicator = true,
  onTransitionStart,
  onTransitionComplete,
  onTransitionError
}: PhaseTransitionContainerProps) {
  const {
    currentPhase,
    isTransitioning,
    currentTransition,
    getConfig
  } = usePhaseTransition()

  const [direction, setDirection] = useState(0)
  const [targetPhase, setTargetPhase] = useState<ChatPhase | undefined>()
  const prevPhaseRef = useRef(currentPhase)

  // Determine animation configuration
  const config = getConfig()
  const animationConfig = animation || config.defaultAnimation

  // Determine transition direction
  useEffect(() => {
    const phases: ChatPhase[] = ['preparation', 'live', 'debrief']
    const prevIndex = phases.indexOf(prevPhaseRef.current)
    const currentIndex = phases.indexOf(currentPhase)
    
    if (prevIndex !== currentIndex) {
      setDirection(currentIndex > prevIndex ? 1 : -1)
      prevPhaseRef.current = currentPhase
    }
  }, [currentPhase])

  // Track target phase during transitions
  useEffect(() => {
    if (isTransitioning && currentTransition) {
      setTargetPhase(currentTransition.toPhase)
      onTransitionStart?.()
    } else {
      setTargetPhase(undefined)
      if (prevPhaseRef.current !== currentPhase) {
        onTransitionComplete?.()
      }
    }
  }, [isTransitioning, currentTransition, currentPhase, onTransitionStart, onTransitionComplete])

  // Get animation variants based on type
  const getVariants = () => {
    switch (animationConfig.type) {
      case 'slide':
        return slideVariants
      case 'fade':
        return fadeVariants
      case 'scale':
        return scaleVariants
      case 'flip':
        return flipVariants
      case 'none':
        return {}
      default:
        return slideVariants
    }
  }

  const variants = getVariants()
  const duration = animationConfig.duration / 1000 // Convert to seconds

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Transition Progress */}
      {showProgress && (
        <TransitionProgress
          isTransitioning={isTransitioning}
          currentTransition={currentTransition}
          duration={animationConfig.duration}
        />
      )}

      {/* Phase Indicator */}
      {showPhaseIndicator && (
        <PhaseIndicator
          currentPhase={currentPhase}
          targetPhase={targetPhase}
          isTransitioning={isTransitioning}
        />
      )}

      {/* Main Content with Animations */}
      <div className="relative">
        {animationConfig.type === 'none' ? (
          // No animation - direct render
          <div key={currentPhase}>
            {children}
          </div>
        ) : (
          // Animated transitions
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPhase}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration,
                ease: animationConfig.easing || 'easeInOut'
              }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Loading overlay during transitions */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                />
                <p className="text-sm text-gray-600">
                  Переход к фазе "{targetPhase === 'preparation' ? 'Подготовка' : 
                                   targetPhase === 'live' ? 'Процесс' : 'Итоги'}"...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Utility component for phase-specific animations
interface PhaseAnimationWrapperProps {
  phase: ChatPhase
  children: ReactNode
  enterAnimation?: 'slideUp' | 'fadeIn' | 'scaleIn'
  exitAnimation?: 'slideDown' | 'fadeOut' | 'scaleOut'
  className?: string
}

export function PhaseAnimationWrapper({
  phase,
  children,
  enterAnimation = 'fadeIn',
  exitAnimation = 'fadeOut',
  className
}: PhaseAnimationWrapperProps) {
  const enterVariants = {
    slideUp: { y: 50, opacity: 0 },
    fadeIn: { opacity: 0 },
    scaleIn: { scale: 0.9, opacity: 0 }
  }

  const exitVariants = {
    slideDown: { y: -50, opacity: 0 },
    fadeOut: { opacity: 0 },
    scaleOut: { scale: 1.1, opacity: 0 }
  }

  return (
    <motion.div
      key={`${phase}-wrapper`}
      initial={enterVariants[enterAnimation]}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={exitVariants[exitAnimation]}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Transition controls component
interface TransitionControlsProps {
  className?: string
  disabled?: boolean
  showValidation?: boolean
}

export function TransitionControls({ 
  className, 
  disabled = false,
  showValidation = true 
}: TransitionControlsProps) {
  const {
    currentPhase,
    isTransitioning,
    requestTransition,
    validateTransition,
    capabilities,
    getPhaseCapabilities
  } = usePhaseTransition()

  const [validationResults, setValidationResults] = useState<Record<string, any>>({})

  const phases: { phase: ChatPhase; label: string; icon: string }[] = [
    { phase: 'preparation', label: 'Подготовка', icon: '🎣' },
    { phase: 'live', label: 'Процесс', icon: '🚤' },
    { phase: 'debrief', label: 'Итоги', icon: '🌅' }
  ]

  // Validate all possible transitions
  useEffect(() => {
    if (!showValidation) return

    const validateAllTransitions = async () => {
      const results: Record<string, any> = {}
      
      for (const phaseInfo of phases) {
        if (phaseInfo.phase !== currentPhase) {
          try {
            const validation = await validateTransition(phaseInfo.phase)
            const capabilities = getPhaseCapabilities(phaseInfo.phase)
            results[phaseInfo.phase] = { validation, capabilities }
          } catch (error) {
            results[phaseInfo.phase] = { 
              validation: { isValid: false, errors: [`Validation error: ${error}`], warnings: [] },
              capabilities: { canEnter: false, canExit: false, reasons: ['Validation failed'] }
            }
          }
        }
      }
      
      setValidationResults(results)
    }

    validateAllTransitions()
  }, [currentPhase, validateTransition, getPhaseCapabilities, showValidation])

  const handleTransition = async (toPhase: ChatPhase) => {
    if (disabled || isTransitioning || toPhase === currentPhase) return

    try {
      const result = await requestTransition(toPhase, 'manual')
      if (!result.success && result.error) {
        console.error('Transition failed:', result.error)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Transition request failed:', error)
    }
  }

  return (
    <div className={cn('p-4 bg-gray-50 border rounded-lg', className)}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Переходы между фазами
      </h3>
      
      <div className="space-y-2">
        {phases.map((phaseInfo) => {
          const isCurrentPhase = phaseInfo.phase === currentPhase
          const results = validationResults[phaseInfo.phase]
          const canTransition = results?.validation?.isValid && results?.capabilities?.canEnter
          
          return (
            <div key={phaseInfo.phase} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{phaseInfo.icon}</span>
                <span className={cn(
                  'text-sm',
                  isCurrentPhase && 'font-medium text-blue-600'
                )}>
                  {phaseInfo.label}
                </span>
                {isCurrentPhase && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Текущая
                  </span>
                )}
              </div>
              
              {!isCurrentPhase && (
                <button
                  onClick={() => handleTransition(phaseInfo.phase)}
                  disabled={disabled || isTransitioning || !canTransition}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    canTransition
                      ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  )}
                  title={
                    canTransition 
                      ? `Перейти к фазе "${phaseInfo.label}"`
                      : results?.validation?.errors?.join(', ') || 'Переход недоступен'
                  }
                >
                  {isTransitioning ? 'Переход...' : 'Перейти'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      
      {showValidation && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-xs text-gray-500">
            <div>Текущие возможности:</div>
            <div>Вход: {capabilities?.canEnter ? '✅' : '❌'}</div>
            <div>Выход: {capabilities?.canExit ? '✅' : '❌'}</div>
            {capabilities?.reasons.length > 0 && (
              <div className="mt-1 text-yellow-600">
                {capabilities.reasons.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
