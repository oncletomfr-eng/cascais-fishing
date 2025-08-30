import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
  Section,
  Preview,
  Heading,
  Link
} from '@react-email/components';

interface Badge {
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface BadgeAwardedNotificationProps {
  userName: string;
  badge: Badge;
  totalBadges: number;
  profileUrl: string;
}

export default function BadgeAwardedNotification({
  userName = 'Участник',
  badge = {
    name: 'First Trip',
    description: 'Completed your first fishing trip!',
    icon: '🎣',
    category: 'MILESTONE'
  },
  totalBadges = 1,
  profileUrl = 'https://cascaisfishing.com/profile'
}: BadgeAwardedNotificationProps) {
  const categoryLabels: Record<string, string> = {
    'MILESTONE': 'Этапное достижение',
    'ACHIEVEMENT': 'Достижение',
    'SPECIAL': 'Специальная награда',
    'SEASONAL': 'Сезонная награда'
  };

  return (
    <Html>
      <Head />
      <Preview>
        🏆 Поздравляем! Вы получили новое достижение: {badge.name}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Заголовок */}
          <Section style={header}>
            <Text style={logo}>🎣 Cascais Fishing</Text>
          </Section>

          {/* Основное содержимое */}
          <Section style={content}>
            <Heading style={heading}>
              🏆 Новое достижение!
            </Heading>

            <Text style={congratsText}>
              Поздравляем, {userName}!
            </Text>

            <Text style={paragraph}>
              Вы только что заработали новый значок достижения за свою активность 
              в рыболовном сообществе Cascais Fishing.
            </Text>

            {/* Карточка значка */}
            <Section style={badgeCard}>
              <div style={badgeIcon}>{badge.icon}</div>
              <Text style={badgeName}>{badge.name}</Text>
              <Text style={badgeDescription}>{badge.description}</Text>
              <Text style={badgeCategory}>
                {categoryLabels[badge.category] || badge.category}
              </Text>
            </Section>

            <Hr style={hr} />

            {/* Статистика */}
            <Section style={statsSection}>
              <Text style={statsTitle}>📊 Ваша статистика:</Text>
              <Text style={statsText}>
                • Всего значков: <strong>{totalBadges}</strong><br />
                • Последний заработан: <strong>Сегодня</strong><br />
                • Ваш статус: <strong>Активный участник</strong>
              </Text>
            </Section>

            <Text style={paragraph}>
              <strong>Как заработать больше значков:</strong><br />
              • Участвуйте в большем количестве поездок<br />
              • Поддерживайте высокий рейтинг<br />
              • Оставляйте отзывы другим участникам<br />
              • Будьте надежным участником группы<br />
              • Пробуйте поездки в разное время года
            </Text>

            {/* Кнопка просмотра профиля */}
            <Section style={buttonContainer}>
              <Button style={button} href={profileUrl}>
                Посмотреть мой профиль
              </Button>
            </Section>

            {/* Мотивационное сообщение */}
            <Section style={motivationSection}>
              <Text style={motivationText}>
                💪 Продолжайте в том же духе! Каждая поездка — это новые впечатления 
                и возможность заработать больше достижений.
              </Text>
            </Section>
          </Section>

          {/* Футер */}
          <Section style={footer}>
            <Text style={footerText}>
              Это автоматическое уведомление от <Link href="https://cascaisfishing.com">Cascais Fishing</Link>.<br />
              Поделитесь своими достижениями с друзьями в социальных сетях!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Стили
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '20px 30px',
  backgroundColor: '#0066cc',
  borderRadius: '8px 8px 0 0',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '30px',
};

const heading = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#333333',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const congratsText = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#f59e0b',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#555555',
  margin: '0 0 16px 0',
};

const badgeCard = {
  backgroundColor: 'linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%)',
  border: '2px solid #f59e0b',
  borderRadius: '12px',
  padding: '24px',
  margin: '30px 0',
  textAlign: 'center' as const,
};

const badgeIcon = {
  fontSize: '48px',
  lineHeight: '1',
  margin: '0 0 12px 0',
};

const badgeName = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 8px 0',
};

const badgeDescription = {
  fontSize: '16px',
  color: '#b45309',
  margin: '0 0 12px 0',
};

const badgeCategory = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#92400e',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0',
};

const statsSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const statsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#0369a1',
  margin: '0 0 8px 0',
};

const statsText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#0c4a6e',
  margin: '0',
};

const motivationSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const motivationText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#166534',
  margin: '0',
  textAlign: 'center' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#f59e0b',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  border: 'none',
  cursor: 'pointer',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '30px 0',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '20px 30px',
  borderRadius: '0 0 8px 8px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6b7280',
  margin: '0',
  textAlign: 'center' as const,
};
