# 🔔 Vercel Monitoring & Alerts Configuration

Рекомендованные настройки для мониторинга и alerting в Vercel Dashboard.

## 📊 Analytics Components Status

- ✅ **Speed Insights**: Установлен в `app/layout.tsx`
- ✅ **Web Analytics**: Установлен с production-only условием
- ✅ **Health Check**: Доступен на `/api/admin/health`

## 🚨 Alert Thresholds Configuration

### Function Performance Alerts

#### Response Time Thresholds
```json
{
  "function_duration": {
    "warning": 1000,     // 1 second
    "critical": 3000,    // 3 seconds
    "description": "Function execution time"
  },
  "cold_start_rate": {
    "warning": 30,       // 30% cold starts
    "critical": 50,      // 50% cold starts  
    "description": "Percentage of cold starts"
  }
}
```

#### Error Rate Thresholds
```json
{
  "error_rate": {
    "warning": 1,        // 1% error rate
    "critical": 5,       // 5% error rate
    "description": "Percentage of failed requests"
  },
  "5xx_errors": {
    "warning": 0.5,      // 0.5% server errors
    "critical": 2,       // 2% server errors
    "description": "Server-side error rate"
  }
}
```

#### Memory Usage Thresholds
```json
{
  "memory_usage": {
    "warning": 80,       // 80% of allocated memory
    "critical": 95,      // 95% of allocated memory
    "description": "Memory consumption percentage"
  },
  "memory_limit_hits": {
    "warning": 1,        // Any memory limit exceeded
    "critical": 5,       // Multiple memory limit hits
    "description": "Function memory limit violations"
  }
}
```

### Database Performance Alerts

#### Connection Health
```json
{
  "db_response_time": {
    "warning": 500,      // 500ms database queries
    "critical": 2000,    // 2 second database queries
    "description": "Database query response time"
  },
  "connection_pool": {
    "warning": 80,       // 80% pool utilization
    "critical": 95,      // 95% pool utilization
    "description": "Database connection pool usage"
  }
}
```

### API Health Check Integration

#### Health Endpoint Monitoring
```json
{
  "health_check": {
    "endpoint": "/api/admin/health",
    "frequency": "1min",
    "timeout": 10000,
    "expected_status": [200, 503],
    "alerts": {
      "unhealthy_duration": 300,    // 5 minutes unhealthy
      "degraded_duration": 900      // 15 minutes degraded
    }
  }
}
```

## 📈 Key Metrics to Monitor

### 1. Function Performance
- **Duration P95**: 95th percentile of function execution time
- **Cold Start Rate**: Percentage of requests hitting cold functions
- **Memory Usage**: Peak memory consumption per function
- **Invocations**: Request volume and patterns

### 2. Error Tracking
- **Error Rate**: Percentage of failed requests
- **Error Types**: 4xx vs 5xx error distribution
- **Error Patterns**: Common error messages and stack traces

### 3. Database Health
- **Query Performance**: Slow query detection
- **Connection Health**: Pool exhaustion and timeouts
- **Critical Table Status**: Availability of essential tables

### 4. User Experience
- **Page Load Time**: Speed Insights metrics
- **Core Web Vitals**: LCP, FID, CLS scores
- **Geographic Performance**: Regional response times

## 🔧 Vercel Dashboard Configuration Steps

### 1. Enable Monitoring Features
1. Go to Vercel Dashboard → Project Settings
2. Navigate to **Functions** tab
3. Enable **Analytics** and **Speed Insights**
4. Configure **Web Analytics** for frontend metrics

### 2. Set Up Function Alerts
```bash
# Navigate to: Dashboard → Project → Functions → [Function Name]
# Configure alerts for:
- Function Duration > 3000ms
- Error Rate > 5%
- Memory Usage > 95%
- Cold Start Rate > 50%
```

### 3. Database Monitoring Integration
```bash
# Health check endpoint: /api/admin/health
# Monitor for:
- HTTP 503 responses (unhealthy status)
- Response time > 2000ms
- Missing critical tables
```

### 4. Notification Channels
- **Slack Integration**: #alerts channel
- **Email Notifications**: ops-team@cascaisfishing.com
- **PagerDuty**: For critical production issues
- **Discord Webhook**: Development team notifications

## 📱 Health Check Response Schema

Our health endpoint returns detailed metrics:

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      connectionPool: {
        total: number;
        active: number;
        idle: number;
      };
    };
    api: {
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
    };
  };
}
```

## 🎯 Recommended Alert Actions

### Immediate Response (Critical Alerts)
1. **Function Timeout**: Scale up memory or optimize code
2. **Database Unavailable**: Check connection strings and pool limits
3. **Memory Limit Hit**: Increase function memory allocation
4. **High Error Rate**: Review recent deployments and rollback if needed

### Investigation Required (Warning Alerts)
1. **Slow Response Times**: Profile function performance
2. **Increasing Error Rate**: Monitor error patterns and logs
3. **High Cold Start Rate**: Consider increasing concurrency or warming functions
4. **Memory Usage Growth**: Check for memory leaks or inefficient queries

---

*Last updated: 2025-01-10*  
*Health Check: `/api/admin/health`*  
*Analytics Status: Speed Insights + Web Analytics enabled*
