import { Metadata } from 'next';
import SmartRecommendations from '@/components/smart-recommendations/SmartRecommendations';

export const metadata: Metadata = {
  title: 'Умные рекомендации | Cascais Fishing',
  description: 'Персонализированные AI-рекомендации для рыбалки на основе погодных условий, истории поездок и советов опытных капитанов.',
  keywords: 'умные рекомендации, AI рыбалка, погодные советы, рекомендации капитанов, персонализированная рыбалка',
  openGraph: {
    title: 'Умные рекомендации для рыбалки',
    description: 'Получайте персонализированные AI-рекомендации на основе погоды, истории и советов капитанов',
    type: 'website',
  }
};

export default function SmartRecommendationsPage() {
  // Пример погодных данных (в реальности должны получаться из API)
  const currentWeather = {
    temperature: 18,
    windSpeed: 12,
    windDirection: 'NORTHWEST',
    pressure: 1015.2,
    humidity: 65,
    cloudCover: 0.4,
    location: { lat: 38.6964, lon: -9.4214 }, // Cascais coordinates
  };

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">🧠 Умные рекомендации</h1>
            <p className="text-muted-foreground text-lg">
              Персонализированные AI-советы для успешной рыбалки на основе погоды, 
              вашей истории поездок и опыта лучших капитанов
            </p>
          </div>

          <div className="space-y-6">
            {/* Тестовый компонент - пока что статичный */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">📊 Статус реализации</h2>
              <p className="text-sm mb-4">Актуальный статус реализации системы (обновлено 30.01.2025):</p>
              
              <div className="grid md:grid-cols-3 gap-4">
                {/* История поездок */}
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold text-green-800">✅ История поездок</h3>
                  <p className="text-sm text-green-600 mt-1">"Участники похожих поездок также ходили на..." - collaborative filtering работает с реальными данными PostgreSQL</p>
                  <div className="mt-2 text-xs text-green-500">
                    ✅ База данных: 12 users, 10 trips<br/>
                    ✅ Алгоритм: User-based CF<br/>
                    ✅ API: /api/test-collaborative-filtering
                  </div>
                </div>

                {/* Погодный AI */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                  <h3 className="font-semibold text-orange-800">🟡 Погодный AI</h3>
                  <p className="text-sm text-orange-600 mt-1">"При таких условиях лучше идёт морской окунь на джиг" - API ключ настроен, но нужно пополнить баланс OpenAI</p>
                  <div className="mt-2 text-xs text-orange-500">
                    ✅ API ключ: настроен<br/>
                    ❌ Баланс: превышена квота (error 429)
                  </div>
                </div>

                {/* Социальные рекомендации */}
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold text-green-800">✅ Капитаны</h3>
                  <p className="text-sm text-green-600 mt-1">"Капитан Мануэл особенно рекомендует новичкам" - работает полностью</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-800">🔧 Проблемы Frontend</h3>
                <ul className="text-sm text-blue-600 mt-1 space-y-1">
                  <li>• React компонент SmartRecommendations не рендерится</li>
                  <li>• Необходима аутентификация для персонализации</li>
                  <li>• UI компонент слишком сложный для текущего состояния</li>
                </ul>
              </div>
            </div>

            {/* Тестирование API */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* OpenAI тест */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">🧠 Тест OpenAI API</h2>
                <iframe 
                  src="/api/test-openai" 
                  className="w-full h-64 border rounded text-sm"
                  title="OpenAI API Test"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Результат подключения к OpenAI для погодных рекомендаций
                </p>
              </div>

              {/* Рекомендации капитанов */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">👨‍✈️ Рекомендации капитанов</h2>
                <iframe 
                  src="/api/captain-recommendations" 
                  className="w-full h-64 border rounded text-sm"
                  title="Captain Recommendations"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Социальные рекомендации - работает полностью ✅
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
