/**
 * Commission Analytics Component
 * Task 8.2: Commission History & Trend Analysis
 * 
 * Taking the role of Senior Developer specializing in Financial Analytics
 * 
 * Comprehensive commission history tracking with trend analysis and reporting capabilities
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  Skeleton,
  LinearProgress,
  Autocomplete,
  Grid
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  ShowChart as ChartIcon,
  DateRange as DateRangeIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Assessment as ReportIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Insights as InsightsIcon,
  Compare as CompareIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  Percent as PercentIcon,
  Euro as EuroIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isValid } from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Interfaces for commission analytics
export interface CommissionDataPoint {
  date: string;
  period: string;
  totalCommissions: number;
  commissionCount: number;
  averageCommission: number;
  commissionRate: number;
  grossRevenue: number;
  netEarnings: number;
}

export interface TrendMetrics {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}

export interface CommissionSummary {
  totalCommissions: number;
  averageCommission: number;
  peakPeriod: {
    period: string;
    amount: number;
  };
  growthRate: number;
  transactionCount: number;
  commissionTrend: TrendMetrics;
  revenueTrend: TrendMetrics;
}

export interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  captainIds?: string[];
  transactionTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  groupBy: 'day' | 'week' | 'month' | 'quarter';
}

interface CommissionAnalyticsProps {
  className?: string;
}

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Chart colors
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export function CommissionAnalytics({ className = '' }: CommissionAnalyticsProps) {
  const { data: session } = useSession();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportDialog, setExportDialog] = useState(false);
  
  // Analytics data
  const [commissionData, setCommissionData] = useState<CommissionDataPoint[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: subMonths(new Date(), 12), // Last 12 months
      end: new Date()
    },
    groupBy: 'month'
  });
  
  // Generate mock commission data
  const generateMockData = useCallback((): CommissionDataPoint[] => {
    const months = eachMonthOfInterval({
      start: filters.dateRange.start,
      end: filters.dateRange.end
    });
    
    return months.map((month, index) => {
      // Generate realistic commission data with seasonal trends
      const baseAmount = 1200 + Math.random() * 800; // €12-20 average commission
      const seasonalMultiplier = 1 + Math.sin((index * Math.PI) / 6) * 0.3; // Seasonal variation
      const commissionCount = Math.floor(15 + Math.random() * 25); // 15-40 transactions
      const totalCommissions = Math.round(baseAmount * seasonalMultiplier * commissionCount);
      const grossRevenue = Math.round(totalCommissions / 0.175 * 100); // Assume 17.5% average rate
      
      return {
        date: format(month, 'yyyy-MM-dd'),
        period: format(month, 'MMM yyyy'),
        totalCommissions,
        commissionCount,
        averageCommission: Math.round(totalCommissions / commissionCount),
        commissionRate: 17.5 + Math.random() * 2.5, // 17.5-20% range
        grossRevenue,
        netEarnings: grossRevenue - totalCommissions - Math.round(grossRevenue * 0.029 + 30 * commissionCount) // Minus fees
      };
    });
  }, [filters.dateRange]);
  
  // Calculate summary statistics
  const calculateSummary = useCallback((data: CommissionDataPoint[]): CommissionSummary => {
    if (data.length === 0) {
      return {
        totalCommissions: 0,
        averageCommission: 0,
        peakPeriod: { period: 'N/A', amount: 0 },
        growthRate: 0,
        transactionCount: 0,
        commissionTrend: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'flat' },
        revenueTrend: { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'flat' }
      };
    }
    
    const totalCommissions = data.reduce((sum, item) => sum + item.totalCommissions, 0);
    const totalTransactions = data.reduce((sum, item) => sum + item.commissionCount, 0);
    const averageCommission = totalTransactions > 0 ? totalCommissions / totalTransactions : 0;
    
    // Find peak period
    const peakPeriod = data.reduce((peak, item) => 
      item.totalCommissions > peak.amount 
        ? { period: item.period, amount: item.totalCommissions }
        : peak
    , { period: data[0]?.period || 'N/A', amount: 0 });
    
    // Calculate growth rate (comparing first half vs second half)
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.totalCommissions, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.totalCommissions, 0) / secondHalf.length;
    const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    // Calculate recent trends (last 2 periods)
    const last2Periods = data.slice(-2);
    const commissionTrend: TrendMetrics = last2Periods.length === 2 
      ? {
          current: last2Periods[1].totalCommissions,
          previous: last2Periods[0].totalCommissions,
          change: last2Periods[1].totalCommissions - last2Periods[0].totalCommissions,
          changePercent: ((last2Periods[1].totalCommissions - last2Periods[0].totalCommissions) / last2Periods[0].totalCommissions) * 100,
          trend: last2Periods[1].totalCommissions > last2Periods[0].totalCommissions ? 'up' : 
                 last2Periods[1].totalCommissions < last2Periods[0].totalCommissions ? 'down' : 'flat'
        }
      : { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'flat' as const };
    
    const revenueTrend: TrendMetrics = last2Periods.length === 2 
      ? {
          current: last2Periods[1].grossRevenue,
          previous: last2Periods[0].grossRevenue,
          change: last2Periods[1].grossRevenue - last2Periods[0].grossRevenue,
          changePercent: ((last2Periods[1].grossRevenue - last2Periods[0].grossRevenue) / last2Periods[0].grossRevenue) * 100,
          trend: last2Periods[1].grossRevenue > last2Periods[0].grossRevenue ? 'up' : 
                 last2Periods[1].grossRevenue < last2Periods[0].grossRevenue ? 'down' : 'flat'
        }
      : { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'flat' as const };
    
    return {
      totalCommissions,
      averageCommission,
      peakPeriod,
      growthRate,
      transactionCount: totalTransactions,
      commissionTrend,
      revenueTrend
    };
  }, []);
  
  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      
      // TODO: Implement actual API call
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = generateMockData();
      const summaryData = calculateSummary(mockData);
      
      setCommissionData(mockData);
      setSummary(summaryData);
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [session?.user, generateMockData, calculateSummary]);
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);
  
  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  }, []);
  
  // Format percentage
  const formatPercentage = useCallback((rate: number, decimals: number = 1) => {
    return `${rate.toFixed(decimals)}%`;
  }, []);
  
  // Get trend icon
  const getTrendIcon = useCallback((trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon sx={{ color: 'success.main' }} />;
      case 'down': return <TrendingDownIcon sx={{ color: 'error.main' }} />;
      default: return <TrendingFlatIcon sx={{ color: 'text.secondary' }} />;
    }
  }, []);
  
  // Get trend color
  const getTrendColor = useCallback((trend: 'up' | 'down' | 'flat') => {
    switch (trend) {
      case 'up': return 'success.main';
      case 'down': return 'error.main';
      default: return 'text.secondary';
    }
  }, []);
  
  // Commission distribution data for pie chart
  const commissionDistribution = useMemo(() => {
    const totalCommissions = commissionData.reduce((sum, item) => sum + item.totalCommissions, 0);
    const quarterlyData = commissionData.reduce((acc, item) => {
      const quarter = `Q${Math.ceil(new Date(item.date).getMonth() / 3 + 1)} ${new Date(item.date).getFullYear()}`;
      acc[quarter] = (acc[quarter] || 0) + item.totalCommissions;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(quarterlyData).map(([quarter, amount]) => ({
      name: quarter,
      value: amount,
      percentage: totalCommissions > 0 ? (amount / totalCommissions) * 100 : 0
    }));
  }, [commissionData]);
  
  if (loading && (!summary || commissionData.length === 0)) {
    return (
      <Box className={className}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} md={6} lg={3} key={item}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={120} />
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={400} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    mr: 2
                  }}
                >
                  <EuroIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" color="primary.main">
                    {formatCurrency(summary?.totalCommissions || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Commissions
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getTrendIcon(summary?.commissionTrend.trend || 'flat')}
                  <Typography 
                    variant="caption" 
                    color={getTrendColor(summary?.commissionTrend.trend || 'flat')}
                    sx={{ ml: 0.5 }}
                  >
                    {formatPercentage(summary?.commissionTrend.changePercent || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'success.light',
                    color: 'success.main',
                    mr: 2
                  }}
                >
                  <BarChartIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(summary?.averageCommission || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Average Commission
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="textSecondary">
                    {summary?.transactionCount || 0} transactions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'warning.light',
                    color: 'warning.main',
                    mr: 2
                  }}
                >
                  <InsightsIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" color="warning.main">
                    {summary?.peakPeriod.period}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Peak Period
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    {formatCurrency(summary?.peakPeriod.amount || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'info.light',
                    color: 'info.main',
                    mr: 2
                  }}
                >
                  <TrendingUpIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" color="info.main">
                    {formatPercentage(summary?.growthRate || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Growth Rate
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getTrendIcon(summary?.revenueTrend.trend || 'flat')}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Analytics Interface */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Commission Analytics"
              action={
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    size="small"
                  >
                    Filters
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => setExportDialog(true)}
                    size="small"
                  >
                    Export
                  </Button>
                </Stack>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                  <Tab label="Trends" />
                  <Tab label="Distribution" />
                  <Tab label="Performance" />
                  <Tab label="Insights" />
                </Tabs>
              </Box>

              {/* Trends Tab */}
              <TabPanel value={activeTab} index={0}>
                <Typography variant="h6" gutterBottom>
                  Commission Trends Over Time
                </Typography>
                
                <Box sx={{ height: 400, mb: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={commissionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `€${(value / 100).toFixed(0)}`}
                      />
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Commission']}
                        labelStyle={{ color: '#333' }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="totalCommissions"
                        stroke={CHART_COLORS[0]}
                        fill={CHART_COLORS[0]}
                        fillOpacity={0.3}
                        name="Total Commissions"
                      />
                      <Area
                        type="monotone"
                        dataKey="averageCommission"
                        stroke={CHART_COLORS[1]}
                        fill={CHART_COLORS[1]}
                        fillOpacity={0.3}
                        name="Average Commission"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                {/* Month-over-Month Analysis */}
                <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Month-over-Month Analysis
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color={getTrendColor(summary?.commissionTrend.trend || 'flat')}>
                          {formatCurrency(summary?.commissionTrend.change || 0)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Commission Change
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color={getTrendColor(summary?.revenueTrend.trend || 'flat')}>
                          {formatPercentage(summary?.commissionTrend.changePercent || 0)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Percentage Change
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" color="info.main">
                          {formatCurrency(summary?.revenueTrend.change || 0)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Revenue Change
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </TabPanel>

              {/* Distribution Tab */}
              <TabPanel value={activeTab} index={1}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Commission Distribution by Quarter
                    </Typography>
                    
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={commissionDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            dataKey="value"
                            label={({ percentage }) => `${percentage.toFixed(1)}%`}
                          >
                            {commissionDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Commission']}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Commission vs Revenue
                    </Typography>
                    
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={commissionData.slice(-6)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `€${(value / 100).toFixed(0)}`}
                          />
                          <RechartsTooltip 
                            formatter={(value: number) => [`€${(value / 100).toFixed(0)}`, '']}
                          />
                          <Legend />
                          <Bar dataKey="totalCommissions" fill={CHART_COLORS[0]} name="Commissions" />
                          <Bar dataKey="grossRevenue" fill={CHART_COLORS[1]} name="Gross Revenue" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Performance Tab */}
              <TabPanel value={activeTab} index={2}>
                <Typography variant="h6" gutterBottom>
                  Commission Performance Metrics
                </Typography>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Period</TableCell>
                        <TableCell align="right">Commissions</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Average</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Growth</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {commissionData.slice(-12).map((row, index) => {
                        const previousRow = index > 0 ? commissionData[commissionData.length - 12 + index - 1] : null;
                        const growth = previousRow 
                          ? ((row.totalCommissions - previousRow.totalCommissions) / previousRow.totalCommissions) * 100 
                          : 0;
                        
                        return (
                          <TableRow key={row.date}>
                            <TableCell>{row.period}</TableCell>
                            <TableCell align="right">{formatCurrency(row.totalCommissions)}</TableCell>
                            <TableCell align="right">{row.commissionCount}</TableCell>
                            <TableCell align="right">{formatCurrency(row.averageCommission)}</TableCell>
                            <TableCell align="right">{formatPercentage(row.commissionRate)}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                {growth > 0 ? <ArrowUpIcon color="success" fontSize="small" /> :
                                 growth < 0 ? <ArrowDownIcon color="error" fontSize="small" /> :
                                 <RemoveIcon color="disabled" fontSize="small" />}
                                <Typography 
                                  variant="body2" 
                                  color={growth > 0 ? 'success.main' : growth < 0 ? 'error.main' : 'text.secondary'}
                                  sx={{ ml: 0.5 }}
                                >
                                  {formatPercentage(Math.abs(growth))}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Insights Tab */}
              <TabPanel value={activeTab} index={3}>
                <Typography variant="h6" gutterBottom>
                  Commission Insights & Recommendations
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Peak Performance
                      </Typography>
                      <Typography variant="body2">
                        Your best month was {summary?.peakPeriod.period} with {formatCurrency(summary?.peakPeriod.amount || 0)} in commissions.
                      </Typography>
                    </Alert>

                    <Alert severity={summary?.growthRate && summary.growthRate > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Growth Trend
                      </Typography>
                      <Typography variant="body2">
                        {summary?.growthRate && summary.growthRate > 0 
                          ? `Your commissions are growing at ${formatPercentage(summary.growthRate)} over the period.`
                          : 'Consider strategies to increase your commission growth rate.'
                        }
                      </Typography>
                    </Alert>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Key Metrics Summary
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Total Transactions:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {summary?.transactionCount}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Average Commission:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(summary?.averageCommission || 0)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Growth Rate:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatPercentage(summary?.growthRate || 0)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Recent Trend:</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getTrendIcon(summary?.commissionTrend.trend || 'flat')}
                            <Typography variant="body2" fontWeight="medium" sx={{ ml: 0.5 }}>
                              {formatPercentage(summary?.commissionTrend.changePercent || 0)}
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog
        open={exportDialog}
        onClose={() => setExportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Commission Analytics</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                defaultValue="csv"
                label="Export Format"
              >
                <MenuItem value="csv">CSV (Excel compatible)</MenuItem>
                <MenuItem value="pdf">PDF Report</MenuItem>
                <MenuItem value="json">JSON Data</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Data Range</InputLabel>
              <Select
                defaultValue="current"
                label="Data Range"
              >
                <MenuItem value="current">Current Period</MenuItem>
                <MenuItem value="last6months">Last 6 Months</MenuItem>
                <MenuItem value="lastyear">Last Year</MenuItem>
                <MenuItem value="all">All Data</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Include Charts and Visualizations"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default CommissionAnalytics;
