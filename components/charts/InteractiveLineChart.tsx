/**
 * Interactive Line Chart Component
 * Task 14: Interactive Chart Components - Line Charts for Booking Trends
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, ReferenceLine, Area, AreaChart
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
  TrendingUp, TrendingDown, Download, ZoomIn, ZoomOut,
  RefreshCw, Eye, EyeOff, MoreHorizontal, Maximize2
} from 'lucide-react'
import { toast } from 'sonner'

import { 
  InteractiveLineChartProps, 
  ChartAnimation, 
  CustomTooltipProps 
} from './types'
import { 
  DEFAULT_LINE_CONFIG, 
  CHART_COLORS, 
  TOOLTIP_STYLES,
  CHART_ANIMATIONS 
} from './constants'
import { 
  mergeChartConfig, 
  formatNumber, 
  formatDate, 
  calculateMovingAverage,
  calculateGrowthRate,
  downloadChart,
  validateChartData,
  generateAriaLabel 
} from './utils'

interface LineChartState {
  zoomDomain?: [number, number]
  selectedLines: Set<string>
  showMovingAverage: boolean
  movingAverageWindow: number
  showPredictive: boolean
  aggregationPeriod: 'day' | 'week' | 'month'
}

export default function InteractiveLineChart({
  data,
  config = {},
  xAxisKey = 'date',
  yAxisKeys = ['value'],
  title,
  description,
  loading = false,
  error = null,
  className = '',
  showBrush = false,
  showZoom = false,
  predictive = false,
  filters,
  interaction,
  accessibility,
  animation = CHART_ANIMATIONS.normal,
  export: exportConfig
}: InteractiveLineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<LineChartState>({
    selectedLines: new Set(yAxisKeys),
    showMovingAverage: false,
    movingAverageWindow: 7,
    showPredictive: predictive,
    aggregationPeriod: 'day'
  })

  const mergedConfig = mergeChartConfig(DEFAULT_LINE_CONFIG, config)
  const chartColors = mergedConfig.colors || CHART_COLORS.primary

  // Validate data
  const { isValid, errors } = validateChartData(data)
  
  useEffect(() => {
    if (!isValid) {
      console.error('LineChart validation errors:', errors)
    }
  }, [isValid, errors])

  // Process data based on state
  const processedData = React.useMemo(() => {
    if (!isValid || data.length === 0) return []

    let processed = [...data]

    // Apply moving average if enabled
    if (state.showMovingAverage) {
      yAxisKeys.forEach(key => {
        const timeSeriesData = processed.map(item => ({
          date: item[xAxisKey],
          value: item[key],
          name: item.name || item[xAxisKey]
        }))
        
        const smoothed = calculateMovingAverage(timeSeriesData, state.movingAverageWindow)
        processed = processed.map((item, index) => ({
          ...item,
          [`${key}_ma`]: smoothed[index]?.value || item[key]
        }))
      })
    }

    // Apply zoom domain if set
    if (state.zoomDomain) {
      const [start, end] = state.zoomDomain
      processed = processed.slice(start, end + 1)
    }

    return processed
  }, [data, state, xAxisKey, yAxisKeys, isValid])

  // Calculate trends and statistics
  const statistics = React.useMemo(() => {
    if (processedData.length < 2) return {}

    const stats: Record<string, any> = {}

    yAxisKeys.forEach(key => {
      const values = processedData.map(item => item[key]).filter(v => typeof v === 'number')
      if (values.length === 0) return

      const latest = values[values.length - 1]
      const previous = values[values.length - 2] || values[0]
      const growth = calculateGrowthRate(latest, previous)
      
      stats[key] = {
        latest,
        previous,
        growth,
        trend: growth > 0.02 ? 'up' : growth < -0.02 ? 'down' : 'stable',
        min: Math.min(...values),
        max: Math.max(...values),
        average: values.reduce((sum, v) => sum + v, 0) / values.length
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
        <p className="font-medium mb-2">
          {typeof label === 'string' && label.includes('-') 
            ? formatDate(label)
            : label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">{entry.name}</span>
            </div>
            <span className="font-medium">
              {formatNumber(entry.value as number, 2)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Event handlers
  const handleLineToggle = (lineKey: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedLines)
      if (newSelected.has(lineKey)) {
        newSelected.delete(lineKey)
      } else {
        newSelected.add(lineKey)
      }
      return { ...prev, selectedLines: newSelected }
    })
  }

  const handleZoomChange = (domain: any) => {
    if (domain && domain.startIndex !== undefined && domain.endIndex !== undefined) {
      setState(prev => ({
        ...prev,
        zoomDomain: [domain.startIndex, domain.endIndex]
      }))
    }
  }

  const handleZoomReset = () => {
    setState(prev => ({ ...prev, zoomDomain: undefined }))
  }

  const handleExport = (format: 'png' | 'svg' | 'jpg') => {
    const svgElement = chartRef.current?.querySelector('svg')
    if (svgElement) {
      const filename = `line-chart-${new Date().toISOString().split('T')[0]}`
      downloadChart(svgElement, filename, format)
      toast.success(`Chart exported as ${format.toUpperCase()}`)
    }
  }

  const handleDataPointClick = (data: any, index: number) => {
    interaction?.onClick?.(data, index)
    toast.info(`Data point: ${data[xAxisKey]} - ${formatNumber(data[yAxisKeys[0]])}`)
  }

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
                  {Object.keys(statistics).map(key => {
                    const stat = statistics[key]
                    if (!stat) return null
                    
                    const TrendIcon = stat.trend === 'up' ? TrendingUp : 
                                    stat.trend === 'down' ? TrendingDown : null
                    
                    return TrendIcon ? (
                      <TrendIcon 
                        key={key}
                        className={`w-4 h-4 ${
                          stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}
                      />
                    ) : null
                  })}
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
              {showZoom && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomReset}
                    disabled={!state.zoomDomain}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </>
              )}
              
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
        {/* Statistics bar */}
        {Object.keys(statistics).length > 0 && (
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            {Object.entries(statistics).map(([key, stat]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">
                  {key.replace('_', ' ')}:
                </span>
                <Badge variant="secondary">
                  {formatNumber(stat.latest, 2)}
                </Badge>
                {stat.growth !== 0 && (
                  <Badge 
                    variant={stat.trend === 'up' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {stat.growth > 0 ? '+' : ''}{(stat.growth * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chart options */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="moving-average"
              checked={state.showMovingAverage}
              onCheckedChange={(checked) => 
                setState(prev => ({ ...prev, showMovingAverage: checked }))
              }
            />
            <Label htmlFor="moving-average" className="text-sm">
              Moving Average ({state.movingAverageWindow}d)
            </Label>
          </div>

          {predictive && (
            <div className="flex items-center space-x-2">
              <Switch
                id="predictive"
                checked={state.showPredictive}
                onCheckedChange={(checked) => 
                  setState(prev => ({ ...prev, showPredictive: checked }))
                }
              />
              <Label htmlFor="predictive" className="text-sm">
                Predictive Trend
              </Label>
            </div>
          )}

          {/* Line toggles */}
          <div className="flex items-center gap-2">
            {yAxisKeys.map((key, index) => (
              <Button
                key={key}
                variant={state.selectedLines.has(key) ? "default" : "outline"}
                size="sm"
                onClick={() => handleLineToggle(key)}
                className="h-8"
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: chartColors[index] }}
                />
                {key.replace('_', ' ').toUpperCase()}
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
            title || 'Line Chart', 
            'line', 
            processedData
          )}
        >
          <ResponsiveContainer 
            width={mergedConfig.width} 
            height={mergedConfig.height}
          >
            {mergedConfig.area ? (
              <AreaChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {mergedConfig.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                )}
                <XAxis 
                  dataKey={xAxisKey}
                  tickFormatter={(value) => 
                    typeof value === 'string' && value.includes('-') 
                      ? formatDate(value, 'short')
                      : value
                  }
                />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                
                {mergedConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
                {mergedConfig.showLegend && <Legend />}
                
                {yAxisKeys.map((key, index) => 
                  state.selectedLines.has(key) && (
                    <Area
                      key={key}
                      type={mergedConfig.smooth ? "monotone" : "linear"}
                      dataKey={key}
                      stroke={chartColors[index]}
                      fill={chartColors[index]}
                      fillOpacity={0.3}
                      strokeWidth={mergedConfig.strokeWidth}
                      dot={mergedConfig.dot}
                      connectNulls={mergedConfig.connectNulls}
                      onClick={handleDataPointClick}
                      animationDuration={animation.duration}
                      isAnimationActive={mergedConfig.animate}
                    />
                  )
                )}

                {/* Moving average lines */}
                {state.showMovingAverage && yAxisKeys.map((key, index) => 
                  state.selectedLines.has(key) && (
                    <Area
                      key={`${key}_ma`}
                      type="monotone"
                      dataKey={`${key}_ma`}
                      stroke={chartColors[index]}
                      fill="none"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      opacity={0.7}
                    />
                  )
                )}

                {showBrush && (
                  <Brush 
                    dataKey={xAxisKey} 
                    height={30}
                    stroke={chartColors[0]}
                    onChange={handleZoomChange}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                {mergedConfig.showGrid && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                )}
                <XAxis 
                  dataKey={xAxisKey}
                  tickFormatter={(value) => 
                    typeof value === 'string' && value.includes('-') 
                      ? formatDate(value, 'short')
                      : value
                  }
                />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                
                {mergedConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
                {mergedConfig.showLegend && <Legend />}
                
                {yAxisKeys.map((key, index) => 
                  state.selectedLines.has(key) && (
                    <Line
                      key={key}
                      type={mergedConfig.smooth ? "monotone" : "linear"}
                      dataKey={key}
                      stroke={chartColors[index]}
                      strokeWidth={mergedConfig.strokeWidth}
                      dot={mergedConfig.dot}
                      connectNulls={mergedConfig.connectNulls}
                      onClick={handleDataPointClick}
                      animationDuration={animation.duration}
                      isAnimationActive={mergedConfig.animate}
                    />
                  )
                )}

                {/* Moving average lines */}
                {state.showMovingAverage && yAxisKeys.map((key, index) => 
                  state.selectedLines.has(key) && (
                    <Line
                      key={`${key}_ma`}
                      type="monotone"
                      dataKey={`${key}_ma`}
                      stroke={chartColors[index]}
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      opacity={0.7}
                    />
                  )
                )}

                {showBrush && (
                  <Brush 
                    dataKey={xAxisKey} 
                    height={30}
                    stroke={chartColors[0]}
                    onChange={handleZoomChange}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </motion.div>

        {/* Chart summary */}
        {processedData.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {processedData.length} data points
            {state.zoomDomain && ' (zoomed view)'}
            {state.showMovingAverage && ` with ${state.movingAverageWindow}-period moving average`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
