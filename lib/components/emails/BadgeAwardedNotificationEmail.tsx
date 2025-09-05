import {
  Text,
  Heading,
  Hr,
  Button,
  Section,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmailTemplate } from './BaseEmailTemplate';

export interface BadgeAwardedNotificationEmailProps {
  userName: string;
  badge: {
    name: string;
    description: string;
    icon: string;
    category: string;
  };
  totalBadges: number;
  profileUrl: string;
}

export function BadgeAwardedNotificationEmail({
  userName,
  badge,
  totalBadges,
  profileUrl,
}: BadgeAwardedNotificationEmailProps) {
  const preview = `Поздравляем! Вы получили новое достижение: ${badge.name}`;

  // Badge category colors
  const getCategoryStyle = (category: string) => {
    switch (category.toLowerCase()) {
      case 'milestone':
        return { backgroundColor: '#fef3c7', borderColor: '#fbbf24', textColor: '#92400e' };
      case 'skill':
        return { backgroundColor: '#dbeafe', borderColor: '#3b82f6', textColor: '#1e40af' };
      case 'achievement':
        return { backgroundColor: '#d1fae5', borderColor: '#10b981', textColor: '#047857' };
      case 'special':
        return { backgroundColor: '#f3e8ff', borderColor: '#8b5cf6', textColor: '#6d28d9' };
      default:
        return { backgroundColor: '#f3f4f6', borderColor: '#6b7280', textColor: '#374151' };
    }
  };

  const categoryStyle = getCategoryStyle(badge.category);

  return (
    <BaseEmailTemplate preview={preview}>
      <Section style={{ textAlign: 'center' as const, margin: '0 0 32px 0' }}>
        <Text style={{
          fontSize: '48px',
          margin: '0 0 16px 0',
        }}>
          🏆
        </Text>
        
        <Heading style={{
          color: '#1e293b',
          fontSize: '28px',
          fontWeight: '700',
          margin: '0 0 16px 0',
          lineHeight: '1.3',
        }}>
          Новое достижение!
        </Heading>
        
        <Text style={{
          color: '#64748b',
          fontSize: '16px',
          margin: '0',
        }}>
          Поздравляем, {userName}!
        </Text>
      </Section>

      {/* Badge Display */}
      <Section style={{
        backgroundColor: '#f8fafc',
        padding: '32px',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        textAlign: 'center' as const,
        margin: '0 0 32px 0',
      }}>
        <Text style={{
          fontSize: '64px',
          margin: '0 0 16px 0',
          lineHeight: '1',
        }}>
          {badge.icon}
        </Text>
        
        <Heading style={{
          color: '#1e293b',
          fontSize: '24px',
          fontWeight: '700',
          margin: '0 0 8px 0',
        }}>
          {badge.name}
        </Heading>
        
        <Text style={{
          display: 'inline-block',
          backgroundColor: categoryStyle.backgroundColor,
          color: categoryStyle.textColor,
          fontSize: '12px',
          fontWeight: '600',
          padding: '4px 12px',
          borderRadius: '20px',
          border: `1px solid ${categoryStyle.borderColor}`,
          margin: '0 0 16px 0',
          textTransform: 'uppercase' as const,
        }}>
          {badge.category}
        </Text>
        
        <Text style={{
          color: '#475569',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0',
        }}>
          {badge.description}
        </Text>
      </Section>

      {/* Achievement Message */}
      <Section style={{
        backgroundColor: '#f0f9ff',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #bae6fd',
        margin: '0 0 32px 0',
      }}>
        <Text style={{
          color: '#0c4a6e',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
          textAlign: 'center' as const,
        }}>
          🎉 Вы успешно заработали это достижение благодаря своим навыкам и активности в рыболовном сообществе!
        </Text>
        
        <Text style={{
          color: '#075985',
          fontSize: '14px',
          textAlign: 'center' as const,
          margin: '0',
        }}>
          <strong>Всего достижений:</strong> {totalBadges}
        </Text>
      </Section>

      {/* Progress Section */}
      <Section style={{
        backgroundColor: '#fefce8',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #fde047',
        margin: '0 0 32px 0',
      }}>
        <Heading style={{
          color: '#a16207',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          textAlign: 'center' as const,
        }}>
          🌟 Продолжайте развиваться!
        </Heading>
        
        <ul style={{ 
          color: '#92400e',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0',
          paddingLeft: '20px',
        }}>
          <li>Участвуйте в новых рыболовных поездках</li>
          <li>Делитесь опытом с другими участниками</li>
          <li>Пробуйте новые техники рыбалки</li>
          <li>Помогайте начинающим рыболовам</li>
        </ul>
      </Section>

      {/* Call to Action */}
      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button
          href={profileUrl}
          style={{
            backgroundColor: '#0ea5e9',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            display: 'inline-block',
          }}
        >
          Посмотреть все достижения
        </Button>
      </Section>

      <Hr style={{
        borderColor: '#e2e8f0',
        margin: '32px 0 24px 0',
      }} />

      <Text style={{
        color: '#64748b',
        fontSize: '14px',
        lineHeight: '1.6',
        margin: '0',
        textAlign: 'center' as const,
      }}>
        Поделитесь своим достижением в социальных сетях и вдохновите других рыболовов!<br />
        Продолжайте исследовать воды Атлантики с нами! 🎣
      </Text>
    </BaseEmailTemplate>
  );
}

export default BadgeAwardedNotificationEmail;
