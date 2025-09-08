# Developer Setup Guide - Cascais Fishing Platform

## Overview
This guide provides comprehensive setup instructions for new developers joining the Cascais Fishing platform project.

## Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions

### Recommended VS Code Extensions
- **TypeScript and JavaScript Language Features**
- **Tailwind CSS IntelliSense**
- **Prisma** (for database schema)
- **ESLint** (code linting)
- **Prettier** (code formatting)
- **GitLens** (Git integration)

## Initial Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone [repository-url]
cd cascais-fishing

# Install dependencies
npm install

# Verify installation
npm run --version
```

### 2. Environment Configuration

Create `.env.local` file in the project root with the following variables:

```bash
# Authentication (Required)
NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-chars
NEXTAUTH_URL=http://localhost:3000

# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/cascais_fishing

# OAuth Providers (Required)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret

# Stream Chat (Required)
NEXT_PUBLIC_STREAM_CHAT_API_KEY=your-stream-api-key
STREAM_CHAT_API_SECRET=your-stream-api-secret

# Email Service (Required)
RESEND_API_KEY=re_your-resend-api-key

# Optional Services
WEATHER_API_KEY=your-weather-api-key
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### 3. Service Account Setup

#### Database (Supabase)
1. Visit [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string to `DATABASE_URL`
4. Note: Database schema will be created automatically

#### Google OAuth
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth app
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret

#### Stream Chat
1. Visit [getstream.io](https://getstream.io)
2. Create new app
3. Copy API key and secret
4. Configure chat features in dashboard

#### Resend (Email)
1. Visit [resend.com](https://resend.com)
2. Create account and verify domain
3. Generate API key
4. Test email sending capability

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (for development)
npx prisma db push

# Optional: Seed database with sample data
npx prisma db seed
```

### 5. Development Server
```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
```

## Development Workflow

### Daily Development Process

1. **Pull Latest Changes**
```bash
git pull origin main
npm install  # In case dependencies changed
```

2. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Development**
```bash
npm run dev  # Start development server
# Make your changes
npm run lint  # Check code quality
npm run type-check  # Verify TypeScript
```

4. **Testing**
```bash
npm run test  # Run unit tests
npm run test:e2e  # Run end-to-end tests (optional)
```

5. **Commit and Push**
```bash
git add .
git commit -m "feat: add amazing feature"
git push origin feature/your-feature-name
```

6. **Create Pull Request**
- Use GitHub interface to create PR
- Follow PR template and checklist
- Request review from team members

### Code Style Guidelines

#### TypeScript Best Practices
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` type - use proper typing
- Use generic types where appropriate

#### React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Use `useCallback` and `useMemo` for performance
- Follow React 18+ concurrent features

#### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use shadcn/ui components when possible
- Maintain consistent spacing and colors

### File Organization

#### Components Structure
```
components/
├── ui/           # shadcn/ui components
├── chat/         # Chat-related components
├── booking/      # Trip booking components
├── admin/        # Admin dashboard components
└── common/       # Shared utility components
```

#### Library Organization
```
lib/
├── services/     # Business logic services
├── hooks/        # Custom React hooks
├── types/        # TypeScript definitions
├── utils/        # Utility functions
└── config/       # Configuration files
```

## Testing Strategy

### Unit Testing
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Integration Testing
```bash
# Run integration tests
npm run test:integration

# Test API endpoints
npm run test:api
```

### End-to-End Testing
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

## Debugging

### Development Tools

#### Browser DevTools
- Use React DevTools extension
- Monitor Network tab for API calls
- Check Console for errors and warnings
- Use Performance tab for optimization

#### VS Code Debugging
1. Set breakpoints in code
2. Use F5 to start debugging
3. Debug configuration in `.vscode/launch.json`

#### Database Debugging
```bash
# Open Prisma Studio
npx prisma studio

# View database in browser interface
# Check data structure and relationships
```

#### API Debugging
```bash
# Test API endpoints manually
curl -X GET http://localhost:3000/api/health

# Use Postman or similar tools for complex requests
```

## Common Development Issues

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

### TypeScript Errors
```bash
# Check TypeScript compilation
npm run type-check

# Common fixes:
# - Add proper type annotations
# - Check import/export statements
# - Verify Prisma client generation
```

### Database Connection Issues
```bash
# Verify database URL format
echo $DATABASE_URL

# Test connection
npx prisma db pull

# Common issues:
# - Wrong connection string format
# - Database not running
# - Network connectivity issues
```

### Authentication Issues
- Verify OAuth app configurations
- Check redirect URIs match exactly
- Ensure NEXTAUTH_SECRET is properly set
- Test OAuth flows in incognito mode

### Stream Chat Issues
- Check API keys are correctly set
- Verify chat app configuration in Stream dashboard
- Test with multiple browser tabs/users
- Check network tab for WebSocket connections

## Performance Optimization

### Development Performance
```bash
# Use Next.js Fast Refresh
# Enable in next.config.js

# Optimize bundle size
npm run analyze

# Check Core Web Vitals
# Use Vercel Speed Insights
```

### Database Performance
```bash
# Monitor slow queries in Prisma
# Add database indexes where needed
# Use Prisma query optimization

# Example: Add index for frequently queried fields
# In schema.prisma:
@@index([userId, createdAt])
```

## Deployment Preview

### Testing Changes
```bash
# Deploy to preview environment
vercel

# Test your changes on preview URL
# Share with team for review
```

### Environment Validation
- Test all authentication flows
- Verify database connections
- Check email sending functionality
- Test real-time chat features

## Contributing Guidelines

### Pull Request Process
1. Create feature branch from `main`
2. Make focused, atomic commits
3. Write descriptive commit messages
4. Include tests for new features
5. Update documentation as needed
6. Request reviews from appropriate team members

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] TypeScript compilation clean
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Documentation updated

### Commit Message Convention
```bash
# Format: type(scope): description

feat(auth): add Google OAuth integration
fix(chat): resolve message ordering issue
docs(api): update endpoint documentation
style(ui): improve button component spacing
refactor(db): optimize user query performance
test(booking): add trip creation tests
```

## Resources & Documentation

### Internal Documentation
- [Operations Runbook](./OPERATIONS_RUNBOOK.md)
- [Deployment Procedures](./DEPLOYMENT_PROCEDURES.md)
- [Security Guide](./PRODUCTION_SECURITY_GUIDE.md)
- [API Documentation](./API.md)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stream Chat Documentation](https://getstream.io/chat/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)

### Development Community
- Team Slack: #engineering channel
- Weekly developer meetings
- Code review sessions
- Technical documentation reviews

## Getting Help

### Internal Support
1. **Check Documentation**: Start with internal docs
2. **Team Slack**: #engineering channel for quick questions
3. **Team Members**: Don't hesitate to ask experienced developers
4. **Code Reviews**: Use PR reviews for learning opportunities

### External Support
1. **GitHub Issues**: For bugs and feature requests
2. **Community Forums**: Next.js, Prisma, Stream communities
3. **Stack Overflow**: For general programming questions

---

**Welcome to the team!** Take your time with setup and don't hesitate to ask questions. We're here to help you succeed.

**Last Updated**: January 10, 2025
**Version**: 1.0
**Next Review**: February 10, 2025
