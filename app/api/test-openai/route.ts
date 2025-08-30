import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ТЕСТОВЫЙ endpoint для проверки OpenAI без аутентификации
export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing OpenAI API...');
    console.log('API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('API Key starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-'));

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        status: '❌ API ключ не настроен'
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Тестовый запрос для рыболовной рекомендации
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Более дешевая модель для тестирования
      messages: [
        {
          role: 'system',
          content: `Ты опытный рыболовный гид в Кашкайше, Португалия. 
          Анализируй погодные условия и давай конкретные советы по рыбалке.
          Отвечай на русском языке, кратко и по делу.`
        },
        {
          role: 'user',
          content: `Погодные условия:
          - Температура: 18°C
          - Ветер: 12 узлов, северо-западный
          - Давление: 1015.2 мбар
          - Влажность: 65%
          - Облачность: 40%
          - Локация: Кашкайш (38.6964, -9.4214)
          
          Какую рыбу лучше ловить при таких условиях и какую технику использовать?`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const recommendation = response.choices[0]?.message?.content;

    return NextResponse.json({
      success: true,
      status: '✅ OpenAI API работает!',
      recommendation,
      usage: response.usage,
      model: response.model,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ OpenAI API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      status: '❌ Ошибка OpenAI API',
      details: {
        code: error.code,
        type: error.type,
        param: error.param,
      }
    }, { status: 500 });
  }
}

// POST для тестирования с кастомными данными
export async function POST(req: NextRequest) {
  try {
    const { weatherData, customPrompt } = await req.json();

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const weatherInfo = weatherData ? `
    Погодные условия:
    - Температура: ${weatherData.temperature}°C
    - Ветер: ${weatherData.windSpeed} узлов, ${weatherData.windDirection}
    - Давление: ${weatherData.pressure} мбар
    - Влажность: ${weatherData.humidity}%
    - Облачность: ${weatherData.cloudCover * 100}%
    ` : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Ты опытный рыболовный гид в Кашкайше, Португалия. 
          Анализируй погодные условия и давай конкретные советы по рыбалке.
          Отвечай на русском языке в формате: "При таких условиях лучше идёт [вид рыбы] на [технику]"`
        },
        {
          role: 'user',
          content: customPrompt || `${weatherInfo}\n\nКакую рыбу и как лучше ловить?`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      recommendation: response.choices[0]?.message?.content,
      usage: response.usage,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
