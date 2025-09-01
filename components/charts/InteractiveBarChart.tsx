/**
 * Interactive Bar Chart Component
 * Task 14: Interactive Chart Components - Bar Charts for Time Slot Comparisons
 */

'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList, ReferenceLine
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Download, RefreshCw, RotateCcw, BarChart3, TrendingUp,
  TrendingDown, Eye, EyeOff, Filter, SortAsc, SortDesc,
  Grid3X3, Layers, Maximize2, Target
} from 'lucide-react'
import { toast } from 'sonner'

import { 
  InteractiveBarChartProps, 
  ChartDataPoint,
  MultiSeriesDataPoint,
  CustomTooltipProps 
} from './types'
import { 
  DEFAULT_BAR_CONFIG, 
  CHART_COLORS, 
  TOOLTIP_STYLES,
  CHART_ANIMATIONS 
} from './constants'
import { 
  mergeChartConfig, 
  formatNumber, 
  formatPercentage,
  downloadChart,
  validateChartData,
  generateAriaLabel,
  generateColorPalette,
  findDataExtremes 
} from './utils'

interface BarChartState {
  orientation: 'horizontal' | 'vertical'
  hiddenSeries: Set<string>
  sortBy: string
  sortOrder: 'asc' | 'desc'
  showValues: boolean
  showGrid: boolean
  showAverage: boolean
  stackMode: 'grouped' | 'stacked' | 'percentage'
  selectedBars: Set<string>
}

export default function InteractiveBarChart({
  data,
  config = {},
  xAxisKey = 'name',
  yAxisKeys = ['value'],
  title,
  description,
  loading = false,
  error = null,
  className = '',
  grouped = false,
  stacked = false,
  filters,
  interaction,
  accessibility,
  animation = CHART_ANIMATIONS.normal,
  export: exportConfig
}: InteractiveBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<BarChartState>({
    orientation: config?.orientation || 'vertical',
    hiddenSeries: new Set(),
    sortBy: yAxisKeys[0] || 'value',
    sortOrder: 'desc',
    showValues: true,
    showGrid: true,
    showAverage: false,
    stackMode: stacked ? 'stacked' : grouped ? 'grouped' : 'grouped',
    selectedBars: new Set()
  })

  const mergedConfig = mergeChartConfig(DEFAULT_BAR_CONFIG, config)
  const chartColors = generateColorPalette(yAxisKeys.length, mergedConfig.colors || CHART_COLORS.primary)

  // Validate data
  const { isValid, errors } = validateChartData(data)

  // Process and sort data
  const processedData = useMemo(() => {
    if (!isValid || data.length === 0) return []

    let processed = [...data]

    // Sort data
    processed.sort((a, b) => {
      const aVal = a[state.sortBy]
      const bVal = b[state.sortBy]
      
      const result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return state.sortOrder === 'asc' ? result : -result
    })

    // Calculate percentage values for percentage stack mode
    if (state.stackMode === 'percentage') {
      processed = processed.map(item => {
        const total = yAxisKeys.reduce((sum, key) => {
          return sum + (typeof item[key] === 'number' ? item[key] : 0)
        }, 0)
        
        const percentageItem: any = { [xAxisKey]: item[xAxisKey] }
        yAxisKeys.forEach(key => {
          if (typeof item[key] === 'number' && total > 0) {
            percentageItem[key] = (item[key] / total) * 100
          }
        })
        return percentageItem
      })
    }

    return processed
  }, [data, state.sortBy, state.sortOrder, state.stackMode, xAxisKey, yAxisKeys, isValid])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (processedData.length === 0) return {}

    const stats: Record<string, any> = {}

    yAxisKeys.forEach(key => {
      const values = processedData
        .map(item => item[key])
        .filter(v => typeof v === 'number') as number[]
      
      if (values.length === 0) return

      const total = values.reduce((sum, v) => sum + v, 0)
      const average = total / values.length
      const { min, max } = { min: Math.min(...values), max: Math.max(...values) }

      stats[key] = {
        total,
        average,
        min,
        max,
        count: values.length
      }
    })

    return stats
  }, [processedData, yAxisKeys])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div 
        className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg"
        style={TOOLTIP_STYLES.default}
      >
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm">{entry.name}</span>
              </div>
              <span className="font-medium">
                {state.stackMode === 'percentage' 
                  ? formatPercentage((entry.value as number) / 100)
                  : formatNumber(entry.value as number)
                }
              </span>
            </div>
          ))}
        </div>
        {state.stackMode === 'percentage' && payload.length > 1 && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            Total: 100%
          </div>
        )}
      </div>
    )
  }

  // Custom label renderer for values on bars
  const renderCustomLabel = (props: any) => {
    if (!state.showValues) return null
    
    const { x, y, width, height, value } = props
    
    if (state.orientation === 'horizontal') {
      return (
        <text 
          x={x + width + 5} 
          y={y + height / 2} 
          dy={4}
          fill="#666" 
          fontSize="12"
        >
          {state.stackMode === 'percentage' 
            ? formatPercentage(value / 100)
            : formatNumber(value)
          }
        </text>
      )
    } else {
      return (
        <text 
          x={x + width / 2} 
          y={y - 5} 
          dy={4}
          textAnchor="middle"
          fill="#666" 
          fontSize="12"
        >
          {state.stackMode === 'percentage' 
            ? formatPercentage(value / 100)
            : formatNumber(value)
          }
        </text>
      )
    }
  }

  // Event handlers
  const handleBarClick = (data: any, index: number) => {
    const barKey = data[xAxisKey]
    setState(prev => {
      const newSelected = new Set(prev.selectedBars)
      if (newSelected.has(barKey)) {
        newSelected.delete(barKey)
      } else {
        newSelected.add(barKey)
      }
      return { ...prev, selectedBars: newSelected }
    })
    
    interaction?.onClick?.(data, index)
    toast.info(`${data[xAxisKey]}: ${formatNumber(data[yAxisKeys[0]])}`)
  }

  const handleSeriesToggle = (seriesKey: string) => {
    setState(prev => {
      const newHidden = new Set(prev.hiddenSeries)
      if (newHidden.has(seriesKey)) {
        newHidden.delete(seriesKey)
      } else {
        newHidden.add(seriesKey)
      }
      return { ...prev, hiddenSeries: newHidden }
    })
  }

  const handleSort = (sortBy: string) => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handleOrientationToggle = () => {
    setState(prev => ({
      ...prev,
      orientation: prev.orientation === 'vertical' ? 'horizontal' : 'vertical'
    }))
  }

  const handleStackModeChange = (mode: 'grouped' | 'stacked' | 'percentage') => {
    setState(prev => ({ ...prev, stackMode: mode }))
  }

  const handleExport = (format: 'png' | 'svg' | 'jpg') => {
    const svgElement = chartRef.current?.querySelector('svg')
    if (svgElement) {
      const filename = `bar-chart-${new Date().toISOString().split('T')[0]}`
      downloadChart(svgElement, filename, format)
      toast.success(`Chart exported as ${format.toUpperCase()}`)
    }
  }

  // Get visible series (not hidden)
  const visibleSeries = yAxisKeys.filter(key => !state.hiddenSeries.has(key))

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading chart data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error || !isValid) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-destructive text-center">
            {error || 'Invalid chart data'}
          </p>
          {!isValid && errors.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p>Errors:</p>
              <ul className="list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <CardTitle className="flex items-center gap-2">
                  {title}
                  <Badge variant="secondary">
                    {processedData.length} items
                  </Badge>
                  {state.stackMode === 'percentage' && (
                    <Badge variant="outline">Percentage View</Badge>
                  )}
                </CardTitle>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>

            {/* Chart controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOrientationToggle}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Select onValueChange={(value) => handleSort(value)}>
                <SelectTrigger className="w-auto">
                  {state.sortOrder === 'asc' ? 
                    <SortAsc className="w-4 h-4" /> : 
                    <SortDesc className="w-4 h-4" />
                  }
                </SelectTrigger>
                <SelectContent>
                  {[xAxisKey, ...yAxisKeys].map(key => (
                    <SelectItem key={key} value={key}>
                      Sort by {key.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {exportConfig?.formats && (
                <Select onValueChange={handleExport}>
                  <SelectTrigger className="w-auto">
                    <Download className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportConfig.formats.map(format => (
                      <SelectItem key={format} value={format}>
                        Export as {format.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent>
        {/* Statistics */}
        {Object.keys(statistics).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            {Object.entries(statistics).map(([key, stat]) => (
              <div key={key} className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {formatNumber(stat.total)}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {key.replace('_', ' ')} Total
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg: {formatNumber(stat.average, 1)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chart options */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-values"
              checked={state.showValues}
              onCheckedChange={(checked) => 
                setState(prev => ({ ...prev, showValues: checked }))
              }
            />
            <Label htmlFor="show-values" className="text-sm">
              Show Values
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-grid"
              checked={state.showGrid}
              onCheckedChange={(checked) => 
                setState(prev => ({ ...prev, showGrid: checked }))
              }
            />
            <Label htmlFor="show-grid" className="text-sm">
              Show Grid
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-average"
              checked={state.showAverage}
              onCheckedChange={(checked) => 
                setState(prev => ({ ...prev, showAverage: checked }))
              }
            />
            <Label htmlFor="show-average" className="text-sm">
              Show Average Line
            </Label>
          </div>

          {/* Stack mode selection */}
          {yAxisKeys.length > 1 && (
            <Select value={state.stackMode} onValueChange={handleStackModeChange}>
              <SelectTrigger className="w-auto">
                <Layers className="w-4 h-4 mr-2" />
                <span className="capitalize">{state.stackMode}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grouped">Grouped</SelectItem>
                <SelectItem value="stacked">Stacked</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Series toggles */}
          <div className="flex items-center gap-2">
            {yAxisKeys.map((key, index) => (
              <Button
                key={key}
                variant={state.hiddenSeries.has(key) ? "outline" : "default"}
                size="sm"
                onClick={() => handleSeriesToggle(key)}
                className="h-8"
              >
                <div 
                  className="w-3 h-3 rounded-sm mr-2"
                  style={{ backgroundColor: chartColors[index] }}
                />
                {key.replace('_', ' ').toUpperCase()}
                {state.hiddenSeries.has(key) && <EyeOff className="w-3 h-3 ml-1" />}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <motion.div
          ref={chartRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={animation}
          role="img"
          aria-label={accessibility?.ariaLabel || generateAriaLabel(
            title || 'Bar Chart', 
            'bar', 
            processedData
          )}
        >
          <ResponsiveContainer 
            width={mergedConfig.width} 
            height={mergedConfig.height}
          >
            <BarChart 
              data={processedData} 
              layout={state.orientation === 'horizontal' ? 'horizontal' : 'vertical'}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              {state.showGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              )}
              
              {state.orientation === 'horizontal' ? (
                <>
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => 
                      state.stackMode === 'percentage' 
                        ? formatPercentage(value / 100)
                        : formatNumber(value)
                    }
                  />
                  <YAxis 
                    type="category"
                    dataKey={xAxisKey}
                    width={100}
                  />
                </>
              ) : (
                <>
                  <XAxis 
                    dataKey={xAxisKey}
                    interval={0}
                    angle={processedData.length > 8 ? -45 : 0}
                    textAnchor={processedData.length > 8 ? 'end' : 'middle'}
                    height={processedData.length > 8 ? 60 : 30}
                  />
                  <YAxis 
                    tickFormatter={(value) => 
                      state.stackMode === 'percentage' 
                        ? formatPercentage(value / 100)
                        : formatNumber(value)
                    }
                  />
                </>
              )}
              
              {mergedConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {mergedConfig.showLegend && <Legend />}
              
              {/* Average reference lines */}
              {state.showAverage && Object.entries(statistics).map(([key, stat]) => (
                <ReferenceLine 
                  key={`avg-${key}`}
                  x={state.orientation === 'horizontal' ? stat.average : undefined}
                  y={state.orientation === 'vertical' ? stat.average : undefined}
                  stroke={chartColors[yAxisKeys.indexOf(key)] || '#666'}
                  strokeDasharray="5 5"
                  opacity={0.7}
                />
              ))}
              
              {visibleSeries.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={chartColors[index]}
                  radius={mergedConfig.cornerRadius}
                  stackId={state.stackMode === 'grouped' ? undefined : 'stack'}
                  onClick={handleBarClick}
                  animationDuration={animation.duration}
                  isAnimationActive={mergedConfig.animate}
                >
                  {state.showValues && <LabelList content={renderCustomLabel} />}
                  {processedData.map((entry, entryIndex) => (
                    <Cell 
                      key={`cell-${entryIndex}`}
                      fill={state.selectedBars.has(entry[xAxisKey]) 
                        ? '#374151' 
                        : chartColors[index]
                      }
                      stroke={state.selectedBars.has(entry[xAxisKey]) ? '#1f2937' : 'none'}
                      strokeWidth={state.selectedBars.has(entry[xAxisKey]) ? 2 : 0}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Chart summary */}
        {processedData.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground flex items-center justify-between">
            <span>
              Showing {processedData.length} items
              {state.hiddenSeries.size > 0 && ` (${state.hiddenSeries.size} series hidden)`}
              {state.selectedBars.size > 0 && ` (${state.selectedBars.size} selected)`}
            </span>
            <span className="capitalize">
              {state.orientation} • {state.stackMode}
              {state.stackMode === 'percentage' && ' view'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
