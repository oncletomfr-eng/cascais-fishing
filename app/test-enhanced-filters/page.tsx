'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EnhancedFishingFilters } from '@/components/fishing-events/enhanced'
import { TripFilters } from '@/lib/types/group-events'

// Расширенный тип с дополнительными полями
interface ExtendedTripFilters extends TripFilters {
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

// Значения по умолчанию
const DEFAULT_FILTERS: ExtendedTripFilters = {
  experience: 'any',
  timeSlot: 'any',
  status: 'any',
  spotsLeft: 0,
  eventType: 'any',
  targetSpecies: [],
  fishingTechniques: [],
  socialMode: 'any',
  equipment: 'any',
  difficultyRange: { min: 1, max: 5 },
  weatherDependency: 'any',
  priceRange: { min: 0, max: 500 },
  weatherConditions: {
    sunny: false,
    cloudy: false,
    rainy: false,
    windy: false
  },
  weatherRanges: {
    windSpeed: { min: 0, max: 50 },
    waveHeight: { min: 0, max: 5 },
    temperature: { min: 0, max: 40 },
    visibility: { min: 1, max: 20 }
  }
}

// Компонент для отображения текущих фильтров (для отладки)
function FiltersDebugDisplay({ filters }: { filters: ExtendedTripFilters }) {
  return (
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          🔍 Current Filter Values (Debug)
        </CardTitle>
        <CardDescription>
          Real-time display of all filter values for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Basic Filters */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600">Basic Filters</h4>
            <div className="space-y-1">
              <div><span className="font-medium">Event Type:</span> {filters.eventType}</div>
              <div><span className="font-medium">Experience:</span> {filters.experience}</div>
              <div><span className="font-medium">Social Mode:</span> {filters.socialMode}</div>
              <div><span className="font-medium">Equipment:</span> {filters.equipment}</div>
            </div>
          </div>

          {/* Array Filters */}
          <div className="space-y-2">
            <h4 className="font-semibold text-green-600">Array Filters</h4>
            <div className="space-y-1">
              <div>
                <span className="font-medium">Species:</span> 
                <div className="flex flex-wrap gap-1 mt-1">
                  {filters.targetSpecies?.map(species => (
                    <Badge key={species} variant="outline" className="text-xs">
                      {species}
                    </Badge>
                  ))}
                  {(!filters.targetSpecies || filters.targetSpecies.length === 0) && (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-medium">Techniques:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {filters.fishingTechniques?.map(technique => (
                    <Badge key={technique} variant="outline" className="text-xs">
                      {technique}
                    </Badge>
                  ))}
                  {(!filters.fishingTechniques || filters.fishingTechniques.length === 0) && (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Range Filters */}
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-600">Range Filters</h4>
            <div className="space-y-1">
              <div><span className="font-medium">Difficulty:</span> {filters.difficultyRange?.min}-{filters.difficultyRange?.max}</div>
              <div><span className="font-medium">Price:</span> €{filters.priceRange?.min}-€{filters.priceRange?.max}</div>
            </div>
          </div>

          {/* Weather Filters */}
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-600">Weather Filters</h4>
            <div className="space-y-1">
              <div><span className="font-medium">Dependency:</span> {String(filters.weatherDependency)}</div>
              {filters.weatherConditions && (
                <div>
                  <span className="font-medium">Conditions:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(filters.weatherConditions)
                      .filter(([_, value]) => value)
                      .map(([key]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Главный компонент страницы
export default function TestEnhancedFiltersPage() {
  const [filters, setFilters] = useState<ExtendedTripFilters>(DEFAULT_FILTERS)
  
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              🎣 Enhanced Fishing Filters Demo
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Test and explore the new advanced fishing event filter system with modern UX, 
              improved multi-select components, enhanced sliders, and detailed weather options.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Filter Component */}
            <div className="lg:col-span-2">
              <EnhancedFishingFilters
                filters={filters}
                onFiltersChange={setFilters}
                onResetFilters={resetFilters}
              />
            </div>

            {/* Debug Panel */}
            <div className="lg:col-span-1">
              <FiltersDebugDisplay filters={filters} />
            </div>
          </div>

          {/* Features Showcase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✨ Enhanced Features
              </CardTitle>
              <CardDescription>
                Key improvements and new capabilities in the enhanced filter system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">🐟 Species</Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    Modern multi-select with search, popularity sorting, and difficulty indicators
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">🎣 Techniques</Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    Tag-based selection with categories, descriptions, and visual cards
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">🎚️ Sliders</Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    Enhanced difficulty & price sliders with visual feedback and optimal ranges
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">🌤️ Weather</Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    Comprehensive weather filters with conditions and parameter ranges
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-xs text-gray-500">
                <p className="mb-2"><strong>UX Improvements:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Organized tab-based interface for better discoverability</li>
                  <li>Real-time active filter indicators with count badges</li>
                  <li>Enhanced visual feedback and animations</li>
                  <li>Better responsive design for mobile and desktop</li>
                  <li>Contextual tooltips and descriptions</li>
                  <li>Quick filter removal and reset options</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
