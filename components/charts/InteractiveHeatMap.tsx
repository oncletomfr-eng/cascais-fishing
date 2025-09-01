/**
 * Interactive Heat Map Component
 * Task 14: Interactive Chart Components - Heat Maps for Seasonal Activity Patterns
 */

'use client'

import React, { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Download, RefreshCw, Palette, Grid3X3, Maximize2,
  MoreHorizontal, Filter, SortAsc, SortDesc, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

import { 
  InteractiveHeatMapProps,
  CustomTooltipProps 
} from './types'
import { 
  DEFAULT_HEATMAP_CONFIG, 
  CHART_COLORS, 
  CHART_ANIMATIONS 
} from './constants'
import { 
  mergeChartConfig, 
  formatNumber, 
  getColorByValue,
  downloadChart,
  generateAriaLabel 
} from './utils'

interface HeatMapState {
  selectedCells: Set<string>
  colorScale: string[]
  showValues: boolean
  showBorders: boolean
  cellSize: number
  zoomLevel: number
  selectedRow: number | null
  selectedColumn: number | null
}

interface HeatMapCell {
  x: number
  y: number
  value: number
  xLabel: string
  yLabel: string
  color: string
  intensity: number
}

export default function InteractiveHeatMap({
  data = [],
  config = {},
  xAxisLabels = [],
  yAxisLabels = [],
  title,
  description,
  loading = false,
  error = null,
  className = '',
  valueFormatter = (value: number) => formatNumber(value),
  filters,
  interaction,
  accessibility,
  animation = CHART_ANIMATIONS.normal,
  export: exportConfig
}: InteractiveHeatMapProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<HeatMapState>({
    selectedCells: new Set(),
    colorScale: mergedConfig.colorScale || CHART_COLORS.heatmap.blue,
    showValues: true,
    showBorders: true,
    cellSize: 24,
    zoomLevel: 1,
    selectedRow: null,
    selectedColumn: null
  })

  const mergedConfig = mergeChartConfig(DEFAULT_HEATMAP_CONFIG, config)

  // Validate and process data
  const { processedData, statistics } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { processedData: [], statistics: { min: 0, max: 0, average: 0 } }
    }

    // Flatten 2D data into cells with coordinates
    const cells: HeatMapCell[] = []
    let allValues: number[] = []

    data.forEach((row, yIndex) => {
      if (Array.isArray(row)) {
        row.forEach((value, xIndex) => {
          if (typeof value === 'number') {
            allValues.push(value)
            cells.push({
              x: xIndex,
              y: yIndex,
              value,
              xLabel: xAxisLabels[xIndex] || `Col ${xIndex + 1}`,
              yLabel: yAxisLabels[yIndex] || `Row ${yIndex + 1}`,
              color: '',
              intensity: 0
            })
          }
        })
      }
    })

    // Calculate statistics
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const average = allValues.reduce((sum, v) => sum + v, 0) / allValues.length

    // Apply colors based on values
    cells.forEach(cell => {
      cell.color = getColorByValue(cell.value, min, max, state.colorScale)
      cell.intensity = max > min ? (cell.value - min) / (max - min) : 0
    })

    return {
      processedData: cells,
      statistics: { min, max, average, count: allValues.length }
    }
  }, [data, xAxisLabels, yAxisLabels, state.colorScale])

  // Grid dimensions
  const gridDimensions = useMemo(() => {
    if (processedData.length === 0) return { width: 0, height: 0, maxX: 0, maxY: 0 }
    
    const maxX = Math.max(...processedData.map(cell => cell.x)) + 1
    const maxY = Math.max(...processedData.map(cell => cell.y)) + 1
    
    return {
      width: maxX * state.cellSize * state.zoomLevel,
      height: maxY * state.cellSize * state.zoomLevel,
      maxX,
      maxY
    }
  }, [processedData, state.cellSize, state.zoomLevel])

  // Custom tooltip component for cells
  const CellTooltip = ({ cell }: { cell: HeatMapCell }) => (
    <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg max-w-xs">
      <div className="font-medium mb-2">
        {cell.yLabel} × {cell.xLabel}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">Value:</span>
          <span className="font-medium">{valueFormatter(cell.value)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">Intensity:</span>
          <span className="font-medium">{(cell.intensity * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm">Position:</span>
          <span className="font-medium">({cell.x}, {cell.y})</span>
        </div>
      </div>
    </div>
  )

  // Event handlers
  const handleCellClick = (cell: HeatMapCell) => {
    const cellKey = `${cell.x}-${cell.y}`
    setState(prev => {
      const newSelected = new Set(prev.selectedCells)
      if (newSelected.has(cellKey)) {
        newSelected.delete(cellKey)
      } else {
        newSelected.add(cellKey)
      }
      return { ...prev, selectedCells: newSelected }
    })
    
    interaction?.onClick?.(cell, cell.y * gridDimensions.maxX + cell.x)
    toast.info(`${cell.yLabel} × ${cell.xLabel}: ${valueFormatter(cell.value)}`)
  }

  const handleRowSelect = (rowIndex: number) => {
    setState(prev => ({
      ...prev,
      selectedRow: prev.selectedRow === rowIndex ? null : rowIndex
    }))
  }

  const handleColumnSelect = (colIndex: number) => {
    setState(prev => ({
      ...prev,
      selectedColumn: prev.selectedColumn === colIndex ? null : colIndex
    }))
  }

  const handleColorScaleChange = (colorScale: string[]) => {
    setState(prev => ({ ...prev, colorScale }))
  }

  const handleCellSizeChange = (size: number) => {
    setState(prev => ({ ...prev, cellSize: size }))
  }

  const handleZoomChange = (zoom: number) => {
    setState(prev => ({ ...prev, zoomLevel: zoom }))
  }

  const handleExport = (format: 'png' | 'svg' | 'jpg') => {
    const svgElement = chartRef.current?.querySelector('svg')
    if (svgElement) {
      const filename = `heatmap-${new Date().toISOString().split('T')[0]}`
      downloadChart(svgElement, filename, format)
      toast.success(`Heat map exported as ${format.toUpperCase()}`)
    }
  }

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading heat map data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error || processedData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-destructive text-center">
            {error || 'No data available for heat map'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <CardTitle className="flex items-center gap-2">
                    {title}
                    <Badge variant="secondary">
                      {gridDimensions.maxX}×{gridDimensions.maxY}
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
                <Select onValueChange={(value) => handleColorScaleChange(CHART_COLORS.heatmap[value as keyof typeof CHART_COLORS.heatmap])}>
                  <SelectTrigger className="w-auto">
                    <Palette className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue Scale</SelectItem>
                    <SelectItem value="green">Green Scale</SelectItem>
                    <SelectItem value="red">Red Scale</SelectItem>
                    <SelectItem value="purple">Purple Scale</SelectItem>
                    <SelectItem value="orange">Orange Scale</SelectItem>
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
          {statistics.count > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {valueFormatter(statistics.min)}
                </div>
                <div className="text-sm text-muted-foreground">Minimum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {valueFormatter(statistics.max)}
                </div>
                <div className="text-sm text-muted-foreground">Maximum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {valueFormatter(statistics.average)}
                </div>
                <div className="text-sm text-muted-foreground">Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.count}
                </div>
                <div className="text-sm text-muted-foreground">Data Points</div>
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
                id="show-borders"
                checked={state.showBorders}
                onCheckedChange={(checked) => 
                  setState(prev => ({ ...prev, showBorders: checked }))
                }
              />
              <Label htmlFor="show-borders" className="text-sm">
                Show Borders
              </Label>
            </div>

            {/* Cell size control */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Cell Size:</Label>
              <Select value={state.cellSize.toString()} onValueChange={(value) => handleCellSizeChange(Number(value))}>
                <SelectTrigger className="w-auto">
                  <span>{state.cellSize}px</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16">16px</SelectItem>
                  <SelectItem value="20">20px</SelectItem>
                  <SelectItem value="24">24px</SelectItem>
                  <SelectItem value="32">32px</SelectItem>
                  <SelectItem value="40">40px</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zoom control */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Zoom:</Label>
              <Select value={state.zoomLevel.toString()} onValueChange={(value) => handleZoomChange(Number(value))}>
                <SelectTrigger className="w-auto">
                  <span>{state.zoomLevel}x</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Heat map */}
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={animation}
            className="overflow-auto border rounded-lg"
            style={{ 
              maxHeight: '500px',
              maxWidth: '100%'
            }}
            role="img"
            aria-label={accessibility?.ariaLabel || generateAriaLabel(
              title || 'Heat Map', 
              'heatmap', 
              processedData.map(cell => ({ name: `${cell.xLabel}×${cell.yLabel}`, value: cell.value }))
            )}
          >
            <svg
              width={Math.max(gridDimensions.width + 100, 400)}
              height={Math.max(gridDimensions.height + 100, 300)}
              className="bg-white dark:bg-gray-900"
            >
              {/* Y-axis labels */}
              {Array.from({ length: gridDimensions.maxY }, (_, i) => (
                <text
                  key={`y-label-${i}`}
                  x={85}
                  y={50 + i * state.cellSize * state.zoomLevel + (state.cellSize * state.zoomLevel) / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-current cursor-pointer hover:font-bold"
                  onClick={() => handleRowSelect(i)}
                  style={{ 
                    fontWeight: state.selectedRow === i ? 'bold' : 'normal',
                    fill: state.selectedRow === i ? '#3b82f6' : 'currentColor'
                  }}
                >
                  {yAxisLabels[i] || `Row ${i + 1}`}
                </text>
              ))}

              {/* X-axis labels */}
              {Array.from({ length: gridDimensions.maxX }, (_, i) => (
                <text
                  key={`x-label-${i}`}
                  x={100 + i * state.cellSize * state.zoomLevel + (state.cellSize * state.zoomLevel) / 2}
                  y={40}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-current cursor-pointer hover:font-bold"
                  onClick={() => handleColumnSelect(i)}
                  style={{ 
                    fontWeight: state.selectedColumn === i ? 'bold' : 'normal',
                    fill: state.selectedColumn === i ? '#3b82f6' : 'currentColor'
                  }}
                  transform={`rotate(-45, ${100 + i * state.cellSize * state.zoomLevel + (state.cellSize * state.zoomLevel) / 2}, 40)`}
                >
                  {xAxisLabels[i] || `Col ${i + 1}`}
                </text>
              ))}

              {/* Heat map cells */}
              {processedData.map((cell, index) => {
                const cellKey = `${cell.x}-${cell.y}`
                const isSelected = state.selectedCells.has(cellKey)
                const isRowSelected = state.selectedRow === cell.y
                const isColumnSelected = state.selectedColumn === cell.x
                const cellSize = state.cellSize * state.zoomLevel

                return (
                  <g key={cellKey}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <rect
                          x={100 + cell.x * cellSize}
                          y={50 + cell.y * cellSize}
                          width={cellSize}
                          height={cellSize}
                          fill={cell.color}
                          stroke={
                            isSelected ? '#1f2937' :
                            isRowSelected || isColumnSelected ? '#3b82f6' :
                            state.showBorders ? '#e5e7eb' : 'none'
                          }
                          strokeWidth={
                            isSelected ? 3 :
                            isRowSelected || isColumnSelected ? 2 :
                            state.showBorders ? 1 : 0
                          }
                          className="cursor-pointer transition-all duration-200 hover:opacity-80"
                          onClick={() => handleCellClick(cell)}
                          rx={mergedConfig.roundedCorners ? 2 : 0}
                          ry={mergedConfig.roundedCorners ? 2 : 0}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <CellTooltip cell={cell} />
                      </TooltipContent>
                    </Tooltip>

                    {/* Cell value text */}
                    {state.showValues && cellSize >= 24 && (
                      <text
                        x={100 + cell.x * cellSize + cellSize / 2}
                        y={50 + cell.y * cellSize + cellSize / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs pointer-events-none"
                        fill={cell.intensity > 0.6 ? 'white' : 'black'}
                      >
                        {valueFormatter(cell.value)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </motion.div>

          {/* Color scale legend */}
          <div className="flex items-center justify-center mt-4 space-x-4">
            <span className="text-sm text-muted-foreground">
              {valueFormatter(statistics.min)}
            </span>
            <div className="flex">
              {state.colorScale.map((color, index) => (
                <div
                  key={index}
                  className="w-6 h-4"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {valueFormatter(statistics.max)}
            </span>
          </div>

          {/* Chart summary */}
          {processedData.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              {gridDimensions.maxX}×{gridDimensions.maxY} grid with {processedData.length} data points
              {state.selectedCells.size > 0 && ` (${state.selectedCells.size} selected)`}
              {(state.selectedRow !== null || state.selectedColumn !== null) && ' • Row/Column highlighted'}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
