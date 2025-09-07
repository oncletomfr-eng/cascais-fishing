# 🚨 КРИТИЧНО: Vercel Environment Variables Setup

**Статус:** БЛОКИРУЮЩАЯ ЗАДАЧА - без этого auth не работает в production  
**Задачи:** auth-1-3, auth-2-3, auth-3-3 из RESTT плана

---

## 🔑 ENVIRONMENT VARIABLES ДЛЯ VERCEL

Добавьте ВСЕ эти переменные в Vercel Dashboard → Settings → Environment Variables:

### 1. NextAuth v5 Configuration:
```
AUTH_SECRET=cascais-fishing-next-auth-secret-2024-development
AUTH_URL=https://www.cascaisfishing.com/
```

### 2. Google OAuth (NextAuth v5 format):
```
AUTH_GOOGLE_ID=268443624329-0tningcfnejjev0fngg1uh9pct123hpp.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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
```

### 3. GitHub OAuth (NextAuth v5 format):
```
AUTH_GITHUB_ID=Ov23lidOAF9VzbED5CvV
AUTH_GITHUB_SECRET=9ef7cb02b0219463d7133b700ba21b0f6bc78a6d
```

### 4. Stream Chat (уже найдены в .env):
```
NEXT_PUBLIC_STREAM_CHAT_API_KEY=8k83mgjc5mtt
STREAM_CHAT_API_SECRET=nx3f8rrnyhv68w9y64yj2k8jrqxrhhrmnchpr2uuxu94nbd7799qxdu95gqnv2u4
```

### 5. Database (Supabase):
```
DATABASE_URL=postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
```

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

---

## 🚨 ВАЖНО

- **Environment:** ОБЯЗАТЕЛЬНО выбирать "All Environments"
- **Порядок:** Добавить ВСЕ variables ПЕРЕД redeploy
- **Проверка:** После redeploy сразу тестировать auth flow

---

**⏳ ETA:** 10-15 минут на добавление + 2-3 минуты redeploy  
**🎯 РЕЗУЛЬТАТ:** Полностью рабочая authentication система в production
