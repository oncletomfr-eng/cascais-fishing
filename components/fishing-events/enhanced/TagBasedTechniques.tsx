'use client'

import React, { useState } from 'react'
import { 
  Target, 
  Info, 
  X, 
  Filter,
  Star,
  Clock,
  TrendingUp
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Расширенные данные о техниках ловли с категориями
const FISHING_TECHNIQUES = {
  surface: [
    { 
      value: 'TROLLING', 
      label: 'Trolling', 
      icon: '🚤', 
      difficulty: 3, 
      description: 'Dragging bait behind moving boat',
      duration: 'Long',
      popularity: 4,
      bestFor: ['Tuna', 'Marlin', 'Dorado']
    },
    { 
      value: 'SURFACE_LURES', 
      label: 'Surface Lures', 
      icon: '🎣', 
      difficulty: 2, 
      description: 'Using lures that float on surface',
      duration: 'Medium',
      popularity: 3,
      bestFor: ['Sea Bass', 'Dorado']
    },
  ],
  depth: [
    { 
      value: 'BOTTOM_FISHING', 
      label: 'Bottom Fishing', 
      icon: '⚓', 
      difficulty: 2, 
      description: 'Fishing near the seafloor',
      duration: 'Long',
      popularity: 4,
      bestFor: ['Cod', 'Bream', 'Sole']
    },
    { 
      value: 'JIGGING', 
      label: 'Jigging', 
      icon: '🎯', 
      difficulty: 4, 
      description: 'Vertical fishing with weighted lure',
      duration: 'Medium',
      popularity: 3,
      bestFor: ['Cod', 'Sea Bass', 'Grouper']
    },
    { 
      value: 'DROP_SHOT', 
      label: 'Drop Shot', 
      icon: '⬇️', 
      difficulty: 3, 
      description: 'Weight below the hook technique',
      duration: 'Medium',
      popularity: 2,
      bestFor: ['Sea Bass', 'Bream']
    },
  ],
  specialized: [
    { 
      value: 'FLY_FISHING', 
      label: 'Fly Fishing', 
      icon: '🦋', 
      difficulty: 5, 
      description: 'Using artificial flies as bait',
      duration: 'Long',
      popularity: 2,
      bestFor: ['Salmon', 'Sea Bass']
    },
    { 
      value: 'SPINNING', 
      label: 'Spinning', 
      icon: '🌀', 
      difficulty: 3, 
      description: 'Using spinning reels and lures',
      duration: 'Medium',
      popularity: 5,
      bestFor: ['Sea Bass', 'Mackerel', 'Dorado']
    },
    { 
      value: 'BAIT_FISHING', 
      label: 'Bait Fishing', 
      icon: '🪱', 
      difficulty: 1, 
      description: 'Traditional fishing with natural bait',
      duration: 'Long',
      popularity: 5,
      bestFor: ['Sardine', 'Bream', 'Mackerel']
    },
  ]
} as const

type TechniqueCategory = keyof typeof FISHING_TECHNIQUES
type Technique = typeof FISHING_TECHNIQUES[TechniqueCategory][number]

interface TagBasedTechniquesProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

// Получить все техники как плоский массив
const getAllTechniques = (): Technique[] => {
  return Object.values(FISHING_TECHNIQUES).flat()
}

// Получить категорию техники
const getTechniqueCategory = (techniqueValue: string): TechniqueCategory | null => {
  for (const [category, techniques] of Object.entries(FISHING_TECHNIQUES)) {
    if (techniques.some(t => t.value === techniqueValue)) {
      return category as TechniqueCategory
    }
  }
  return null
}

// Конфигурация категорий
const CATEGORY_CONFIG = {
  surface: {
    label: 'Surface',
    icon: '🌊',
    description: 'Fishing at or near water surface',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  depth: {
    label: 'Depth',
    icon: '🌊',
    description: 'Deep water and bottom fishing techniques',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  specialized: {
    label: 'Specialized',
    icon: '⭐',
    description: 'Specialized and advanced techniques',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
}

// Рендер звёзд сложности
const DifficultyStars = ({ level }: { level: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          "h-2.5 w-2.5",
          i < level 
            ? "text-yellow-500 fill-yellow-500" 
            : "text-gray-300"
        )}
      />
    ))}
  </div>
)

// Рендер популярности
const PopularityIndicator = ({ level }: { level: number }) => (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <TrendingUp className="h-3 w-3" />
    <span>{level}/5</span>
  </div>
)

// Карточка техники
function TechniqueCard({ 
  technique, 
  isSelected, 
  onToggle 
}: { 
  technique: Technique
  isSelected: boolean
  onToggle: () => void 
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected 
            ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200" 
            : "hover:bg-gray-50"
        )}
        onClick={onToggle}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{technique.icon}</span>
              <div>
                <h4 className="font-medium text-sm">{technique.label}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <DifficultyStars level={technique.difficulty} />
                  <PopularityIndicator level={technique.popularity} />
                </div>
              </div>
            </div>
            {isSelected && (
              <Badge variant="secondary" className="text-xs">
                Selected
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            {technique.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{technique.duration}</span>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium mb-1">Best for:</p>
                    <p>{technique.bestFor.join(', ')}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function TagBasedTechniques({ 
  value = [], 
  onChange, 
  className 
}: TagBasedTechniquesProps) {
  const [selectedCategory, setSelectedCategory] = useState<TechniqueCategory>('surface')
  
  const allTechniques = getAllTechniques()
  const selectedTechniques = allTechniques.filter(t => value.includes(t.value))

  // Переключение выбора техники
  const toggleTechnique = (techniqueValue: string) => {
    const newValue = value.includes(techniqueValue)
      ? value.filter(v => v !== techniqueValue)
      : [...value, techniqueValue]
    onChange(newValue)
  }

  // Удаление техники
  const removeTechnique = (techniqueValue: string) => {
    onChange(value.filter(v => v !== techniqueValue))
  }

  // Очистка всех
  const clearAll = () => {
    onChange([])
  }

  // Получить количество выбранных техник по категории
  const getSelectedCountByCategory = (category: TechniqueCategory) => {
    return FISHING_TECHNIQUES[category].filter(t => value.includes(t.value)).length
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          Fishing Techniques
        </Label>
        {value.length > 0 && (
          <Button
            variant="ghost" 
            size="sm" 
            onClick={clearAll}
            className="text-xs text-muted-foreground h-auto p-1"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Выбранные техники */}
      <AnimatePresence>
        {value.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1"
          >
            {selectedTechniques.map((technique) => (
              <Badge
                key={technique.value}
                variant="secondary"
                className="cursor-pointer text-xs px-2 py-1 gap-1"
                onClick={() => removeTechnique(technique.value)}
              >
                <span>{technique.icon} {technique.label}</span>
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Категории техник */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as TechniqueCategory)}>
        <TabsList className="grid w-full grid-cols-3">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
            <TabsTrigger 
              key={category} 
              value={category} 
              className="text-xs flex items-center gap-1"
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              {getSelectedCountByCategory(category as TechniqueCategory) > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                  {getSelectedCountByCategory(category as TechniqueCategory)}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(FISHING_TECHNIQUES).map(([category, techniques]) => (
          <TabsContent key={category} value={category} className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {CATEGORY_CONFIG[category as TechniqueCategory].description}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {techniques.map((technique) => (
                <TechniqueCard
                  key={technique.value}
                  technique={technique}
                  isSelected={value.includes(technique.value)}
                  onToggle={() => toggleTechnique(technique.value)}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Статистика */}
      {value.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>{value.length} techniques selected</span>
          <div className="flex items-center gap-4">
            {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
              const count = getSelectedCountByCategory(category as TechniqueCategory)
              if (count === 0) return null
              
              return (
                <div key={category} className="flex items-center gap-1">
                  <span>{config.icon}</span>
                  <span>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TagBasedTechniques
