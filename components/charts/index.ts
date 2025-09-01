/**
 * Interactive Chart Components Library
 * Task 14: Interactive Chart Components
 */

// Export all chart components
export { default as InteractiveLineChart } from './InteractiveLineChart'
export { default as InteractivePieChart } from './InteractivePieChart'
export { default as InteractiveBarChart } from './InteractiveBarChart'
export { default as InteractiveHeatMap } from './InteractiveHeatMap'

// Export types and interfaces
export type {
  ChartDataPoint,
  TimeSeriesDataPoint,
  MultiSeriesDataPoint,
  ChartConfig,
  LineChartConfig,
  BarChartConfig,
  PieChartConfig,
  HeatMapConfig,
  CustomTooltipProps,
  CustomLegendProps,
  ChartFilters,
  ChartInteraction,
  ChartAccessibility,
  ChartAnimation,
  ChartExport,
  BaseChartProps,
  InteractiveLineChartProps,
  InteractivePieChartProps,
  InteractiveBarChartProps,
  InteractiveHeatMapProps
} from './types'

// Export constants and utilities
export {
  CHART_COLORS,
  DEFAULT_CHART_CONFIG,
  DEFAULT_LINE_CONFIG,
  DEFAULT_BAR_CONFIG,
  DEFAULT_PIE_CONFIG,
  DEFAULT_HEATMAP_CONFIG,
  CHART_ANIMATIONS,
  CHART_BREAKPOINTS,
  CHART_ARIA_LABELS,
  BOOKING_TREND_CONFIG,
  SPECIES_BREAKDOWN_CONFIG,
  TIME_SLOT_COMPARISON_CONFIG,
  SEASONAL_ACTIVITY_CONFIG
} from './constants'

export {
  getColorByIndex,
  getColorByValue,
  generateColorPalette,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDate,
  aggregateDataByPeriod,
  calculateMovingAverage,
  calculateGrowthRate,
  findDataExtremes,
  mergeChartConfig,
  getResponsiveHeight,
  getResponsiveConfig,
  generateChartDescription,
  generateAriaLabel,
  downloadChart,
  validateChartData
} from './utils'
