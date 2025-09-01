/**
 * Post-Trip Phase Component (Simplified)
 * Task 17.2: Phase-Specific UI Components - Review and Sharing Functionality
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Star,
  Share2,
  Camera,
  Fish,
  Calendar,
  Award,
  BarChart3,
  TrendingUp,
  Send,
  Plus,
  X,
  Check
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import {
  PostTripPhaseProps,
  TripReview,
  CatchRecord
} from './types'

// Default trip summary for demo
const DEFAULT_TRIP_SUMMARY = {
  catches: [
    {
      id: '1',
      species: 'Треска',
      size: 45,
      weight: 2.1,
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      technique: 'Спиннинг',
      bait: 'Воблер'
    }
  ] as CatchRecord[],
  photos: ['photo1.jpg', 'photo2.jpg'],
  highlights: ['Отличная погода', 'Хорошая компания'],
  totalDistance: 25.6,
  totalTime: 480,
  weather: {
    averageTemp: 18,
    windSpeed: 12,
    waveHeight: 0.8,
    visibility: 95,
    conditions: ['Ясно']
  }
}

// Rating categories
const RATING_CATEGORIES = [
  { key: 'organization', label: 'Организация', icon: Calendar },
  { key: 'communication', label: 'Коммуникация', icon: Share2 },
  { key: 'fishing', label: 'Рыбалка', icon: Fish },
  { key: 'weather', label: 'Погода', icon: Calendar },
  { key: 'overall', label: 'Общее впечатление', icon: Star }
] as const

export function PostTripPhase({
  tripId,
  tripDate,
  tripSummary = DEFAULT_TRIP_SUMMARY,
  className,
  isActive = false,
  onReviewSubmit,
  onPhotoShare,
  onNextTripPlan,
  onPhaseComplete,
  onFeatureUsed,
  onMessageSent
}: PostTripPhaseProps) {
  // State management
  const [review, setReview] = useState<Partial<TripReview>>({
    rating: 0,
    highlights: [],
    improvements: [],
    wouldRecommend: true,
    totalScore: {
      organization: 0,
      communication: 0,
      fishing: 0,
      weather: 0,
      overall: 0
    }
  })
  
  const [activeTab, setActiveTab] = useState('summary')
  const [newHighlight, setNewHighlight] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  // Trip statistics
  const tripStats = useMemo(() => {
    const catches = tripSummary.catches || []
    const totalCatches = catches.length
    const totalWeight = catches.reduce((sum, catch_) => sum + (catch_.weight || 0), 0)
    
    return {
      totalCatches,
      totalWeight: totalWeight.toFixed(1),
      duration: tripSummary.totalTime || 0,
      durationFormatted: tripSummary.totalTime 
        ? `${Math.floor(tripSummary.totalTime / 60)}ч ${tripSummary.totalTime % 60}м`
        : '0ч 0м',
      distance: tripSummary.totalDistance || 0,
      photosCount: tripSummary.photos?.length || 0
    }
  }, [tripSummary])

  // Handle rating change
  const handleRatingChange = useCallback((category: keyof TripReview['totalScore'], rating: number) => {
    setReview(prev => ({
      ...prev,
      totalScore: {
        ...prev.totalScore!,
        [category]: rating
      }
    }))
  }, [])

  // Handle review submission
  const handleReviewSubmit = useCallback(() => {
    const finalReview: TripReview = {
      id: `review-${Date.now()}`,
      rating: review.rating || 0,
      title: `Поездка ${format(tripDate, 'dd.MM.yyyy')}`,
      highlights: review.highlights || [],
      improvements: review.improvements || [],
      wouldRecommend: review.wouldRecommend || true,
      photos: [],
      catches: tripSummary.catches || [],
      totalScore: review.totalScore || {
        organization: 0,
        communication: 0,
        fishing: 0,
        weather: 0,
        overall: 0
      }
    }

    onReviewSubmit?.(finalReview)
    setReviewSubmitted(true)
    onFeatureUsed?.('review_submitted', finalReview)
  }, [review, tripDate, tripSummary.catches, onReviewSubmit, onFeatureUsed])

  // Add highlight
  const addHighlight = useCallback(() => {
    if (!newHighlight.trim()) return
    
    setReview(prev => ({
      ...prev,
      highlights: [...(prev.highlights || []), newHighlight.trim()]
    }))
    setNewHighlight('')
  }, [newHighlight])

  // Calculate overall rating
  const overallRating = useMemo(() => {
    const scores = Object.values(review.totalScore || {})
    const validScores = scores.filter(score => score > 0)
    return validScores.length > 0
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : 0
  }, [review.totalScore])

  return (
    <div
      className={cn(
        "w-full max-w-4xl mx-auto space-y-4 transition-opacity duration-300",
        !isActive && "pointer-events-none opacity-70",
        isActive && "opacity-100",
        className
      )}
    >
      {/* Phase Header */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-amber-900">
                  🌅 Итоги поездки
                </CardTitle>
                <p className="text-sm text-amber-700">
                  Завершена {formatDistanceToNow(tripDate, { locale: ru, addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-900">
                {tripStats.totalCatches}
              </div>
              <div className="text-xs text-amber-600">уловов</div>
            </div>
          </div>
          
          {/* Trip Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-amber-900">{tripStats.totalCatches}</div>
              <div className="text-xs text-amber-600">Рыб</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-900">{tripStats.totalWeight}</div>
              <div className="text-xs text-amber-600">кг</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-900">{tripStats.photosCount}</div>
              <div className="text-xs text-amber-600">фото</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-900">{tripStats.distance}</div>
              <div className="text-xs text-amber-600">км</div>
            </div>
          </div>

          {/* Overall Rating Display */}
          {overallRating > 0 && (
            <div className="mt-4 p-3 bg-white/60 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-900">Общая оценка</span>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < Math.round(overallRating)
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                  <span className="ml-2 text-sm font-bold text-amber-900">
                    {overallRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Feature Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-1" />
          Поделиться итогами
        </Button>
        <Button variant="outline" size="sm">
          <Camera className="w-4 h-4 mr-1" />
          Галерея фото
        </Button>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-1" />
          Планировать следующую
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Итоги</TabsTrigger>
          <TabsTrigger value="review">Отзыв</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Trip Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Сводка поездки</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Продолжительность</span>
                  <span className="text-sm font-medium">{tripStats.durationFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Общий вес улова</span>
                  <span className="text-sm font-medium">{tripStats.totalWeight} кг</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Пройдено</span>
                  <span className="text-sm font-medium">{tripStats.distance} км</span>
                </div>
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>Ключевые моменты</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tripSummary.highlights?.map((highlight, index) => (
                    <div key={index} className="p-2 bg-amber-50 rounded-lg">
                      <div className="text-sm text-amber-800">{highlight}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          {!reviewSubmitted ? (
            <>
              {/* Rating Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Оценить поездку</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {RATING_CATEGORIES.map((category) => (
                    <div key={category.key} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <category.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => handleRatingChange(category.key, i + 1)}
                            className={cn(
                              "w-5 h-5 transition-colors",
                              i < (review.totalScore?.[category.key] || 0)
                                ? "text-yellow-500"
                                : "text-gray-300 hover:text-yellow-400"
                            )}
                          >
                            <Star className="w-full h-full fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Add Highlights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-700">Что понравилось</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Добавить что понравилось..."
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                      className="flex-1"
                    />
                    <Button onClick={addHighlight} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {review.highlights?.map((highlight, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-sm text-green-800">{highlight}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReview(prev => ({
                              ...prev,
                              highlights: prev.highlights?.filter((_, i) => i !== index) || []
                            }))
                          }}
                          className="w-6 h-6 p-0 text-green-600 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle>Рекомендация</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Label htmlFor="recommend">Порекомендуете эту поездку другим?</Label>
                    <Switch
                      id="recommend"
                      checked={review.wouldRecommend}
                      onCheckedChange={(checked) => setReview(prev => ({ ...prev, wouldRecommend: checked }))}
                    />
                    <span className="text-sm text-gray-600">
                      {review.wouldRecommend ? 'Да, рекомендую' : 'Не рекомендую'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Review */}
              <div className="flex justify-center">
                <Button 
                  onClick={handleReviewSubmit}
                  size="lg"
                  className="min-w-48"
                  disabled={overallRating === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Отправить отзыв
                </Button>
              </div>
            </>
          ) : (
            /* Review Submitted */
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Спасибо за отзыв!
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    Ваш отзыв поможет улучшить будущие поездки
                  </p>
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-5 h-5",
                          i < Math.round(overallRating)
                            ? "text-yellow-500 fill-current"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                    <span className="ml-2 text-lg font-bold text-green-900">
                      {overallRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Статистика поездки</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{tripStats.totalCatches}</div>
                  <div className="text-sm text-blue-700">Всего уловов</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{tripStats.totalWeight}</div>
                  <div className="text-sm text-green-700">Общий вес (кг)</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{tripStats.distance}</div>
                  <div className="text-sm text-purple-700">Пройдено (км)</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{tripStats.durationFormatted}</div>
                  <div className="text-sm text-orange-700">Продолжительность</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
