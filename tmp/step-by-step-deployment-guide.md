# 🚀 Пошаговое развертывание Cascais Fishing на Vercel + Supabase

## 📋 Предварительная подготовка

### ✅ Что у вас уже есть:
- ✅ Next.js 15 проект
- ✅ Prisma схема с PostgreSQL
- ✅ GitHub репозиторий
- ✅ Домен cascaisfishing.com
- ✅ API ключи (OpenAI, Stripe, Weather, Stream)

---

## 🗄️ ЧАСТЬ 1: Настройка Supabase (Backend + Database)

### Шаг 1.1: Создание проекта Supabase

1. **Перейдите на** https://supabase.com
2. **Нажмите** "Start your project"
3. **Войдите через GitHub** (рекомендуется)
4. **Создайте организацию** (например, "cascais-fishing")
5. **Создайте новый проект:**
   ```
   Name: cascais-fishing
   Database Password: [создайте надежный пароль]
   Region: West Europe (closest to Portugal)
   ```
6. **Дождитесь создания** (~2 минуты)

### Шаг 1.2: Получение connection данных

1. **Перейдите в Settings → Database**
2. **Скопируйте Connection string:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. **Сохраните Project URL и anon key** из Settings → API

### Шаг 1.3: Настройка Database Schema

**Вариант A: Через Supabase SQL Editor (рекомендуется)**
1. **Откройте SQL Editor** в Supabase Dashboard
2. **Скопируйте содержимое** `prisma/schema.prisma`
3. **Создайте SQL скрипт** для создания таблиц:

```sql
-- Включить необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Затем выполните миграцию Prisma (см. Вариант B)
```

**Вариант B: Через Prisma Migration (проще)**
1. **Обновите DATABASE_URL** в `.env` локально:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
2. **Выполните миграцию:**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed  # если у вас есть seed скрипт
   ```

### Шаг 1.4: Настройка Row Level Security (RLS)

1. **Откройте Authentication → Policies**
2. **Для каждой таблицы включите RLS:**
   ```sql
   -- Пример для таблицы User
   ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
   
   -- Политика для чтения профиля
   CREATE POLICY "Users can view own profile" ON "User"
     FOR SELECT USING (auth.uid() = id::text);
   
   -- Политика для обновления профиля  
   CREATE POLICY "Users can update own profile" ON "User"
     FOR UPDATE USING (auth.uid() = id::text);
   ```

---

## 🚀 ЧАСТЬ 2: Настройка Vercel (Frontend + API)

### Шаг 2.1: Подключение GitHub к Vercel

1. **Перейдите на** https://vercel.com
2. **Войдите через GitHub**
3. **Import Git Repository**
4. **Выберите репозиторий** cascais-fishing
5. **Configure Project:**
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

### Шаг 2.2: Настройка Environment Variables

**В Vercel Dashboard → Settings → Environment Variables добавьте:**

```bash
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE-ROLE-KEY]"

# NextAuth
NEXTAUTH_URL="https://cascaisfishing.com"
NEXTAUTH_SECRET="[GENERATE-RANDOM-SECRET]"

# External APIs (ваши существующие)
OPENAI_API_KEY="[YOUR-OPENAI-KEY]"
STREAM_API_KEY="[YOUR-STREAM-KEY]"
STREAM_API_SECRET="[YOUR-STREAM-SECRET]"
OPENWEATHERMAP_API_KEY="[YOUR-WEATHER-KEY]"
STRIPE_PUBLISHABLE_KEY="[YOUR-STRIPE-PUBLIC]"
STRIPE_SECRET_KEY="[YOUR-STRIPE-SECRET]"
STRIPE_WEBHOOK_SECRET="[YOUR-STRIPE-WEBHOOK]"

# Additional
NODE_ENV="production"
```

### Шаг 2.3: Первый Deploy

1. **Нажмите Deploy** в Vercel
2. **Дождитесь завершения** (~3-5 минут)  
3. **Проверьте deployment** на временном URL

---

## 🌐 ЧАСТЬ 3: Настройка Custom Domain

### Шаг 3.1: Добавление домена в Vercel

1. **Vercel Dashboard → Settings → Domains**
2. **Add Domain:** `cascaisfishing.com`
3. **Add Domain:** `www.cascaisfishing.com`
4. **Vercel покажет DNS записи:**
   ```
   Type: A
   Name: @
   Value: 76.76.19.61
   
   Type: CNAME
   Name: www  
   Value: cname.vercel-dns.com
   ```

### Шаг 3.2: Настройка DNS в Dynadot

1. **Войдите в Dynadot** → Manage Domain → cascaisfishing.com
2. **DNS Settings → Change to "Dynadot DNS"**
3. **Добавьте записи из Vercel:**
   ```
   A Record: @ → 76.76.19.61
   CNAME Record: www → cname.vercel-dns.com
   ```
4. **Сохраните изменения**

### Шаг 3.3: Проверка SSL

1. **Подождите 24-48 часов** для DNS propagation
2. **Проверьте домен:** https://cascaisfishing.com
3. **SSL должен настроиться автоматически**

---

## ⚙️ ЧАСТЬ 4: Адаптация кода для Supabase

### Шаг 4.1: Обновление NextAuth конфигурации

**Создайте/обновите `lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Для server-side операций
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Шаг 4.2: Настройка Real-time для чатов

**В компонентах чата добавьте:**
```typescript
// Real-time subscriptions для Stream Chat
useEffect(() => {
  const channel = supabase
    .channel('fishing-trips')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'FishingTrip'
    }, (payload) => {
      // Обновление UI при изменениях
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

### Шаг 4.3: Настройка File Storage

**Для загрузки изображений в Fishing Diary:**
```typescript
// Замените локальную загрузку файлов на Supabase Storage
const { data, error } = await supabase.storage
  .from('fishing-photos')
  .upload(`${userId}/${fileName}`, file)

if (!error) {
  const { data: publicUrl } = supabase.storage
    .from('fishing-photos')
    .getPublicUrl(data.path)
}
```

---

## 🧪 ЧАСТЬ 5: Тестирование и отладка

### Шаг 5.1: Проверка основных функций

**Тестируйте последовательно:**
1. ✅ **Регистрация/авторизация**
2. ✅ **Создание профиля капитана**  
3. ✅ **Создание рыболовного тура**
4. ✅ **Система бронирования**
5. ✅ **Оплата через Stripe**
6. ✅ **Stream Chat интеграция**
7. ✅ **Fishing Diary с фото**
8. ✅ **AI рекомендации**

### Шаг 5.2: Мониторинг через Vercel

1. **Functions → View logs** для API routes
2. **Analytics** для производительности
3. **Speed Insights** для Core Web Vitals

### Шаг 5.3: Мониторинг через Supabase

1. **Database → Performance** для запросов
2. **API → Logs** для database операций
3. **Auth → Users** для управления пользователями

---

## 🎯 ЧАСТЬ 6: Оптимизация для Production

### Шаг 6.1: Настройка Vercel конфигурации

**Создайте `vercel.json`:**
```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "regions": ["fra1"],
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/webhooks/stripe",
      "destination": "/api/webhooks/stripe"
    }
  ]
}
```

### Шаг 6.2: Edge Functions для лучшей производительности

**Обновите критичные API routes:**
```typescript
// app/api/weather/route.ts
export const runtime = 'edge'

export async function GET() {
  // Weather API logic
}
```

### Шаг 6.3: Database Connection Pooling

**Настройте Prisma для serverless:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## ✅ Финальный Checklist

### Перед запуском:
- [ ] Supabase проект создан и настроен
- [ ] Database schema migrated
- [ ] RLS policies настроены
- [ ] Vercel проект подключен к GitHub
- [ ] Все environment variables добавлены  
- [ ] Custom domain настроен
- [ ] SSL certificate активен
- [ ] Все API endpoints работают
- [ ] Real-time функции тестированы
- [ ] Payment flow через Stripe работает

### После запуска:
- [ ] Analytics настроен
- [ ] Error monitoring активен  
- [ ] Performance мониторинг
- [ ] Database backup настроен
- [ ] SEO мета-теги проверены

---

## 🆘 Troubleshooting

### Проблема: Database connection error
**Решение:** Проверьте DATABASE_URL в environment variables

### Проблема: NextAuth не работает
**Решение:** Убедитесь что NEXTAUTH_URL указывает на production домен

### Проблема: Stripe webhooks не работают  
**Решение:** Проверьте STRIPE_WEBHOOK_SECRET и endpoint URL

### Проблема: Real-time не работает
**Решение:** Убедитесь что RLS policies разрешают нужные операции

---

## 🎉 Готово!

После выполнения всех шагов ваш проект **Cascais Fishing** будет полностью развернут на production-готовой инфраструктуре с возможностью бесплатного использования на начальной стадии.

**Время выполнения:** ~2-3 часа  
**Стоимость:** $0 для development  
**Масштабируемость:** До тысяч пользователей
