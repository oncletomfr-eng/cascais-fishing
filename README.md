# Cascais Fishing Platform

A modern fishing platform built with Next.js, featuring real-time chat, trip booking, and comprehensive fishing community features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (or Supabase account)
- Git

### Installation

1. **Clone the repository**
```bash
git clone [repository-url]
cd cascais-fishing
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
```

4. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Push database schema (for development)
npx prisma db push

# Seed database (optional)
npx prisma db seed
```

5. **Start Development Server**
```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Tech Stack

### Core Framework
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Static type checking
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library

### Backend Services
- **Prisma** - Database ORM
- **Supabase** - Database and authentication
- **NextAuth.js** - Authentication system
- **Stream Chat** - Real-time messaging
- **Resend** - Email service

### Deployment & Monitoring
- **Vercel** - Hosting and deployment
- **Sentry** - Error tracking
- **Vercel Analytics** - Performance monitoring

## 📁 Project Structure

```
cascais-fishing/
├── app/                    # Next.js App Router pages
├── components/             # Reusable React components
│   ├── ui/                # shadcn/ui components
│   ├── chat/              # Chat system components
│   ├── booking/           # Trip booking components
│   └── ...
├── lib/                   # Utility functions and configurations
│   ├── services/          # Business logic services
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── utils.ts           # Common utilities
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── scripts/               # Build and deployment scripts
├── docs/                  # Documentation
└── __tests__/             # Test files
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # Run TypeScript compiler check

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run end-to-end tests
```

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Conventional Commits** for commit messages

## 🌍 Environment Variables

Required environment variables (see `.env.example`):

### Authentication
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GITHUB_ID` - GitHub OAuth app ID
- `GITHUB_SECRET` - GitHub OAuth app secret

### Database
- `DATABASE_URL` - PostgreSQL connection string

### External Services
- `NEXT_PUBLIC_STREAM_CHAT_API_KEY` - Stream Chat API key
- `STREAM_CHAT_API_SECRET` - Stream Chat API secret
- `RESEND_API_KEY` - Resend email API key
- `WEATHER_API_KEY` - Weather service API key

### Monitoring
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Import your GitHub repository to Vercel
   - Configure environment variables in Vercel dashboard

2. **Database Setup**
   - Set up Supabase project
   - Configure DATABASE_URL environment variable
   - Run database migrations

3. **Deploy**
   ```bash
   # Deploy to preview
   vercel
   
   # Deploy to production
   vercel --prod
   ```

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Performance Testing
```bash
npm run test:performance
```

## 📊 Monitoring & Analytics

### Error Tracking
- **Sentry** - Real-time error monitoring
- **Vercel Analytics** - Performance insights

### Performance Monitoring
- Core Web Vitals tracking
- API response time monitoring
- Database query performance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Commit Convention

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

## 📚 Documentation

- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Deployment Procedures](docs/DEPLOYMENT_PROCEDURES.md)
- [Incident Response](docs/INCIDENT_RESPONSE_PROCEDURES.md)
- [Security Guide](docs/PRODUCTION_SECURITY_GUIDE.md)
- [API Documentation](docs/API.md)

## 🆘 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

#### Database Connection Issues
```bash
# Check database URL format
echo $DATABASE_URL

# Test database connection
npx prisma db pull
```

#### Authentication Issues
- Verify OAuth app configurations
- Check redirect URIs match your domain
- Ensure NEXTAUTH_SECRET is set and secure

### Getting Help

- 📖 [Documentation](docs/)
- 🐛 [Issues](../../issues)
- 💬 [Discussions](../../discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This is a production-ready application. Please follow security best practices when deploying and configuring environment variables.

**Last Updated**: January 10, 2025