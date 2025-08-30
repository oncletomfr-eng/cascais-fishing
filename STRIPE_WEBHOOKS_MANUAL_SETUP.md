# 🔗 MANUAL STRIPE WEBHOOKS SETUP GUIDE

**Дата:** 29 января 2025  
**Основано на:** Context7 Stripe документации и лучших практиках  
**Автоматический скрипт:** `scripts/setup-stripe-webhooks.js`  

---

## 🎯 **ДВА СПОСОБА НАСТРОЙКИ WEBHOOKS**

### **СПОСОБ 1: АВТОМАТИЧЕСКИЙ СКРИПТ (РЕКОМЕНДУЕТСЯ)**

```bash
# Убедитесь что у вас настроен .env.local с live keys
cd /Users/vitavitalij/Documents/cascais-fishing

# Запустите скрипт автоматической настройки
node scripts/setup-stripe-webhooks.js

# Скопируйте webhook secret в .env.local
```

### **СПОСОБ 2: РУЧНАЯ НАСТРОЙКА ЧЕРЕЗ DASHBOARD**

---

## 📋 **ПОШАГОВАЯ РУЧНАЯ НАСТРОЙКА**

### **Шаг 1: Войдите в Stripe Dashboard**

1. Перейдите на https://dashboard.stripe.com/
2. **ВАЖНО:** Убедитесь что вы в **Live mode** (переключатель слева внизу должен быть зеленым)

### **Шаг 2: Перейдите к Webhooks**

**ВАРИАНТ A (Новый интерфейс Workbench):**
1. В URL введите: `https://dashboard.stripe.com/webhooks`
2. Если откроется Workbench → кликните вкладку "destinations"
3. Нажмите "Create webhook" (Add destination)

**ВАРИАНТ B (Классический интерфейс):**
1. В навигации найдите "Developers" → "Webhooks"
2. Нажмите "Add endpoint"

### **Шаг 3: Настройте Webhook Endpoint**

**Конфигурация endpoint:**

```
Endpoint URL: https://cascaisfishing.com/api/stripe-webhooks
Description: Cascais Fishing - Production Webhook
```

**Выберите события для мониторинга:**

✅ **Обязательные события (Context7 рекомендация):**
```
☑ checkout.session.completed
☑ customer.subscription.created
☑ customer.subscription.updated
☑ customer.subscription.deleted
☑ customer.subscription.paused
☑ customer.subscription.resumed
☑ invoice.paid
☑ invoice.payment_failed
☑ invoice.payment_succeeded
☑ payment_intent.succeeded
☑ payment_intent.payment_failed
☑ payment_intent.canceled
☑ payment_intent.processing
☑ charge.dispute.created
```

### **Шаг 4: Получите Webhook Secret**

После создания webhook:

1. Кликните на созданный webhook endpoint
2. В разделе "Signing secret" нажмите **"Reveal"**
3. Скопируйте secret (начинается с `whsec_`)

### **Шаг 5: Обновите .env.local**

```bash
# Обновите файл .env.local
STRIPE_WEBHOOK_SECRET="whsec_ваш_реальный_секрет_здесь"
```

**Быстрая команда для обновления:**
```bash
sed -i '' 's/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET="whsec_ваш_секрет"/' .env.local
```

---

## 🧪 **ТЕСТИРОВАНИЕ WEBHOOK**

### **Способ 1: Через Stripe Dashboard**

1. В webhook settings нажмите "Send test webhook"
2. Выберите событие `payment_intent.succeeded`
3. Нажмите "Send test webhook"
4. Проверьте логи вашего приложения

### **Способ 2: Через Stripe CLI**

```bash
# Установите Stripe CLI
brew install stripe/stripe-cli/stripe

# Авторизуйтесь
stripe login

# Отправьте тестовое событие
stripe trigger payment_intent.succeeded
```

### **Способ 3: Создать тестовый платеж**

```bash
# Запустите ваше приложение
npm run dev

# Создайте тестовый checkout session
curl -X POST http://localhost:3001/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_1S0sGVFwX7vboUlLvRXgNxmr",
    "mode": "subscription"
  }'
```

---

## 📊 **ПРОВЕРКА РАБОТОСПОСОБНОСТИ**

### **Индикаторы успешной настройки:**

✅ **В Stripe Dashboard:**
- Webhook endpoint отображается как "Enabled"
- Recent deliveries показывают успешные доставки (200 OK)

✅ **В логах приложения:**
```bash
✅ Webhook signature verified: payment_intent.succeeded
✅ Successfully processed event: payment_intent.succeeded (evt_xxx)
💰 Processing successful payment: pi_xxx
✅ Payment updated in database: payment_123
```

✅ **В базе данных:**
- Статусы платежей обновляются автоматически
- Подписки активируются после оплаты

---

## 🔧 **TROUBLESHOOTING**

### **❌ Webhook signature verification failed**

**Причины:**
- Неверный `STRIPE_WEBHOOK_SECRET`
- Webhook secret от test mode, а используются live keys

**Решение:**
1. Убедитесь что webhook создан в Live mode
2. Получите новый signing secret
3. Обновите .env.local

### **❌ 400 Bad Request**

**Причины:**
- Неправильный URL endpoint
- Приложение недоступно из интернета

**Решение:**
1. Убедитесь что домен доступен: `curl -I https://cascaisfishing.com/api/stripe-webhooks`
2. Проверьте HTTPS сертификат
3. Проверьте firewall настройки

### **❌ 500 Internal Server Error**

**Причины:**
- Ошибка в обработке webhook
- Проблемы с базой данных

**Решение:**
1. Проверьте логи приложения
2. Убедитесь что база данных доступна
3. Проверьте правильность структуры данных

---

## 🚀 **PRODUCTION DEPLOYMENT CHECKLIST**

### **Перед запуском:**

- [ ] ✅ Webhook создан в **Live mode**
- [ ] ✅ Все 14 событий выбраны
- [ ] ✅ `STRIPE_WEBHOOK_SECRET` обновлен в production
- [ ] ✅ HTTPS настроен для домена
- [ ] ✅ Endpoint возвращает 200 OK на тестовые события

### **После запуска:**

- [ ] 📊 Настроить мониторинг webhook delivery rates
- [ ] 🚨 Alerting при failed webhooks (>5% failure rate)
- [ ] 🔄 Backup план при webhook downtime
- [ ] 📝 Логирование всех webhook событий
- [ ] 🧪 Регулярное тестирование webhook endpoint

---

## 🎯 **КОНФИГУРАЦИЯ ОСНОВАНА НА ЛУЧШИХ ПРАКТИКАХ**

### **Context7 Stripe Node.js рекомендации:**
- ✅ API version pinned: `2024-12-18.acacia`
- ✅ Signature verification включена
- ✅ Event filtering по allowed types
- ✅ Customer data synchronization
- ✅ Proper error handling
- ✅ Idempotent event processing

### **t3dotgg patterns:**
- ✅ Centralized event processing
- ✅ Customer ID extraction and validation
- ✅ Database sync на каждое событие
- ✅ Production-ready logging

---

## 📞 **ПОДДЕРЖКА**

Если webhook не работает:

1. **Проверьте скрипт:** `node scripts/check-stripe-production.js`
2. **Логи Stripe:** Dashboard → Webhooks → Recent deliveries
3. **Логи приложения:** Проверьте вывод сервера
4. **Тест endpoint:** `curl -X POST https://cascaisfishing.com/api/stripe-webhooks`

**ГОТОВО К PRODUCTION! 🚀**
