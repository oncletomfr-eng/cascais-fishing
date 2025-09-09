# 🎯 ПРОФЕССИОНАЛЬНЫЙ ПРОМПТ: РЕШЕНИЕ ПРОБЛЕМЫ STREAM CHAT WEBSOCKET TIMEOUT

## **РОЛЬ**
Вы — **Senior Full-Stack Developer** со специализацией в **Real-Time WebSocket архитектуре** и **Stream Chat интеграциях**. У вас глубокий опыт в диагностике и решении сложных проблем сетевой связи, WebSocket соединений, и производительности real-time приложений.

---

## **КОНТЕКСТ**

### 📊 **Техническая среда:**
- **Framework**: Next.js 14 + TypeScript + React 18
- **Real-Time Chat**: Stream Chat JS SDK + React Components 
- **Authentication**: NextAuth.js (Google OAuth)
- **SSE**: Server-Sent Events (работает идеально ✅)
- **Deployment**: Vercel Production
- **Region**: EU/Global users

### 🔍 **Текущее состояние системы:**

**✅ РАБОТАЕТ:**
- SSE подключения стабильны (`connected`, events parsing корректно)
- Авторизация через Google OAuth без rate limits
- Stream Chat API Keys валидны (health check: `healthy`)
- Online Users обновляются (SSE показывает активных пользователей)
- Использование правильного singleton pattern: `StreamChatClient.getInstance()`

**❌ ОСНОВНАЯ ПРОБЛЕМА:**
```javascript
// Console Error:
Failed to initialize enhanced chat: Error: Stream Chat WebSocket connection timeout (30s). 
This may be due to network restrictions or Stream Chat server unavailability.

// WebSocket Connection Pattern:
🔌 Attempting Stream Chat WebSocket connection...  
📡 Stream Chat API Key: 949qa8f3...
👤 User ID: 4b3b4f31-bd3c-4ae2-9c77-82d72ff798b2
❌ Stream Chat WebSocket connection timeout after 30s
💔 consecutive calls to connectUser detected
```

### 🧬 **Архитектурная структура:**
```typescript
// Текущая структура подключения:
const client = StreamChatClient.getInstance(apiKey);
await Promise.race([
  client.connectUser(userObject, token),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), 30000)
  )
]);
```

### 📈 **Metrics & Diagnostics:**
- **SSE Connection**: 100% success rate
- **Stream Chat WebSocket**: 0% success rate  
- **Token Generation**: 100% success rate
- **Network Latency**: EU-region users
- **Browser**: Modern (Chrome, Firefox, Safari)

---

## **ЗАДАЧА**

### 🎯 **Основная цель:**
Разработать **robust, production-ready решение** для устранения Stream Chat WebSocket connection timeouts с обеспечением 99.9% надежности подключения и graceful degradation.

### 📋 **Конкретные требования:**

#### **1. WebSocket Connection Resilience**
- Увеличить timeout до подходящего значения для глобальных пользователей
- Реализовать exponential backoff retry mechanism
- Добавить connection pooling optimization
- Внедрить региональные fallback стратегии

#### **2. Advanced Error Handling & Diagnostics**
- Детальное логирование всех этапов WebSocket handshake
- Network connectivity diagnostics (latency, packet loss detection)
- ISP/Firewall WebSocket blocking detection
- Real-time connection health monitoring

#### **3. Multiple Connection Strategies**
- **Primary**: Direct WebSocket connection
- **Fallback 1**: WebSocket через different ports (80, 443, 8080)
- **Fallback 2**: Long-polling fallback for restricted networks
- **Fallback 3**: SSE-only mode с частичным функционалом

#### **4. Production Performance Optimization**
- Connection caching между page refreshes
- WebSocket connection reuse optimization
- Минимизация re-renders которые вызывают reconnects
- Memory leak prevention в cleanup functions

#### **5. User Experience Excellence**
- Progressive loading states (не просто "Подключение к чату...")
- Connection quality indicators (🟢 Excellent, 🟡 Good, 🔴 Poor)
- Автоматический retry с пользовательским контролем
- Seamless graceful degradation UI

### 🔧 **Технические требования:**

#### **Code Quality:**
- TypeScript strict mode compliance
- Zero linter errors
- Comprehensive error boundaries
- Unit tests для connection logic

#### **Performance Targets:**
- WebSocket connection: < 10 секунд в 95% случаев  
- Retry success rate: > 90%
- Memory usage: < 50MB для chat client
- CPU overhead: < 5% при активном чате

#### **Browser Compatibility:**
- Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- Mobile browsers (iOS Safari, Android Chrome)
- Различные network conditions (3G, 4G, 5G, WiFi)

### 📊 **Success Metrics:**
- **Connection Success Rate**: > 99%
- **Average Connection Time**: < 8 секунд
- **User Satisfaction**: Zero "застрявших на подключении" сценариев
- **Error Recovery**: 100% graceful failure handling

---

## **ДОПОЛНИТЕЛЬНЫЕ СООБРАЖЕНИЯ**

### 🌐 **Network Environment Factors:**
- Corporate firewalls могут блокировать WebSocket
- ISP throttling/blocking WebSocket connections
- Regional CDN availability для Stream Chat
- Mobile network restrictions

### 🏗️ **Architectural Patterns:**
- Observer pattern для connection state management
- Strategy pattern для различных connection methods
- Circuit breaker pattern для failing connections
- Singleton pattern preservation для client instances

### 🔒 **Security & Privacy:**
- Secure WebSocket (WSS) enforcement
- Connection origin validation
- Token refresh mechanism для long sessions
- User data privacy в diagnostic logs

---

## **DELIVERABLES**

1. **Production-ready код** с полной реализацией robust WebSocket connection logic
2. **Comprehensive error handling** со всеми fallback strategies 
3. **User experience enhancements** с proper loading states и connection indicators
4. **Performance optimizations** для минимизации connection overhead
5. **Testing strategy** для validation всех connection scenarios
6. **Documentation** по troubleshooting и maintenance

### 🚀 **Немедленная цель:**
Устранить "Подключение к чату..." проблему и обеспечить, что **100% пользователей** могут успешно подключаться к Stream Chat **в production environment** с **отличным user experience**.
