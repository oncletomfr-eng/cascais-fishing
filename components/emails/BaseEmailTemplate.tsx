import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Heading,
  Hr,
  Font,
  Preview,
} from '@react-email/components';
import * as React from 'react';

interface BaseEmailTemplateProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseEmailTemplate({ preview, children }: BaseEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyg.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WRhyg.woff2',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459W1hyw.woff2',
            format: 'woff2',
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{
        backgroundColor: '#f8fafc',
        fontFamily: 'Montserrat, Arial, sans-serif',
        margin: 0,
        padding: 0,
      }}>
        <Container style={{
          backgroundColor: '#ffffff',
          margin: '0 auto',
          padding: '0',
          maxWidth: '600px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <Section style={{
            backgroundColor: '#0f172a',
            padding: '32px 40px',
            textAlign: 'center' as const,
          }}>
            <Img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/11-MwFTIWjDf7ohD6gHEB3bpur6NtqmV2.webp"
              alt="Cascais Premium Fishing"
              width="100"
              height="100"
              style={{
                borderRadius: '50%',
                objectFit: 'cover' as const,
                border: '3px solid #ffffff',
              }}
            />
            <Heading style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: '700',
              margin: '16px 0 8px 0',
              lineHeight: '1.3',
            }}>
              Cascais Premium Fishing
            </Heading>
            <Text style={{
              color: '#94a3b8',
              fontSize: '16px',
              margin: '0',
              fontWeight: '400',
            }}>
              Experience the Atlantic like never before
            </Text>
          </Section>

          {/* Content */}
          <Section style={{
            padding: '40px',
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{
            backgroundColor: '#f1f5f9',
            padding: '32px 40px',
            borderTop: '1px solid #e2e8f0',
          }}>
            <Text style={{
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0 0 16px 0',
              textAlign: 'center' as const,
            }}>
              <strong>Contact Information:</strong><br />
              📞 Phone/WhatsApp: +351 934 027 852<br />
              📍 Location: Cascais Marina, Portugal<br />
              ⏰ Duration: 3-4 hours
            </Text>
            <Hr style={{
              borderColor: '#e2e8f0',
              margin: '16px 0',
            }} />
            <Text style={{
              color: '#94a3b8',
              fontSize: '12px',
              lineHeight: '1.5',
              margin: '0',
              textAlign: 'center' as const,
            }}>
              This email was sent regarding your fishing trip booking.<br />
              If you have any questions, please contact us via WhatsApp at +351 934 027 852
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BaseEmailTemplate;
