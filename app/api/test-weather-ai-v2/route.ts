import { NextRequest, NextResponse } from 'next/server';
import { smartRecommendationsServiceV2 } from '@/lib/services/smart-recommendations-service-v2';

// GET - проверка здоровья API и статистика
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Проверка состояния OpenAI API...');

    // Проверяем здоровье API
    const healthCheck = await smartRecommendationsServiceV2.checkAPIHealth();
    
    // Получаем статистику использования
    const usageStats = await smartRecommendationsServiceV2.getUsageStats();

    return NextResponse.json({
      success: true,
      apiHealth: healthCheck,
      usageStats: usageStats,
      timestamp: new Date().toISOString(),
      message: 'Диагностика завершена'
    });

  } catch (error) {
    console.error('❌ Ошибка диагностики API:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Ошибка диагностики', 
        error: error?.toString() 
      },
      { status: 500 }
    );
  }
}

// POST - тестирование погодных AI рекомендаций
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Тестовые данные по умолчанию (условия для хорошей рыбалки в Кашкайш)
    const testWeatherData = {
      temperature: body.temperature || 18,
      windSpeed: body.windSpeed || 5.5,
      windDirection: body.windDirection || 'NORTH_WEST',
      pressure: body.pressure || 1015,
      humidity: body.humidity || 70,
      cloudCover: body.cloudCover || 0.3,
      location: body.location || { lat: 38.6973, lon: -9.4208 }
    };

    console.log('🌤️ Тестируем погодные AI рекомендации...');
    console.log('Условия:', JSON.stringify(testWeatherData, null, 2));

    const startTime = Date.now();
    
    // Генерируем рекомендацию
    const recommendation = await smartRecommendationsServiceV2.generateWeatherAIRecommendations(testWeatherData);
    
    const processingTime = Date.now() - startTime;

    // Проверяем состояние API после запроса
    const postHealthCheck = await smartRecommendationsServiceV2.checkAPIHealth();

    return NextResponse.json({
      success: true,
      weatherData: testWeatherData,
      recommendation: recommendation,
      performance: {
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString()
      },
      apiStatus: postHealthCheck,
      message: 'Рекомендация сгенерирована успешно'
    });

  } catch (error: any) {
    console.error('❌ Ошибка генерации рекомендации:', error);
    
    let errorDetails: any = {
      success: false,
      message: 'Ошибка генерации рекомендации',
      error: error?.toString(),
      timestamp: new Date().toISOString()
    };

    // Специальная обработка ошибок OpenAI
    if (error?.message?.includes('quota')) {
      errorDetails.errorType = 'quota_exceeded';
      errorDetails.message = '🔴 КРИТИЧНО: Превышена квота OpenAI API';
      errorDetails.solution = 'Пополните баланс на https://platform.openai.com/account/billing';
    } else if (error?.message?.includes('rate_limit')) {
      errorDetails.errorType = 'rate_limited';
      errorDetails.message = '⏱️ Превышен лимит запросов';
      errorDetails.solution = 'Подождите несколько минут перед следующим запросом';
    } else {
      errorDetails.errorType = 'unknown';
    }

    return NextResponse.json(
      errorDetails,
      { status: 500 }
    );
  }
}

// PUT - тест с различными погодными сценариями
export async function PUT(req: NextRequest) {
  try {
    console.log('🧪 Запуск комплексного теста погодных сценариев...');

    const testScenarios = [
      {
        name: 'Идеальные условия',
        data: { temperature: 20, windSpeed: 3, windDirection: 'SOUTH', pressure: 1018, humidity: 65, cloudCover: 0.1, location: { lat: 38.6973, lon: -9.4208 } }
      },
      {
        name: 'Штормовые условия',
        data: { temperature: 15, windSpeed: 15, windDirection: 'NORTH', pressure: 990, humidity: 85, cloudCover: 0.9, location: { lat: 38.6973, lon: -9.4208 } }
      },
      {
        name: 'Жаркий летний день',
        data: { temperature: 28, windSpeed: 8, windDirection: 'EAST', pressure: 1025, humidity: 45, cloudCover: 0.2, location: { lat: 38.6973, lon: -9.4208 } }
      },
      {
        name: 'Холодный зимний день',
        data: { temperature: 10, windSpeed: 12, windDirection: 'WEST', pressure: 1005, humidity: 80, cloudCover: 0.7, location: { lat: 38.6973, lon: -9.4208 } }
      }
    ];

    const results = [];

    for (const scenario of testScenarios) {
      try {
        console.log(`🎯 Тестируем: ${scenario.name}`);
        
        const startTime = Date.now();
        const recommendation = await smartRecommendationsServiceV2.generateWeatherAIRecommendations(scenario.data);
        const processingTime = Date.now() - startTime;

        results.push({
          scenario: scenario.name,
          weatherData: scenario.data,
          recommendation: recommendation,
          processingTimeMs: processingTime,
          success: true
        });

        // Пауза между запросами для избежания rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Ошибка в сценарии "${scenario.name}":`, error);
        results.push({
          scenario: scenario.name,
          weatherData: scenario.data,
          error: error?.toString(),
          success: false
        });
      }
    }

    // Финальная проверка состояния API
    const finalHealthCheck = await smartRecommendationsServiceV2.checkAPIHealth();
    const finalUsageStats = await smartRecommendationsServiceV2.getUsageStats();

    return NextResponse.json({
      success: true,
      testResults: results,
      summary: {
        totalTests: testScenarios.length,
        successfulTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        averageProcessingTime: results
          .filter(r => r.success && r.processingTimeMs)
          .reduce((sum, r) => sum + (r.processingTimeMs || 0), 0) / results.filter(r => r.success).length || 0
      },
      finalApiStatus: finalHealthCheck,
      finalUsageStats: finalUsageStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка комплексного теста:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Ошибка комплексного тестирования', 
        error: error?.toString() 
      },
      { status: 500 }
    );
  }
}
