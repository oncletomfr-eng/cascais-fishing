/**
 * Commission Breakdown Analysis Component
 * Task 6.3: Commission Breakdown Analysis
 * 
 * Detailed commission analysis with breakdowns by service type, captain tier, 
 * and time periods including pie charts, trend analysis, and payout transparency
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  TreeMap, RadialBarChart, RadialBar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  PieChart as PieChartIcon,
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Calculator,
  Download,
  RefreshCw,
  Info,
  Eye,
  EyeOff,
  Settings2,
  BarChart3,
  LineChart as LineChartIcon,
  Filter,
  ArrowUp,
  ArrowDown,
  Percent,
  Target,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Types for commission data
export interface ServiceTypeBreakdown {
  serviceType: 'tours' | 'courses' | 'advertising' | 'other';
  serviceName: string;
  totalCommission: number;
  percentage: number;
  count: number;
  averageCommission: number;
  color: string;
}

export interface CaptainTierBreakdown {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  tierName: string;
  captainCount: number;
  totalCommission: number;
  averageCommission: number;
  commissionRate: number;
  percentage: number;
  color: string;
}

export interface CommissionTrendPoint {
  date: string;
  timestamp: Date;
  totalCommission: number;
  tourCommissions: number;
  courseCommissions: number;
  advertisingCommissions: number;
  captainCount: number;
  averagePerCaptain: number;
}

export interface PayoutHistory {
  id: string;
  payoutDate: Date;
  captainId: string;
  captainName: string;
  totalAmount: number;
  commissionAmount: number;
  feeAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: string;
  transactionId?: string;
}

export interface CommissionCalculation {
  serviceId: string;
  serviceType: string;
  serviceName: string;
  baseAmount: number;
  commissionRate: number;
  captainTier: string;
  tierMultiplier: number;
  finalCommission: number;
  platformFee: number;
  netPayout: number;
  timestamp: Date;
}

export interface CommissionAnalyticsData {
  serviceBreakdown: ServiceTypeBreakdown[];
  tierBreakdown: CaptainTierBreakdown[];
  trends: CommissionTrendPoint[];
  payoutHistory: PayoutHistory[];
  calculations: CommissionCalculation[];
  summary: {
    totalCommissions: number;
    totalPayouts: number;
    pendingPayouts: number;
    averageCommissionRate: number;
    topServiceType: string;
    topTier: string;
    monthlyGrowth: number;
    totalCaptains: number;
    activeServices: number;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface CommissionBreakdownAnalysisProps {
  data: CommissionAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDateRangeChange?: (start: Date, end: Date) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf', section: string) => void;
  className?: string;
}

// Color schemes for different breakdown types
const serviceColors = {
  tours: '#3B82F6',      // Blue
  courses: '#10B981',    // Green  
  advertising: '#F59E0B', // Amber
  other: '#8B5CF6'       // Purple
};

const tierColors = {
  bronze: '#CD7F32',     // Bronze
  silver: '#C0C0C0',     // Silver
  gold: '#FFD700',       // Gold
  platinum: '#E5E4E2',   // Platinum
  diamond: '#B9F2FF'     // Diamond
};

export function CommissionBreakdownAnalysis({
  data,
  loading = false,
  error = null,
  onRefresh,
  onDateRangeChange,
  onExport,
  className = ''
}: CommissionBreakdownAnalysisProps) {
  // State management
  const [activeTab, setActiveTab] = useState('breakdown');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [showPercentages, setShowPercentages] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [sortBy, setSortBy] = useState<'amount' | 'percentage' | 'count'>('amount');

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!data) return null;

    const serviceData = selectedServiceType === 'all' 
      ? data.serviceBreakdown 
      : data.serviceBreakdown.filter(item => item.serviceType === selectedServiceType);

    const tierData = selectedTier === 'all'
      ? data.tierBreakdown
      : data.tierBreakdown.filter(item => item.tier === selectedTier);

    return {
      ...data,
      serviceBreakdown: serviceData,
      tierBreakdown: tierData
    };
  }, [data, selectedServiceType, selectedTier]);

  // Custom tooltip components
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      >
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              ${entry.value?.toLocaleString()}
            </span>
            {showPercentages && entry.payload.percentage && (
              <span className="text-gray-500">
                ({entry.payload.percentage.toFixed(1)}%)
              </span>
            )}
          </div>
        ))}
      </motion.div>
    );
  };

  // Service type breakdown pie chart
  const ServiceBreakdownChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={filteredData?.serviceBreakdown || []}
          dataKey="totalCommission"
          nameKey="serviceName"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          paddingAngle={2}
          animationBegin={0}
          animationDuration={1000}
        >
          {filteredData?.serviceBreakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        {showTooltips && <Tooltip content={<CustomTooltip />} />}
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value, entry) => showPercentages && entry.payload ? 
            `${value} (${entry.payload.percentage?.toFixed(1)}%)` : value
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );

  // Captain tier breakdown radial chart
  const TierBreakdownChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="20%"
        outerRadius="90%"
        data={filteredData?.tierBreakdown || []}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar 
          dataKey="totalCommission" 
          cornerRadius={4} 
          fill="url(#colorTier)"
          animationBegin={0}
          animationDuration={1200}
        />
        {showTooltips && <Tooltip content={<CustomTooltip />} />}
        <Legend 
          iconSize={18}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          formatter={(value, entry) => (
            <span style={{ color: entry.color }}>
              {value} {showPercentages && entry.payload ? 
                `(${entry.payload.percentage?.toFixed(1)}%)` : ''}
            </span>
          )}
        />
        <defs>
          <linearGradient id="colorTier" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.6}/>
          </linearGradient>
        </defs>
      </RadialBarChart>
    </ResponsiveContainer>
  );

  // Commission trends line chart
  const CommissionTrendsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={filteredData?.trends || []}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />
        {showTooltips && <Tooltip content={<CustomTooltip />} />}
        <Legend />
        <Line
          type="monotone"
          dataKey="totalCommission"
          name="Total Commission"
          stroke={serviceColors.tours}
          strokeWidth={3}
          dot={{ r: 4 }}
          animationDuration={1000}
        />
        <Line
          type="monotone"
          dataKey="tourCommissions"
          name="Tour Commissions"
          stroke={serviceColors.tours}
          strokeWidth={2}
          strokeDasharray="5 5"
          animationDuration={1200}
        />
        <Line
          type="monotone"
          dataKey="courseCommissions"
          name="Course Commissions"
          stroke={serviceColors.courses}
          strokeWidth={2}
          strokeDasharray="5 5"
          animationDuration={1400}
        />
        <Line
          type="monotone"
          dataKey="advertisingCommissions"
          name="Advertising Commissions"
          stroke={serviceColors.advertising}
          strokeWidth={2}
          strokeDasharray="5 5"
          animationDuration={1600}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // Payout history table component
  const PayoutHistoryTable = () => (
    <div className="space-y-4">
      {filteredData?.payoutHistory.slice(0, 10).map((payout) => (
        <motion.div
          key={payout.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              payout.status === 'completed' ? 'bg-green-100 text-green-600' :
              payout.status === 'processing' ? 'bg-blue-100 text-blue-600' :
              payout.status === 'failed' ? 'bg-red-100 text-red-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
              {payout.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
               payout.status === 'processing' ? <Clock className="w-5 h-5" /> :
               payout.status === 'failed' ? <XCircle className="w-5 h-5" /> :
               <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {payout.captainName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {format(payout.payoutDate, 'MMM dd, yyyy')} • {payout.payoutMethod}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              ${payout.totalAmount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Commission: ${payout.commissionAmount.toLocaleString()}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Commission calculation transparency
  const CommissionTransparency = () => (
    <div className="space-y-4">
      {filteredData?.calculations.slice(0, 5).map((calc, index) => (
        <motion.div
          key={calc.serviceId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {calc.serviceName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {calc.serviceType} • {calc.captainTier} Tier
              </p>
            </div>
            <Badge variant={calc.serviceType === 'tours' ? 'default' : 'secondary'}>
              {calc.serviceType}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Base Amount:</span>
              <span>${calc.baseAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Commission Rate ({calc.commissionRate}%):
              </span>
              <span>${(calc.baseAmount * calc.commissionRate / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Tier Multiplier ({calc.tierMultiplier}x):
              </span>
              <span className={calc.tierMultiplier > 1 ? 'text-green-600' : ''}>
                +${((calc.baseAmount * calc.commissionRate / 100) * (calc.tierMultiplier - 1)).toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Final Commission:</span>
              <span className="text-green-600">${calc.finalCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Platform Fee:</span>
              <span>-${calc.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Net Payout:</span>
              <span className="text-blue-600">${calc.netPayout.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Commission Analysis
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Detailed breakdown of commissions by service type and captain tier
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => onExport?.('png', activeTab)}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {filteredData?.summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Commissions
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${filteredData.summary.totalCommissions.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Captains
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredData.summary.totalCaptains}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Commission Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredData.summary.averageCommissionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Percent className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Monthly Growth
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    {filteredData.summary.monthlyGrowth > 0 ? 
                      <ArrowUp className="w-5 h-5 text-green-500" /> : 
                      <ArrowDown className="w-5 h-5 text-red-500" />
                    }
                    {Math.abs(filteredData.summary.monthlyGrowth).toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main analysis tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="breakdown" className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <LineChartIcon className="w-4 h-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="transparency" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculations
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="tours">Tours</SelectItem>
                <SelectItem value="courses">Courses</SelectItem>
                <SelectItem value="advertising">Advertising</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Service & Tier Breakdown */}
        <TabsContent value="breakdown" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Commission by Service Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : error ? (
                  <div className="h-[300px] flex items-center justify-center text-red-500">
                    Error loading data
                  </div>
                ) : (
                  <ServiceBreakdownChart />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Commission by Captain Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : error ? (
                  <div className="h-[300px] flex items-center justify-center text-red-500">
                    Error loading data
                  </div>
                ) : (
                  <TierBreakdownChart />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Breakdown statistics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData?.serviceBreakdown.map((service) => (
                    <div key={service.serviceType} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        <div>
                          <div className="font-medium capitalize">{service.serviceName}</div>
                          <div className="text-sm text-gray-500">
                            {service.count} bookings
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${service.totalCommission.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {service.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tier Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData?.tierBreakdown.map((tier) => (
                    <div key={tier.tier} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tier.color }}
                        />
                        <div>
                          <div className="font-medium capitalize">{tier.tierName}</div>
                          <div className="text-sm text-gray-500">
                            {tier.captainCount} captains • {tier.commissionRate}% rate
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${tier.totalCommission.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${tier.averageCommission.toLocaleString()} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commission Trends */}
        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 w-5" />
                Commission Trends Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="h-[300px] flex items-center justify-center text-red-500">
                  Error loading data
                </div>
              ) : (
                <CommissionTrendsChart />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout History */}
        <TabsContent value="payouts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Payout History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="h-[300px] flex items-center justify-center text-red-500">
                  Error loading data
                </div>
              ) : (
                <PayoutHistoryTable />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Calculations */}
        <TabsContent value="transparency" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Commission Calculation Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="h-[300px] flex items-center justify-center text-red-500">
                  Error loading data
                </div>
              ) : (
                <CommissionTransparency />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chart controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Display Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-percentages"
                checked={showPercentages}
                onCheckedChange={setShowPercentages}
              />
              <Label htmlFor="show-percentages" className="text-sm">Show Percentages</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-tooltips"
                checked={showTooltips}
                onCheckedChange={setShowTooltips}
              />
              <Label htmlFor="show-tooltips" className="text-sm">Show Tooltips</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
              <Label htmlFor="compact-mode" className="text-sm">Compact Mode</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default CommissionBreakdownAnalysis;
