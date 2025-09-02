'use client'

import React, { useState } from 'react'
import { 
  Cloud, 
  Sun, 
  CloudRain,
  Wind,
  Waves,
  Eye,
  Thermometer,
  Umbrella,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Типы погодных фильтров
interface WeatherConditionFilter {
  sunny: boolean
  cloudy: boolean
  rainy: boolean
  windy: boolean
}

interface WeatherRanges {
  windSpeed: { min: number, max: number }     // km/h
  waveHeight: { min: number, max: number }    // meters
  temperature: { min: number, max: number }   // celsius
  visibility: { min: number, max: number }    // km
}

interface WeatherFiltersProps {
  weatherDependency: boolean | 'any'
  conditions?: WeatherConditionFilter
  ranges?: WeatherRanges
  onWeatherDependencyChange: (value: boolean | 'any') => void
  onConditionsChange?: (conditions: WeatherConditionFilter) => void
  onRangesChange?: (ranges: WeatherRanges) => void
  className?: string
}

// Конфигурация погодных условий
const WEATHER_CONDITIONS = [
  {
    key: 'sunny' as const,
    label: 'Sunny',
    icon: Sun,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    description: 'Clear skies, great visibility'
  },
  {
    key: 'cloudy' as const,
    label: 'Cloudy',
    icon: Cloud,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
    description: 'Overcast, mild conditions'
  },
  {
    key: 'rainy' as const,
    label: 'Rainy',
    icon: CloudRain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Light rain acceptable'
  },
  {
    key: 'windy' as const,
    label: 'Windy',
    icon: Wind,
    color: 'text-green-500',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Strong winds, experienced only'
  },
]

// Конфигурация диапазонов
const RANGE_CONFIGS = [
  {
    key: 'windSpeed' as const,
    label: 'Wind Speed',
    icon: Wind,
    unit: 'km/h',
    min: 0,
    max: 50,
    step: 5,
    color: 'text-green-500',
    optimal: { min: 5, max: 20 },
    description: 'Ideal range: 5-20 km/h'
  },
  {
    key: 'waveHeight' as const,
    label: 'Wave Height',
    icon: Waves,
    unit: 'm',
    min: 0,
    max: 5,
    step: 0.5,
    color: 'text-blue-500',
    optimal: { min: 0.5, max: 2 },
    description: 'Ideal range: 0.5-2 meters'
  },
  {
    key: 'temperature' as const,
    label: 'Temperature',
    icon: Thermometer,
    unit: '°C',
    min: 0,
    max: 40,
    step: 2,
    color: 'text-red-500',
    optimal: { min: 15, max: 25 },
    description: 'Ideal range: 15-25°C'
  },
  {
    key: 'visibility' as const,
    label: 'Visibility',
    icon: Eye,
    unit: 'km',
    min: 1,
    max: 20,
    step: 1,
    color: 'text-purple-500',
    optimal: { min: 10, max: 20 },
    description: 'Ideal range: 10+ km'
  },
]

// Компонент переключателя погодного условия
function WeatherConditionToggle({ 
  condition, 
  isActive, 
  onToggle 
}: { 
  condition: typeof WEATHER_CONDITIONS[0]
  isActive: boolean
  onToggle: () => void 
}) {
  const Icon = condition.icon
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                isActive 
                  ? cn("ring-2 ring-blue-500", condition.bgColor)
                  : "hover:bg-gray-50"
              )}
              onClick={onToggle}
            >
              <CardContent className="p-4 text-center">
                <Icon className={cn("h-8 w-8 mx-auto mb-2", condition.color)} />
                <p className="font-medium text-sm">{condition.label}</p>
                {isActive && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Active
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{condition.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Компонент слайдера параметра
function ParameterSlider({ 
  config, 
  value, 
  onChange 
}: { 
  config: typeof RANGE_CONFIGS[0]
  value: { min: number, max: number }
  onChange: (value: { min: number, max: number }) => void 
}) {
  const Icon = config.icon
  const isOptimal = value.min >= config.optimal.min && value.max <= config.optimal.max
  
  return (
    <Card className={cn(
      "transition-all duration-200",
      isOptimal && "ring-1 ring-green-200 bg-green-50/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className="font-medium text-sm">{config.label}</span>
          </div>
          {isOptimal && (
            <Badge variant="outline" className="text-xs text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Optimal
            </Badge>
          )}
        </div>
        
        <div className="space-y-3">
          <Slider
            value={[value.min, value.max]}
            onValueChange={([min, max]) => onChange({ min, max })}
            min={config.min}
            max={config.max}
            step={config.step}
            className="w-full"
          />
          
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-xs">
              {value.min}{config.unit}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {config.description}
            </span>
            <Badge variant="outline" className="text-xs">
              {value.max}{config.unit}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Основной компонент
export function WeatherFilters({
  weatherDependency,
  conditions = { sunny: false, cloudy: false, rainy: false, windy: false },
  ranges = {
    windSpeed: { min: 0, max: 50 },
    waveHeight: { min: 0, max: 5 },
    temperature: { min: 0, max: 40 },
    visibility: { min: 1, max: 20 }
  },
  onWeatherDependencyChange,
  onConditionsChange = () => {},
  onRangesChange = () => {},
  className
}: WeatherFiltersProps) {
  const [activeTab, setActiveTab] = useState<'conditions' | 'ranges'>('conditions')
  
  // Подсчет активных фильтров
  const activeConditions = Object.values(conditions).filter(Boolean).length
  const activeRanges = RANGE_CONFIGS.filter(config => {
    const range = ranges[config.key]
    return range.min > config.min || range.max < config.max
  }).length
  
  const totalActiveFilters = activeConditions + activeRanges + 
    (weatherDependency !== 'any' ? 1 : 0)

  // Переключение условия
  const toggleCondition = (key: keyof WeatherConditionFilter) => {
    onConditionsChange({
      ...conditions,
      [key]: !conditions[key]
    })
  }

  // Изменение диапазона
  const updateRange = (key: keyof WeatherRanges, value: { min: number, max: number }) => {
    onRangesChange({
      ...ranges,
      [key]: value
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Cloud className="h-4 w-4 text-blue-600" />
          Weather Preferences
        </Label>
        {totalActiveFilters > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalActiveFilters} active
          </Badge>
        )}
      </div>

      {/* Основной переключатель зависимости от погоды */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Weather Dependency</Label>
              <p className="text-xs text-muted-foreground">
                How important are weather conditions for this trip?
              </p>
            </div>
            <div className="flex items-center gap-2">
              {weatherDependency === 'any' && (
                <Badge variant="outline" className="text-xs">Any weather</Badge>
              )}
              {weatherDependency === true && (
                <Badge variant="default" className="text-xs">Weather dependent</Badge>
              )}
              {weatherDependency === false && (
                <Badge variant="secondary" className="text-xs">Weather independent</Badge>
              )}
              <Switch
                checked={weatherDependency !== 'any'}
                onCheckedChange={(checked) => 
                  onWeatherDependencyChange(checked ? true : 'any')
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Детальные настройки (только если зависимость от погоды активна) */}
      <AnimatePresence>
        {weatherDependency !== 'any' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="conditions" className="text-xs flex items-center gap-1">
                  <Sun className="h-3 w-3" />
                  Conditions
                  {activeConditions > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                      {activeConditions}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="ranges" className="text-xs flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Parameters
                  {activeRanges > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                      {activeRanges}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conditions" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Select acceptable weather conditions for your fishing trip
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {WEATHER_CONDITIONS.map((condition) => (
                    <WeatherConditionToggle
                      key={condition.key}
                      condition={condition}
                      isActive={conditions[condition.key]}
                      onToggle={() => toggleCondition(condition.key)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="ranges" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Set preferred ranges for weather parameters
                </p>
                <div className="space-y-3">
                  {RANGE_CONFIGS.map((config) => (
                    <ParameterSlider
                      key={config.key}
                      config={config}
                      value={ranges[config.key]}
                      onChange={(value) => updateRange(config.key, value)}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Активные фильтры сводка */}
      {totalActiveFilters > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <Info className="h-3 w-3" />
              <span>
                {totalActiveFilters} weather filter{totalActiveFilters > 1 ? 's' : ''} active
                {activeConditions > 0 && ` • ${activeConditions} condition${activeConditions > 1 ? 's' : ''}`}
                {activeRanges > 0 && ` • ${activeRanges} parameter${activeRanges > 1 ? 's' : ''}`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WeatherFilters
