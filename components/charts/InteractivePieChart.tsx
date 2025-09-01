/**
 * Interactive Pie Chart Component
 * Task 14: Interactive Chart Components - Pie Charts for Species/Technique Breakdowns
 */

'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector
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
  Download, RefreshCw, Eye, EyeOff, Percent, Hash,
  ChevronRight, MoreHorizontal, Filter, SortAsc, SortDesc
} from 'lucide-react'
import { toast } from 'sonner'

import { 
  InteractivePieChartProps, 
  ChartDataPoint,
  CustomTooltipProps 
} from './types'
import { 
  DEFAULT_PIE_CONFIG, 
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
  generateColorPalette 
} from './utils'

interface PieChartState {
  activeIndex: number | null
  hiddenSegments: Set<string>
  sortBy: 'value' | 'name' | 'percentage'
  sortOrder: 'asc' | 'desc'
  showValues: boolean
  showPercentages: boolean
  showLabels: boolean
  explodeActive: boolean
}

interface RenderActiveShapeProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
  payload: any
  percent: number
  value: number
  name: string
}

export default function InteractivePieChart({
  data,
  config = {},
  dataKey = 'value',
  nameKey = 'name',
  title,
  description,
  loading = false,
  error = null,
  className = '',
  showPercentage = true,
  filters,
  interaction,
  accessibility,
  animation = CHART_ANIMATIONS.normal,
  export: exportConfig
}: InteractivePieChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<PieChartState>({
    activeIndex: null,
    hiddenSegments: new Set(),
    sortBy: 'value',
    sortOrder: 'desc',
    showValues: true,
    showPercentages: showPercentage,
    showLabels: true,
    explodeActive: true
  })

  const mergedConfig = mergeChartConfig(DEFAULT_PIE_CONFIG, config)
  const chartColors = generateColorPalette(data.length, mergedConfig.colors || CHART_COLORS.primary)

  // Validate data
  const { isValid, errors } = validateChartData(data)

  // Process and sort data
  const processedData = useMemo(() => {
    if (!isValid || data.length === 0) return []

    // Filter out hidden segments
    let processed = data.filter(item => !state.hiddenSegments.has(item[nameKey]))

    // Sort data
    processed.sort((a, b) => {
      let aVal, bVal
      switch (state.sortBy) {
        case 'value':
          aVal = a[dataKey]
          bVal = b[dataKey]
          break
        case 'name':
          aVal = a[nameKey].toLowerCase()
          bVal = b[nameKey].toLowerCase()
          break
        case 'percentage':
          const total = data.reduce((sum, item) => sum + item[dataKey], 0)
          aVal = a[dataKey] / total
          bVal = b[dataKey] / total
          break
        default:
          return 0
      }
      
      const result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return state.sortOrder === 'asc' ? result : -result
    })

    return processed
  }, [data, state.hiddenSegments, state.sortBy, state.sortOrder, dataKey, nameKey, isValid])

  // Calculate statistics
  const statistics = useMemo(() => {
    if (processedData.length === 0) return {}

    const total = processedData.reduce((sum, item) => sum + item[dataKey], 0)
    const largest = processedData.reduce((max, item) => 
      item[dataKey] > max[dataKey] ? item : max, processedData[0])
    const smallest = processedData.reduce((min, item) => 
      item[dataKey] < min[dataKey] ? item : min, processedData[0])

    return {
      total,
      segments: processedData.length,
      largest: {
        name: largest[nameKey],
        value: largest[dataKey],
        percentage: (largest[dataKey] / total) * 100
      },
      smallest: {
        name: smallest[nameKey], 
        value: smallest[dataKey],
        percentage: (smallest[dataKey] / total) * 100
      },
      average: total / processedData.length
    }
  }, [processedData, dataKey, nameKey])

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const percentage = ((data[dataKey] / statistics.total) * 100)

    return (
      <div 
        className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg"
        style={TOOLTIP_STYLES.default}
      >
        <p className="font-medium mb-2">{data[nameKey]}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Value:</span>
            <span className="font-medium">{formatNumber(data[dataKey])}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">Percentage:</span>
            <span className="font-medium">{formatPercentage(percentage / 100)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Custom active shape for hover effect
  const RenderActiveShape = (props: RenderActiveShapeProps) => {
    const RADIAN = Math.PI / 180
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value, name
    } = props
    
    const sin = Math.sin(-RADIAN * midAngle)
    const cos = Math.cos(-RADIAN * midAngle)
    const sx = cx + (outerRadius + 10) * cos
    const sy = cy + (outerRadius + 10) * sin
    const mx = cx + (outerRadius + 30) * cos
    const my = cy + (outerRadius + 30) * sin
    const ex = mx + (cos >= 0 ? 1 : -1) * 22
    const ey = my
    const textAnchor = cos >= 0 ? 'start' : 'end'

    const explodedOuterRadius = state.explodeActive ? outerRadius + 8 : outerRadius

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-medium">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={explodedOuterRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={explodedOuterRadius + 6}
          outerRadius={explodedOuterRadius + 10}
          fill={fill}
          opacity={0.3}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey} 
          textAnchor={textAnchor} 
          fill="#333"
          className="text-sm font-medium"
        >
          {name}
        </text>
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey + 18} 
          textAnchor={textAnchor} 
          fill="#666"
          className="text-xs"
        >
          {`${formatNumber(value)} (${formatPercentage(percent)})`}
        </text>
      </g>
    )
  }

  // Custom label renderer
  const renderCustomLabel = (entry: any) => {
    if (!state.showLabels) return null
    
    const percentage = (entry.value / statistics.total) * 100
    let label = ''
    
    if (state.showValues && state.showPercentages) {
      label = `${formatNumber(entry.value)} (${formatPercentage(percentage / 100)})`
    } else if (state.showValues) {
      label = formatNumber(entry.value)
    } else if (state.showPercentages) {
      label = formatPercentage(percentage / 100)
    }
    
    return percentage > 5 ? label : '' // Only show label if segment is large enough
  }

  // Event handlers
  const handlePieEnter = (_: any, index: number) => {
    setState(prev => ({ ...prev, activeIndex: index }))
    interaction?.onMouseEnter?.(processedData[index], index)
  }

  const handlePieLeave = () => {
    setState(prev => ({ ...prev, activeIndex: null }))
  }

  const handleSegmentClick = (data: any, index: number) => {
    interaction?.onClick?.(data, index)
    toast.info(`${data[nameKey]}: ${formatNumber(data[dataKey])}`)
  }

  const handleSegmentToggle = (segmentName: string) => {
    setState(prev => {
      const newHidden = new Set(prev.hiddenSegments)
      if (newHidden.has(segmentName)) {
        newHidden.delete(segmentName)
      } else {
        newHidden.add(segmentName)
      }
      return { ...prev, hiddenSegments: newHidden }
    })
  }

  const handleSort = (sortBy: 'value' | 'name' | 'percentage') => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handleExport = (format: 'png' | 'svg' | 'jpg') => {
    const svgElement = chartRef.current?.querySelector('svg')
    if (svgElement) {
      const filename = `pie-chart-${new Date().toISOString().split('T')[0]}`
      downloadChart(svgElement, filename, format)
      toast.success(`Chart exported as ${format.toUpperCase()}`)
    }
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
                  <Badge variant="secondary">
                    {statistics.segments} segments
                  </Badge>
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
              <Select onValueChange={(value) => handleSort(value as any)}>
                <SelectTrigger className="w-auto">
                  {state.sortOrder === 'asc' ? 
                    <SortAsc className="w-4 h-4" /> : 
                    <SortDesc className="w-4 h-4" />
                  }
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Sort by Value</SelectItem>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="percentage">Sort by Percentage</SelectItem>
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
        {statistics.total && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(statistics.total)}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statistics.segments}
              </div>
              <div className="text-sm text-muted-foreground">Segments</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {statistics.largest.name}
              </div>
              <div className="text-sm text-muted-foreground">
                Largest ({formatPercentage(statistics.largest.percentage / 100)})
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {formatNumber(statistics.average, 1)}
              </div>
              <div className="text-sm text-muted-foreground">Average</div>
            </div>
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
              id="show-percentages"
              checked={state.showPercentages}
              onCheckedChange={(checked) => 
                setState(prev => ({ ...prev, showPercentages: checked }))
              }
            />
            <Label htmlFor="show-percentages" className="text-sm">
              Show Percentages
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="explode-active"
              checked={state.explodeActive}
              onCheckedChange={(checked) => 
                setState(prev => ({ ...prev, explodeActive: checked }))
              }
            />
            <Label htmlFor="explode-active" className="text-sm">
              Explode Active
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <motion.div
              ref={chartRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={animation}
              role="img"
              aria-label={accessibility?.ariaLabel || generateAriaLabel(
                title || 'Pie Chart', 
                'pie', 
                processedData
              )}
            >
              <ResponsiveContainer 
                width={mergedConfig.width} 
                height={mergedConfig.height}
              >
                <PieChart>
                  <Pie
                    activeIndex={state.activeIndex}
                    activeShape={state.explodeActive ? RenderActiveShape : undefined}
                    data={processedData}
                    cx="50%"
                    cy="50%"
                    labelLine={mergedConfig.labelLine}
                    label={mergedConfig.showLabels ? renderCustomLabel : false}
                    outerRadius={mergedConfig.outerRadius}
                    innerRadius={mergedConfig.innerRadius}
                    paddingAngle={mergedConfig.paddingAngle}
                    dataKey={dataKey}
                    startAngle={mergedConfig.startAngle}
                    endAngle={mergedConfig.endAngle}
                    onMouseEnter={handlePieEnter}
                    onMouseLeave={handlePieLeave}
                    onClick={handleSegmentClick}
                    animationBegin={0}
                    animationDuration={animation.duration}
                    isAnimationActive={mergedConfig.animate}
                  >
                    {processedData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={chartColors[index % chartColors.length]}
                        stroke={state.activeIndex === index ? '#374151' : 'none'}
                        strokeWidth={state.activeIndex === index ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  {mergedConfig.showTooltip && !state.explodeActive && (
                    <Tooltip content={<CustomTooltip />} />
                  )}
                  {mergedConfig.showLegend && (
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => (
                        <span className="text-sm">{value}</span>
                      )}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Legend with toggles */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              Segments ({processedData.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.map((item, index) => {
                const isHidden = state.hiddenSegments.has(item[nameKey])
                const percentage = (item[dataKey] / statistics.total) * 100
                
                return (
                  <div 
                    key={item[nameKey]}
                    className={`flex items-center justify-between p-2 rounded border transition-opacity ${
                      isHidden ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => handleSegmentToggle(item[nameKey])}
                        className="flex items-center gap-2 hover:opacity-80"
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: isHidden ? '#d1d5db' : chartColors[index % chartColors.length] 
                          }}
                        />
                        {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <span className="text-sm font-medium truncate">
                        {item[nameKey]}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatNumber(item[dataKey])}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPercentage(percentage / 100)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chart summary */}
        {processedData.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {processedData.length} of {data.length} segments
            {state.hiddenSegments.size > 0 && ` (${state.hiddenSegments.size} hidden)`}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
