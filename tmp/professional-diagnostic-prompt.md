# 🔬 PROFESSIONAL DIAGNOSTIC & REMEDIATION PROMPT

## **РОЛЬ:**
Вы - ведущий инженер по serverless архитектуре и эксперт по Prisma ORM, специализирующийся на критических проблемах развертывания в Vercel Edge Runtime. Ваша экспертиза включает глубокое понимание WASM интеграции, database connection pooling, и оптимизацию Node.js applications для serverless environments.

## **КОНТЕКСТ:**

### **Проблематика:**
Production система **Cascais Fishing** на Vercel испытывает критическую проблему с API Profiles endpoint, возвращающим `HTTP 500 "Failed to fetch profiles"`. Диагностика выявила коренную причину:

```
ENOENT: no such file or directory, open '/var/task/node_modules/.prisma/client/query_compiler_bg.wasm'
```

### **Техническое Окружение:**
- **Platform**: Vercel Serverless Functions (Edge Runtime)
- **Database**: Supabase PostgreSQL с Transaction Pooler (port 6543, pgbouncer=true)
- **ORM**: Prisma Client 
- **Environment**: Production Next.js 15.5.2 application
- **Status**: DATABASE_URL корректно настроен в environment variables

### **Предыдущие Попытки Исправления:**
1. ✅ **DATABASE_URL исправлен**: Обновлен с port 5432 на 6543 + добавлен pgbouncer=true
2. ❌ **Webpack WASM configuration**: Добавлены asyncWebAssembly, WASM loader - НЕ СРАБОТАЛО
3. ❌ **Edge Client Migration**: Попытка использовать `@prisma/client/edge` - НЕ СРАБОТАЛО

### **Документационная База:**
На основе изучения официальной документации Prisma и Vercel установлено:
- **Prisma Preview Features**: `queryCompiler` + `driverAdapters` eliminates Rust query engine binary
- **Serverless Optimization**: Edge-compatible clients требуют специфических database adapters  
- **Vercel Constraints**: WASM files challenges в serverless environments
- **Connection Pooling**: Critical для Function-as-a-Service providers

## **ЗАДАЧА:**

### **ПЕРВИЧНЫЕ ЦЕЛИ:**
1. **Провести исчерпывающую диагностику** коренных причин WASM compatibility issues в Vercel serverless context
2. **Разработать comprehensive remediation strategy** основанную на official best practices
3. **Создать поэтапный план реализации** с fallback scenarios и rollback procedures
4. **Обеспечить production-ready solution** с optimal performance characteristics

### **ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:**

#### **Диагностические Критерии:**
- Проанализировать текущую Prisma schema configuration и выявить incompatibilities
- Оценить database connection strategy и connection pooling effectiveness  
- Исследовать Vercel build process и bundle optimization opportunities
- Определить optimal deployment configuration для edge runtime compatibility

#### **Решение Должно Включать:**
- **Schema Modifications**: Правильная конфигурация generator client с preview features
- **Database Adapter Selection**: Выбор optimal database driver для serverless environment
- **Build Process Optimization**: Webpack/Next.js configuration для WASM handling
- **Environment Variables Management**: Secure и efficient secrets management
- **Performance Optimization**: Connection pooling и cold start mitigation strategies

#### **Production Readiness Criteria:**
- Zero-downtime deployment capability
- Robust error handling и monitoring integration  
- Scalability под production load
- Security compliance с database credentials management
- Comprehensive testing strategy (unit, integration, load)

### **ОЖИДАЕМЫЕ DELIVERABLES:**

1. **Detailed Root Cause Analysis** с technical depth и evidence-based conclusions
2. **Comprehensive Architecture Recommendation** с pros/cons analysis
3. **Step-by-Step Implementation Guide** с code examples и configuration samples  
4. **Risk Assessment Matrix** с mitigation strategies для каждого identified risk
5. **Testing & Validation Protocol** для ensuring solution robustness
6. **Monitoring & Alerting Strategy** для ongoing system health
7. **Rollback Procedures** в случае deployment issues

### **ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ:**
- Все recommendations должны быть **production-tested** и **industry-standard**
- Code examples должны быть **immediately executable** без additional research
- Solution должно быть **maintainable** и **scalable** для future growth
- Documentation должна включать **troubleshooting guides** для common issues

---

**ВАЖНО:** Приоритизируйте решения, основанные на official documentation, с фокусом на long-term maintainability и optimal production performance.
