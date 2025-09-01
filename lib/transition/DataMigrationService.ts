/**
 * Data Migration Service for Phase Transitions
 * Task 17.3: Phase Transition Logic - Data Migration System
 */

import { ChatPhase } from '@/lib/types/multi-phase-chat'
import {
  DataMigration,
  DataMigrationRule,
  TransitionContext,
  TransitionError
} from './phase-transition-types'
import { 
  ChecklistItem, 
  CatchRecord, 
  TripReview,
  WeatherData,
  FishingSpot,
  ParticipantStatus
} from '@/components/chat/phases/types'

export class DataMigrationService {
  private migrations: Map<string, DataMigration> = new Map()
  private migrationHistory: MigrationHistoryEntry[] = []

  constructor() {
    this.initializeDefaultMigrations()
  }

  // Register a custom migration
  registerMigration(migration: DataMigration): void {
    const key = `${migration.fromPhase}-${migration.toPhase}`
    this.migrations.set(key, migration)
  }

  // Execute migration between phases
  async executeMigration(
    fromPhase: ChatPhase,
    toPhase: ChatPhase,
    sourceData: any,
    context: TransitionContext
  ): Promise<MigrationResult> {
    const migrationKey = `${fromPhase}-${toPhase}`
    const migration = this.migrations.get(migrationKey)

    if (!migration) {
      return {
        success: true,
        migratedData: sourceData, // No migration defined, pass through
        appliedRules: [],
        warnings: [`No migration defined for ${fromPhase} -> ${toPhase}`]
      }
    }

    const result: MigrationResult = {
      success: false,
      migratedData: {},
      appliedRules: [],
      errors: [],
      warnings: []
    }

    try {
      // Execute each migration rule
      for (const rule of migration.migrations) {
        try {
          const ruleResult = await this.executeMigrationRule(rule, sourceData, context)
          
          if (ruleResult.success) {
            result.migratedData[rule.targetKey] = ruleResult.data
            result.appliedRules.push(rule.id)
          } else {
            if (rule.isRequired) {
              result.errors.push(`Required migration rule failed: ${rule.id} - ${ruleResult.error}`)
            } else {
              result.warnings.push(`Optional migration rule failed: ${rule.id} - ${ruleResult.error}`)
            }
          }
        } catch (error) {
          const errorMessage = `Migration rule ${rule.id} threw exception: ${error}`
          if (rule.isRequired) {
            result.errors.push(errorMessage)
          } else {
            result.warnings.push(errorMessage)
          }
        }
      }

      result.success = result.errors.length === 0

      // Log migration in history
      this.addToHistory({
        id: `migration-${Date.now()}`,
        fromPhase,
        toPhase,
        executedAt: new Date(),
        success: result.success,
        appliedRules: result.appliedRules,
        errors: result.errors,
        warnings: result.warnings,
        dataSize: JSON.stringify(sourceData).length
      })

      return result

    } catch (error) {
      result.errors.push(`Migration execution failed: ${error}`)
      return result
    }
  }

  // Execute a single migration rule
  private async executeMigrationRule(
    rule: DataMigrationRule,
    sourceData: any,
    context: TransitionContext
  ): Promise<RuleExecutionResult> {
    try {
      // Extract source data
      const extractedData = this.extractDataByKey(sourceData, rule.sourceKey)
      
      if (extractedData === undefined && rule.isRequired) {
        return {
          success: false,
          error: `Required source data not found: ${rule.sourceKey}`
        }
      }

      // Transform data if transformer is provided
      let transformedData = extractedData
      if (rule.transformer) {
        transformedData = await rule.transformer(extractedData, context)
      }

      // Validate transformed data
      if (rule.validator && !rule.validator(transformedData)) {
        return {
          success: false,
          error: `Validation failed for transformed data`
        }
      }

      return {
        success: true,
        data: transformedData
      }

    } catch (error) {
      return {
        success: false,
        error: `Rule execution error: ${error}`
      }
    }
  }

  // Extract data by nested key path
  private extractDataByKey(data: any, keyPath: string): any {
    const keys = keyPath.split('.')
    let current = data

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return undefined
      }
    }

    return current
  }

  // Add entry to migration history
  private addToHistory(entry: MigrationHistoryEntry): void {
    this.migrationHistory.push(entry)
    
    // Keep only last 100 entries
    if (this.migrationHistory.length > 100) {
      this.migrationHistory = this.migrationHistory.slice(-100)
    }
  }

  // Get migration history
  getMigrationHistory(): MigrationHistoryEntry[] {
    return [...this.migrationHistory]
  }

  // Get available migrations
  getAvailableMigrations(): Array<{ fromPhase: ChatPhase; toPhase: ChatPhase; rulesCount: number }> {
    return Array.from(this.migrations.values()).map(migration => ({
      fromPhase: migration.fromPhase,
      toPhase: migration.toPhase,
      rulesCount: migration.migrations.length
    }))
  }

  // Initialize default migrations
  private initializeDefaultMigrations(): void {
    // Preparation -> Live Migration
    this.registerMigration({
      fromPhase: 'preparation',
      toPhase: 'live',
      migrations: [
        {
          id: 'preparation-checklist-to-live-status',
          description: 'Convert preparation checklist to live trip status',
          sourceKey: 'checklist',
          targetKey: 'preparationStatus',
          transformer: (checklist: ChecklistItem[]) => {
            const completed = checklist.filter(item => item.isCompleted)
            return {
              totalTasks: checklist.length,
              completedTasks: completed.length,
              completionPercentage: (completed.length / checklist.length) * 100,
              readinessScore: this.calculateReadinessScore(checklist),
              pendingTasks: checklist.filter(item => !item.isCompleted).map(item => item.title)
            }
          },
          validator: (data) => data.totalTasks > 0,
          isRequired: true
        },
        {
          id: 'preparation-gear-to-live-inventory',
          description: 'Convert gear recommendations to live inventory',
          sourceKey: 'gearRecommendations',
          targetKey: 'currentInventory',
          transformer: (gear: any[]) => {
            return gear.map(item => ({
              name: item.name,
              category: item.category,
              isAvailable: true,
              condition: 'good',
              lastChecked: new Date()
            }))
          },
          isRequired: false
        },
        {
          id: 'preparation-participants-to-live-crew',
          description: 'Convert trip participants to live crew status',
          sourceKey: 'tripDetails.participants',
          targetKey: 'crewStatus',
          transformer: (participants: string[]) => {
            return participants.map(name => ({
              name,
              status: 'active' as ParticipantStatus,
              joinedAt: new Date(),
              lastSeen: new Date(),
              role: name.includes('captain') ? 'captain' : 'participant'
            }))
          },
          isRequired: true
        },
        {
          id: 'preparation-weather-to-live-conditions',
          description: 'Convert weather forecast to current conditions baseline',
          sourceKey: 'weatherForecast',
          targetKey: 'currentConditions',
          transformer: (forecast: WeatherData) => ({
            ...forecast,
            isActual: false,
            forecastAccuracy: 'unknown',
            lastUpdated: new Date()
          }),
          isRequired: false
        }
      ]
    })

    // Live -> Debrief Migration
    this.registerMigration({
      fromPhase: 'live',
      toPhase: 'debrief',
      migrations: [
        {
          id: 'live-catches-to-debrief-summary',
          description: 'Convert live catches to trip summary',
          sourceKey: 'catches',
          targetKey: 'tripSummary.catches',
          transformer: (catches: CatchRecord[]) => {
            const totalWeight = catches.reduce((sum, catch_) => sum + (catch_.weight || 0), 0)
            const uniqueSpecies = new Set(catches.map(c => c.species)).size
            const avgWeight = catches.length > 0 ? totalWeight / catches.length : 0
            
            return {
              total: catches.length,
              totalWeight: totalWeight,
              averageWeight: avgWeight,
              uniqueSpecies: uniqueSpecies,
              biggestCatch: catches.reduce((biggest, current) => 
                (current.weight || 0) > (biggest?.weight || 0) ? current : biggest, catches[0]),
              catches: catches
            }
          },
          validator: (data) => Array.isArray(data.catches),
          isRequired: true
        },
        {
          id: 'live-location-to-debrief-route',
          description: 'Convert location history to trip route',
          sourceKey: 'locationHistory',
          targetKey: 'tripSummary.route',
          transformer: (locations: Array<{ lat: number; lng: number; timestamp: Date }>) => {
            if (!locations || locations.length === 0) return null
            
            const totalDistance = this.calculateTotalDistance(locations)
            const duration = locations.length > 1 ? 
              locations[locations.length - 1].timestamp.getTime() - locations[0].timestamp.getTime() : 0
            
            return {
              startPoint: locations[0],
              endPoint: locations[locations.length - 1],
              totalDistance: totalDistance,
              duration: duration,
              waypoints: locations.length,
              averageSpeed: duration > 0 ? (totalDistance / (duration / 1000 / 3600)) : 0
            }
          },
          isRequired: false
        },
        {
          id: 'live-crew-to-debrief-participants',
          description: 'Convert crew status to participant summary',
          sourceKey: 'crewStatus',
          targetKey: 'tripSummary.participants',
          transformer: (crew: ParticipantStatus[]) => {
            return crew.map(member => ({
              name: member.name,
              role: member.role,
              participation: 'full', // Could be calculated based on activity
              catches: 0, // Would need to be calculated from catches data
              highlights: []
            }))
          },
          isRequired: false
        },
        {
          id: 'live-weather-to-debrief-conditions',
          description: 'Convert weather conditions to trip weather summary',
          sourceKey: 'weatherConditions',
          targetKey: 'tripSummary.weather',
          transformer: (conditions: WeatherData[]) => {
            if (!conditions || conditions.length === 0) return null
            
            const avgTemp = conditions.reduce((sum, c) => sum + c.temperature, 0) / conditions.length
            const avgWind = conditions.reduce((sum, c) => sum + c.windSpeed, 0) / conditions.length
            const avgWaves = conditions.reduce((sum, c) => sum + (c.waveHeight || 0), 0) / conditions.length
            
            return {
              averageTemp: avgTemp,
              windSpeed: avgWind,
              waveHeight: avgWaves,
              visibility: conditions[conditions.length - 1]?.visibility || 0,
              conditions: [...new Set(conditions.flatMap(c => c.conditions || []))]
            }
          },
          isRequired: false
        }
      ]
    })

    // Debrief -> Preparation Migration (for next trip)
    this.registerMigration({
      fromPhase: 'debrief',
      toPhase: 'preparation',
      migrations: [
        {
          id: 'debrief-lessons-to-preparation-improvements',
          description: 'Convert trip lessons to preparation improvements',
          sourceKey: 'reviews',
          targetKey: 'improvementSuggestions',
          transformer: (reviews: TripReview[]) => {
            const allSuggestions = reviews.flatMap(review => review.suggestions || [])
            const suggestionCounts = allSuggestions.reduce((acc, suggestion) => {
              acc[suggestion] = (acc[suggestion] || 0) + 1
              return acc
            }, {} as Record<string, number>)
            
            return Object.entries(suggestionCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10) // Top 10 suggestions
              .map(([suggestion, count]) => ({
                suggestion,
                frequency: count,
                priority: count > reviews.length / 2 ? 'high' : 'medium'
              }))
          },
          isRequired: false
        },
        {
          id: 'debrief-successful-spots-to-preparation-recommendations',
          description: 'Convert successful fishing spots to recommendations',
          sourceKey: 'tripSummary.catches',
          targetKey: 'recommendedSpots',
          transformer: (catchSummary: any) => {
            // Extract fishing spots from successful catches
            const catches = catchSummary?.catches || []
            const spotSuccess = catches.reduce((acc: any, catch_: CatchRecord) => {
              if (catch_.location) {
                const spotKey = `${catch_.location.lat.toFixed(3)},${catch_.location.lng.toFixed(3)}`
                if (!acc[spotKey]) {
                  acc[spotKey] = {
                    location: catch_.location,
                    catches: 0,
                    totalWeight: 0,
                    species: new Set()
                  }
                }
                acc[spotKey].catches++
                acc[spotKey].totalWeight += catch_.weight || 0
                acc[spotKey].species.add(catch_.species)
              }
              return acc
            }, {})
            
            return Object.values(spotSuccess)
              .filter((spot: any) => spot.catches > 0)
              .sort((a: any, b: any) => b.totalWeight - a.totalWeight)
              .slice(0, 5) // Top 5 spots
              .map((spot: any) => ({
                location: spot.location,
                successRate: spot.catches,
                averageWeight: spot.totalWeight / spot.catches,
                species: Array.from(spot.species),
                recommendation: 'high'
              }))
          },
          isRequired: false
        }
      ]
    })
  }

  // Helper methods
  private calculateReadinessScore(checklist: ChecklistItem[]): number {
    if (checklist.length === 0) return 0
    
    const weights = {
      safety: 3,
      equipment: 2,
      preparation: 1,
      optional: 0.5
    }
    
    let totalWeight = 0
    let completedWeight = 0
    
    checklist.forEach(item => {
      const weight = weights[item.category as keyof typeof weights] || 1
      totalWeight += weight
      if (item.isCompleted) {
        completedWeight += weight
      }
    })
    
    return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0
  }

  private calculateTotalDistance(locations: Array<{ lat: number; lng: number }>): number {
    if (locations.length < 2) return 0
    
    let total = 0
    for (let i = 1; i < locations.length; i++) {
      total += this.haversineDistance(
        locations[i - 1].lat, locations[i - 1].lng,
        locations[i].lat, locations[i].lng
      )
    }
    return total
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
}

// Types for migration results and history
export interface MigrationResult {
  success: boolean
  migratedData: any
  appliedRules: string[]
  errors?: string[]
  warnings?: string[]
}

export interface RuleExecutionResult {
  success: boolean
  data?: any
  error?: string
}

export interface MigrationHistoryEntry {
  id: string
  fromPhase: ChatPhase
  toPhase: ChatPhase
  executedAt: Date
  success: boolean
  appliedRules: string[]
  errors: string[]
  warnings: string[]
  dataSize: number
}

// Create default instance
export const dataMigrationService = new DataMigrationService()
