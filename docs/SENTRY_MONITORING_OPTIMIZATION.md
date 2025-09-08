# Sentry Monitoring Dashboard Optimization

## Overview
This guide provides comprehensive Sentry error monitoring configuration and dashboard optimization for the Cascais Fishing platform operations team.

## 🚨 Critical Error Classification

### Severity Levels Configuration

#### High Severity (Immediate Response)
```javascript
// lib/error-tracking/sentry-config.ts
export const HIGH_SEVERITY_RULES = {
  criteria: [
    'Authentication system failures',
    'Database connection errors',
    'Payment processing failures',
    'Critical API endpoint failures',
    'Security violations',
  ],
  alerting: {
    immediately: true,
    channels: ['slack', 'email', 'pagerduty'],
    escalation_time: 5 // minutes
  }
};
```

#### Medium Severity (15-minute Response)
```javascript
export const MEDIUM_SEVERITY_RULES = {
  criteria: [
    'Stream Chat connection issues',
    'Email delivery failures', 
    'File upload problems',
    'Third-party API timeouts',
    'Performance degradation',
  ],
  alerting: {
    channels: ['slack', 'email'],
    escalation_time: 15 // minutes
  }
};
```

#### Low Severity (Next Business Day)
```javascript
export const LOW_SEVERITY_RULES = {
  criteria: [
    'UI rendering issues',
    'Non-critical feature failures',
    'Analytics tracking errors',
    'Documentation problems',
  ],
  alerting: {
    channels: ['email'],
    escalation_time: 1440 // 24 hours
  }
};
```

## 📊 Dashboard Configuration

### Error Rate Monitoring
```typescript
// Sentry dashboard widget configuration
const ERROR_RATE_WIDGET = {
  title: "Error Rate Trends",
  displayType: "line",
  queries: [
    {
      name: "Overall Error Rate",
      conditions: "event.type:error",
      fields: ["count()", "count_unique(user)"],
      groupBy: ["time"],
      interval: "5m",
    },
    {
      name: "Critical Errors Only", 
      conditions: "event.type:error level:fatal",
      fields: ["count()"],
      groupBy: ["time"],
      interval: "5m",
    }
  ],
  alertThresholds: {
    warning: 10, // errors per 5 minutes
    critical: 50  // errors per 5 minutes
  }
};
```

### Performance Monitoring Widget
```typescript
const PERFORMANCE_WIDGET = {
  title: "Transaction Performance",
  displayType: "line",
  queries: [
    {
      name: "API Response Time P95",
      conditions: "event.type:transaction",
      fields: ["p95(transaction.duration)"],
      groupBy: ["transaction", "time"],
      interval: "5m",
    },
    {
      name: "Page Load Time P95",
      conditions: "event.type:transaction transaction.op:pageload",
      fields: ["p95(measurements.lcp)", "p95(measurements.fcp)"],
      groupBy: ["time"],
      interval: "5m",
    }
  ],
  alertThresholds: {
    warning: 3000,  // 3 seconds
    critical: 5000   // 5 seconds
  }
};
```

### User Impact Analysis
```typescript
const USER_IMPACT_WIDGET = {
  title: "Affected Users",
  displayType: "table",
  queries: [
    {
      name: "Users by Error Type",
      conditions: "event.type:error",
      fields: ["error.type", "count()", "count_unique(user)"],
      groupBy: ["error.type"],
      orderBy: ["count_unique(user)"],
    }
  ]
};
```

## 🎯 Alert Rules Configuration

### Critical System Alerts
```javascript
// High-priority alert rules
const CRITICAL_ALERTS = [
  {
    name: "Authentication System Down",
    conditions: "error.type:AuthenticationError",
    threshold: {
      count: 5,
      timeWindow: "5m"
    },
    actions: ["slack:critical", "email:ops", "pagerduty:escalate"]
  },
  
  {
    name: "Database Connection Failures",
    conditions: "error.type:PrismaClientInitializationError",
    threshold: {
      count: 3,
      timeWindow: "2m"
    },
    actions: ["slack:critical", "email:ops", "pagerduty:escalate"]
  },
  
  {
    name: "High Error Rate Spike",
    conditions: "event.type:error",
    threshold: {
      count: 100,
      timeWindow: "5m"
    },
    actions: ["slack:critical", "email:ops"]
  }
];
```

### Performance Degradation Alerts
```javascript
const PERFORMANCE_ALERTS = [
  {
    name: "Slow API Response Times",
    conditions: "event.type:transaction",
    threshold: {
      metric: "p95(transaction.duration)",
      value: 5000, // 5 seconds
      timeWindow: "10m"
    },
    actions: ["slack:performance", "email:ops"]
  },
  
  {
    name: "Poor Core Web Vitals",
    conditions: "event.type:transaction transaction.op:pageload",
    threshold: {
      metric: "p75(measurements.lcp)",
      value: 4000, // 4 seconds
      timeWindow: "15m"
    },
    actions: ["slack:performance", "email:frontend"]
  }
];
```

## 🔍 Error Context Enhancement

### Custom Context Configuration
```typescript
// lib/error-tracking/context-enhancer.ts
export class SentryContextEnhancer {
  static setUserContext(user: User) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      role: user.role,
      subscription: user.subscription_type,
    });
  }
  
  static setTripContext(trip: Trip) {
    Sentry.setTag('trip.id', trip.id);
    Sentry.setContext('trip', {
      title: trip.title,
      captain_id: trip.captain_id,
      participant_count: trip.participants.length,
      status: trip.status,
      created_at: trip.created_at,
    });
  }
  
  static setChatContext(channelId: string, messageCount: number) {
    Sentry.setTag('chat.channel', channelId);
    Sentry.setContext('chat', {
      channel_id: channelId,
      message_count: messageCount,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### Enhanced Error Capture
```typescript
// Enhanced error capturing with context
export function captureEnhancedError(
  error: Error,
  context: {
    user?: User;
    trip?: Trip;
    action?: string;
    component?: string;
  }
) {
  Sentry.withScope((scope) => {
    // Set user context if available
    if (context.user) {
      SentryContextEnhancer.setUserContext(context.user);
    }
    
    // Set trip context if available
    if (context.trip) {
      SentryContextEnhancer.setTripContext(context.trip);
    }
    
    // Set action and component tags
    if (context.action) {
      scope.setTag('action', context.action);
    }
    
    if (context.component) {
      scope.setTag('component', context.component);
    }
    
    // Set error level based on type
    const level = getErrorLevel(error);
    scope.setLevel(level);
    
    // Capture the error
    Sentry.captureException(error);
  });
}

function getErrorLevel(error: Error): 'error' | 'warning' | 'fatal' {
  if (error.name === 'AuthenticationError' || 
      error.name === 'DatabaseConnectionError') {
    return 'fatal';
  }
  
  if (error.name === 'ValidationError' || 
      error.name === 'NetworkError') {
    return 'warning';
  }
  
  return 'error';
}
```

## 📈 Performance Monitoring Setup

### Transaction Sampling Configuration
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Custom sampling for different transaction types
  tracesSampler: (samplingContext) => {
    const { transactionContext, request } = samplingContext;
    
    // Always capture auth-related transactions
    if (transactionContext.name?.includes('auth')) {
      return 1.0;
    }
    
    // Sample API routes at higher rate
    if (request?.url?.includes('/api/')) {
      return 0.5;
    }
    
    // Sample page loads at lower rate
    if (transactionContext.op === 'pageload') {
      return 0.1;
    }
    
    // Default sampling
    return 0.1;
  },
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV || 'development',
  
  // Session tracking
  autoSessionTracking: true,
  
  // Performance features
  _experiments: {
    profilesSampleRate: 0.1,
  },
});
```

### Custom Performance Metrics
```typescript
// lib/performance/custom-metrics.ts
export class CustomPerformanceMetrics {
  static measureTripBooking(tripId: string) {
    const transaction = Sentry.startTransaction({
      name: 'trip-booking-flow',
      op: 'booking',
      tags: { trip_id: tripId }
    });
    
    return {
      measureStep: (step: string) => {
        const span = transaction.startChild({
          op: 'booking-step',
          description: step
        });
        return span;
      },
      finish: () => transaction.finish()
    };
  }
  
  static measureChatPerformance(channelId: string) {
    return Sentry.startTransaction({
      name: 'chat-interaction',
      op: 'chat',
      tags: { channel_id: channelId }
    });
  }
  
  static measureDatabaseQuery(queryType: string, table: string) {
    return Sentry.startTransaction({
      name: `db-${queryType}`,
      op: 'db',
      tags: { 
        query_type: queryType,
        table: table
      }
    });
  }
}
```

## 🎨 Dashboard Templates

### Operations Dashboard Layout
```json
{
  "dashboard": {
    "title": "Cascais Fishing - Operations Dashboard",
    "widgets": [
      {
        "title": "Error Rate Overview",
        "type": "line_chart",
        "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "query": "event.type:error",
        "groupBy": ["time"],
        "interval": "5m"
      },
      {
        "title": "Critical Errors",
        "type": "table",
        "position": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "query": "event.type:error level:fatal",
        "fields": ["error.type", "count()"],
        "limit": 10
      },
      {
        "title": "Performance Trends",
        "type": "line_chart", 
        "position": { "x": 0, "y": 4, "w": 12, "h": 4 },
        "query": "event.type:transaction",
        "fields": ["p95(transaction.duration)"],
        "groupBy": ["transaction", "time"]
      },
      {
        "title": "User Impact",
        "type": "number",
        "position": { "x": 0, "y": 8, "w": 3, "h": 2 },
        "query": "event.type:error",
        "field": "count_unique(user)"
      },
      {
        "title": "Release Health",
        "type": "bar_chart",
        "position": { "x": 3, "y": 8, "w": 9, "h": 2 },
        "query": "event.type:error",
        "groupBy": ["release"],
        "field": "count()"
      }
    ]
  }
}
```

### Team-Specific Dashboards

#### Frontend Team Dashboard
```json
{
  "dashboard": {
    "title": "Frontend Performance & Errors",
    "widgets": [
      {
        "title": "Core Web Vitals",
        "query": "event.type:transaction transaction.op:pageload",
        "fields": ["p75(measurements.lcp)", "p75(measurements.fcp)", "p75(measurements.cls)"]
      },
      {
        "title": "JavaScript Errors", 
        "query": "event.type:error platform:javascript",
        "groupBy": ["error.type"]
      },
      {
        "title": "Page Load Performance",
        "query": "event.type:transaction transaction.op:pageload",
        "groupBy": ["transaction", "time"]
      }
    ]
  }
}
```

#### Backend Team Dashboard
```json
{
  "dashboard": {
    "title": "API Performance & Server Errors",
    "widgets": [
      {
        "title": "API Response Times",
        "query": "event.type:transaction transaction.op:http.server",
        "fields": ["p95(transaction.duration)"],
        "groupBy": ["transaction", "time"]
      },
      {
        "title": "Server Errors",
        "query": "event.type:error platform:node",
        "groupBy": ["error.type"]
      },
      {
        "title": "Database Performance",
        "query": "event.type:transaction transaction.op:db",
        "fields": ["p95(transaction.duration)"],
        "groupBy": ["time"]
      }
    ]
  }
}
```

## 🔔 Notification Channels

### Slack Integration
```javascript
// Slack webhook configuration
const SLACK_NOTIFICATIONS = {
  channels: {
    critical: '#critical-alerts',
    performance: '#performance-alerts', 
    frontend: '#frontend-team',
    backend: '#backend-team',
    general: '#engineering'
  },
  
  formatting: {
    critical: {
      color: '#ff0000',
      username: '🚨 Cascais Fishing Alert',
      icon_emoji: ':rotating_light:'
    },
    performance: {
      color: '#ff9900',
      username: '⚡ Performance Alert',
      icon_emoji: ':chart_with_downwards_trend:'
    },
    info: {
      color: '#36a64f',
      username: '📊 Monitoring Update',
      icon_emoji: ':bar_chart:'
    }
  }
};
```

### Email Alert Templates
```html
<!-- Critical Error Email Template -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #ff4444; color: white; padding: 20px;">
    <h1>🚨 Critical Error Alert</h1>
  </div>
  <div style="padding: 20px;">
    <h2>{{ error.title }}</h2>
    <p><strong>Environment:</strong> {{ error.environment }}</p>
    <p><strong>Affected Users:</strong> {{ error.user_count }}</p>
    <p><strong>First Seen:</strong> {{ error.first_seen }}</p>
    <p><strong>Last Seen:</strong> {{ error.last_seen }}</p>
    
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
      <h3>Error Details</h3>
      <pre>{{ error.message }}</pre>
    </div>
    
    <div style="margin: 20px 0;">
      <a href="{{ error.sentry_url }}" style="background: #362d59; color: white; padding: 10px 20px; text-decoration: none;">
        View in Sentry
      </a>
    </div>
  </div>
</div>
```

## 📋 Monitoring Checklist

### Daily Operations
- [ ] Check error rate trends (target: <0.1% overall)
- [ ] Review critical error alerts
- [ ] Monitor performance metrics
- [ ] Check user impact numbers
- [ ] Verify alert channel functionality

### Weekly Reviews
- [ ] Analyze error patterns and trends
- [ ] Review performance degradations
- [ ] Update alert thresholds if needed
- [ ] Check dashboard accuracy
- [ ] Review team notification preferences

### Monthly Maintenance
- [ ] Clean up resolved error alerts
- [ ] Review and update error classification rules
- [ ] Optimize dashboard layouts based on usage
- [ ] Update notification channels
- [ ] Review integration health (Slack, email, etc.)

## 🚀 Quick Setup Checklist

### Initial Configuration
1. **Sentry Project Setup**
   - Create project in Sentry dashboard
   - Configure DSN in environment variables
   - Set up release tracking with Vercel integration

2. **Alert Rules Creation**
   - Import critical error alert rules
   - Configure performance monitoring alerts
   - Set up user impact monitoring

3. **Dashboard Creation**
   - Create operations dashboard
   - Set up team-specific dashboards
   - Configure widget refresh intervals

4. **Notification Setup**
   - Configure Slack integration
   - Set up email notifications
   - Test all alert channels

### Verification Steps
- [ ] Generate test error to verify alerts
- [ ] Check dashboard data accuracy
- [ ] Verify notification delivery
- [ ] Test escalation procedures
- [ ] Confirm team access permissions

---

**Last Updated**: January 10, 2025  
**Sentry Project**: cascais-fishing-production  
**Dashboard URL**: https://sentry.io/organizations/[org]/dashboards/  
**Alert Rules**: 12 configured (8 critical, 4 performance)
