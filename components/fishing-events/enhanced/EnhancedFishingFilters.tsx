'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Filter, 
  RefreshCcw,
  Settings,
  X,
  TrendingUp
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Импорт новых компонентов
import MultiSelectSpecies from './MultiSelectSpecies'
import TagBasedTechniques from './TagBasedTechniques'
import AdvancedSliders from './AdvancedSliders'
import WeatherFilters from './WeatherFilters'

// Импорт типов
import { TripFilters } from '@/lib/types/group-events'

// Расширенные типы для новых фильтров
interface ExtendedTripFilters extends TripFilters {
  // Новые погодные фильтры
  weatherConditions?: {
    sunny: boolean
    cloudy: boolean
    rainy: boolean
    windy: boolean
  }
  weatherRanges?: {
    windSpeed: { min: number, max: number }
    waveHeight: { min: number, max: number }
    temperature: { min: number, max: number }
    visibility: { min: number, max: number }
  }
}

interface EnhancedFishingFiltersProps {
  filters: ExtendedTripFilters
  onFiltersChange: (filters: ExtendedTripFilters) => void
  onResetFilters: () => void
  className?: string
}

// Конфигурация базовых типов событий
const EVENT_TYPES = [
  { value: 'commercial', label: 'Commercial', icon: '💼', color: 'blue' },
  { value: 'community', label: 'Community', icon: '🤝', color: 'green' },
  { value: 'tournament', label: 'Tournament', icon: '🏆', color: 'yellow' },
  { value: 'learning', label: 'Learning', icon: '📚', color: 'purple' },
] as const

const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', icon: '🌱' },
  { value: 'INTERMEDIATE', label: 'Intermediate', icon: '⚡' },
  { value: 'ADVANCED', label: 'Advanced', icon: '🏆' },
  { value: 'EXPERT', label: 'Expert', icon: '⭐' },
] as const

const SOCIAL_MODES = [
  { value: 'competitive', label: 'Competitive', icon: '🏁', color: 'red' },
  { value: 'collaborative', label: 'Collaborative', icon: '🤝', color: 'blue' },
  { value: 'educational', label: 'Educational', icon: '📖', color: 'purple' },
  { value: 'recreational', label: 'Recreational', icon: '🎉', color: 'green' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', color: 'pink' },
] as const

const EQUIPMENT_OPTIONS = [
  { value: 'provided', label: 'Provided', icon: '✅' },
  { value: 'bring_own', label: 'Bring Own', icon: '🎒' },
  { value: 'rental_available', label: 'Rental Available', icon: '🏪' },
  { value: 'partially_provided', label: 'Partially Provided', icon: '⚖️' },
] as const

// Компонент активных фильтров
function ActiveFiltersDisplay({ 
  filters, 
  onRemoveFilter 
}: { 
  filters: ExtendedTripFilters
  onRemoveFilter: (key: string) => void 
}) {
  const activeFilters = []

  // Базовые фильтры
  if (filters.eventType && filters.eventType !== 'any') {
    const eventType = EVENT_TYPES.find(t => t.value === filters.eventType)
    activeFilters.push({
      key: 'eventType',
      label: `Event: ${eventType?.label}`,
      remove: () => onRemoveFilter('eventType')
    })
  }

  if (filters.experience && filters.experience !== 'any') {
    activeFilters.push({
      key: 'experience',
      label: `Level: ${filters.experience}`,
      remove: () => onRemoveFilter('experience')
    })
  }

  if (filters.socialMode && filters.socialMode !== 'any') {
    const socialMode = SOCIAL_MODES.find(m => m.value === filters.socialMode)
    activeFilters.push({
      key: 'socialMode',
      label: `Mode: ${socialMode?.label}`,
      remove: () => onRemoveFilter('socialMode')
    })
  }

  // Виды рыб
  if (filters.targetSpecies && filters.targetSpecies.length > 0) {
    activeFilters.push({
      key: 'targetSpecies',
      label: `Species: ${filters.targetSpecies.length} selected`,
      remove: () => onRemoveFilter('targetSpecies')
    })
  }

  // Техники
  if (filters.fishingTechniques && filters.fishingTechniques.length > 0) {
    activeFilters.push({
      key: 'fishingTechniques',
      label: `Techniques: ${filters.fishingTechniques.length} selected`,
      remove: () => onRemoveFilter('fishingTechniques')
    })
  }

  // Слайдеры
  if (filters.difficultyRange && (filters.difficultyRange.min > 1 || filters.difficultyRange.max < 5)) {
    activeFilters.push({
      key: 'difficultyRange',
      label: `Difficulty: ${filters.difficultyRange.min}-${filters.difficultyRange.max}`,
      remove: () => onRemoveFilter('difficultyRange')
    })
  }

  if (filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max < 500)) {
    activeFilters.push({
      key: 'priceRange',
      label: `Price: €${filters.priceRange.min}-€${filters.priceRange.max}`,
      remove: () => onRemoveFilter('priceRange')
    })
  }

  // Погодные фильтры
  if (filters.weatherDependency && filters.weatherDependency !== 'any') {
    activeFilters.push({
      key: 'weatherDependency',
      label: 'Weather dependent',
      remove: () => onRemoveFilter('weatherDependency')
    })
  }

  if (activeFilters.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2"
    >
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Active Filters ({activeFilters.length})</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-auto p-1"
            onClick={() => activeFilters.forEach(f => f.remove())}
          >
            Clear all
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="cursor-pointer text-xs"
              onClick={filter.remove}
            >
              {filter.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Основной компонент
export function EnhancedFishingFilters({
  filters,
  onFiltersChange,
  onResetFilters,
  className,
}: EnhancedFishingFiltersProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'weather'>('basic')

  // Подсчет активных фильтров
  const activeFiltersCount = useMemo(() => {
    let count = 0
    
    if (filters.eventType && filters.eventType !== 'any') count++
    if (filters.experience && filters.experience !== 'any') count++
    if (filters.socialMode && filters.socialMode !== 'any') count++
    if (filters.equipment && filters.equipment !== 'any') count++
    if (filters.targetSpecies && filters.targetSpecies.length > 0) count++
    if (filters.fishingTechniques && filters.fishingTechniques.length > 0) count++
    if (filters.difficultyRange && (filters.difficultyRange.min > 1 || filters.difficultyRange.max < 5)) count++
    if (filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max < 500)) count++
    if (filters.weatherDependency && filters.weatherDependency !== 'any') count++
    if (filters.weatherConditions && Object.values(filters.weatherConditions).some(Boolean)) count++
    
    return count
  }, [filters])

  // Обновление фильтров
  const updateFilters = useCallback((newFilters: Partial<ExtendedTripFilters>) => {
    onFiltersChange({ ...filters, ...newFilters })
  }, [filters, onFiltersChange])

  // Удаление конкретного фильтра
  const removeFilter = useCallback((key: string) => {
    const resetValues: Partial<ExtendedTripFilters> = {
      eventType: 'any',
      experience: 'any',
      socialMode: 'any',
      equipment: 'any',
      targetSpecies: [],
      fishingTechniques: [],
      difficultyRange: { min: 1, max: 5 },
      priceRange: { min: 0, max: 500 },
      weatherDependency: 'any',
      weatherConditions: { sunny: false, cloudy: false, rainy: false, windy: false }
    }
    
    if (key in resetValues) {
      updateFilters({ [key]: resetValues[key as keyof ExtendedTripFilters] })
    }
  }, [updateFilters])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Enhanced Fishing Filters</CardTitle>
            <AnimatePresence>
              {activeFiltersCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount} active
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <CardDescription>
          Advanced filtering system for fishing events with enhanced UX and detailed options.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Табы для организации фильтров */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="text-xs">
              Basic Filters
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs">
              Species & Techniques
            </TabsTrigger>
            <TabsTrigger value="weather" className="text-xs">
              Weather & Difficulty
            </TabsTrigger>
          </TabsList>

          {/* Базовые фильтры */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Event Type</label>
                <Select
                  value={filters.eventType || 'any'}
                  onValueChange={(value) => updateFilters({ eventType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Type</SelectItem>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience Level</label>
                <Select
                  value={filters.experience}
                  onValueChange={(value) => updateFilters({ experience: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Level</SelectItem>
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value.toLowerCase()}>
                        <div className="flex items-center gap-2">
                          <span>{level.icon}</span>
                          <span>{level.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Social Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Social Mode</label>
                <Select
                  value={filters.socialMode || 'any'}
                  onValueChange={(value) => updateFilters({ socialMode: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Mode</SelectItem>
                    {SOCIAL_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center gap-2">
                          <span>{mode.icon}</span>
                          <span>{mode.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Equipment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Equipment</label>
                <Select
                  value={filters.equipment || 'any'}
                  onValueChange={(value) => updateFilters({ equipment: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Equipment</SelectItem>
                    {EQUIPMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Продвинутые фильтры: виды рыб и техники */}
          <TabsContent value="advanced" className="space-y-6">
            <MultiSelectSpecies
              value={filters.targetSpecies || []}
              onChange={(value) => updateFilters({ targetSpecies: value })}
            />
            
            <Separator />
            
            <TagBasedTechniques
              value={filters.fishingTechniques || []}
              onChange={(value) => updateFilters({ fishingTechniques: value })}
            />
          </TabsContent>

          {/* Погода и сложность */}
          <TabsContent value="weather" className="space-y-6">
            <AdvancedSliders
              difficultyRange={filters.difficultyRange || { min: 1, max: 5 }}
              priceRange={filters.priceRange || { min: 0, max: 500 }}
              onDifficultyChange={(range) => updateFilters({ difficultyRange: range })}
              onPriceChange={(range) => updateFilters({ priceRange: range })}
            />
            
            <Separator />
            
            <WeatherFilters
              weatherDependency={filters.weatherDependency || 'any'}
              conditions={filters.weatherConditions}
              ranges={filters.weatherRanges}
              onWeatherDependencyChange={(value) => updateFilters({ weatherDependency: value })}
              onConditionsChange={(conditions) => updateFilters({ weatherConditions: conditions })}
              onRangesChange={(ranges) => updateFilters({ weatherRanges: ranges })}
            />
          </TabsContent>
        </Tabs>

        {/* Активные фильтры */}
        <ActiveFiltersDisplay 
          filters={filters} 
          onRemoveFilter={removeFilter} 
        />
      </CardContent>
    </Card>
  )
}

export default EnhancedFishingFilters
