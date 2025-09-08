# Deployment Procedures - Cascais Fishing Platform

## Overview
This document outlines step-by-step deployment procedures for the Cascais Fishing platform to ensure safe, reliable, and consistent deployments.

## Pre-Deployment Checklist

### Code Quality Verification
- [ ] All tests passing locally (`npm test`)
- [ ] TypeScript compilation clean (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build completes successfully (`npm run build`)
- [ ] No console errors in development mode

### Environment Verification
- [ ] All environment variables configured in Vercel
- [ ] Database migrations applied if needed
- [ ] Third-party API keys validated
- [ ] Stream Chat configuration verified
- [ ] NextAuth OAuth providers configured

## Production Deployment Process

### 1. Pre-Deployment Steps
```bash
# 1. Ensure clean working directory
git status
git pull origin main

# 2. Run full test suite
npm ci
npm run test:full

# 3. Build and verify locally
npm run build
npm run start # Verify local production build

# 4. Database preparation (if needed)
npx prisma db push --preview-feature
npx prisma generate
```

### 2. Vercel Deployment
```bash
# Deploy to preview environment first
vercel --prod=false

# After preview validation, deploy to production
vercel --prod
```

### 3. Post-Deployment Verification

#### Immediate Checks (0-5 minutes)
- [ ] Vercel build completed successfully (check build logs)
- [ ] Homepage loads without errors
- [ ] Authentication flows work (Google/GitHub OAuth)
- [ ] Database connections established
- [ ] Stream Chat connectivity verified

#### Smoke Tests (5-15 minutes)
- [ ] User registration/login flow
- [ ] Trip booking functionality
- [ ] Chat system (send/receive messages)
- [ ] Email notifications (participant approval)
- [ ] Mobile responsiveness check

#### Performance Monitoring (15-30 minutes)
- [ ] Core Web Vitals within acceptable ranges
- [ ] API response times <300ms average
- [ ] Error rate <0.1%
- [ ] Memory usage stable

## Rollback Procedures

### Immediate Rollback (Critical Issues)
```bash
# Rollback to previous Vercel deployment
vercel rollback [deployment-url]

# Or redeploy last known good commit
git log --oneline -10  # Find last good commit
git checkout [good-commit-hash]
vercel --prod
```

### Database Rollback (If Needed)
```bash
# Restore from backup (see DATABASE_BACKUP_DISASTER_RECOVERY_GUIDE.md)
# This should be coordinated with database team
```

## Environment-Specific Procedures

### Preview/Staging Deployments
- Used for testing new features before production
- Same process but with `--prod=false` flag
- Can be used for stakeholder reviews

### Emergency Hotfixes
1. Create hotfix branch from main
2. Make minimal necessary changes
3. Deploy to preview first
4. Fast-track to production after validation
5. Follow up with proper PR process

## Monitoring During Deployment

### Critical Metrics to Watch
- **Build Status**: Monitor Vercel build logs
- **Error Rate**: Check Sentry for new errors
- **Response Times**: Monitor API performance
- **User Sessions**: Check for authentication issues
- **Database Performance**: Monitor connection pools

### Alert Escalation
- **Level 1**: Automated Vercel/Sentry alerts
- **Level 2**: Manual verification of critical paths
- **Level 3**: Rollback decision point (within 15 minutes)

## Common Deployment Issues & Solutions

### Build Failures
- **Module Resolution**: Check tsconfig.json and import paths
- **Environment Variables**: Verify all required vars in Vercel
- **Dependencies**: Clear cache and reinstall (`npm ci`)

### Runtime Issues
- **Database Connection**: Check Supabase connection string
- **OAuth Errors**: Verify redirect URIs match production domain
- **API Timeouts**: Check third-party service status

### Performance Degradation
- **Bundle Size**: Analyze and optimize if >1MB increase
- **Memory Leaks**: Monitor heap usage in Vercel dashboard
- **Database Queries**: Check for N+1 queries or missing indexes

## Security Considerations

### Pre-Deployment Security Review
- [ ] No hardcoded secrets in code
- [ ] All dependencies updated (check for vulnerabilities)
- [ ] Security headers properly configured
- [ ] Rate limiting active on production endpoints

### Post-Deployment Security Verification
- [ ] HTTPS enforced on all endpoints
- [ ] Security headers present (CSP, HSTS, etc.)
- [ ] Authentication middleware protecting private routes
- [ ] API rate limiting functioning

## Documentation Updates

### Post-Deployment Tasks
- [ ] Update changelog
- [ ] Document any configuration changes
- [ ] Update runbooks if procedures changed
- [ ] Notify team of deployment completion

## Emergency Contact Information

### Technical Escalation
- **Primary**: Development Team Lead
- **Secondary**: Senior Full-Stack Developer  
- **Infrastructure**: Vercel Support (for platform issues)

### Business Escalation
- **Product Owner**: For feature-related decisions
- **Stakeholders**: For user-impacting issues

## Deployment Schedule

### Recommended Timing
- **Major Releases**: Tuesday-Thursday, 10:00-16:00 UTC
- **Hotfixes**: Any time, with proper monitoring
- **Avoid**: Fridays, weekends, holidays (unless emergency)

### Maintenance Windows
- **Database Migrations**: Schedule during low-traffic periods
- **Third-party Updates**: Coordinate with service providers
- **Major Infrastructure Changes**: Communicate in advance

---

**Last Updated**: January 10, 2025
**Version**: 1.0
**Next Review**: February 10, 2025
