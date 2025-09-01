/**
 * Chart Component Types and Interfaces
 * Task 14: Interactive Chart Components
 */

import { ReactNode } from 'react'

// Base chart data interfaces
export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any
}

export interface TimeSeriesDataPoint {
  date: string
  timestamp?: Date
  value: number
  [key: string]: any
}

export interface MultiSeriesDataPoint {
  name: string
  [key: string]: string | number
}

// Chart configuration interfaces
export interface ChartConfig {
  colors?: string[]
  width?: number | string
  height?: number | string
  responsive?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  animate?: boolean
  theme?: 'light' | 'dark' | 'auto'
}

export interface LineChartConfig extends ChartConfig {
  strokeWidth?: number
  dot?: boolean
  area?: boolean
  smooth?: boolean
  connectNulls?: boolean
  yAxisDomain?: [number | 'dataMin', number | 'dataMax']
}

export interface BarChartConfig extends ChartConfig {
  orientation?: 'horizontal' | 'vertical'
  stackId?: string
  barSize?: number
  cornerRadius?: number
}

export interface PieChartConfig extends ChartConfig {
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  showLabels?: boolean
  labelLine?: boolean
  paddingAngle?: number
}

export interface HeatMapConfig extends ChartConfig {
  cellSize?: number
  colorScale?: string[]
  showValues?: boolean
  roundedCorners?: boolean
}

// Tooltip and legend interfaces
export interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: any
  formatter?: (value: any, name: string, props: any) => [ReactNode, string]
  labelFormatter?: (label: any) => ReactNode
  separator?: string
  contentStyle?: React.CSSProperties
  itemStyle?: React.CSSProperties
  labelStyle?: React.CSSProperties
}

export interface CustomLegendProps {
  payload?: any[]
  formatter?: (value: string, entry: any) => ReactNode
  iconType?: 'line' | 'rect' | 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye'
}

// Filter and interaction interfaces
export interface ChartFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  categories?: string[]
  valueRange?: {
    min: number
    max: number
  }
}

export interface ChartInteraction {
  onClick?: (data: any, index: number) => void
  onMouseEnter?: (data: any, index: number) => void
  onMouseLeave?: (data: any, index: number) => void
  onBrushChange?: (domain: any) => void
}

// Accessibility interfaces
export interface ChartAccessibility {
  title?: string
  description?: string
  ariaLabel?: string
  focusable?: boolean
  tabIndex?: number
  role?: string
}

// Animation interfaces
export interface ChartAnimation {
  duration?: number
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  delay?: number
  isAnimationActive?: boolean
}

// Export and sharing interfaces
export interface ChartExport {
  formats?: ('png' | 'jpg' | 'svg' | 'pdf')[]
  filename?: string
  onExport?: (format: string, data: any) => void
}

// Base props for all chart components
export interface BaseChartProps {
  data: any[]
  config?: ChartConfig
  loading?: boolean
  error?: string | null
  className?: string
  title?: string
  description?: string
  filters?: ChartFilters
  interaction?: ChartInteraction
  accessibility?: ChartAccessibility
  animation?: ChartAnimation
  export?: ChartExport
}

// Specific chart component props
export interface InteractiveLineChartProps extends BaseChartProps {
  data: TimeSeriesDataPoint[] | MultiSeriesDataPoint[]
  config?: LineChartConfig
  xAxisKey?: string
  yAxisKeys?: string[]
  showBrush?: boolean
  showZoom?: boolean
  predictive?: boolean
}

export interface InteractivePieChartProps extends BaseChartProps {
  data: ChartDataPoint[]
  config?: PieChartConfig
  dataKey?: string
  nameKey?: string
  showPercentage?: boolean
}

export interface InteractiveBarChartProps extends BaseChartProps {
  data: ChartDataPoint[] | MultiSeriesDataPoint[]
  config?: BarChartConfig
  xAxisKey?: string
  yAxisKeys?: string[]
  grouped?: boolean
  stacked?: boolean
}

export interface InteractiveHeatMapProps extends BaseChartProps {
  data: any[][]
  config?: HeatMapConfig
  xAxisLabels?: string[]
  yAxisLabels?: string[]
  valueFormatter?: (value: number) => string
}
