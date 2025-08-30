# 🗝️ Получение API ключей для Морского календаря

## 🎯 **Необходимые API для полной реализации ТЗ**

### 1. 🌤️ **OpenWeatherMap API** (Погода и океанографические данные)

**Что получаем:**
- Текущая погода и прогноз
- Температура воды
- Скорость и направление ветра
- Атмосферное давление
- Морское волнение

**Как получить:**

1. **Регистрация:** https://openweathermap.org/api
2. **Выбор плана:**
   - Free tier: 1000 запросов/день
   - Paid: от $40/месяц за больше запросов
3. **API endpoints:**
   ```
   Current weather: https://api.openweathermap.org/data/2.5/weather
   Marine weather: https://api.openweathermap.org/data/2.5/onecall
   ```

**Добавить в .env:**
```bash
OPENWEATHER_API_KEY=your_api_key_here
```

### 2. 🌊 **NOAA Tides API** (Приливы и отливы)

**Что получаем:**
- Точные данные приливов/отливов
- Высота воды по часам
- Времена максимальных/минимальных уровней

**Как получить:**

1. **Бесплатно:** https://tidesandcurrents.noaa.gov/api/
2. **Без регистрации** - публичный API
3. **API endpoints:**
   ```
   Predictions: https://tidesandcurrents.noaa.gov/api/datagetter
   Stations: https://tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json
   ```

**Пример использования:**
```typescript
const tidalData = await fetch(
  `https://tidesandcurrents.noaa.gov/api/datagetter?date=today&station=9414290&product=predictions&datum=MLLW&time_zone=gmt&units=metric&format=json`
);
```

### 3. 📡 **NASA API** (Точные астрономические данные)

**Что получаем:**
- Точные фазы луны
- Восход/заход луны и солнца
- Астрономические события

**Как получить:**

1. **Регистрация:** https://api.nasa.gov/
2. **Бесплатно:** 1000 запросов/час
3. **API endpoints:**
   ```
   Earth Imagery: https://api.nasa.gov/planetary/earth/imagery
   APOD: https://api.nasa.gov/planetary/apod
   ```

**Добавить в .env:**
```bash
NASA_API_KEY=your_nasa_api_key
```

### 4. 🐟 **FishBase API** (Данные о рыбах)

**Что получаем:**
- Биологические данные о видах рыб
- Предпочитаемые температуры и глубины
- Миграционные паттерны

**Как получить:**

1. **Сайт:** https://www.fishbase.se/manual/english/FishBaseThe_SPECIES_Table.htm
2. **API:** http://fishbase.ropensci.org/
3. **Бесплатный доступ**

**Пример использования:**
```typescript
const speciesData = await fetch(`https://fishbase.ropensci.org/species?Genus=Thunnus`);
```

### 5. 🌊 **Marine Traffic API** (Морские данные)

**Что получаем:**
- Течения
- Температура поверхности моря
- Соленость воды

**Как получить:**

1. **Регистрация:** https://www.marinetraffic.com/en/ais-api-services
2. **Платные планы:** от $100/месяц
3. **API endpoints:**
   ```
   Vessel Positions: https://services.marinetraffic.com/api/exportvessels
   ```

### 6. 🗺️ **Google Maps API** (Геолокация)

**Что получаем:**
- Точные координаты
- Расстояния от берега
- Глубины в точках

**Как получить:**

1. **Google Cloud Console:** https://console.cloud.google.com/
2. **Включить APIs:** Maps JavaScript API, Geocoding API
3. **Free tier:** $200 кредитов в месяц

**Добавить в .env:**
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## 🔧 **Быстрый старт с бесплатными API**

### Минимальный набор для тестирования:

```bash
# .env файл
OPENWEATHER_API_KEY=get_from_openweathermap_org
NASA_API_KEY=DEMO_KEY  # Для начала можно использовать демо-ключ
GOOGLE_MAPS_API_KEY=get_from_google_cloud_console

# NOAA API не требует ключа
# FishBase API бесплатный
```

### Порядок получения:

1. **Начать с OpenWeatherMap** (самый важный)
2. **NASA API** для астрономии
3. **Google Maps** для геолокации
4. **NOAA** уже доступен без регистрации
5. **FishBase** бесплатный
6. **Marine Traffic** в последнюю очередь (платный)

## 📝 **Пример конфигурации**

```typescript
// lib/config/api-keys.ts
export const API_KEYS = {
  OPENWEATHER: process.env.OPENWEATHER_API_KEY,
  NASA: process.env.NASA_API_KEY || 'DEMO_KEY',
  GOOGLE_MAPS: process.env.GOOGLE_MAPS_API_KEY,
  // NOAA не требует ключа
};

export const API_ENDPOINTS = {
  WEATHER: 'https://api.openweathermap.org/data/2.5',
  TIDES: 'https://tidesandcurrents.noaa.gov/api/datagetter',
  NASA: 'https://api.nasa.gov',
  FISHBASE: 'https://fishbase.ropensci.org',
  GMAPS: 'https://maps.googleapis.com/maps/api'
};
```

## ⚡ **Быстрая установка основных API**

Для немедленного тестирования получите:

1. **OpenWeatherMap** (5 минут регистрации)
   - Откройте https://openweathermap.org/api
   - Sign Up → Free tier
   - Скопируйте API key

2. **NASA API** (2 минуты)
   - Откройте https://api.nasa.gov/
   - Generate API Key
   - Введите email

3. **Google Maps** (10 минут)
   - Google Cloud Console
   - New Project → Enable APIs
   - Create credentials

**После получения ключей добавьте в `.env`:**
```bash
OPENWEATHER_API_KEY=ваш_ключ_openweather
NASA_API_KEY=ваш_nasa_ключ
GOOGLE_MAPS_API_KEY=ваш_google_ключ
```

## 🚀 **После получения API**

Следующие шаги:
1. Обновить сервисы для использования реальных API
2. Заменить упрощенные алгоритмы на точные расчеты
3. Интегрировать погодные данные в морской календарь
4. Добавить реальные приливные данные
5. Протестировать все функции с реальными данными
