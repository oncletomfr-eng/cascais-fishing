import { Metadata } from 'next';
import FishingDiary from '@/components/fishing-diary/FishingDiary';

export const metadata: Metadata = {
  title: 'Цифровой дневник рыболова | Cascais Fishing',
  description: 'Ведите детальный дневник своих рыболовных приключений с GPS координатами, фотографиями с метаданными и подробной статистикой.',
  keywords: 'дневник рыболова, GPS рыбалка, статистика улова, фото рыбалки, цифровой журнал',
  openGraph: {
    title: 'Цифровой дневник рыболова',
    description: 'Ведите детальный дневник своих рыболовных приключений с GPS координатами и статистикой',
    type: 'website',
  }
};

export default function FishingDiaryPage() {
  return <FishingDiary />;
}
