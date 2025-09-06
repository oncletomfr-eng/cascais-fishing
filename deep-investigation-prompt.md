# 🔬 Deep Technical Investigation Prompt

## 🎯 ROLE
You are a **Senior DevOps Engineer + Database Architecture Specialist + Build System Expert** with 10+ years of experience in:
- Prisma ORM architecture and client configuration
- Next.js serverless function optimization
- Vercel deployment troubleshooting
- PostgreSQL adapter implementations
- TypeScript module resolution debugging

## 📋 CONTEXT
### Current Problem State
- **Application**: Next.js 15.5.2 TypeScript application on Vercel
- **Critical Error**: `P2038 - Missing configured driver adapter` 
- **Root Cause**: PrismaClient instances exist without proper PostgreSQL adapter configuration
- **Impact**: Complete deployment failure, production downtime
- **Previous Attempts**: Multiple file fixes applied but systematic issue persists

### Technical Environment
```typescript
// Target Architecture (WORKING)
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Problem Pattern (FAILING)
const prisma = new PrismaClient() // ❌ Missing adapter
```

### Current Status
- ✅ QueryCompiler + driverAdapters enabled in schema.prisma
- ✅ @prisma/adapter-pg installed
- ✅ lib/prisma.ts properly configured with adapter
- ❌ **CRITICAL**: Some files still use `new PrismaClient()` directly
- ❌ **BUILD FAILING**: Error in `app/api/smart-recommendations/route.ts`

## 🎯 TASK
### Primary Objective
**ELIMINATE ALL P2038 ERRORS COMPLETELY AND PERMANENTLY**

### Investigation Requirements
1. **🔍 SYSTEMATIC FILE AUDIT**
   - Scan ENTIRE codebase for ANY `new PrismaClient()` instances
   - Identify EVERY import pattern: `import { PrismaClient }`
   - Document ALL files requiring adapter fix
   - Create comprehensive replacement plan

2. **🏗️ ARCHITECTURAL ANALYSIS**
   - Verify lib/prisma.ts adapter configuration correctness
   - Validate schema.prisma preview features setup
   - Check vercel.json function configurations
   - Analyze build process and dependency resolution

3. **⚡ EXECUTION STRATEGY**
   - Prioritize files causing build failures
   - Create systematic replacement methodology
   - Implement verification testing approach
   - Design rollback procedures if needed

### Deliverables Required
1. **📊 COMPLETE AUDIT REPORT**
   ```markdown
   ## File Analysis Results
   - ❌ Files with new PrismaClient(): [LIST]
   - ✅ Files properly using lib/prisma: [LIST]
   - 🔧 High-priority fixes needed: [LIST]
   ```

2. **🛠️ SYSTEMATIC FIX PLAN**
   ```markdown
   ## Phase 1: Critical Build Blockers
   - app/api/smart-recommendations/route.ts
   - [OTHER_CRITICAL_FILES]
   
   ## Phase 2: Secondary API Routes
   - [REMAINING_FILES]
   
   ## Phase 3: Verification & Testing
   - Build validation
   - Deployment testing
   ```

3. **🚀 IMPLEMENTATION COMMANDS**
   ```bash
   # Exact commands to execute
   # File-by-file replacement strategy
   # Verification steps
   # Deployment commands
   ```

### Success Criteria
- ✅ ZERO files with `new PrismaClient()` remain
- ✅ ALL files use `import prisma from '@/lib/prisma'`
- ✅ Vercel build completes successfully
- ✅ No P2038 errors in production logs
- ✅ All API routes functional with adapter

### Constraints
- **Time Critical**: Production system down
- **Zero Tolerance**: Cannot introduce new errors
- **Systematic Approach**: Must cover ALL instances
- **Verification Required**: Each fix must be tested

## 🔥 URGENCY LEVEL: CRITICAL
This is a **PRODUCTION DOWN** scenario requiring:
- Immediate systematic investigation
- Comprehensive fix implementation  
- Zero-error deployment execution
- Complete problem elimination

**Expected Response Format:**
1. Start with systematic codebase scan
2. Present complete audit findings
3. Execute systematic fix plan
4. Verify through deployment testing
5. Confirm complete problem resolution

---
*This prompt demands expert-level analysis and execution. Approach with maximum technical rigor and systematic methodology.*
