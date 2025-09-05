import {
  Text,
  Heading,
  Hr,
  Button,
  Section,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmailTemplate } from './BaseEmailTemplate';

export interface ParticipantApprovalNotificationEmailProps {
  participantName: string;
  captainName: string;
  tripTitle: string;
  tripDate: string;
  status: 'APPROVED' | 'REJECTED';
  rejectedReason?: string;
  tripDetailsUrl: string;
}

export function ParticipantApprovalNotificationEmail({
  participantName,
  captainName,
  tripTitle,
  tripDate,
  status,
  rejectedReason,
  tripDetailsUrl,
}: ParticipantApprovalNotificationEmailProps) {
  const isApproved = status === 'APPROVED';
  const statusEmoji = isApproved ? '✅' : '❌';
  const statusText = isApproved ? 'одобрена' : 'отклонена';
  
  const preview = `Ваша заявка на поездку "${tripTitle}" ${statusText}`;

  return (
    <BaseEmailTemplate preview={preview}>
      <Heading style={{
        color: '#1e293b',
        fontSize: '24px',
        fontWeight: '700',
        margin: '0 0 24px 0',
        lineHeight: '1.3',
        textAlign: 'center' as const,
      }}>
        {statusEmoji} Ваша заявка {statusText}!
      </Heading>

      <Text style={{
        color: '#334155',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 16px 0',
      }}>
        Привет, <strong>{participantName}</strong>!
      </Text>

      <Text style={{
        color: '#334155',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 24px 0',
      }}>
        {isApproved 
          ? `Отличные новости! Капитан ${captainName} одобрил вашу заявку на участие в поездке.`
          : `К сожалению, капитан ${captainName} не смог одобрить вашу заявку на участие в поездке.`
        }
      </Text>

      {/* Trip Details */}
      <Section style={{
        backgroundColor: isApproved ? '#f0f9ff' : '#fef2f2',
        padding: '24px',
        borderRadius: '8px',
        border: isApproved ? '1px solid #bae6fd' : '1px solid #fecaca',
        margin: '0 0 24px 0',
      }}>
        <Heading style={{
          color: '#1e293b',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          📅 Детали поездки:
        </Heading>
        <Text style={{ color: '#475569', fontSize: '14px', margin: '0 0 8px 0' }}>
          <strong>Поездка:</strong> {tripTitle}
        </Text>
        <Text style={{ color: '#475569', fontSize: '14px', margin: '0 0 8px 0' }}>
          <strong>Дата:</strong> {tripDate}
        </Text>
        <Text style={{ color: '#475569', fontSize: '14px', margin: '0' }}>
          <strong>Капитан:</strong> {captainName}
        </Text>
      </Section>

      {isApproved ? (
        <>
          <Section style={{
            backgroundColor: '#f0fdf4',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            margin: '0 0 24px 0',
          }}>
            <Heading style={{
              color: '#166534',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 12px 0',
            }}>
              🎉 Поздравляем! Что дальше?
            </Heading>
            <ul style={{ 
              color: '#15803d',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0',
              paddingLeft: '20px',
            }}>
              <li>Подготовьте необходимое снаряжение</li>
              <li>Прибудьте вовремя к месту встречи</li>
              <li>Следите за обновлениями от капитана</li>
              <li>Не забудьте документы и средства защиты</li>
            </ul>
          </Section>
          
          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button
              href={tripDetailsUrl}
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
              Посмотреть детали поездки
            </Button>
          </Section>
        </>
      ) : (
        <>
          {rejectedReason && (
            <Section style={{
              backgroundColor: '#fef2f2',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              margin: '0 0 24px 0',
            }}>
              <Heading style={{
                color: '#dc2626',
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 12px 0',
              }}>
                💬 Причина отклонения:
              </Heading>
              <Text style={{
                color: '#991b1b',
                fontSize: '14px',
                lineHeight: '1.6',
                margin: '0',
              }}>
                {rejectedReason}
              </Text>
            </Section>
          )}
          
          <Section style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            margin: '0 0 24px 0',
          }}>
            <Text style={{
              color: '#475569',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0',
            }}>
              Не расстраивайтесь! У нас много других интересных поездок. Посмотрите доступные варианты и подайте заявку на другую поездку.
            </Text>
          </Section>
          
          <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
            <Button
              href="https://cascaisfishing.com/trips"
              style={{
                backgroundColor: '#64748b',
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
              Посмотреть другие поездки
            </Button>
          </Section>
        </>
      )}

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
        Если у вас есть вопросы, не стесняйтесь обращаться к нам!<br />
        Мы всегда готовы помочь вам с организацией незабываемой рыбалки.
      </Text>
    </BaseEmailTemplate>
  );
}

export default ParticipantApprovalNotificationEmail;
