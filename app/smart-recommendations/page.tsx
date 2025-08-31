import { Metadata } from 'next';
import SmartRecommendationsSimple from '@/components/smart-recommendations/SmartRecommendationsSimple';

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
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <SmartRecommendationsSimple />
        </div>
      </div>
    </main>
  );
}
