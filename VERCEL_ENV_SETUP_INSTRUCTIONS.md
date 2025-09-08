# 🚨 КРИТИЧНО: Vercel Environment Variables Setup

**Статус:** БЛОКИРУЮЩАЯ ЗАДАЧА - без этого auth не работает в production  
**Задачи:** auth-1-3, auth-2-3, auth-3-3 из RESTT плана

---

## 🔑 ENVIRONMENT VARIABLES ДЛЯ VERCEL

Добавьте ВСЕ эти переменные в Vercel Dashboard → Settings → Environment Variables:

### 1. NextAuth v5 Configuration:
```
AUTH_SECRET=[GENERATE_SECURE_64_CHAR_HEX_SECRET]
AUTH_URL=https://www.cascaisfishing.com/
AUTH_TRUST_HOST=true
```
**ВАЖНО:** 
- `AUTH_TRUST_HOST=true` обязательно для NextAuth v5 в production!
- **GENERATE SECURE SECRET**: Use `openssl rand -hex 64` to generate production AUTH_SECRET

### 2. Google OAuth (NextAuth v5 format):
```
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_OAUTH_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_OAUTH_SECRET]
```

### 3. GitHub OAuth (NextAuth v5 format):
```
GITHUB_CLIENT_ID=[YOUR_GITHUB_OAUTH_CLIENT_ID]
GITHUB_CLIENT_SECRET=[YOUR_GITHUB_OAUTH_SECRET]
```

### 4. Stream Chat (production keys) - ✅ PRIORITY:
```
NEXT_PUBLIC_STREAM_CHAT_API_KEY=[YOUR_STREAM_CHAT_API_KEY]
STREAM_CHAT_API_SECRET=[YOUR_STREAM_CHAT_API_SECRET]
STREAM_CHAT_ENVIRONMENT=production
STREAM_CHAT_TIMEOUT=10000
STREAM_CHAT_ENABLE_LOGGING=false
```
**SETUP INSTRUCTIONS:**
1. Create production Stream Chat app at https://getstream.io/chat/
2. Get API Key and Secret from dashboard
3. Configure automod: AI moderation enabled
4. Set connection timeout to 10 seconds for production
5. Disable debug logging for performance

### 5. Database (Supabase production):
```
DATABASE_URL=[YOUR_SUPABASE_DATABASE_URL_WITH_POOLER_PORT_6543]
```
**КРИТИЧНО:** 
- ✅ Port 6543 (Transaction Pooler) для Vercel serverless  
- ✅ pgbouncer=true для connection pooling
- ✅ Протестировано и работает с новым Prisma client

### 6. Stripe (production keys):
```
STRIPE_SECRET_KEY=sk_live_[YOUR_STRIPE_SECRET_KEY_HERE]
```

### 7. AI Services:
```
OPENAI_API_KEY=sk-proj-[YOUR_OPENAI_API_KEY_HERE]
```

### 8. Weather APIs:
```
NASA_API_KEY=[YOUR_NASA_API_KEY]
NOAA_CDO_API_TOKEN=[YOUR_NOAA_API_TOKEN]
```

### 9. 🚨 NEW: Sentry Error Tracking (PRIORITY):
```
SENTRY_DSN=[YOUR_SENTRY_DSN_URL]
NEXT_PUBLIC_SENTRY_DSN=[YOUR_SENTRY_DSN_URL]  
SENTRY_ORG=[YOUR_SENTRY_ORG_NAME]
SENTRY_PROJECT=cascais-fishing
SENTRY_ENVIRONMENT=production
```
**SETUP INSTRUCTIONS:**
1. Create Sentry account at https://sentry.io/
2. Create new project "cascais-fishing" (Next.js platform)
3. Copy DSN URL from project settings
4. Set sample rates: 10% for production performance
5. Enable session replay for error debugging
6. Configure alerts for critical errors

**BENEFITS:**
- 🚨 Real-time error monitoring & alerting
- 📊 Performance tracking & bottleneck detection  
- 🔍 Session replay for debugging user issues
- 📈 Error trends & impact analysis
- 🎯 User context & comprehensive error details

---

## 📝 ШАГИ ВЫПОЛНЕНИЯ:

### ШАГ 1: Перейти в Vercel Dashboard
1. Открыть https://vercel.com/
2. Найти проект "cascais-fishing" 
3. Settings → Environment Variables

### ШАГ 2: Добавить Variables
Для КАЖДОЙ переменной выше:
1. Нажать "Add New"
2. Name: скопировать название (например, AUTH_SECRET)
3. Value: скопировать значение  
4. Environment: выбрать **All Environments** (Production, Preview, Development)
5. Нажать "Save"

### ШАГ 3: Trigger Redeploy
После добавления ВСЕХ переменных:
1. Deployments tab
2. Нажать "..." на последнем deployment
3. "Redeploy"
4. ИЛИ Push новый commit в main branch

---

## ✅ ВЕРИФИКАЦИЯ

После redeploy проверить:
1. ❌ https://www.cascaisfishing.com/auth/signin → НЕ должно быть Configuration Error
2. ✅ Google OAuth должен работать без ошибок  
3. ✅ GitHub OAuth должен работать без ошибок
4. ✅ https://www.cascaisfishing.com/api/chat/health → status: "healthy"
5. 🔥 **КРИТИЧНО:** https://www.cascaisfishing.com/api/profiles → должен возвращать JSON массив профилей (НЕ "Failed to fetch profiles")

---

## 🚨 ВАЖНО

- **Environment:** ОБЯЗАТЕЛЬНО выбирать "All Environments"
- **Порядок:** Добавить ВСЕ variables ПЕРЕД redeploy
- **Проверка:** После redeploy сразу тестировать auth flow

---

**⏳ ETA:** 10-15 минут на добавление + 2-3 минуты redeploy  
**🎯 РЕЗУЛЬТАТ:** Полностью рабочая authentication система в production
