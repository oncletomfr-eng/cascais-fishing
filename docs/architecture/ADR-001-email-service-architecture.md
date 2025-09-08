# ADR-001: Email Service Architecture

## Status
Accepted (January 2025)

## Context

The Cascais Fishing platform requires email functionality for:
- User notifications (trip approvals, booking confirmations)
- Achievement badges and rewards notifications
- System alerts and administrative communications
- Password reset and account verification

### Initial Challenges
- Multiple email service implementations existed in the codebase
- Inconsistent email templates and formatting
- Complex dependency management between email components
- Vercel build issues with email module resolution
- Need for production-ready, scalable email delivery

### Technical Constraints
- Next.js App Router architecture
- Server-side rendering requirements
- Vercel deployment environment limitations
- TypeScript strict mode compliance
- Integration with React Email for template rendering

## Decision

We decided to implement a **unified email service architecture** with the following components:

### 1. Single Email Service (`lib/services/email-service.ts`)
- Centralized email sending logic
- Consistent error handling and logging
- Support for multiple email providers
- Template rendering integration
- Type-safe email operations

### 2. React Email Templates (`components/emails/`)
- Reusable email components using React Email
- Consistent branding and styling
- Type-safe template props
- Preview and testing capabilities

### 3. Service Provider Abstraction
- Primary: Resend for transactional emails
- Fallback capabilities for provider switching
- Environment-based configuration
- Rate limiting and quota management

### 4. Template Management System
```typescript
// Email service interface
interface EmailServiceConfig {
  provider: 'resend' | 'sendgrid' | 'ses';
  apiKey: string;
  defaultFrom: string;
  templates: EmailTemplateRegistry;
}

// Template registration
const templates = {
  participantApproval: ParticipantApprovalNotificationEmail,
  badgeAwarded: BadgeAwardedNotificationEmail,
  tripConfirmation: TripConfirmationEmail,
  // ... other templates
} as const;
```

### 5. Integration Points
- API routes for triggered emails
- Background job processing
- User preference management
- Delivery tracking and analytics

## Consequences

### Positive
- **Unified Architecture**: Single source of truth for email operations
- **Type Safety**: Full TypeScript support throughout email pipeline
- **Maintainability**: Easier to update and extend email functionality
- **Reliability**: Consistent error handling and delivery tracking
- **Performance**: Optimized template rendering and caching
- **Developer Experience**: Easy to add new email templates
- **Build Stability**: Resolved Vercel module resolution issues
- **Testing**: Simplified testing with unified interface

### Negative
- **Migration Effort**: Required refactoring existing email implementations
- **Provider Lock-in**: Primary dependency on Resend service
- **Learning Curve**: Team needs to learn React Email template syntax
- **Complexity**: Additional abstraction layer adds complexity

### Neutral
- **Template Storage**: Templates stored in version control with code
- **Configuration Management**: Email settings managed via environment variables
- **Monitoring**: Reliance on provider-level delivery tracking

## Implementation Details

### Service Structure
```typescript
// lib/services/email-service.ts
export class UnifiedEmailService {
  async sendEmail(params: SendEmailParams): Promise<EmailResult>
  async sendTemplate<T>(templateId: string, data: T): Promise<EmailResult>
  async validateTemplate(templateId: string): Promise<boolean>
  private async renderTemplate<T>(template: EmailTemplate<T>, data: T): Promise<string>
}
```

### Template Example
```typescript
// components/emails/ParticipantApprovalNotificationEmail.tsx
interface ParticipantApprovalProps {
  tripTitle: string;
  participantName: string;
  approvalDate: string;
  tripDetails: TripDetails;
}

export function ParticipantApprovalNotificationEmail(props: ParticipantApprovalProps) {
  return (
    <Html>
      <Head />
      <Preview>Your participation has been approved!</Preview>
      <Body className="bg-white font-sans">
        {/* Email content */}
      </Body>
    </Html>
  );
}
```

### Error Handling Strategy
```typescript
try {
  const result = await emailService.sendTemplate('participantApproval', data);
  logger.info('Email sent successfully', { messageId: result.id });
} catch (error) {
  logger.error('Email sending failed', { error, data });
  // Fallback handling or retry logic
}
```

## Migration Strategy

### Phase 1: Infrastructure Setup ✅
- Create unified email service
- Set up React Email templates
- Configure Resend integration
- Update environment variables

### Phase 2: Template Migration ✅
- Migrate existing email formats to React Email
- Create new required templates
- Update email sending calls
- Test template rendering

### Phase 3: Integration Updates ✅
- Update API routes to use new service
- Migrate background job email sending
- Remove legacy email code
- Update tests and documentation

### Phase 4: Optimization
- Implement email analytics
- Add delivery tracking
- Optimize template performance
- Set up monitoring alerts

## Monitoring and Metrics

### Key Metrics
- Email delivery success rate (target: >98%)
- Template rendering performance
- Provider API response times
- Email bounce and complaint rates

### Alerting
- Failed email delivery notifications
- Provider API outages
- Template rendering errors
- High bounce rate alerts

## Security Considerations

### Data Protection
- Sensitive data handling in templates
- Secure API key management
- Email content sanitization
- User privacy compliance

### Access Control
- Environment-based configuration
- API key rotation procedures
- Template update authorization
- Audit logging for email operations

## Future Considerations

### Potential Improvements
- **Multi-provider Support**: Implement automatic failover
- **Advanced Templates**: Rich content and interactive elements
- **Analytics Integration**: Detailed email performance tracking
- **A/B Testing**: Template and content optimization
- **Personalization**: Dynamic content based on user preferences

### Technical Debt
- Consider provider abstraction if vendor lock-in becomes an issue
- Evaluate template caching strategies for high-volume sending
- Implement email queue system for high-throughput scenarios

## References

- [React Email Documentation](https://react.email/)
- [Resend API Documentation](https://resend.com/docs)
- [Next.js Email Best Practices](https://nextjs.org/docs/pages/building-your-application/optimizing/email)
- [Email Accessibility Guidelines](https://www.emailonacid.com/blog/article/email-development/email-accessibilty-in-2021/)

---

**Decision Date**: January 10, 2025
**Contributors**: Engineering Team
**Review Date**: June 2025
