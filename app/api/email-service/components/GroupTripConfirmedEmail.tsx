import {
  Text,
  Heading,
  Section,
  Hr,
  Button,
} from '@react-email/components';
import * as React from 'react';
import { BaseEmailTemplate } from './BaseEmailTemplate';

interface GroupTripConfirmedEmailProps {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  totalParticipants: number;
  customerPhone: string;
}

export function GroupTripConfirmedEmail({
  customerName,
  confirmationCode,
  date,
  time,
  totalParticipants,
  customerPhone,
}: GroupTripConfirmedEmailProps) {
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
    <BaseEmailTemplate preview={`🎉 Great news! Your group fishing trip is now confirmed - ${confirmationCode}`}>
      {/* Celebration Header */}
      <Section style={{
        backgroundColor: '#dcfce7',
        border: '1px solid #16a34a',
        borderRadius: '8px',
        padding: '24px',
        margin: '0 0 32px 0',
        textAlign: 'center' as const,
      }}>
        <Text style={{
          fontSize: '48px',
          margin: '0 0 16px 0',
        }}>
          🎉
        </Text>
        <Heading style={{
          color: '#166534',
          fontSize: '24px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          lineHeight: '1.3',
        }}>
          Trip Confirmed!
        </Heading>
        <Text style={{
          color: '#166534',
          fontSize: '16px',
          fontWeight: '500',
          margin: '0',
        }}>
          We've reached the minimum crew - your adventure is a go!
        </Text>
      </Section>

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
        fontSize: '18px',
        lineHeight: '1.6',
        margin: '0 0 24px 0',
        fontWeight: '500',
      }}>
        Fantastic news! Your group fishing trip has been confirmed. We've gathered a great crew of {totalParticipants} fishing enthusiasts, and you're all set for an amazing Atlantic adventure!
      </Text>

      {/* Confirmed Trip Details */}
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
          ✅ Confirmed Trip Details
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
            Your Confirmation Code
          </Text>
          <Text style={{
            color: '#0f172a',
            fontSize: '20px',
            fontWeight: '700',
            margin: '0 0 16px 0',
            fontFamily: 'Monaco, monospace',
            backgroundColor: '#dcfce7',
            padding: '8px 12px',
            borderRadius: '4px',
            display: 'inline-block',
            border: '1px solid #16a34a',
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
              👥 Total Crew
            </Text>
            <Text style={{
              color: '#0f172a',
              fontSize: '16px',
              fontWeight: '500',
              margin: '0',
            }}>
              {totalParticipants} fishing enthusiasts
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
              🚢 Trip Status
            </Text>
            <Text style={{
              color: '#16a34a',
              fontSize: '16px',
              fontWeight: '700',
              margin: '0',
            }}>
              CONFIRMED ✓
            </Text>
          </Section>
        </Section>
      </Section>

      {/* What Happens Next */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: '#16a34a',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          🎯 What Happens Next?
        </Heading>

        <Section style={{
          backgroundColor: '#fef9c3',
          border: '1px solid #eab308',
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
        }}>
          <Text style={{
            color: '#a16207',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 8px 0',
          }}>
            📍 Meeting Details Coming Soon
          </Text>
          <Text style={{
            color: '#a16207',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '0',
          }}>
            We'll send you detailed meeting instructions 24 hours before your trip, including:
            <br />• Exact meeting location at Cascais Marina
            <br />• Parking instructions and nearby landmarks
            <br />• Captain's direct phone number
            <br />• Last-minute weather updates
          </Text>
        </Section>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.6',
          margin: '16px 0 0 0',
        }}>
          Until then, start getting excited about your Atlantic fishing adventure! Our experienced Captain João and crew are preparing everything for an unforgettable day on the water.
        </Text>
      </Section>

      {/* Preparation Tips */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          🎒 What to Bring
        </Heading>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.8',
          margin: '0',
        }}>
          • <strong>Sunscreen & Hat:</strong> Protect yourself from the Atlantic sun<br />
          • <strong>Comfortable Clothes:</strong> Dress for a day on the water<br />
          • <strong>Camera/Phone:</strong> Capture your catches (we'll take professional photos too!)<br />
          • <strong>Excitement:</strong> Your positive energy and fishing enthusiasm<br />
          • <strong>Valid ID:</strong> Just in case we need it for marina access
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e2e8f0', margin: '32px 0' }} />

      {/* Group Fishing Benefits */}
      <Section style={{ margin: '32px 0' }}>
        <Heading style={{
          color: '#0f172a',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 16px 0',
        }}>
          🌟 Why Group Fishing is Amazing
        </Heading>

        <Text style={{
          color: '#374151',
          fontSize: '16px',
          lineHeight: '1.8',
          margin: '0',
        }}>
          • <strong>Share the Excitement:</strong> Celebrate catches with new friends<br />
          • <strong>Learn from Others:</strong> Pick up tips from fellow anglers<br />
          • <strong>Great Value:</strong> Premium experience at an affordable price<br />
          • <strong>Social Experience:</strong> Make connections with like-minded people<br />
          • <strong>Shared Memories:</strong> Create stories you'll tell for years
        </Text>
      </Section>

      {/* Emergency Contact */}
      <Section style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '6px',
        padding: '16px',
        margin: '32px 0',
      }}>
        <Text style={{
          color: '#dc2626',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 8px 0',
        }}>
          🚨 Important: Weather Policy
        </Text>
        <Text style={{
          color: '#7f1d1d',
          fontSize: '14px',
          lineHeight: '1.6',
          margin: '0',
        }}>
          Safety is our top priority. In case of severe weather conditions, we'll contact you immediately to reschedule your trip at no additional cost. Your safety and experience quality come first!
        </Text>
      </Section>

      {/* Contact Button */}
      <Section style={{
        textAlign: 'center' as const,
        margin: '32px 0',
      }}>
        <Button
          href={`https://wa.me/351934027852?text=Hi! My group trip is confirmed! Booking code: ${confirmationCode}. Phone: ${customerPhone}. So excited!`}
          style={{
            backgroundColor: '#16a34a',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            padding: '14px 28px',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          🎉 Share Your Excitement on WhatsApp
        </Button>
      </Section>

      <Text style={{
        color: '#374151',
        fontSize: '16px',
        lineHeight: '1.6',
        margin: '24px 0 0 0',
      }}>
        We can't wait to welcome you aboard for this incredible Atlantic fishing adventure! Get ready for an unforgettable day with your new fishing crew.<br /><br />
        Tight lines and fair seas,<br />
        Captain João & Team<br />
        <strong>Cascais Premium Fishing</strong>
      </Text>
    </BaseEmailTemplate>
  );
}

export default GroupTripConfirmedEmail;
