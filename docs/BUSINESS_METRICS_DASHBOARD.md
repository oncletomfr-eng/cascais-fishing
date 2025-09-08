# Business Metrics Dashboard - Cascais Fishing Platform

## Overview
This document defines the business metrics dashboard configuration for stakeholders to monitor user engagement, platform health, and key business KPIs.

## 📊 Key Performance Indicators (KPIs)

### User Engagement Metrics

#### Active User Tracking
```typescript
// lib/analytics/business-metrics.ts
export class BusinessMetricsTracker {
  static trackUserSession(userId: string, sessionData: {
    loginTime: Date;
    userAgent: string;
    referrer?: string;
    features_used: string[];
  }) {
    // Track for business analytics
    if (typeof window !== 'undefined' && window.va) {
      window.va('track', 'User Session', {
        user_id: userId,
        session_duration: sessionData.loginTime,
        features_count: sessionData.features_used.length,
        platform: this.getPlatformType(sessionData.userAgent),
      });
    }
  }
  
  static trackFeatureUsage(featureName: string, userId: string, metadata?: any) {
    if (typeof window !== 'undefined' && window.va) {
      window.va('track', 'Feature Usage', {
        feature: featureName,
        user_id: userId,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
    }
  }
  
  private static getPlatformType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
    if (/Mobile|Android|iPhone/i.test(userAgent)) return 'mobile';
    if (/Tablet|iPad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }
}
```

#### User Retention Analysis
```typescript
export interface UserRetentionMetrics {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  retention_rates: {
    day_1: number;
    day_7: number;
    day_30: number;
  };
  churn_rate: number;
  user_lifetime_value: number;
}

export class RetentionTracker {
  static async calculateRetentionMetrics(timeframe: string): Promise<UserRetentionMetrics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (timeframe === 'monthly' ? 30 : 7));
    
    const metrics = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN last_active >= CURRENT_DATE - INTERVAL '1 day' 
          THEN user_id END) as daily_active_users,
        COUNT(DISTINCT CASE 
          WHEN last_active >= CURRENT_DATE - INTERVAL '7 days' 
          THEN user_id END) as weekly_active_users,
        COUNT(DISTINCT CASE 
          WHEN last_active >= CURRENT_DATE - INTERVAL '30 days' 
          THEN user_id END) as monthly_active_users
      FROM user_sessions 
      WHERE created_at >= ${startDate}
    `;
    
    return metrics as UserRetentionMetrics;
  }
}
```

### Trip Booking Metrics

#### Conversion Funnel Tracking
```typescript
export interface TripBookingFunnel {
  page_views: number;
  trip_detail_views: number;
  booking_initiated: number;
  booking_completed: number;
  conversion_rates: {
    view_to_detail: number;
    detail_to_booking: number;
    booking_completion: number;
    overall_conversion: number;
  };
}

export class BookingMetricsTracker {
  static trackBookingFunnel(step: 'view' | 'detail' | 'initiate' | 'complete', tripId: string) {
    BusinessMetricsTracker.trackFeatureUsage('booking_funnel', step, {
      trip_id: tripId,
      step: step,
      timestamp: new Date().toISOString(),
    });
  }
  
  static async calculateConversionRates(timeframe: string): Promise<TripBookingFunnel> {
    // Implementation would query analytics data
    const funnel = await this.queryBookingFunnelData(timeframe);
    
    return {
      ...funnel,
      conversion_rates: {
        view_to_detail: funnel.trip_detail_views / funnel.page_views,
        detail_to_booking: funnel.booking_initiated / funnel.trip_detail_views,
        booking_completion: funnel.booking_completed / funnel.booking_initiated,
        overall_conversion: funnel.booking_completed / funnel.page_views,
      }
    };
  }
}
```

### Chat & Community Engagement

#### Community Activity Metrics
```typescript
export interface CommunityMetrics {
  active_chat_users: number;
  messages_sent: number;
  files_shared: number;
  average_session_length: number;
  most_active_channels: Array<{
    channel_id: string;
    channel_name: string;
    message_count: number;
    unique_users: number;
  }>;
  user_engagement_score: number;
}

export class CommunityMetricsTracker {
  static trackChatEngagement(channelId: string, userId: string, action: string) {
    BusinessMetricsTracker.trackFeatureUsage('chat_engagement', userId, {
      channel_id: channelId,
      action: action,
      platform: this.detectPlatform(),
    });
  }
  
  static async getCommunityHealthScore(): Promise<number> {
    const metrics = await this.getCommunityMetrics('weekly');
    
    // Calculate engagement score based on multiple factors
    const engagementScore = (
      (metrics.active_chat_users / metrics.messages_sent) * 0.3 +
      (metrics.average_session_length / 3600) * 0.2 + // Convert to hours
      (metrics.files_shared / metrics.messages_sent) * 0.2 +
      (metrics.most_active_channels.length / 10) * 0.3
    ) * 100;
    
    return Math.min(100, engagementScore);
  }
}
```

## 📈 Dashboard Configuration

### Executive Summary Dashboard
```json
{
  "dashboard": {
    "title": "Cascais Fishing - Executive Summary",
    "refresh_interval": "15m",
    "widgets": [
      {
        "id": "total_active_users",
        "type": "metric",
        "title": "Active Users (30d)",
        "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
        "metric": "monthly_active_users",
        "format": "number",
        "color": "#4CAF50"
      },
      {
        "id": "user_growth_trend",
        "type": "line_chart",
        "title": "User Growth Trend",
        "position": { "x": 3, "y": 0, "w": 6, "h": 4 },
        "metrics": ["daily_active_users", "weekly_active_users"],
        "timeframe": "30d",
        "interval": "1d"
      },
      {
        "id": "platform_health_score",
        "type": "gauge",
        "title": "Platform Health Score",
        "position": { "x": 9, "y": 0, "w": 3, "h": 4 },
        "metric": "overall_health_score",
        "min": 0,
        "max": 100,
        "thresholds": {
          "red": 60,
          "yellow": 80,
          "green": 90
        }
      },
      {
        "id": "trip_bookings",
        "type": "metric",
        "title": "Trips Booked (7d)",
        "position": { "x": 0, "y": 2, "w": 3, "h": 2 },
        "metric": "weekly_trip_bookings",
        "format": "number",
        "color": "#2196F3"
      },
      {
        "id": "conversion_funnel",
        "type": "funnel",
        "title": "Booking Conversion Funnel",
        "position": { "x": 0, "y": 4, "w": 6, "h": 4 },
        "steps": [
          { "name": "Page Views", "metric": "page_views" },
          { "name": "Trip Details", "metric": "trip_detail_views" },
          { "name": "Booking Started", "metric": "booking_initiated" },
          { "name": "Booking Completed", "metric": "booking_completed" }
        ]
      },
      {
        "id": "user_satisfaction",
        "type": "metric",
        "title": "User Satisfaction Score",
        "position": { "x": 6, "y": 4, "w": 3, "h": 2 },
        "metric": "nps_score",
        "format": "percentage",
        "color": "#FF9800"
      },
      {
        "id": "revenue_trend",
        "type": "bar_chart",
        "title": "Monthly Revenue Trend",
        "position": { "x": 9, "y": 4, "w": 3, "h": 4 },
        "metric": "monthly_revenue",
        "timeframe": "6m",
        "interval": "1m"
      }
    ]
  }
}
```

### User Engagement Dashboard
```json
{
  "dashboard": {
    "title": "User Engagement Analytics",
    "widgets": [
      {
        "id": "user_activity_heatmap",
        "type": "heatmap",
        "title": "User Activity by Hour & Day",
        "position": { "x": 0, "y": 0, "w": 8, "h": 4 },
        "metric": "user_sessions_by_time",
        "x_axis": "hour_of_day",
        "y_axis": "day_of_week"
      },
      {
        "id": "feature_adoption",
        "type": "horizontal_bar",
        "title": "Feature Adoption Rates",
        "position": { "x": 8, "y": 0, "w": 4, "h": 4 },
        "metrics": [
          "chat_usage",
          "trip_booking",
          "profile_completion",
          "photo_upload",
          "weather_check"
        ]
      },
      {
        "id": "user_journey_flow",
        "type": "sankey",
        "title": "User Journey Flow",
        "position": { "x": 0, "y": 4, "w": 12, "h": 4 },
        "source_metric": "page_visits",
        "target_metric": "next_page_visits",
        "flow_metric": "transition_count"
      },
      {
        "id": "retention_cohorts",
        "type": "cohort_table",
        "title": "User Retention Cohorts",
        "position": { "x": 0, "y": 8, "w": 12, "h": 4 },
        "metric": "user_retention_by_signup_date",
        "periods": ["day_1", "day_7", "day_14", "day_30", "day_60", "day_90"]
      }
    ]
  }
}
```

### Community Health Dashboard
```json
{
  "dashboard": {
    "title": "Community & Chat Health",
    "widgets": [
      {
        "id": "chat_activity_timeline",
        "type": "area_chart",
        "title": "Chat Activity Timeline",
        "position": { "x": 0, "y": 0, "w": 8, "h": 4 },
        "metrics": ["messages_sent", "active_users", "files_shared"],
        "timeframe": "7d",
        "interval": "1h"
      },
      {
        "id": "community_health_score",
        "type": "gauge",
        "title": "Community Health Score",
        "position": { "x": 8, "y": 0, "w": 4, "h": 4 },
        "metric": "community_engagement_score",
        "thresholds": { "red": 40, "yellow": 70, "green": 85 }
      },
      {
        "id": "most_active_channels",
        "type": "table",
        "title": "Most Active Channels",
        "position": { "x": 0, "y": 4, "w": 6, "h": 4 },
        "columns": ["channel_name", "message_count", "unique_users", "avg_response_time"],
        "sort_by": "message_count",
        "limit": 10
      },
      {
        "id": "user_participation_distribution",
        "type": "pie_chart",
        "title": "User Participation Distribution",
        "position": { "x": 6, "y": 4, "w": 6, "h": 4 },
        "metric": "users_by_activity_level",
        "segments": ["highly_active", "moderately_active", "low_activity", "lurkers"]
      }
    ]
  }
}
```

## 📊 Automated Reporting

### Weekly Business Report
```typescript
// lib/reporting/weekly-business-report.ts
export class WeeklyBusinessReporter {
  static async generateWeeklyReport(): Promise<WeeklyReport> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const metrics = await Promise.all([
      this.getUserMetrics(weekStart),
      this.getTripBookingMetrics(weekStart),
      this.getCommunityMetrics(weekStart),
      this.getPerformanceMetrics(weekStart),
    ]);
    
    return {
      period: { start: weekStart, end: new Date() },
      user_growth: metrics[0],
      booking_performance: metrics[1],
      community_health: metrics[2],
      platform_performance: metrics[3],
      key_insights: await this.generateInsights(metrics),
      action_items: await this.generateActionItems(metrics),
    };
  }
  
  static async emailReport(recipients: string[]) {
    const report = await this.generateWeeklyReport();
    
    // Send formatted email report
    await emailService.sendTemplate('weekly_business_report', {
      recipients,
      data: report,
      attachments: [
        await this.generatePDFReport(report)
      ]
    });
  }
}
```

### Monthly Executive Summary
```typescript
export interface ExecutiveSummary {
  headline_metrics: {
    user_growth_rate: number;
    booking_conversion_rate: number;
    revenue_growth: number;
    platform_uptime: number;
  };
  achievements: string[];
  challenges: string[];
  upcoming_initiatives: string[];
  budget_performance: {
    allocated: number;
    spent: number;
    remaining: number;
  };
}

export class ExecutiveReporter {
  static async generateMonthlySummary(): Promise<ExecutiveSummary> {
    // Implementation would aggregate monthly data
    return {
      headline_metrics: {
        user_growth_rate: await this.calculateUserGrowth('monthly'),
        booking_conversion_rate: await this.calculateConversionRate('monthly'),
        revenue_growth: await this.calculateRevenueGrowth('monthly'),
        platform_uptime: await this.calculateUptime('monthly'),
      },
      achievements: await this.getMonthlyAchievements(),
      challenges: await this.identifyChallenges(),
      upcoming_initiatives: await this.getUpcomingInitiatives(),
      budget_performance: await this.getBudgetPerformance(),
    };
  }
}
```

## 🎯 Success Metrics & Targets

### Key Performance Targets
```typescript
export const BUSINESS_TARGETS = {
  user_engagement: {
    monthly_active_users: { target: 1000, current: 0, trend: 'up' },
    daily_active_users: { target: 150, current: 0, trend: 'up' },
    user_retention_day_7: { target: 0.6, current: 0, trend: 'up' },
    user_retention_day_30: { target: 0.3, current: 0, trend: 'up' },
  },
  
  booking_performance: {
    conversion_rate: { target: 0.05, current: 0, trend: 'up' },
    average_booking_value: { target: 150, current: 0, trend: 'up' },
    repeat_booking_rate: { target: 0.4, current: 0, trend: 'up' },
    booking_completion_rate: { target: 0.8, current: 0, trend: 'up' },
  },
  
  community_health: {
    community_health_score: { target: 80, current: 0, trend: 'up' },
    average_session_length: { target: 1800, current: 0, trend: 'up' }, // 30 minutes
    messages_per_active_user: { target: 5, current: 0, trend: 'up' },
    user_satisfaction_score: { target: 85, current: 0, trend: 'up' },
  },
  
  platform_performance: {
    uptime_percentage: { target: 99.9, current: 0, trend: 'stable' },
    average_response_time: { target: 300, current: 0, trend: 'down' }, // ms
    error_rate: { target: 0.001, current: 0, trend: 'down' },
    core_web_vitals_score: { target: 90, current: 0, trend: 'up' },
  },
};
```

### Alert Thresholds for Business Metrics
```typescript
export const BUSINESS_ALERTS = {
  critical: [
    { metric: 'daily_active_users', threshold: -20, type: 'percentage_drop' },
    { metric: 'booking_conversion_rate', threshold: -30, type: 'percentage_drop' },
    { metric: 'platform_uptime', threshold: 99.5, type: 'below_threshold' },
    { metric: 'user_satisfaction_score', threshold: 70, type: 'below_threshold' },
  ],
  
  warning: [
    { metric: 'weekly_active_users', threshold: -10, type: 'percentage_drop' },
    { metric: 'community_health_score', threshold: 65, type: 'below_threshold' },
    { metric: 'average_response_time', threshold: 500, type: 'above_threshold' },
    { metric: 'user_retention_day_7', threshold: -15, type: 'percentage_drop' },
  ],
};
```

## 🔗 Integration Points

### Data Sources
- **Vercel Analytics**: Page views, user sessions, performance metrics
- **Database**: User registrations, trip bookings, community activity
- **Stream Chat**: Message volume, user engagement, channel activity
- **Sentry**: Error rates, performance monitoring, user experience
- **Custom Analytics**: Feature usage, conversion funnels, retention data

### External Tools Integration
- **Google Analytics**: Website traffic and user behavior
- **Mixpanel**: Advanced user analytics and cohort analysis
- **Amplitude**: Product analytics and user journey mapping
- **Hotjar**: User experience and heatmap analysis

## 📱 Mobile Dashboard Access

### Responsive Dashboard Design
```css
/* Business dashboard mobile styles */
.business-dashboard {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

@media (max-width: 768px) {
  .dashboard-widget {
    grid-column: span 12;
    min-height: 200px;
  }
  
  .metric-widget {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
  }
  
  .chart-widget {
    overflow-x: auto;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard-widget {
    grid-column: span 6;
  }
}

@media (min-width: 1025px) {
  .dashboard-widget {
    grid-column: span 3;
  }
}
```

## 📋 Stakeholder Access & Permissions

### Role-Based Dashboard Access
```typescript
export const DASHBOARD_PERMISSIONS = {
  executive: {
    dashboards: ['executive_summary', 'financial_overview', 'strategic_metrics'],
    widgets: ['all'],
    export: true,
    sharing: true,
  },
  
  product_manager: {
    dashboards: ['user_engagement', 'feature_adoption', 'conversion_metrics'],
    widgets: ['user_metrics', 'feature_metrics', 'conversion_metrics'],
    export: true,
    sharing: false,
  },
  
  marketing: {
    dashboards: ['user_acquisition', 'campaign_performance', 'user_engagement'],
    widgets: ['acquisition_metrics', 'campaign_metrics', 'engagement_metrics'],
    export: true,
    sharing: false,
  },
  
  operations: {
    dashboards: ['platform_health', 'community_health', 'support_metrics'],
    widgets: ['performance_metrics', 'error_metrics', 'user_support'],
    export: false,
    sharing: false,
  },
};
```

---

**Dashboard Access**: [Business Dashboard URL]  
**Update Frequency**: Real-time (15-minute intervals)  
**Data Retention**: 2 years  
**Export Formats**: PDF, CSV, JSON  
**Last Updated**: January 10, 2025
