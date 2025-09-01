/**
 * Chart Utility Functions
 * Task 14: Interactive Chart Components
 */

import { CHART_COLORS, CHART_BREAKPOINTS } from './constants'
import { ChartDataPoint, TimeSeriesDataPoint, ChartConfig } from './types'

// Color utilities
export const getColorByIndex = (index: number, palette: string[] = CHART_COLORS.primary): string => {
  return palette[index % palette.length]
}

export const getColorByValue = (value: number, min: number, max: number, palette: string[]): string => {
  const normalizedValue = (value - min) / (max - min)
  const index = Math.floor(normalizedValue * (palette.length - 1))
  return palette[Math.max(0, Math.min(index, palette.length - 1))]
}

export const generateColorPalette = (count: number, baseColors: string[] = CHART_COLORS.primary): string[] => {
  const palette: string[] = []
  for (let i = 0; i < count; i++) {
    palette.push(getColorByIndex(i, baseColors))
  }
  return palette
}

// Data formatting utilities
export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

export const formatCurrency = (value: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(value)
}

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

export const formatDate = (date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'long':
      return dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    default:
      return dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
  }
}

// Data processing utilities
export const aggregateDataByPeriod = (
  data: TimeSeriesDataPoint[], 
  period: 'day' | 'week' | 'month' | 'year'
): TimeSeriesDataPoint[] => {
  const aggregated = new Map<string, number>()
  
  data.forEach(item => {
    const date = new Date(item.date)
    let key: string
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      case 'year':
        key = String(date.getFullYear())
        break
      default:
        key = date.toISOString().split('T')[0]
    }
    
    aggregated.set(key, (aggregated.get(key) || 0) + item.value)
  })
  
  return Array.from(aggregated.entries()).map(([date, value]) => ({
    date,
    value,
    name: formatDate(date)
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export const calculateMovingAverage = (
  data: TimeSeriesDataPoint[], 
  window: number
): TimeSeriesDataPoint[] => {
  return data.map((item, index) => {
    const start = Math.max(0, index - Math.floor(window / 2))
    const end = Math.min(data.length, index + Math.ceil(window / 2))
    const slice = data.slice(start, end)
    const average = slice.reduce((sum, point) => sum + point.value, 0) / slice.length
    
    return {
      ...item,
      value: average,
      originalValue: item.value
    }
  })
}

export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 1 : 0
  return (current - previous) / previous
}

export const findDataExtremes = (data: ChartDataPoint[]): { min: number; max: number } => {
  const values = data.map(item => item.value)
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

// Chart configuration utilities
export const mergeChartConfig = <T extends ChartConfig>(
  defaultConfig: T, 
  userConfig: Partial<T> = {}
): T => {
  return { ...defaultConfig, ...userConfig }
}

export const getResponsiveHeight = (baseHeight: number, screenWidth: number): number => {
  if (screenWidth < CHART_BREAKPOINTS.mobile) {
    return Math.max(200, baseHeight * 0.7)
  }
  if (screenWidth < CHART_BREAKPOINTS.tablet) {
    return Math.max(250, baseHeight * 0.85)
  }
  return baseHeight
}

export const getResponsiveConfig = (config: ChartConfig, screenWidth: number): ChartConfig => {
  const isMobile = screenWidth < CHART_BREAKPOINTS.mobile
  const isTablet = screenWidth < CHART_BREAKPOINTS.tablet
  
  return {
    ...config,
    height: typeof config.height === 'number' 
      ? getResponsiveHeight(config.height, screenWidth) 
      : config.height,
    showLegend: isMobile ? false : config.showLegend,
    showGrid: isTablet ? false : config.showGrid
  }
}

// Accessibility utilities
export const generateChartDescription = (
  data: ChartDataPoint[], 
  type: 'line' | 'bar' | 'pie' | 'heatmap'
): string => {
  const totalItems = data.length
  const { min, max } = findDataExtremes(data)
  const average = data.reduce((sum, item) => sum + item.value, 0) / totalItems
  
  let description = `${type} chart with ${totalItems} data points. `
  description += `Values range from ${formatNumber(min)} to ${formatNumber(max)}, `
  description += `with an average of ${formatNumber(average, 2)}.`
  
  return description
}

export const generateAriaLabel = (
  title: string, 
  type: string, 
  data: ChartDataPoint[]
): string => {
  return `${title}: ${generateChartDescription(data, type as any)}`
}

// Export utilities
export const downloadChart = (
  svgElement: SVGElement | null, 
  filename: string, 
  format: 'png' | 'svg' | 'jpg' = 'png'
): void => {
  if (!svgElement) return
  
  if (format === 'svg') {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
    downloadBlob(svgBlob, `${filename}.svg`)
    return
  }
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const svgRect = svgElement.getBoundingClientRect()
  canvas.width = svgRect.width
  canvas.height = svgRect.height
  
  const img = new Image()
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    
    const format_type = format === 'jpg' ? 'image/jpeg' : 'image/png'
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${filename}.${format}`)
      }
    }, format_type)
  }
  
  img.src = url
}

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Validation utilities
export const validateChartData = (data: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!Array.isArray(data)) {
    errors.push('Data must be an array')
    return { isValid: false, errors }
  }
  
  if (data.length === 0) {
    errors.push('Data array cannot be empty')
    return { isValid: false, errors }
  }
  
  // Check for required fields
  data.forEach((item, index) => {
    if (typeof item !== 'object') {
      errors.push(`Item at index ${index} must be an object`)
      return
    }
    
    if (!('value' in item) || typeof item.value !== 'number') {
      errors.push(`Item at index ${index} must have a numeric 'value' property`)
    }
    
    if (!('name' in item) || typeof item.name !== 'string') {
      errors.push(`Item at index ${index} must have a string 'name' property`)
    }
  })
  
  return { isValid: errors.length === 0, errors }
}
