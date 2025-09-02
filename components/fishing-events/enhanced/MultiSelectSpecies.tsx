'use client'

import React, { useState } from 'react'
import { 
  Fish, 
  Check, 
  ChevronsUpDown, 
  X, 
  Search,
  Star
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// Данные о видах рыб (расширенные)
const FISH_SPECIES = [
  { value: 'SEABASS', label: 'Sea Bass', icon: '🐟', difficulty: 2, season: 'all', popularity: 5 },
  { value: 'TUNA', label: 'Tuna', icon: '🐠', difficulty: 5, season: 'summer', popularity: 4 },
  { value: 'DORADO', label: 'Dorado', icon: '🐡', difficulty: 4, season: 'summer', popularity: 4 },
  { value: 'SARDINE', label: 'Sardine', icon: '🐠', difficulty: 1, season: 'all', popularity: 3 },
  { value: 'MACKEREL', label: 'Mackerel', icon: '🐟', difficulty: 2, season: 'spring', popularity: 4 },
  { value: 'MARLIN', label: 'Marlin', icon: '🦈', difficulty: 5, season: 'summer', popularity: 2 },
  { value: 'COD', label: 'Cod', icon: '🐟', difficulty: 3, season: 'winter', popularity: 3 },
  { value: 'SALMON', label: 'Salmon', icon: '🍣', difficulty: 4, season: 'spring', popularity: 4 },
  { value: 'BREAM', label: 'Sea Bream', icon: '🐟', difficulty: 2, season: 'all', popularity: 3 },
  { value: 'SOLE', label: 'Sole', icon: '🐟', difficulty: 3, season: 'all', popularity: 2 },
  { value: 'ANCHOVY', label: 'Anchovy', icon: '🐟', difficulty: 1, season: 'all', popularity: 2 },
  { value: 'GROUPER', label: 'Grouper', icon: '🐠', difficulty: 4, season: 'summer', popularity: 3 },
] as const

interface MultiSelectSpeciesProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
  placeholder?: string
  maxDisplay?: number
}

// Получить сезонные эмоджи
const getSeasonEmoji = (season: string) => {
  switch (season) {
    case 'spring': return '🌸'
    case 'summer': return '☀️'
    case 'winter': return '❄️'
    default: return '🌍'
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

export function MultiSelectSpecies({ 
  value = [], 
  onChange, 
  className,
  placeholder = "Select species...",
  maxDisplay = 3
}: MultiSelectSpeciesProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Фильтрация по поисковому запросу
  const filteredSpecies = FISH_SPECIES.filter(species =>
    species.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    species.value.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.popularity - a.popularity) // Сортировка по популярности

  // Выбранные виды рыб
  const selectedSpecies = FISH_SPECIES.filter(species => value.includes(species.value))

  // Переключение выбора
  const toggleSpecies = (speciesValue: string) => {
    const newValue = value.includes(speciesValue)
      ? value.filter(v => v !== speciesValue)
      : [...value, speciesValue]
    onChange(newValue)
  }

  // Удаление вида рыбы
  const removeSpecies = (speciesValue: string) => {
    onChange(value.filter(v => v !== speciesValue))
  }

  // Очистка всех
  const clearAll = () => {
    onChange([])
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Fish className="h-4 w-4 text-blue-600" />
          Target Species
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between min-h-10 h-auto py-2",
              value.length === 0 && "text-muted-foreground"
            )}
          >
            <div className="flex flex-wrap items-center gap-1">
              {value.length === 0 ? (
                placeholder
              ) : value.length <= maxDisplay ? (
                selectedSpecies.map((species) => (
                  <Badge
                    key={species.value}
                    variant="secondary"
                    className="text-xs px-2 py-1"
                  >
                    {species.icon} {species.label}
                  </Badge>
                ))
              ) : (
                <>
                  {selectedSpecies.slice(0, maxDisplay).map((species) => (
                    <Badge
                      key={species.value}
                      variant="secondary"
                      className="text-xs px-2 py-1"
                    >
                      {species.icon} {species.label}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    +{value.length - maxDisplay} more
                  </Badge>
                </>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" side="bottom" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search species..."
                className="flex-1"
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList>
              <CommandEmpty>No species found.</CommandEmpty>
              <CommandGroup>
                <div className="max-h-64 overflow-y-auto">
                  {filteredSpecies.map((species) => (
                    <CommandItem
                      key={species.value}
                      onSelect={() => toggleSpecies(species.value)}
                      className="flex items-center justify-between p-2"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{species.icon}</span>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{species.label}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <DifficultyStars level={species.difficulty} />
                              <span>{getSeasonEmoji(species.season)}</span>
                              {species.season !== 'all' && (
                                <span className="capitalize">{species.season}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value.includes(species.value) 
                              ? "opacity-100 text-blue-600" 
                              : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Выбранные виды рыб */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedSpecies.map((species) => (
            <Badge
              key={species.value}
              variant="secondary"
              className="cursor-pointer text-xs px-2 py-1 gap-1"
              onClick={() => removeSpecies(species.value)}
            >
              <span>{species.icon} {species.label}</span>
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Статистика */}
      {value.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {value.length} species selected
        </div>
      )}
    </div>
  )
}

export default MultiSelectSpecies
