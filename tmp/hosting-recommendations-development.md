# 🚀 Рекомендации хостинга для Cascais Fishing (Development Stage)

## 🏆 Оптимальная связка: Vercel + Supabase (FREE)

### **Frontend: Vercel**
- **Цена:** FREE (Hobby Plan)
- **Лимиты:** 100GB bandwidth, безлимитные деплои
- **Преимущества для Next.js 15:**
  - Native поддержка App Router
  - Edge Runtime для API routes  
  - Automatic optimizations
  - GitHub integration
  - Instant deployments

### **Backend + DB: Supabase**
- **Цена:** FREE (включает PostgreSQL)
- **Лимиты:** 500MB DB, 2GB bandwidth
- **Преимущества для проекта:**
  - PostgreSQL (как в проекте)
  - Real-time subscriptions (для чатов)
  - Built-in Auth (совместим с NextAuth)
  - Storage для файлов
  - Edge Functions

## 🔧 Настройка для проекта

### 1. Environment Variables (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database URL для Prisma
DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL=https://cascaisfishing.com
NEXTAUTH_SECRET=your-secret

# External APIs (существующие в проекте)
OPENAI_API_KEY=your-openai-key
STREAM_API_KEY=your-stream-key  
OPENWEATHERMAP_API_KEY=your-weather-key
STRIPE_PUBLISHABLE_KEY=your-stripe-key
STRIPE_SECRET_KEY=your-stripe-secret
```

### 2. Vercel Configuration (vercel.json)
```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 10
    }
  },
  "regions": ["fra1"],
  "framework": "nextjs"
}
```

## 💡 Альтернативные варианты

### **Railway** ($5/месяц)
```
✅ Все-в-одном решение
✅ PostgreSQL включена
✅ Docker поддержка
✅ Автоскейлинг
✅ Простая настройка
```

### **PlanetScale + Vercel** (FREE)
```
✅ Serverless MySQL
✅ Database branching
✅ Prisma совместимость  
❌ Нужна адаптация с PostgreSQL на MySQL
```

### **Render** ($7/месяц)
```
✅ PostgreSQL включена
✅ Static sites бесплатно
✅ Docker поддержка
❌ Медленнее чем Vercel
```

### **Heroku** ($7-25/месяц)
```
✅ Проверенная платформа
✅ PostgreSQL add-on
❌ Дороже альтернатив
❌ Sleep mode на бесплатном плане убран
```

## 🎯 Пошаговый план развертывания

### Phase 1: Настройка Supabase
1. Создать проект на supabase.com
2. Импортировать Prisma схему в Supabase
3. Настроить Row Level Security (RLS)
4. Получить connection string

### Phase 2: Настройка Vercel  
1. Подключить GitHub репозиторий
2. Добавить environment variables
3. Настроить custom domain (cascaisfishing.com)
4. Активировать Analytics

### Phase 3: Миграция данных
1. Обновить DATABASE_URL в .env
2. Запустить `npx prisma migrate deploy`
3. Засидить начальные данные
4. Протестировать все API endpoints

## 💰 Сравнение стоимости (месяц)

| Решение | Цена | PostgreSQL | Bandwidth | Деплои |
|---------|------|------------|-----------|---------|
| **Vercel + Supabase** | **FREE** | ✅ 500MB | 100GB | ∞ |
| Railway | $5 | ✅ Unlimited | 100GB | ∞ |
| PlanetScale + Vercel | FREE | ❌ MySQL | 100GB | ∞ |
| Render | $7 | ✅ Unlimited | 100GB | ∞ |

## 🚀 Для Production (будущее)

При переходе на production рекомендуется:
- **Vercel Pro** ($20/месяц) + **Supabase Pro** ($25/месяц)
- Или **Railway Pro** ($20/месяц) 
- Добавить **Cloudflare** для CDN и security

## ⚡ Быстрый старт

```bash
# 1. Создать Supabase проект
# 2. Получить credentials
# 3. Обновить .env.local
# 4. Подключить Vercel к GitHub
# 5. Деплой!

npm run build
vercel --prod
```

Рекомендация: **Начать с Vercel + Supabase** для бесплатной разработки, затем масштабировать по необходимости.
