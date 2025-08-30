import { NextRequest, NextResponse } from 'next/server';

/**
 * Weather API endpoint
 * Интеграция с OpenWeatherMap для получения погодных данных
 */

const OPENWEATHER_BASE_URL = 'http://api.openweathermap.org/data/2.5';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    
    if (!lat || !lon) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: lat, lon'
      }, { status: 400 });
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenWeatherMap API key not configured'
      }, { status: 500 });
    }

    // Получаем текущую погоду
    const currentWeatherUrl = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru`;
    const currentWeatherResponse = await fetch(currentWeatherUrl);
    
    if (!currentWeatherResponse.ok) {
      const errorText = await currentWeatherResponse.text();
      console.error('OpenWeatherMap API error:', errorText);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch weather data',
        details: {
          status: currentWeatherResponse.status,
          statusText: currentWeatherResponse.statusText
        }
      }, { status: 502 });
    }

    const currentWeather = await currentWeatherResponse.json();
    
    // Получаем прогноз на 5 дней
    const forecastUrl = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru`;
    const forecastResponse = await fetch(forecastUrl);
    
    let forecast = null;
    if (forecastResponse.ok) {
      forecast = await forecastResponse.json();
    }

    // Формируем ответ
    const weatherData = {
      location: {
        name: currentWeather.name,
        country: currentWeather.sys?.country,
        coordinates: {
          lat: parseFloat(lat),
          lon: parseFloat(lon)
        }
      },
      current: {
        temperature: Math.round(currentWeather.main.temp),
        feelsLike: Math.round(currentWeather.main.feels_like),
        humidity: currentWeather.main.humidity,
        pressure: currentWeather.main.pressure,
        windSpeed: currentWeather.wind?.speed || 0,
        windDirection: currentWeather.wind?.deg || 0,
        visibility: currentWeather.visibility ? currentWeather.visibility / 1000 : null, // км
        uvIndex: null, // Не доступен в current weather API
        condition: {
          main: currentWeather.weather[0]?.main,
          description: currentWeather.weather[0]?.description,
          icon: currentWeather.weather[0]?.icon
        },
        timestamp: new Date(currentWeather.dt * 1000).toISOString()
      },
      forecast: forecast ? {
        daily: forecast.list.filter((_: any, index: number) => index % 8 === 0).slice(0, 5).map((day: any) => ({
          date: new Date(day.dt * 1000).toISOString().split('T')[0],
          temperature: {
            min: Math.round(day.main.temp_min),
            max: Math.round(day.main.temp_max)
          },
          condition: {
            main: day.weather[0]?.main,
            description: day.weather[0]?.description,
            icon: day.weather[0]?.icon
          },
          windSpeed: day.wind?.speed || 0,
          humidity: day.main.humidity,
          precipitation: day.rain ? day.rain['3h'] || 0 : 0
        })),
        hourly: forecast.list.slice(0, 24).map((hour: any) => ({
          datetime: new Date(hour.dt * 1000).toISOString(),
          temperature: Math.round(hour.main.temp),
          condition: {
            main: hour.weather[0]?.main,
            description: hour.weather[0]?.description,
            icon: hour.weather[0]?.icon
          },
          windSpeed: hour.wind?.speed || 0,
          precipitation: hour.rain ? hour.rain['3h'] || 0 : 0
        }))
      } : null,
      fishingConditions: {
        overall: getFishingConditions(currentWeather),
        windCondition: getWindCondition(currentWeather.wind?.speed || 0),
        pressureCondition: getPressureCondition(currentWeather.main.pressure),
        temperatureCondition: getTemperatureCondition(currentWeather.main.temp),
        recommendation: getFishingRecommendation(currentWeather)
      },
      metadata: {
        source: 'OpenWeatherMap',
        apiVersion: '2.5',
        requestTime: new Date().toISOString(),
        coordinates: `${lat},${lon}`,
        units: 'metric'
      }
    };

    return NextResponse.json({
      success: true,
      data: weatherData
    });

  } catch (error) {
    console.error('Weather API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Определяет общие условия для рыбалки
 */
function getFishingConditions(weather: any): 'excellent' | 'good' | 'fair' | 'poor' {
  const windSpeed = weather.wind?.speed || 0;
  const temp = weather.main.temp;
  const pressure = weather.main.pressure;
  
  let score = 0;
  
  // Ветер
  if (windSpeed < 3) score += 3;
  else if (windSpeed < 6) score += 2;
  else if (windSpeed < 10) score += 1;
  
  // Температура
  if (temp >= 15 && temp <= 25) score += 3;
  else if (temp >= 10 && temp <= 30) score += 2;
  else if (temp >= 5 && temp <= 35) score += 1;
  
  // Давление
  if (pressure >= 1013 && pressure <= 1025) score += 2;
  else if (pressure >= 1005 && pressure <= 1030) score += 1;
  
  // Осадки
  if (!weather.rain && !weather.snow) score += 2;
  
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 4) return 'fair';
  return 'poor';
}

/**
 * Оценивает условия ветра для рыбалки
 */
function getWindCondition(windSpeed: number): { rating: string; description: string } {
  if (windSpeed < 2) {
    return { rating: 'excellent', description: 'Штиль - отличные условия' };
  } else if (windSpeed < 5) {
    return { rating: 'good', description: 'Легкий ветер - хорошие условия' };
  } else if (windSpeed < 8) {
    return { rating: 'fair', description: 'Умеренный ветер - приемлемые условия' };
  } else {
    return { rating: 'poor', description: 'Сильный ветер - сложные условия' };
  }
}

/**
 * Оценивает атмосферное давление для рыбалки
 */
function getPressureCondition(pressure: number): { rating: string; description: string } {
  if (pressure >= 1015 && pressure <= 1025) {
    return { rating: 'excellent', description: 'Стабильное высокое давление - отлично' };
  } else if (pressure >= 1010 && pressure <= 1030) {
    return { rating: 'good', description: 'Нормальное давление - хорошо' };
  } else if (pressure >= 1000 && pressure <= 1035) {
    return { rating: 'fair', description: 'Изменчивое давление - приемлемо' };
  } else {
    return { rating: 'poor', description: 'Экстремальное давление - неблагоприятно' };
  }
}

/**
 * Оценивает температуру для рыбалки
 */
function getTemperatureCondition(temp: number): { rating: string; description: string } {
  if (temp >= 18 && temp <= 24) {
    return { rating: 'excellent', description: 'Оптимальная температура для рыбалки' };
  } else if (temp >= 12 && temp <= 28) {
    return { rating: 'good', description: 'Хорошая температура' };
  } else if (temp >= 5 && temp <= 32) {
    return { rating: 'fair', description: 'Приемлемая температура' };
  } else {
    return { rating: 'poor', description: 'Экстремальная температура' };
  }
}

/**
 * Генерирует рекомендации для рыбалки
 */
function getFishingRecommendation(weather: any): string {
  const windSpeed = weather.wind?.speed || 0;
  const temp = weather.main.temp;
  const condition = weather.weather[0]?.main.toLowerCase();
  
  if (condition.includes('rain')) {
    return 'Дождь может активизировать клев, но будьте осторожны. Рекомендуется защищенные места.';
  }
  
  if (condition.includes('storm')) {
    return 'Штормовые условия опасны для рыбалки. Отложите поездку до улучшения погоды.';
  }
  
  if (windSpeed > 10) {
    return 'Сильный ветер затруднит рыбалку. Выбирайте защищенные от ветра места.';
  }
  
  if (temp < 5) {
    return 'Холодная погода. Рыба менее активна. Используйте медленную проводку.';
  }
  
  if (temp > 30) {
    return 'Жаркая погода. Рыбачьте рано утром или вечером, когда прохладнее.';
  }
  
  if (condition.includes('clear') && windSpeed < 5) {
    return 'Отличные условия для рыбалки! Ясная погода и спокойное море.';
  }
  
  return 'Приемлемые условия для рыбалки. Следите за изменениями погоды.';
}
