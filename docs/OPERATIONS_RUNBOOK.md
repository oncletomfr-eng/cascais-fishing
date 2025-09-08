# Operations Runbook - Cascais Fishing Platform

## Overview
This is the master operations runbook for the Cascais Fishing platform. It serves as the central hub for all operational procedures, monitoring guidelines, and maintenance tasks.

## Quick Reference

### Emergency Contacts
- **On-Call Engineer**: Primary incident responder
- **Tech Lead**: Architecture and complex issue escalation
- **Platform Status**: https://status.vercel.com, https://status.supabase.com

### Critical Resources
- **Production Dashboard**: https://vercel.com/dashboard
- **Error Monitoring**: Sentry dashboard
- **Database Console**: Supabase dashboard
- **Chat System**: Stream dashboard

## Daily Operations Checklist

### Morning Health Check (09:00 UTC)
- [ ] Check overnight alerts and incidents
- [ ] Verify core services status
- [ ] Review error rates from past 24 hours
- [ ] Check performance metrics trends
- [ ] Validate backup completion

### Health Check Commands
```bash
# Service availability
curl -f https://cascais-fishing.vercel.app/api/health

# Database connectivity
# Check via Supabase dashboard

# Authentication health
# Test OAuth flows manually

# Chat system status  
# Check Stream dashboard metrics
```

### Performance Baselines
- **Response Time**: <300ms average for API endpoints
- **Error Rate**: <0.1% across all requests
- **Uptime**: >99.9% availability
- **Build Time**: <3 minutes for deployments

## Monitoring & Alerting

### Critical Metrics Dashboard

#### Application Metrics
- **User Sessions**: Active user count and trends
- **API Performance**: Response times by endpoint
- **Error Rates**: Error percentage by service
- **Authentication**: Login success rates

#### Infrastructure Metrics
- **Memory Usage**: Function memory consumption
- **Build Performance**: Deployment success rate
- **Database Performance**: Query times and connection pools
- **Third-party Status**: External service availability

### Alert Thresholds

#### Critical Alerts (Immediate Response)
- Error rate >5% for 5+ minutes
- Response time >2 seconds for 5+ minutes  
- Service availability <95% for 3+ minutes
- Authentication failure rate >10%

#### Warning Alerts (15-minute Response)
- Error rate 1-5% for 10+ minutes
- Response time 500ms-2s for 10+ minutes
- Memory usage >80% for 15+ minutes
- Database connections >80% of pool

## Routine Maintenance

### Daily Tasks
- **Health Check**: Morning service verification
- **Log Review**: Check for unusual patterns
- **Performance Review**: Identify degradation trends
- **Security Scan**: Review security alerts

### Weekly Tasks  
- **Performance Analysis**: Weekly metrics review
- **Dependency Updates**: Security patches and updates
- **Backup Verification**: Test backup integrity
- **Documentation Review**: Update procedures as needed

### Monthly Tasks
- **Security Audit**: Comprehensive security review
- **Performance Optimization**: Analyze and optimize slow queries
- **Capacity Planning**: Review growth trends
- **Disaster Recovery Test**: Validate DR procedures

## Service Management

### Core Services

#### Next.js Application (Vercel)
- **Purpose**: Main web application
- **Health Check**: `/api/health` endpoint
- **Logs**: Vercel function logs
- **Scaling**: Auto-scaling via Vercel
- **Config**: Environment variables in Vercel dashboard

#### Database (Supabase)
- **Purpose**: Primary data storage
- **Health Check**: Connection test via dashboard
- **Logs**: Supabase logs panel
- **Scaling**: Auto-scaling managed by Supabase
- **Backup**: Automated daily backups

#### Stream Chat
- **Purpose**: Real-time messaging
- **Health Check**: Stream dashboard
- **Logs**: Stream logs panel
- **Scaling**: Managed by Stream
- **Config**: API keys in environment variables

#### Email Service (Resend)
- **Purpose**: Transactional emails
- **Health Check**: Email send test
- **Logs**: Resend dashboard
- **Rate Limits**: Monitor sending quotas

### Service Dependencies
```
Web App (Vercel)
  ├── Database (Supabase)
  ├── Authentication (NextAuth + OAuth)
  ├── Chat (Stream)
  ├── Email (Resend)
  ├── Weather API (Tomorrow.io)
  └── Error Tracking (Sentry)
```

## Common Operational Tasks

### User Account Issues

#### Password Reset
```bash
# User requests password reset
# Check logs for email delivery
# Verify OAuth provider status if applicable
```

#### Account Lockout
```bash
# Check authentication logs
# Review rate limiting triggers
# Manual unlock if legitimate user
```

### Performance Issues

#### Slow API Response
```bash
# Check Vercel function metrics
# Review database query performance
# Verify third-party API status
# Check for memory pressure
```

#### High Error Rate
```bash
# Check Sentry for error patterns
# Review recent deployments
# Verify environment configuration
# Check service dependencies
```

### Data Management

#### Database Maintenance
```bash
# Monitor connection pools
# Check query performance  
# Review index usage
# Validate backup integrity
```

#### Data Migration
```bash
# Follow change management process
# Test on preview environment
# Schedule during low-traffic period
# Verify data integrity post-migration
```

## Deployment Operations

### Standard Deployment
- Follow [DEPLOYMENT_PROCEDURES.md](./DEPLOYMENT_PROCEDURES.md)
- Use preview environment for validation
- Monitor post-deployment metrics

### Emergency Deployment
- Create hotfix branch
- Deploy to preview first
- Get approval from Tech Lead
- Monitor closely during and after deployment

### Rollback Procedures
```bash
# Immediate rollback via Vercel
vercel rollback [deployment-url]

# Or redeploy previous version
git checkout [previous-commit]
vercel --prod
```

## Incident Management

### Incident Response
- Follow [INCIDENT_RESPONSE_PROCEDURES.md](./INCIDENT_RESPONSE_PROCEDURES.md)
- Use severity classification system
- Maintain communication protocols
- Document all actions taken

### Post-Incident Actions
- Conduct blameless post-mortem
- Update monitoring and alerts
- Improve procedures based on learnings
- Share knowledge with team

## Security Operations

### Daily Security Tasks
- Review security alerts
- Check for suspicious activity
- Validate rate limiting effectiveness
- Monitor authentication patterns

### Security Incident Response
- Isolate affected systems immediately
- Notify security team
- Preserve evidence
- Follow incident response procedures

### Regular Security Reviews
- Weekly: Review access logs
- Monthly: Update dependencies
- Quarterly: Penetration testing
- Annually: Full security audit

## Backup & Recovery

### Backup Status Verification
```bash
# Check Supabase automated backups
# Verify backup completion times
# Test random backup restoration
# Document recovery time objectives
```

### Disaster Recovery
- Follow [DATABASE_BACKUP_DISASTER_RECOVERY_GUIDE.md](./DATABASE_BACKUP_DISASTER_RECOVERY_GUIDE.md)
- Test recovery procedures quarterly
- Maintain updated contact lists
- Document lessons learned

## Performance Optimization

### Regular Performance Tasks
- Monitor Core Web Vitals
- Analyze bundle sizes
- Review database query performance
- Check CDN cache hit rates

### Performance Investigation
```bash
# Use Vercel Analytics for insights
# Check Sentry performance monitoring
# Review database slow query logs
# Analyze user flow bottlenecks
```

## Documentation Maintenance

### Keep Updated
- Contact information
- Service configurations
- Alert thresholds
- Operational procedures

### Regular Reviews
- Monthly: Review procedures accuracy
- Quarterly: Update contact information
- After incidents: Update based on learnings
- Annually: Comprehensive procedure review

## Knowledge Management

### Important Documents
- [DEPLOYMENT_PROCEDURES.md](./DEPLOYMENT_PROCEDURES.md)
- [INCIDENT_RESPONSE_PROCEDURES.md](./INCIDENT_RESPONSE_PROCEDURES.md)
- [DATABASE_BACKUP_DISASTER_RECOVERY_GUIDE.md](./DATABASE_BACKUP_DISASTER_RECOVERY_GUIDE.md)
- [PRODUCTION_SECURITY_GUIDE.md](./PRODUCTION_SECURITY_GUIDE.md)
- [VERCEL_MONITORING_CONFIG.md](./VERCEL_MONITORING_CONFIG.md)

### Training & Onboarding
- New operations team members must review this runbook
- Shadow experienced team members for first week
- Practice incident response scenarios
- Maintain operational knowledge base

## Continuous Improvement

### Metrics Collection
- Response times to incidents
- Time to resolution
- User satisfaction scores
- System availability metrics

### Regular Reviews
- Weekly: Operational metrics review
- Monthly: Process improvement opportunities
- Quarterly: Technology stack assessment
- Annually: Full operational review

---

**Remember**: This runbook is a living document. Update it based on operational experience and lessons learned.

**Last Updated**: January 10, 2025
**Version**: 1.0
**Next Review**: February 10, 2025
