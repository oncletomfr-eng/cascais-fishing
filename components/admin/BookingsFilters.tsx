'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  CalendarIcon, 
  Filter,
  X,
  RefreshCw
} from 'lucide-react'
import { format, isValid } from 'date-fns'
import { cn } from '@/lib/utils'

interface BookingsFiltersProps {
  onFiltersChange?: (filters: BookingFilters) => void
}

export interface BookingFilters {
  status?: string
  type?: 'private' | 'group'
  dateFrom?: string
  dateTo?: string
  search?: string
}

export function BookingsFilters({ onFiltersChange }: BookingsFiltersProps) {
  const [filters, setFilters] = useState<BookingFilters>({})
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  // Apply filters
  const applyFilters = () => {
    const newFilters: BookingFilters = {
      ...filters,
      dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    }
    
    onFiltersChange?.(newFilters)
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setDateFrom(undefined)
    setDateTo(undefined)
    onFiltersChange?.({})
  }

  // Update filter state
  const updateFilter = (key: keyof BookingFilters, value: string | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined
    }
    setFilters(newFilters)
  }

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(Boolean).length + 
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)

  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-medium">Filters</h3>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={applyFilters}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Apply
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <Label htmlFor="search" className="text-sm font-medium">
              Search Customer
            </Label>
            <Input
              id="search"
              placeholder="Name, phone, email..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm font-medium">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div>
            <Label className="text-sm font-medium">Type</Label>
            <Select value={filters.type || 'all'} onValueChange={(value) => updateFilter('type', value as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="group">Group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div>
            <Label className="text-sm font-medium">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div>
            <Label className="text-sm font-medium">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  disabled={(date) => dateFrom ? date < dateFrom : false}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {filters.search}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('search', '')}
                  />
                </Badge>
              )}
              
              {filters.status && filters.status !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('status', 'all')}
                  />
                </Badge>
              )}
              
              {filters.type && filters.type !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 capitalize">
                  Type: {filters.type}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('type', 'all')}
                  />
                </Badge>
              )}
              
              {dateFrom && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  From: {format(dateFrom, "MMM dd")}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setDateFrom(undefined)}
                  />
                </Badge>
              )}
              
              {dateTo && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  To: {format(dateTo, "MMM dd")}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setDateTo(undefined)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
