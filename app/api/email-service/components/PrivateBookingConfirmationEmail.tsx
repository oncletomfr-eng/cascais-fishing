import {
  Text,
  Heading,
  Section,
  Hr,
  Button,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmailTemplate } from './BaseEmailTemplate';

interface PrivateBookingConfirmationEmailProps {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  participants: number;
  totalPrice: number;
  customerPhone: string;
}

export function PrivateBookingConfirmationEmail({
  customerName,
  confirmationCode,
  date,
  time,
  participants,
  totalPrice,
  customerPhone,
}: PrivateBookingConfirmationEmailProps) {
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

  return (
    <BaseEmailTemplate preview={`Private fishing charter confirmed for ${customerName} - ${confirmationCode}`}>
      <Heading style={{
        color: '#0f172a',
        fontSize: '24px',
        fontWeight: '700',
        margin: '0 0 24px 0',
        lineHeight: '1.3',
      }}>
        🎣 Your Private Charter is Confirmed!
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
        Great news! Your private fishing charter has been confirmed. Get ready for an unforgettable Atlantic adventure with our experienced Captain João!
      </Text>

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
              👥 Participants
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
              💰 Total Price
            </Text>
            <Text style={{
              color: '#059669',
              fontSize: '18px',
              fontWeight: '700',
              margin: '0',
            }}>
              €{totalPrice}
            </Text>
          </Section>
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
          • 3-4 hours on the Atlantic Ocean
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e2e8f0', margin: '32px 0' }} />

      {/* Important Information */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: '#dc2626',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          ⚠️ Important Information
        </Heading>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
        }}>
          <strong>Meeting Point:</strong> Cascais Marina - we'll send you exact coordinates and parking instructions 24 hours before your trip.
        </Text>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
        }}>
          <strong>What to Bring:</strong> Sunscreen, hat, comfortable clothing, and your excitement for fishing!
        </Text>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
        }}>
          <strong>Weather Policy:</strong> In case of bad weather, we'll contact you to reschedule at no extra cost.
        </Text>
      </Section>

      {/* Contact Button */}
      <Section style={{
        textAlign: 'center' as const,
        margin: '32px 0',
      }}>
        <Button
          href={`https://wa.me/351934027852?text=Hi! I have a confirmed booking with code ${confirmationCode}. My phone is ${customerPhone}.`}
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
        We're looking forward to providing you with an amazing fishing experience!<br /><br />
        Best regards,<br />
        Captain João & Team<br />
        <strong>Cascais Premium Fishing</strong>
      </Text>
    </BaseEmailTemplate>
  );
}

export default PrivateBookingConfirmationEmail;
