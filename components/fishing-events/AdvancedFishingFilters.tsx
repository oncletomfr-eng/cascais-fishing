'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Filter,
  X,
  ChevronDown,
  Fish,
  Target,
  Star,
  CloudRain,
  DollarSign,
  Calendar,
  Users,
  Trophy,
  GraduationCap,
  Anchor,
  Waves,
  Wind,
  Thermometer,
  MapPin,
  Clock,
  Check,
  ChevronsUpDown,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripFilters } from '@/lib/types/group-events';

// 🎣 FISHING DATA CONSTANTS
const FISH_SPECIES = [
  { value: 'SEABASS', label: 'Sea Bass', icon: '🐟', difficulty: 2, season: 'all' },
  { value: 'TUNA', label: 'Tuna', icon: '🐠', difficulty: 5, season: 'summer' },
  { value: 'DORADO', label: 'Dorado', icon: '🐡', difficulty: 4, season: 'summer' },
  { value: 'SARDINE', label: 'Sardine', icon: '🐠', difficulty: 1, season: 'all' },
  { value: 'MACKEREL', label: 'Mackerel', icon: '🐟', difficulty: 2, season: 'spring' },
  { value: 'MARLIN', label: 'Marlin', icon: '🦈', difficulty: 5, season: 'summer' },
  { value: 'COD', label: 'Cod', icon: '🐟', difficulty: 3, season: 'winter' },
  { value: 'SALMON', label: 'Salmon', icon: '🍣', difficulty: 4, season: 'spring' },
  { value: 'BREAM', label: 'Sea Bream', icon: '🐟', difficulty: 2, season: 'all' },
  { value: 'SOLE', label: 'Sole', icon: '🐟', difficulty: 3, season: 'all' },
] as const;

const FISHING_TECHNIQUES = [
  { value: 'BOTTOM_FISHING', label: 'Bottom Fishing', icon: '⚓', difficulty: 2, description: 'Fishing near the seafloor' },
  { value: 'TROLLING', label: 'Trolling', icon: '🚤', difficulty: 3, description: 'Dragging bait behind moving boat' },
  { value: 'JIGGING', label: 'Jigging', icon: '🎣', difficulty: 4, description: 'Vertical fishing with weighted lure' },
  { value: 'FLY_FISHING', label: 'Fly Fishing', icon: '🦋', difficulty: 5, description: 'Using artificial flies as bait' },
  { value: 'CASTING', label: 'Casting', icon: '🎯', difficulty: 3, description: 'Throwing bait to specific spots' },
  { value: 'DRIFT_FISHING', label: 'Drift Fishing', icon: '🌊', difficulty: 2, description: 'Fishing while boat drifts naturally' },
  { value: 'DEEP_SEA', label: 'Deep Sea', icon: '🏔️', difficulty: 4, description: 'Offshore deep water fishing' },
  { value: 'SURF_FISHING', label: 'Surf Fishing', icon: '🏄', difficulty: 3, description: 'Fishing from the shore' },
] as const;

const EVENT_TYPES = [
  { value: 'COMMERCIAL', label: 'Commercial', icon: '🎣', color: 'blue' },
  { value: 'TOURNAMENT', label: 'Tournament', icon: '🏆', color: 'yellow' },
  { value: 'LEARNING', label: 'Learning', icon: '🎓', color: 'green' },
  { value: 'COMMUNITY', label: 'Community', icon: '👥', color: 'purple' },
] as const;

const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', icon: '🌱', color: 'green' },
  { value: 'INTERMEDIATE', label: 'Intermediate', icon: '🎯', color: 'yellow' },
  { value: 'ADVANCED', label: 'Advanced', icon: '⭐', color: 'orange' },
  { value: 'EXPERT', label: 'Expert', icon: '💎', color: 'purple' },
  { value: 'ANY', label: 'Any Level', icon: '🌍', color: 'blue' },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: 'PROVIDED', label: 'All Provided', icon: '✅', description: 'Everything included' },
  { value: 'BRING_OWN', label: 'Bring Own', icon: '🎒', description: 'Bring your equipment' },
  { value: 'RENTAL_AVAILABLE', label: 'Rental Available', icon: '🏪', description: 'Equipment for rent' },
  { value: 'PARTIALLY_PROVIDED', label: 'Partially Provided', icon: '⚡', description: 'Some equipment included' },
] as const;

const SOCIAL_MODES = [
  { value: 'COMPETITIVE', label: 'Competitive', icon: '🏁', color: 'red' },
  { value: 'COLLABORATIVE', label: 'Collaborative', icon: '🤝', color: 'blue' },
  { value: 'EDUCATIONAL', label: 'Educational', icon: '📚', color: 'green' },
  { value: 'RECREATIONAL', label: 'Recreational', icon: '🎉', color: 'purple' },
  { value: 'FAMILY', label: 'Family', icon: '👨‍👩‍👧‍👦', color: 'pink' },
] as const;

interface AdvancedFishingFiltersProps {
  filters: TripFilters;
  onFiltersChange: (filters: TripFilters) => void;
  onResetFilters: () => void;
  className?: string;
}

export function AdvancedFishingFilters({
  filters,
  onFiltersChange,
  onResetFilters,
  className,
}: AdvancedFishingFiltersProps) {
  const [openSections, setOpenSections] = useState({
    species: false,
    techniques: false,
    eventTypes: false,
    difficulty: false,
    equipment: false,
    pricing: false,
    weather: false,
  });

  // Count active filters
  const activeFiltersCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'experience' && value !== 'any') return count + 1;
    if (key === 'timeSlot' && value !== 'any') return count + 1;
    if (key === 'status' && value !== 'any') return count + 1;
    if (key === 'eventType' && value !== 'any') return count + 1;
    if (key === 'socialMode' && value !== 'any') return count + 1;
    if (key === 'equipment' && value !== 'any') return count + 1;
    if (key === 'weatherDependency' && value !== 'any') return count + 1;
    if (key === 'targetSpecies' && Array.isArray(value) && value.length > 0) return count + 1;
    if (key === 'fishingTechniques' && Array.isArray(value) && value.length > 0) return count + 1;
    if (key === 'difficultyRange' && value && (value.min > 1 || value.max < 5)) return count + 1;
    if (key === 'priceRange' && value && (value.min > 0 || value.max < 500)) return count + 1;
    return count;
  }, 0);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateFilters = (newFilters: Partial<TripFilters>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const toggleArrayFilter = (filterKey: 'targetSpecies' | 'fishingTechniques', value: string) => {
    const currentArray = (filters[filterKey] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilters({ [filterKey]: newArray });
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle>Advanced Fishing Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
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
          Filter fishing events by species, techniques, difficulty, and more.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Event Type & Skill Level */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
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

          <div className="space-y-2">
            <Label>Experience Level</Label>
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
        </div>

        <Separator />

        {/* Target Species Filter */}
        <Collapsible
          open={openSections.species}
          onOpenChange={() => toggleSection('species')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Fish className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Target Species</span>
                {filters.targetSpecies && filters.targetSpecies.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.targetSpecies.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 pt-2">
              {FISH_SPECIES.map((species) => (
                <div key={species.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`species-${species.value}`}
                    checked={filters.targetSpecies?.includes(species.value) || false}
                    onCheckedChange={() => toggleArrayFilter('targetSpecies', species.value)}
                  />
                  <Label
                    htmlFor={`species-${species.value}`}
                    className="text-sm cursor-pointer flex items-center gap-2"
                  >
                    <span>{species.icon}</span>
                    <span>{species.label}</span>
                    <div className="flex">
                      {Array.from({ length: species.difficulty }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            {filters.targetSpecies && filters.targetSpecies.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {filters.targetSpecies.map((species) => {
                  const speciesData = FISH_SPECIES.find(s => s.value === species);
                  return (
                    <Badge
                      key={species}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('targetSpecies', species)}
                    >
                      {speciesData?.icon} {speciesData?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Fishing Techniques Filter */}
        <Collapsible
          open={openSections.techniques}
          onOpenChange={() => toggleSection('techniques')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="font-medium">Fishing Techniques</span>
                {filters.fishingTechniques && filters.fishingTechniques.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.fishingTechniques.length}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 pt-2">
              {FISHING_TECHNIQUES.map((technique) => (
                <div key={technique.value} className="flex items-start space-x-2">
                  <Checkbox
                    id={`technique-${technique.value}`}
                    checked={filters.fishingTechniques?.includes(technique.value) || false}
                    onCheckedChange={() => toggleArrayFilter('fishingTechniques', technique.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`technique-${technique.value}`}
                      className="text-sm cursor-pointer flex items-center gap-2 mb-1"
                    >
                      <span>{technique.icon}</span>
                      <span>{technique.label}</span>
                      <div className="flex">
                        {Array.from({ length: technique.difficulty }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 text-orange-400 fill-orange-400" />
                        ))}
                      </div>
                    </Label>
                    <p className="text-xs text-muted-foreground">{technique.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {filters.fishingTechniques && filters.fishingTechniques.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {filters.fishingTechniques.map((technique) => {
                  const techniqueData = FISHING_TECHNIQUES.find(t => t.value === technique);
                  return (
                    <Badge
                      key={technique}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('fishingTechniques', technique)}
                    >
                      {techniqueData?.icon} {techniqueData?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Difficulty Range */}
        <Collapsible
          open={openSections.difficulty}
          onOpenChange={() => toggleSection('difficulty')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Difficulty Range</span>
                {filters.difficultyRange && (filters.difficultyRange.min > 1 || filters.difficultyRange.max < 5) && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.difficultyRange.min}-{filters.difficultyRange.max}⭐
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="px-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Difficulty Level</span>
                <span className="text-sm text-muted-foreground">
                  {filters.difficultyRange?.min || 1}⭐ - {filters.difficultyRange?.max || 5}⭐
                </span>
              </div>
              <Slider
                value={[filters.difficultyRange?.min || 1, filters.difficultyRange?.max || 5]}
                onValueChange={([min, max]) => updateFilters({ difficultyRange: { min, max } })}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>🌱 Beginner</span>
                <span>🎯 Intermediate</span>
                <span>💎 Expert</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Equipment & Social Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Equipment</Label>
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

          <div className="space-y-2">
            <Label>Social Mode</Label>
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
        </div>

        <Separator />

        {/* Price Range */}
        <Collapsible
          open={openSections.pricing}
          onOpenChange={() => toggleSection('pricing')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">Price Range</span>
                {filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max < 500) && (
                  <Badge variant="secondary" className="ml-2">
                    €{filters.priceRange.min}-€{filters.priceRange.max}
                  </Badge>
                )}
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="px-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Price per Person (€)</span>
                <span className="text-sm text-muted-foreground">
                  €{filters.priceRange?.min || 0} - €{filters.priceRange?.max || 500}
                </span>
              </div>
              <Slider
                value={[filters.priceRange?.min || 0, filters.priceRange?.max || 500]}
                onValueChange={([min, max]) => updateFilters({ priceRange: { min, max } })}
                min={0}
                max={500}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Free</span>
                <span>€250</span>
                <span>€500+</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Weather Dependency */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-blue-600" />
            <div>
              <Label htmlFor="weather-dependency">Weather Independent</Label>
              <p className="text-xs text-muted-foreground">Show only events that run regardless of weather</p>
            </div>
          </div>
          <Switch
            id="weather-dependency"
            checked={filters.weatherDependency === false}
            onCheckedChange={(checked) => 
              updateFilters({ weatherDependency: checked ? false : 'any' })
            }
          />
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Filters ({activeFiltersCount})</Label>
              <div className="flex flex-wrap gap-1">
                {filters.eventType && filters.eventType !== 'any' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilters({ eventType: 'any' })}>
                    Event: {EVENT_TYPES.find(t => t.value === filters.eventType)?.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {filters.experience && filters.experience !== 'any' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilters({ experience: 'any' })}>
                    Level: {filters.experience}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {filters.equipment && filters.equipment !== 'any' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilters({ equipment: 'any' })}>
                    Equipment: {EQUIPMENT_OPTIONS.find(e => e.value === filters.equipment)?.label}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {filters.weatherDependency === false && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => updateFilters({ weatherDependency: 'any' })}>
                    Weather Independent
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
