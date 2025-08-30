'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Star,
  Zap,
  Shield,
  AlertTriangle,
  CloudRain,
  Sun,
  Cloud,
  CloudSnow,
  Wind,
  Waves,
  Thermometer,
  Eye,
  Compass,
  Activity,
  TrendingUp,
  Award,
  Target,
  Users,
  Clock,
  MapPin,
  Fish,
  Anchor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 🌟 DIFFICULTY SYSTEM
interface DifficultyLevel {
  level: number;
  name: string;
  color: string;
  icon: JSX.Element;
  description: string;
  requirements: string[];
  bgColor: string;
  textColor: string;
}

const DIFFICULTY_LEVELS: Record<number, DifficultyLevel> = {
  1: {
    level: 1,
    name: 'Beginner',
    color: 'emerald',
    icon: <Shield className="h-3 w-3" />,
    description: 'Perfect for first-time anglers and families',
    requirements: ['No experience needed', 'All equipment provided', 'Full guidance included'],
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    textColor: 'text-emerald-800 dark:text-emerald-200',
  },
  2: {
    level: 2,
    name: 'Easy',
    color: 'green',
    icon: <Star className="h-3 w-3" />,
    description: 'Suitable for beginners with some comfort on water',
    requirements: ['Basic water comfort', 'Simple techniques', 'Guided experience'],
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
  },
  3: {
    level: 3,
    name: 'Intermediate',
    color: 'yellow',
    icon: <Target className="h-3 w-3" />,
    description: 'Requires some fishing experience and physical stamina',
    requirements: ['Some fishing experience', 'Good physical condition', 'Basic equipment knowledge'],
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200',
  },
  4: {
    level: 4,
    name: 'Advanced',
    color: 'orange',
    icon: <Zap className="h-3 w-3" />,
    description: 'For experienced anglers seeking challenging conditions',
    requirements: ['Solid fishing experience', 'Excellent stamina', 'Own equipment preferred'],
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-800 dark:text-orange-200',
  },
  5: {
    level: 5,
    name: 'Expert',
    color: 'red',
    icon: <AlertTriangle className="h-3 w-3" />,
    description: 'Extreme conditions for professional-level anglers only',
    requirements: ['Expert-level skills', 'Own professional equipment', 'Excellent physical condition'],
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-800 dark:text-red-200',
  },
};

// 🌤️ WEATHER SYSTEM
interface WeatherCondition {
  score: number;
  name: string;
  icon: JSX.Element;
  color: string;
  description: string;
  suitability: string;
  bgColor: string;
  textColor: string;
}

const WEATHER_CONDITIONS: Record<number, WeatherCondition> = {
  10: {
    score: 10,
    name: 'Perfect',
    icon: <Sun className="h-4 w-4" />,
    color: 'emerald',
    description: 'Ideal conditions for fishing',
    suitability: 'All skill levels',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    textColor: 'text-emerald-800 dark:text-emerald-200',
  },
  8: {
    score: 8,
    name: 'Excellent',
    icon: <Sun className="h-4 w-4" />,
    color: 'green',
    description: 'Great fishing weather',
    suitability: 'All skill levels',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
  },
  6: {
    score: 6,
    name: 'Good',
    icon: <Cloud className="h-4 w-4" />,
    color: 'blue',
    description: 'Suitable for fishing',
    suitability: 'Beginner and up',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
  },
  4: {
    score: 4,
    name: 'Fair',
    icon: <CloudRain className="h-4 w-4" />,
    color: 'yellow',
    description: 'Challenging but manageable',
    suitability: 'Intermediate and up',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-800 dark:text-yellow-200',
  },
  2: {
    score: 2,
    name: 'Poor',
    icon: <Wind className="h-4 w-4" />,
    color: 'orange',
    description: 'Difficult conditions',
    suitability: 'Advanced anglers only',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-800 dark:text-orange-200',
  },
};

// 🎯 MAIN DIFFICULTY BADGE COMPONENT
interface DifficultyBadgeProps {
  level: number;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'card';
  className?: string;
}

export function DifficultyBadge({ 
  level, 
  showDescription = false, 
  size = 'md',
  variant = 'default',
  className 
}: DifficultyBadgeProps) {
  const difficulty = DIFFICULTY_LEVELS[Math.max(1, Math.min(5, level))];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  if (variant === 'card') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn('p-3 cursor-help', difficulty.bgColor, className)}>
              <CardContent className="p-0">
                <div className="flex items-center gap-2 mb-2">
                  {difficulty.icon}
                  <span className={cn('font-semibold', difficulty.textColor)}>
                    {difficulty.name}
                  </span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i}
                        className={cn(
                          'h-3 w-3',
                          i < level 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
                {showDescription && (
                  <>
                    <p className={cn('text-sm mb-2', difficulty.textColor)}>
                      {difficulty.description}
                    </p>
                    <ul className={cn('text-xs space-y-1', difficulty.textColor)}>
                      {difficulty.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-current rounded-full" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-semibold mb-1">{difficulty.name} (Level {level})</p>
              <p className="text-sm mb-2">{difficulty.description}</p>
              <div className="space-y-1">
                {difficulty.requirements.map((req, i) => (
                  <p key={i} className="text-xs">• {req}</p>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant === 'outline' ? 'outline' : 'secondary'}
            className={cn(
              sizeClasses[size],
              difficulty.bgColor,
              difficulty.textColor,
              'cursor-help font-medium',
              className
            )}
          >
            {difficulty.icon}
            <span className="ml-1">{difficulty.name}</span>
            <div className="flex ml-1">
              {Array.from({ length: level }).map((_, i) => (
                <Star key={i} className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold mb-1">{difficulty.name} (Level {level})</p>
            <p className="text-sm mb-2">{difficulty.description}</p>
            <div className="space-y-1">
              {difficulty.requirements.map((req, i) => (
                <p key={i} className="text-xs">• {req}</p>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// 🌤️ WEATHER BADGE COMPONENT  
interface WeatherBadgeProps {
  score: number;
  minimumScore?: number;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'card';
  className?: string;
  isDependency?: boolean;
}

export function WeatherBadge({ 
  score, 
  minimumScore,
  showDescription = false,
  size = 'md',
  variant = 'default',
  className,
  isDependency = false
}: WeatherBadgeProps) {
  const weatherCondition = Object.values(WEATHER_CONDITIONS)
    .reverse()
    .find(condition => score >= condition.score) || WEATHER_CONDITIONS[2];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1', 
    lg: 'text-base px-4 py-2',
  };

  const meetsMinimum = minimumScore ? score >= minimumScore : true;

  if (variant === 'card') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={cn(
              'p-3 cursor-help',
              weatherCondition.bgColor,
              !meetsMinimum && 'opacity-60 border-red-300',
              className
            )}>
              <CardContent className="p-0">
                <div className="flex items-center gap-2 mb-2">
                  {weatherCondition.icon}
                  <span className={cn('font-semibold', weatherCondition.textColor)}>
                    {weatherCondition.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={cn('text-sm', weatherCondition.textColor)}>
                      {score}/10
                    </span>
                  </div>
                </div>
                {isDependency && (
                  <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    Weather dependent event
                  </div>
                )}
                {showDescription && (
                  <>
                    <p className={cn('text-sm mb-1', weatherCondition.textColor)}>
                      {weatherCondition.description}
                    </p>
                    <p className={cn('text-xs', weatherCondition.textColor)}>
                      Suitable for: {weatherCondition.suitability}
                    </p>
                  </>
                )}
                {minimumScore && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={weatherCondition.textColor}>Weather Score</span>
                      <span className={weatherCondition.textColor}>
                        {score}/{minimumScore} min
                      </span>
                    </div>
                    <Progress 
                      value={(score / 10) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-semibold mb-1">
                Weather Score: {score}/10 ({weatherCondition.name})
              </p>
              <p className="text-sm mb-1">{weatherCondition.description}</p>
              <p className="text-xs">Suitable for: {weatherCondition.suitability}</p>
              {minimumScore && (
                <p className="text-xs mt-2">
                  Minimum required: {minimumScore}/10
                  {!meetsMinimum && ' ⚠️ Below minimum!'}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant === 'outline' ? 'outline' : 'secondary'}
            className={cn(
              sizeClasses[size],
              weatherCondition.bgColor,
              weatherCondition.textColor,
              'cursor-help font-medium',
              !meetsMinimum && 'opacity-70 border-red-300',
              className
            )}
          >
            {weatherCondition.icon}
            <span className="ml-1">{weatherCondition.name}</span>
            <span className="ml-1 text-xs">({score}/10)</span>
            {isDependency && <AlertTriangle className="h-3 w-3 ml-1" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-semibold mb-1">
              Weather Score: {score}/10 ({weatherCondition.name})
            </p>
            <p className="text-sm mb-1">{weatherCondition.description}</p>
            <p className="text-xs">Suitable for: {weatherCondition.suitability}</p>
            {minimumScore && (
              <p className="text-xs mt-2">
                Minimum required: {minimumScore}/10
                {!meetsMinimum && ' ⚠️ Below minimum!'}
              </p>
            )}
            {isDependency && (
              <p className="text-xs mt-1 text-yellow-600">
                ⚠️ This event may be cancelled due to poor weather
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// 🌊 COMBINED CONDITIONS INDICATOR
interface CombinedConditionsBadgeProps {
  difficulty: number;
  weatherScore: number;
  minimumWeatherScore?: number;
  weatherDependent?: boolean;
  targetSpecies?: string[];
  fishingTechniques?: string[];
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function CombinedConditionsBadge({
  difficulty,
  weatherScore,
  minimumWeatherScore,
  weatherDependent,
  targetSpecies,
  fishingTechniques,
  size = 'md',
  variant = 'default',
  className,
}: CombinedConditionsBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <DifficultyBadge level={difficulty} size={size} />
        <WeatherBadge 
          score={weatherScore} 
          minimumScore={minimumWeatherScore}
          size={size}
          isDependency={weatherDependent}
        />
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="grid grid-cols-2 gap-3">
          <DifficultyBadge 
            level={difficulty} 
            variant="card"
            showDescription={true}
          />
          <WeatherBadge 
            score={weatherScore}
            minimumScore={minimumWeatherScore}
            variant="card"
            showDescription={true}
            isDependency={weatherDependent}
          />
        </div>
        
        {(targetSpecies || fishingTechniques) && (
          <div className="grid grid-cols-1 gap-2">
            {targetSpecies && targetSpecies.length > 0 && (
              <div className="flex items-center gap-2">
                <Fish className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Target Species:</span>
                <div className="flex flex-wrap gap-1">
                  {targetSpecies.slice(0, 3).map((species, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {species.toLowerCase().replace('_', ' ')}
                    </Badge>
                  ))}
                  {targetSpecies.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{targetSpecies.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {fishingTechniques && fishingTechniques.length > 0 && (
              <div className="flex items-center gap-2">
                <Anchor className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Techniques:</span>
                <div className="flex flex-wrap gap-1">
                  {fishingTechniques.slice(0, 2).map((technique, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {technique.toLowerCase().replace('_', ' ')}
                    </Badge>
                  ))}
                  {fishingTechniques.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{fishingTechniques.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <DifficultyBadge level={difficulty} size={size} />
      <WeatherBadge 
        score={weatherScore} 
        minimumScore={minimumWeatherScore}
        size={size}
        isDependency={weatherDependent}
      />
      
      {targetSpecies && targetSpecies.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                <Fish className="h-3 w-3 mr-1" />
                {targetSpecies.length} species
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-1">Target Species</p>
                <div className="flex flex-wrap gap-1">
                  {targetSpecies.map((species, i) => (
                    <span key={i} className="text-xs bg-blue-100 px-2 py-1 rounded">
                      {species.toLowerCase().replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {fishingTechniques && fishingTechniques.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-help">
                <Anchor className="h-3 w-3 mr-1" />
                {fishingTechniques.length} techniques
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-1">Fishing Techniques</p>
                <div className="flex flex-wrap gap-1">
                  {fishingTechniques.map((technique, i) => (
                    <span key={i} className="text-xs bg-green-100 px-2 py-1 rounded">
                      {technique.toLowerCase().replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
