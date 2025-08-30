import {
  Text,
  Heading,
  Section,
  Hr,
  Button,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmailTemplate } from './BaseEmailTemplate';

interface GroupBookingConfirmationEmailProps {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  participants: number;
  totalPrice: number;
  customerPhone: string;
  tripStatus: 'forming' | 'confirmed';
  currentParticipants: number;
  requiredParticipants: number;
  maxCapacity: number;
}

export function GroupBookingConfirmationEmail({
  customerName,
  confirmationCode,
  date,
  time,
  participants,
  totalPrice,
  customerPhone,
  tripStatus,
  currentParticipants,
  requiredParticipants,
  maxCapacity,
}: GroupBookingConfirmationEmailProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString === '09:00' ? '9:00 AM' : '2:00 PM';
  };

  const isConfirmed = tripStatus === 'confirmed';
  const spotsRemaining = requiredParticipants - currentParticipants;

  return (
    <BaseEmailTemplate preview={`Group fishing trip ${isConfirmed ? 'confirmed' : 'booking received'} for ${customerName} - ${confirmationCode}`}>
      <Heading style={{
        color: '#0f172a',
        fontSize: '24px',
        fontWeight: '700',
        margin: '0 0 24px 0',
        lineHeight: '1.3',
      }}>
        🎣 {isConfirmed ? 'Your Group Trip is Confirmed!' : 'You\'ve Joined the Group!'}
      </Heading>

      <Text style={{
        color: '#374151',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 16px 0',
      }}>
        Dear {customerName},
      </Text>

      <Text style={{
        color: '#374151',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '0 0 24px 0',
      }}>
        {isConfirmed 
          ? 'Excellent news! Your group fishing trip has been confirmed. Get ready for an amazing Atlantic adventure!'
          : 'Thank you for joining our group fishing trip! We\'re getting closer to confirming this amazing Atlantic adventure.'
        }
      </Text>

      {/* Trip Status */}
      <Section style={{
        backgroundColor: isConfirmed ? '#dcfce7' : '#fef3c7',
        border: `1px solid ${isConfirmed ? '#16a34a' : '#f59e0b'}`,
        borderRadius: '8px',
        padding: '16px 24px',
        margin: '24px 0',
        textAlign: 'center' as const,
      }}>
        <Text style={{
          color: isConfirmed ? '#166534' : '#92400e',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0',
        }}>
          {isConfirmed 
            ? '✅ Trip Confirmed - Ready to Set Sail!'
            : `⏳ Gathering Crew - ${spotsRemaining} more ${spotsRemaining === 1 ? 'person' : 'people'} needed`
          }
        </Text>
      </Section>

      {/* Booking Details */}
      <Section style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '24px',
        margin: '24px 0',
      }}>
        <Heading style={{
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          📋 Booking Details
        </Heading>

        <Section style={{ margin: '16px 0' }}>
          <Text style={{
            color: '#4b5563',
            fontSize: '14px',
            fontWeight: '600',
            margin: '0 0 4px 0',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
          }}>
            Confirmation Code
          </Text>
          <Text style={{
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: '700',
            margin: '0 0 16px 0',
            fontFamily: 'Monaco, monospace',
            backgroundColor: '#fef3c7',
            padding: '8px 12px',
            borderRadius: '4px',
            display: 'inline-block',
          }}>
            {confirmationCode}
          </Text>
        </Section>

        <Hr style={{ borderColor: '#e2e8f0', margin: '16px 0' }} />

        <Section style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          margin: '16px 0',
        }}>
          <Section>
            <Text style={{
              color: '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 4px 0',
            }}>
              📅 Date
            </Text>
            <Text style={{
              color: '#0f172a',
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 12px 0',
            }}>
              {formatDate(date)}
            </Text>

            <Text style={{
              color: '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 4px 0',
            }}>
              👥 Your Spots
            </Text>
            <Text style={{
              color: '#0f172a',
              fontSize: '16px',
              fontWeight: '500',
              margin: '0',
            }}>
              {participants} {participants === 1 ? 'person' : 'people'}
            </Text>
          </Section>

          <Section>
            <Text style={{
              color: '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 4px 0',
            }}>
              ⏰ Departure Time
            </Text>
            <Text style={{
              color: '#0f172a',
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 12px 0',
            }}>
              {formatTime(time)}
            </Text>

            <Text style={{
              color: '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 4px 0',
            }}>
              💰 Your Total
            </Text>
            <Text style={{
              color: '#059669',
              fontSize: '18px',
              fontWeight: '700',
              margin: '0',
            }}>
              €{totalPrice} <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280' }}>(€95 × {participants})</span>
            </Text>
          </Section>
        </Section>
      </Section>

      {/* Group Status */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          👥 Group Status
        </Heading>

        <Section style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
        }}>
          <Text style={{
            color: '#374151',
            fontSize: '16px',
            fontWeight: '500',
            margin: '0 0 8px 0',
          }}>
            Current crew: {currentParticipants}/{maxCapacity} people
          </Text>
          
          <div style={{
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            height: '8px',
            overflow: 'hidden',
            margin: '8px 0',
          }}>
            <div style={{
              backgroundColor: isConfirmed ? '#16a34a' : '#f59e0b',
              height: '100%',
              width: `${(currentParticipants / requiredParticipants) * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>

          <Text style={{
            color: '#6b7280',
            fontSize: '14px',
            margin: '0',
          }}>
            {isConfirmed 
              ? 'Minimum crew reached - trip confirmed!'
              : `${spotsRemaining} more ${spotsRemaining === 1 ? 'person' : 'people'} needed to confirm the trip`
            }
          </Text>
        </Section>
      </Section>

      {/* What's Included */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          ✅ What's Included
        </Heading>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.8',
          margin: '0',
        }}>
          • Professional fishing guide (Captain João - 15+ years experience)<br />
          • Premium fishing equipment & fresh bait<br />
          • Safety equipment & life jackets<br />
          • Complimentary drinks and light snacks<br />
          • Fish cleaning service<br />
          • Professional photos of your experience<br />
          • 3-4 hours on the Atlantic Ocean<br />
          • Share the adventure with like-minded fishing enthusiasts
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e2e8f0', margin: '32px 0' }} />

      {/* Next Steps */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: isConfirmed ? '#16a34a' : '#f59e0b',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          {isConfirmed ? '🎯 Next Steps' : '⏳ What Happens Next?'}
        </Heading>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
        }}>
          {isConfirmed 
            ? 'Your trip is confirmed! We\'ll send you detailed meeting instructions 24 hours before departure, including exact location, parking details, and our direct contact number.'
            : `We're still gathering crew members for this trip. You'll receive an immediate notification once we reach the minimum of ${requiredParticipants} people and your trip is confirmed. Don't worry - your spot is secured!`
          }
        </Text>

        {!isConfirmed && (
          <Text style={{
            color: '#6b7280',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '16px 0 0 0',
            fontStyle: 'italic',
          }}>
            💡 <strong>Pro tip:</strong> Share this experience with friends and family - group fishing is more fun when you know people in the crew!
          </Text>
        )}
      </Section>

      {/* Contact Button */}
      <Section style={{
        textAlign: 'center' as const,
        margin: '32px 0',
      }}>
        <Button
          href={`https://wa.me/351934027852?text=Hi! I have a group booking with code ${confirmationCode}. My phone is ${customerPhone}.`}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          💬 Contact us on WhatsApp
        </Button>
      </Section>

      <Text style={{
        color: '#374151',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '24px 0 0 0',
      }}>
        {isConfirmed 
          ? 'Get ready for an unforgettable Atlantic fishing adventure!'
          : 'Thank you for your patience as we build the perfect fishing crew!'
        }<br /><br />
        Best regards,<br />
        Captain João & Team<br />
        <strong>Cascais Premium Fishing</strong>
      </Text>
    </BaseEmailTemplate>
  );
}

export default GroupBookingConfirmationEmail;
