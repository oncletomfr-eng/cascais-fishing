import { Metadata } from 'next';
import EnhancedUnifiedWidget from '@/components/booking/EnhancedUnifiedWidget';

export const metadata: Metadata = {
  title: 'Групповые события - Cascais Fishing',
  description: 'Присоединяйтесь к групповым рыболовным турам или создайте свою группу в Каштайше',
  openGraph: {
    title: 'Групповые рыболовные туры в Каштайше',
    description: 'Интерактивная лента групповых мероприятий с реал-тайм обновлениями',
    images: ['/hero-fishing-boat-cascais.png'],
  },
};

/**
 * Демонстрационная страница новой системы групповых событий
 * 
 * Функции:
 * - Интеллектуальная лента групповых мероприятий
 * - Реал-тайм WebSocket обновления
 * - Социальные триггеры (progress bars, avatars, urgency badges)
 * - UX психология (scarcity, social proof, goal gradient)
 * - Framer Motion анимации
 * - TanStack Query кеширование
 */
export default function GroupEventsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Hero Section */}
      <section className="relative py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🎣 Групповые рыболовные приключения
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Присоединяйтесь к единомышленникам в захватывающих морских путешествиях. 
            Новые группы формируются каждый день!
          </p>
          
          {/* Live Stats Demo */}
          <div className="flex items-center justify-center gap-8 mt-8 text-sm">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Live обновления</span>
            </div>
            
            <div className="bg-white rounded-full px-4 py-2 shadow-md">
              <span className="font-semibold text-blue-600">47</span>
              <span className="text-muted-foreground ml-1">активных участников</span>
            </div>
            
            <div className="bg-white rounded-full px-4 py-2 shadow-md">
              <span className="font-semibold text-green-600">12</span>
              <span className="text-muted-foreground ml-1">подтвержденных групп</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Enhanced Booking Widget */}
      <EnhancedUnifiedWidget />
      
      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Преимущества новой системы групповых событий
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Real-time Updates */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold">Обновления в реальном времени</h3>
              <p className="text-muted-foreground">
                Мгновенные уведомления о новых участниках, подтверждениях групп и изменениях статуса
              </p>
            </div>
            
            {/* Social Proof */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 bg-green-600 rounded-full border border-white"></div>
                  <div className="w-4 h-4 bg-blue-600 rounded-full border border-white"></div>
                  <div className="w-4 h-4 bg-purple-600 rounded-full border border-white"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold">Социальное доказательство</h3>
              <p className="text-muted-foreground">
                Видите участников, прогресс заполнения групп и создаёте доверительную атмосферу
              </p>
            </div>
            
            {/* Smart Notifications */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <div className="text-2xl">⚡</div>
              </div>
              <h3 className="text-xl font-semibold">Умные уведомления</h3>
              <p className="text-muted-foreground">
                Срочные предложения, почти заполненные группы и персонализированные рекомендации
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Technical Details Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">Технические особенности</h2>
          
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                🔧 Frontend технологии
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• React 19 + Next.js 15 + TypeScript</li>
                <li>• Framer Motion для плавных анимаций</li>
                <li>• TanStack Query для кеширования данных</li>
                <li>• WebSocket для реального времени</li>
                <li>• Radix UI + Tailwind CSS</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                🎯 UX психология
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Social Proof (аватары участников)</li>
                <li>• Scarcity (urgency badges)</li>
                <li>• Goal Gradient (progress bars)</li>
                <li>• Peak-End Rule (финальные анимации)</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🚀 Результаты внедрения
            </h3>
            <p className="text-blue-700">
              Ожидаемое увеличение групповой конверсии на 40-60% благодаря улучшенной видимости 
              доступных поездок и психологическим триггерам принятия решений.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
