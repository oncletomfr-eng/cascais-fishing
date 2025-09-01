/**
 * Chart Constants and Configuration
 * Task 14: Interactive Chart Components
 */

// Standard color palettes
export const CHART_COLORS = {
  primary: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  secondary: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'],
  muted: ['#94a3b8', '#a1a1aa', '#d1d5db', '#e5e7eb', '#f3f4f6', '#fafafa'],
  
  // Semantic colors
  success: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  warning: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  error: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  info: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
  
  // Rating colors (1-5 stars)
  rating: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#22c55e'],
  
  // Sentiment colors
  sentiment: {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: '#6b7280'
  },
  
  // Heatmap gradients
  heatmap: {
    blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'],
    green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a'],
    red: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c'],
    purple: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea'],
    orange: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c']
  }
}

// Default chart configurations
export const DEFAULT_CHART_CONFIG = {
  width: '100%',
  height: 300,
  responsive: true,
  showGrid: true,
  showTooltip: true,
  showLegend: false,
  animate: true,
  theme: 'auto' as const
}

export const DEFAULT_LINE_CONFIG = {
  ...DEFAULT_CHART_CONFIG,
  strokeWidth: 2,
  dot: false,
  area: false,
  smooth: true,
  connectNulls: false
}

export const DEFAULT_BAR_CONFIG = {
  ...DEFAULT_CHART_CONFIG,
  orientation: 'vertical' as const,
  barSize: undefined,
  cornerRadius: 4
}

export const DEFAULT_PIE_CONFIG = {
  ...DEFAULT_CHART_CONFIG,
  height: 250,
  innerRadius: 0,
  outerRadius: 80,
  startAngle: 0,
  endAngle: 360,
  showLabels: true,
  labelLine: false,
  paddingAngle: 2
}

export const DEFAULT_HEATMAP_CONFIG = {
  ...DEFAULT_CHART_CONFIG,
  cellSize: 20,
  colorScale: CHART_COLORS.heatmap.blue,
  showValues: true,
  roundedCorners: true
}

// Animation configurations
export const CHART_ANIMATIONS = {
  fast: { duration: 300, easing: 'ease-out' as const },
  normal: { duration: 500, easing: 'ease-in-out' as const },
  slow: { duration: 800, easing: 'ease-in-out' as const },
  bounce: { duration: 600, easing: 'ease-out' as const }
}

// Responsive breakpoints for charts
export const CHART_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280
}

// Accessibility constants
export const CHART_ARIA_LABELS = {
  lineChart: 'Line chart showing trends over time',
  barChart: 'Bar chart comparing values across categories',
  pieChart: 'Pie chart showing distribution of values',
  heatMap: 'Heat map showing intensity patterns',
  loading: 'Chart is loading',
  error: 'Chart failed to load',
  noData: 'No data available for chart'
}

// Tooltip styles
export const TOOLTIP_STYLES = {
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    color: '#374151',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  dark: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    color: '#f9fafb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }
}

// Grid styles
export const GRID_STYLES = {
  default: {
    stroke: '#e5e7eb',
    strokeDasharray: '3 3',
    strokeWidth: 1,
    opacity: 0.5
  },
  subtle: {
    stroke: '#f3f4f6',
    strokeDasharray: '2 2',
    strokeWidth: 1,
    opacity: 0.3
  },
  bold: {
    stroke: '#d1d5db',
    strokeDasharray: '5 5',
    strokeWidth: 1,
    opacity: 0.7
  }
}

// Export formats and options
export const EXPORT_FORMATS = {
  png: { extension: 'png', mimeType: 'image/png' },
  jpg: { extension: 'jpg', mimeType: 'image/jpeg' },
  svg: { extension: 'svg', mimeType: 'image/svg+xml' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf' }
}

// Chart type specific configurations
export const BOOKING_TREND_CONFIG = {
  colors: [CHART_COLORS.primary[0], CHART_COLORS.primary[1]],
  strokeWidth: 3,
  dot: true,
  area: true,
  showGrid: true,
  showLegend: true
}

export const SPECIES_BREAKDOWN_CONFIG = {
  colors: CHART_COLORS.primary,
  showLabels: true,
  labelLine: true,
  outerRadius: 90,
  innerRadius: 30
}

export const TIME_SLOT_COMPARISON_CONFIG = {
  colors: [CHART_COLORS.primary[0]],
  orientation: 'vertical' as const,
  cornerRadius: 6,
  showGrid: true
}

export const SEASONAL_ACTIVITY_CONFIG = {
  colorScale: CHART_COLORS.heatmap.blue,
  cellSize: 24,
  showValues: true,
  roundedCorners: true
}
