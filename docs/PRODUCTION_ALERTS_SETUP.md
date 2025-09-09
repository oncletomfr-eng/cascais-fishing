# Production Alerts & Monitoring Setup

This document outlines the complete monitoring and alerting system for the Cascais Fishing platform in production.

## 🚨 Critical Alerts Configuration

### 1. Health Check Monitoring

**Endpoint**: `https://www.cascaisfishing.com/api/health`

**Monitoring Setup**:
```bash
# Example curl command for external monitoring services
curl -X GET https://www.cascaisfishing.com/api/health \
  -H "User-Agent: HealthMonitor/1.0" \
  -w "Status: %{http_code}, Time: %{time_total}s\n"
```

**Alert Thresholds**:
- ❌ **CRITICAL**: HTTP status 503 or timeout > 10s  
- ⚠️ **WARNING**: HTTP status 200 but `status: 'degraded'`
- ✅ **OK**: HTTP status 200 and `status: 'healthy'`

### 2. Sentry Error Monitoring

**Configuration**:
- **DSN**: Already configured in Vercel environment variables
- **Environment**: `production`
- **Sample Rate**: 10% for performance, 100% for errors

**Alert Rules** (Configure in Sentry Dashboard):

#### Critical Errors (Immediate notification)
- **Authentication failures** > 5 per minute
- **Database connection errors** > 1 per minute  
- **OAuth configuration errors** > 1 occurrence
- **Weather API complete failures** > 3 per minute

#### Warning Alerts (15-minute notification)
- **JavaScript errors** > 20 per hour
- **API response time** > 5 seconds average
- **Session timeout issues** > 10 per hour

**Sentry Setup Commands**:
```bash
# Already configured via environment variables:
# SENTRY_DSN=https://e27b9c23c9d1764019752c7e7f18782e@o4509984520798208.ingest.de.sentry.io/4509984525058128
# NEXT_PUBLIC_SENTRY_DSN=https://e27b9c23c9d1764019752c7e7f18782e@o4509984520798208.ingest.de.sentry.io/4509984525058128
# SENTRY_ENVIRONMENT=production
```

### 3. Vercel Platform Monitoring

**Built-in Alerts**:
- Function execution errors
- Build failures  
- Deployment issues
- Edge network problems

**Custom Vercel Alerts**:
```javascript
// Add to vercel.json for custom monitoring
{
  "functions": {
    "app/api/health/route.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/health",
      "headers": [
        {
          "key": "Cache-Control", 
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

## 📊 Monitoring Dashboards

### 1. Sentry Dashboard

**URL**: [https://sentry.io/organizations/cascais-fishing/](https://sentry.io/organizations/cascais-fishing/)

**Key Metrics**:
- Error rate by component (auth, weather, api)
- Response time percentiles
- User impact analysis
- Release tracking

### 2. Vercel Analytics

**URL**: [https://vercel.com/victors-projects-1cb47092/cascais-fishing/analytics](https://vercel.com/victors-projects-1cb47092/cascais-fishing/analytics)

**Key Metrics**:
- Function invocations
- Edge requests
- Build times
- Deployment success rate

### 3. Health Check Dashboard

Create a simple monitoring dashboard using the health endpoint:

```bash
# Script to check system health
#!/bin/bash
HEALTH_URL="https://www.cascaisfishing.com/api/health"
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" $HEALTH_URL)
HTTP_BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ $HTTP_STATUS -eq 200 ]; then
    echo "✅ System Healthy"
elif [ $HTTP_STATUS -eq 503 ]; then
    echo "❌ System Unhealthy"
    echo $HTTP_BODY
else
    echo "⚠️ Unexpected Status: $HTTP_STATUS"
fi
```

## 🔔 Notification Channels

### 1. Email Alerts
- Configure in Sentry: Settings → Alerts → Email
- Add admin emails for critical alerts
- Set up digest emails for warning-level issues

### 2. Slack Integration (Recommended)
```bash
# Sentry Slack webhook URL
https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Configure in Sentry: Settings → Integrations → Slack
# Channel: #cascais-alerts
```

### 3. SMS/Phone Alerts (Critical Only)
- For authentication system failures
- For complete site outages
- Configure via PagerDuty or similar service

## 🚀 Deployment Health Checks

### Pre-deployment Checks
```bash
# Run before each deployment
npm run build        # Ensure build succeeds
npm run test         # Run test suite
npm run lint         # Check code quality
```

### Post-deployment Verification
```bash
# Automated post-deploy health check
curl -f https://www.cascaisfishing.com/api/health || exit 1
curl -f https://www.cascaisfishing.com/auth/signin || exit 1
```

## 📈 Performance Thresholds

### Response Time Targets
- **Health endpoint**: < 1 second
- **Authentication pages**: < 3 seconds
- **Weather data**: < 5 seconds
- **Database queries**: < 2 seconds

### Availability Targets
- **Overall uptime**: 99.5%
- **Authentication system**: 99.9%
- **Core functionality**: 99.8%

### Error Rate Targets
- **JavaScript errors**: < 1% of sessions
- **API failures**: < 0.5% of requests
- **Authentication failures**: < 2% of attempts

## 🛠️ Troubleshooting Runbook

### Critical Alert Response

#### 1. Authentication System Down
```bash
# Check OAuth configuration
curl https://www.cascaisfishing.com/api/health | jq '.checks.auth'

# Verify environment variables in Vercel
# Required: AUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_*, GITHUB_CLIENT_*
```

#### 2. Database Connection Issues
```bash
# Check database status
curl https://www.cascaisfishing.com/api/health | jq '.checks.database'

# Verify DATABASE_URL in Vercel environment variables
# Check Supabase dashboard for connection limits
```

#### 3. High Error Rate
```bash
# Check Sentry dashboard for error patterns
# Look for:
# - Recent deployments that might have introduced bugs
# - Spike in specific error types
# - Geographic distribution of errors
```

### Recovery Procedures

#### 1. Immediate Rollback
```bash
# In Vercel dashboard, click "Instant Rollback" 
# Or via CLI:
vercel rollback [deployment-url]
```

#### 2. Emergency Maintenance Mode
```javascript
// Add to middleware.ts temporarily
if (process.env.MAINTENANCE_MODE === 'true') {
  return new Response('Site under maintenance', { status: 503 });
}
```

#### 3. Hotfix Deployment
```bash
# For critical fixes:
git checkout main
git pull origin main
# Make minimal fix
git add .
git commit -m "hotfix: [description]"
git push origin main
# Vercel auto-deploys
```

## 📋 Daily Monitoring Checklist

### Morning Health Check (5 min)
- [ ] Check Sentry dashboard for overnight errors
- [ ] Verify health endpoint returns 200 OK
- [ ] Check Vercel analytics for anomalies
- [ ] Review authentication success rates

### Weekly Review (15 min)
- [ ] Analyze error trends in Sentry
- [ ] Review performance metrics
- [ ] Check for new security alerts
- [ ] Update alert thresholds if needed

### Monthly Audit (30 min)
- [ ] Review and update alert rules
- [ ] Test notification channels
- [ ] Audit environment variables
- [ ] Update monitoring documentation

## 🔐 Security Monitoring

### Authentication Alerts
- Multiple failed login attempts
- Suspicious email patterns
- OAuth configuration tampering
- JWT token anomalies

### API Security
- Rate limiting violations  
- Suspicious request patterns
- CORS violations
- Injection attempt detection

---

## 📞 Emergency Contacts

**On-Call Developer**: [Configure based on team]
**System Administrator**: [Configure based on team] 
**Business Owner**: [Configure based on team]

**External Services**:
- Vercel Support: [Vercel Status Page](https://vercel-status.com)
- Sentry Support: [Sentry Status](https://status.sentry.io)
- Supabase Support: [Supabase Status](https://status.supabase.com)

---

*Last Updated: January 11, 2025*
*Version: 1.0*
