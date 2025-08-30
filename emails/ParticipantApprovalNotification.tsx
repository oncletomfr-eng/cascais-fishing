import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Img,
  Link,
} from '@react-email/components';

interface ParticipantApprovalNotificationProps {
  participantName: string;
  captainName: string;
  tripTitle: string;
  tripDate: string;
  status: 'APPROVED' | 'REJECTED';
  rejectedReason?: string;
  tripDetailsUrl: string;
}

export default function ParticipantApprovalNotification({
  participantName = 'Fishing Enthusiast',
  captainName = 'Captain Rodriguez',
  tripTitle = 'Deep Sea Fishing Adventure',
  tripDate = '2025-02-15',
  status = 'APPROVED',
  rejectedReason,
  tripDetailsUrl = '#'
}: ParticipantApprovalNotificationProps) {
  const isApproved = status === 'APPROVED';
  const statusEmoji = isApproved ? '✅' : '❌';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusText = isApproved ? 'одобрена' : 'отклонена';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>🎣 Cascais Fishing</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={title}>
              {statusEmoji} Ваша заявка {statusText}!
            </Heading>
            
            <Text style={greeting}>Привет, {participantName}!</Text>
            
            {isApproved ? (
              <Section>
                <Text style={paragraph}>
                  Отличные новости! Ваша заявка на участие в поездке 
                  "<strong>{tripTitle}</strong>" была одобрена капитаном {captainName}.
                </Text>
                
                <Section style={tripDetails}>
                  <Heading style={sectionTitle}>📅 Детали поездки</Heading>
                  <Text style={detailItem}><strong>Поездка:</strong> {tripTitle}</Text>
                  <Text style={detailItem}><strong>Дата:</strong> {tripDate}</Text>
                  <Text style={detailItem}><strong>Капитан:</strong> {captainName}</Text>
                </Section>

                <Text style={paragraph}>
                  <strong>Что дальше?</strong>
                </Text>
                <Text style={paragraph}>
                  • Подготовьте необходимое снаряжение<br/>
                  • Следите за обновлениями в чате поездки<br/>
                  • Прибудьте вовремя к месту встречи<br/>
                  • Не забудьте документы и солнцезащитные средства
                </Text>

                <Section style={buttonContainer}>
                  <Button style={button} href={tripDetailsUrl}>
                    Открыть детали поездки
                  </Button>
                </Section>
              </Section>
            ) : (
              <Section>
                <Text style={paragraph}>
                  К сожалению, ваша заявка на участие в поездке 
                  "<strong>{tripTitle}</strong>" была отклонена капитаном {captainName}.
                </Text>
                
                {rejectedReason && (
                  <Section style={rejectionReason}>
                    <Text style={reasonTitle}><strong>Причина отклонения:</strong></Text>
                    <Text style={reasonText}>{rejectedReason}</Text>
                  </Section>
                )}

                <Text style={paragraph}>
                  Не расстраивайтесь! У нас много других захватывающих поездок. 
                  Посмотрите доступные варианты и попробуйте подать заявку на другую поездку.
                </Text>

                <Section style={buttonContainer}>
                  <Button style={altButton} href="https://cascaisfishing.com/group-events">
                    Найти другие поездки
                  </Button>
                </Section>
              </Section>
            )}

            <Hr style={divider} />
            
            <Text style={footer}>
              Если у вас есть вопросы, не стесняйтесь обращаться к нашей службе поддержки.
            </Text>
            
            <Text style={signature}>
              С уважением,<br/>
              Команда Cascais Fishing
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Cascais Fishing | Marina do Cascais, Cascais, Portugal<br/>
              <Link href="mailto:support@cascaisfishing.com" style={footerLink}>
                support@cascaisfishing.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  padding: '20px 0',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  maxWidth: '600px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const header = {
  backgroundColor: '#0066cc',
  padding: '30px 20px',
  textAlign: 'center' as const,
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '40px 30px',
};

const title = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  textAlign: 'center' as const,
  marginBottom: '30px',
};

const greeting = {
  fontSize: '16px',
  color: '#374151',
  marginBottom: '20px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '16px',
};

const tripDetails = {
  backgroundColor: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  marginTop: '0',
  marginBottom: '15px',
};

const detailItem = {
  fontSize: '14px',
  color: '#4b5563',
  marginBottom: '8px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#0066cc',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
};

const altButton = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
};

const rejectionReason = {
  backgroundColor: '#fef2f2',
  padding: '15px',
  borderRadius: '6px',
  borderLeft: '4px solid #dc2626',
  margin: '20px 0',
};

const reasonTitle = {
  fontSize: '14px',
  color: '#991b1b',
  marginBottom: '5px',
};

const reasonText = {
  fontSize: '14px',
  color: '#7f1d1d',
  fontStyle: 'italic',
};

const divider = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '30px 0',
};

const footer = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '20px',
};

const signature = {
  fontSize: '14px',
  color: '#374151',
  marginTop: '20px',
};

const footerSection = {
  backgroundColor: '#f8fafc',
  padding: '20px 30px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: '16px',
  margin: '0',
};

const footerLink = {
  color: '#0066cc',
  textDecoration: 'none',
};
