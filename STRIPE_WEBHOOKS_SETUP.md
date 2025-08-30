# 🔗 НАСТРОЙКА STRIPE WEBHOOKS

**Дата:** 28 августа 2025  
**Цель:** Настроить автоматическую обработку платежей через Stripe webhooks

---

## 🎯 **ЧТО СОЗДАНО**

### ✅ **Webhook Handler**
```
/app/api/stripe-webhooks/route.ts
```
- Обрабатывает успешные платежи
- Обрабатывает неудачные платежи  
- Обрабатывает отменные платежи
- Обрабатывает споры по платежам
- Обновляет статусы в базе данных

### ✅ **Test Endpoint**
```
/app/api/test-stripe-webhooks/route.ts
```
- Проверка конфигурации webhooks
- Симуляция webhook событий для тестирования

---

## ⚙️ **НАСТРОЙКА PRODUCTION WEBHOOKS**

### **1. В Stripe Dashboard**

1. **Войти в Stripe Dashboard**
   ```
   https://dashboard.stripe.com/
   ```

2. **Перейти к Webhooks**
   - Developers → Webhooks
   - Нажать "Add endpoint"

3. **Добавить endpoint URL**
   ```
   https://yourdomain.com/api/stripe-webhooks
   ```

4. **Выбрать события для мониторинга**
   ```
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed
   ✅ payment_intent.canceled
   ✅ payment_intent.processing
   ✅ charge.dispute.created
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ```

5. **Получить Webhook Secret**
   - После создания webhook скопировать "Signing secret"
   - Начинается с `whsec_`

### **2. В Environment Variables**

Добавить в `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🧪 **ЛОКАЛЬНОЕ ТЕСТИРОВАНИЕ**

### **Метод 1: Stripe CLI**

1. **Установить Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Или скачать: https://stripe.com/docs/stripe-cli
   ```

2. **Логин в Stripe**
   ```bash
   stripe login
   ```

3. **Слушать webhook события**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhooks
   ```

4. **Получить test webhook secret**
   Команда выше покажет webhook secret для тестирования:
   ```
   Your webhook signing secret is whsec_xxxxx (^C to quit)
   ```

5. **Обновить .env.local для тестирования**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### **Метод 2: Test Endpoint**

1. **Проверить конфигурацию**
   ```bash
   curl http://localhost:3000/api/test-stripe-webhooks
   ```

2. **Симулировать событие**
   ```bash
   curl -X POST http://localhost:3000/api/test-stripe-webhooks \
     -H "Content-Type: application/json" \
     -d '{
       "event_type": "payment_intent.succeeded",
       "payment_intent_id": "pi_xxxxxxxxx"
     }'
   ```

---

## 📋 **ТЕСТИРОВАНИЕ WEBHOOK FLOW**

### **Сценарий 1: Успешный платеж**

1. **Создать тестовый платеж**
   ```bash
   curl -X POST http://localhost:3000/api/payments \
     -H "Content-Type: application/json" \
     -d '{
       "type": "TOUR_BOOKING",
       "amount": 5000,
       "description": "Test booking"
     }'
   ```

2. **Подтвердить платеж в Stripe Dashboard**
   - Test payments → найти Payment Intent
   - Нажать "Succeed payment"

3. **Проверить webhook обработку**
   - Logs в терминале должны показать обновление
   - Проверить статус в базе данных

### **Сценарий 2: Неудачный платеж**

1. **Использовать тестовую карту с ошибкой**
   ```
   Card: 4000 0000 0000 0002
   Result: Declined (generic decline)
   ```

2. **Webhook автоматически обновит статус на FAILED**

---

## 🔍 **МОНИТОРИНГ И DEBUGGING**

### **В Stripe Dashboard**
- Developers → Webhooks → ваш endpoint
- Вкладка "Recent deliveries" показывает все webhook события
- Статусы: ✅ Succeeded, ❌ Failed, ⏳ Pending

### **В Приложении**
- Логи в консоли: `console.log` из webhook handler
- Database: проверить обновления в таблице `payments`

### **Troubleshooting**

❌ **400 Bad Request**
- Неверная webhook signature
- Проверить STRIPE_WEBHOOK_SECRET

❌ **500 Internal Error**  
- Ошибка в webhook handler коде
- Проверить логи приложения

❌ **Webhook не получен**
- Проверить URL endpoint
- Проверить firewall/proxy настройки

---

## 📊 **EXPECTED BEHAVIOR**

### **После настройки webhooks:**

1. **Платеж создается** → Status: `PENDING`
2. **Пользователь платит** → Stripe отправляет webhook
3. **Webhook обработан** → Status: `SUCCEEDED`
4. **Бронирование подтверждается** → Email отправляется
5. **Participant получает уведомление** → Поездка активна

### **Автоматические действия:**
- ✅ Статусы платежей обновляются
- ✅ Бронирования подтверждаются
- ✅ Email уведомления отправляются
- ✅ Подписки активируются
- ✅ Споры регистрируются

---

## 🚀 **PRODUCTION CHECKLIST**

### **До запуска:**
- [ ] Webhook endpoint создан в Stripe Dashboard
- [ ] STRIPE_WEBHOOK_SECRET добавлен в .env
- [ ] HTTPS настроен для домена
- [ ] Webhook протестирован с реальными событиями

### **После запуска:**
- [ ] Мониторинг webhook delivery rates
- [ ] Alerting при failed webhooks  
- [ ] Backup план при downtime webhooks
- [ ] Регулярная проверка webhook логов

---

## 💡 **РЕЗУЛЬТАТ**

После настройки webhooks:
- **100% автоматизация платежей** ✅
- **Мгновенные обновления статусов** ⚡
- **Надежная обработка ошибок** 🛡️
- **Production-ready система** 🎯

**Критический функционал проекта теперь полностью реализован!**
