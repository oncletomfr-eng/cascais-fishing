# VERCEL ENVIRONMENT VARIABLES - CRITICAL SETUP REQUIRED

**Status**: 🚨 PRODUCTION-BREAKING ISSUE  
**Date**: January 10, 2025  
**Priority**: URGENT - OAuth Authentication Completely Broken

## Current State Analysis

### ✅ Configured Variables (6/13+ required)
```
✅ NASA_API_KEY           - All Environments
✅ NOAA_CDO_API_TOKEN     - All Environments  
✅ AUTH_SECRET            - All Environments
✅ DIRECT_URL             - Production only
✅ OPENAI_API_KEY         - Production only
✅ STRIPE_SECRET_KEY      - Production only
```

### 🚨 MISSING CRITICAL OAuth Variables (Production-Breaking!)
```
❌ AUTH_GOOGLE_ID         - Google OAuth client ID
❌ AUTH_GOOGLE_SECRET     - Google OAuth client secret  
❌ AUTH_GITHUB_ID         - GitHub OAuth App ID
❌ AUTH_GITHUB_SECRET     - GitHub OAuth App secret
❌ NEXTAUTH_URL           - Should be: https://www.cascaisfishing.com
```

### 📋 MISSING Important Variables
```
❌ DATABASE_URL           - PostgreSQL connection string
❌ TOMORROW_IO_API_KEY    - Weather API integration
❌ SENTRY_DSN            - Error monitoring (if used)
❌ STREAM_CHAT_API_KEY   - Chat functionality (if used)
❌ STREAM_CHAT_SECRET    - Chat functionality (if used)
```

## IMMEDIATE ACTION REQUIRED

### Step 1: Create OAuth Applications

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Set Authorized redirect URI: `https://www.cascaisfishing.com/api/auth/callback/google`
4. Copy `CLIENT_ID` → `AUTH_GOOGLE_ID`  
5. Copy `CLIENT_SECRET` → `AUTH_GOOGLE_SECRET`

#### GitHub OAuth Setup  
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create New OAuth App
3. Set Authorization callback URL: `https://www.cascaisfishing.com/api/auth/callback/github`
4. Copy `Client ID` → `AUTH_GITHUB_ID`
5. Copy `Client Secret` → `AUTH_GITHUB_SECRET`

### Step 2: Add Variables to Vercel

**Environment**: All Environments (Production, Preview, Development)

```bash
# OAuth Configuration
AUTH_GOOGLE_ID=your_google_client_id_here
AUTH_GOOGLE_SECRET=your_google_client_secret_here
AUTH_GITHUB_ID=your_github_client_id_here  
AUTH_GITHUB_SECRET=your_github_client_secret_here
NEXTAUTH_URL=https://www.cascaisfishing.com

# Weather API (Optional - has fallback)
TOMORROW_IO_API_KEY=your_tomorrow_io_key_here

# Database (Check if missing)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Step 3: Redeploy

After adding variables:
1. Trigger new deployment in Vercel
2. Test OAuth functionality
3. Verify weather API integration

## Impact Assessment

**Current Impact**: 
- ❌ 100% OAuth login failure (Google + GitHub)
- ❌ Users cannot authenticate  
- ❌ Premium features inaccessible
- ⚠️ Weather API using fallback data

**Post-Fix Impact**:
- ✅ Full OAuth authentication restored
- ✅ User registration/login working  
- ✅ Premium features accessible
- ✅ Enhanced weather data accuracy

## Security Notes

⚠️ **IMPORTANT**: Use "Sensitive" option in Vercel for all SECRET values
⚠️ **SECURITY**: Never commit OAuth secrets to git
⚠️ **DOMAINS**: Ensure OAuth redirect URIs match exactly

---
**Next Steps**: Configure OAuth applications → Add variables → Deploy → Test