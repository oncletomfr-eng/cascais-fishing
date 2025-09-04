# Chat Security & Permission Management Guide
**Task 22.2: Chat Security Configuration**

This document provides comprehensive documentation for the Stream Chat security system implemented in the Cascais Fishing Platform.

## Overview

The Chat Security Configuration implements a comprehensive multi-layered security system:

- **Role-Based Access Control (RBAC)** with 8 distinct user roles
- **Permission-Based Authorization** with 15 granular permissions
- **Channel-Type Security** with 5 specialized channel types
- **Advanced Authentication Middleware** for endpoint protection
- **Content Moderation System** with automated and manual controls
- **Comprehensive Audit Logging** for security monitoring

## Architecture

### 1. Role-Based Access Control (RBAC)

#### User Roles Hierarchy (ascending privilege)

```typescript
enum ChatRole {
  BANNED = 'banned',           // No access
  GUEST = 'guest',            // Limited visitor access
  USER = 'user',              // Standard authenticated user
  PREMIUM_USER = 'premium_user', // Enhanced user privileges
  CAPTAIN = 'captain',        // Trip leader permissions
  MODERATOR = 'moderator',    // Content moderation rights
  ADMIN = 'admin',           // Full administrative access
  SUPER_ADMIN = 'super_admin' // Complete system control
}
```

#### Role Determination Logic

User roles are dynamically determined based on:
- Application role (`admin`, `moderator`, `captain`, `user`, `guest`)
- Premium subscription status
- Trip ownership context
- Moderation privileges

### 2. Permission System

#### Core Permissions

```typescript
enum ChatPermission {
  // Channel Management
  CREATE_CHANNEL = 'create_channel',
  DELETE_CHANNEL = 'delete_channel', 
  UPDATE_CHANNEL = 'update_channel',
  
  // Member Management
  ADD_MEMBERS = 'add_members',
  REMOVE_MEMBERS = 'remove_members',
  BAN_MEMBERS = 'ban_members',
  MUTE_MEMBERS = 'mute_members',
  
  // Message Control
  SEND_MESSAGE = 'send_message',
  DELETE_MESSAGE = 'delete_message',
  EDIT_MESSAGE = 'edit_message',
  PIN_MESSAGE = 'pin_message',
  
  // Content Sharing
  UPLOAD_FILE = 'upload_file',
  SHARE_LINK = 'share_link',
  SEND_EMOJI = 'send_emoji',
  
  // Moderation
  MODERATE_CONTENT = 'moderate_content',
  VIEW_REPORTS = 'view_reports',
  HANDLE_FLAGS = 'handle_flags'
}
```

#### Permission Matrix

| Role | Channel Mgmt | Member Mgmt | Message Control | File Upload | Moderation |
|------|-------------|-------------|----------------|-------------|------------|
| **SUPER_ADMIN** | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| **ADMIN** | ✅ Create/Update/Delete | ✅ All except Super Admin | ✅ All | ✅ All | ✅ All |
| **MODERATOR** | ✅ Update only | ✅ Add/Remove/Mute | ✅ Send/Delete/Pin | ✅ Upload/Link | ✅ All |
| **CAPTAIN** | ✅ Create/Update | ✅ Add/Remove/Mute | ✅ Send/Edit/Delete/Pin | ✅ Upload/Link | ❌ |
| **PREMIUM_USER** | ❌ | ✅ Add only | ✅ Send/Edit | ✅ Upload/Link | ❌ |
| **USER** | ❌ | ❌ | ✅ Send/Edit | ✅ Upload only | ❌ |
| **GUEST** | ❌ | ❌ | ✅ Send only | ❌ | ❌ |
| **BANNED** | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3. Channel Types & Security

#### Channel Types

```typescript
enum ChannelType {
  TRIP_CHAT = 'trip_chat',           // Private trip conversations
  GROUP_CHAT = 'group_chat',         // General group discussions  
  ANNOUNCEMENT = 'announcement',      // Admin/Captain broadcasts
  SUPPORT_CHAT = 'support_chat',     // Customer support
  MODERATION = 'moderation'          // Moderation team only
}
```

#### Channel Access Rules

- **TRIP_CHAT**: Trip participants + Captains + Moderators + Admins
- **GROUP_CHAT**: All authenticated users (except banned)
- **ANNOUNCEMENT**: All users can read, Captains+ can write
- **SUPPORT_CHAT**: All authenticated users
- **MODERATION**: Moderators and Admins only

#### Channel Security Configuration

Each channel type has specialized security settings:

```typescript
// Example: Trip Chat Configuration
{
  private: true,
  members_only: true,
  max_members: 20,
  automod: true,
  automod_behavior: 'block',
  max_message_length: 1000,
  message_retention: '30d',
  file_upload: true,
  max_file_size: 10485760 // 10MB
}
```

## API Endpoints

### 1. Authentication API (`/api/chat/auth`)

#### POST - Enhanced Authentication with RBAC

```bash
curl -X POST /api/chat/auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session-token>" \
  -d '{
    "channelId": "trip-12345",
    "channelType": "trip_chat",
    "requestedPermissions": ["send_message", "upload_file"]
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "name": "John Doe", 
    "email": "john@example.com",
    "role": "captain",
    "permissions": ["create_channel", "send_message", ...],
    "token": "eyJhbGciOiJ...",
    "expiresAt": "2025-01-06T12:00:00Z"
  },
  "context": {
    "channelType": "trip_chat",
    "channelAccess": true,
    "securityLevel": "medium"
  }
}
```

#### GET - Authentication Status Check

```bash
curl /api/chat/auth \
  -H "Authorization: Bearer <session-token>"
```

### 2. Secure Channel Management (`/api/chat/secure-channels`)

#### POST - Create/Manage Channels with Security

```bash
curl -X POST /api/chat/secure-channels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <session-token>" \
  -d '{
    "action": "create",
    "channelType": "trip_chat",
    "tripId": "trip_12345",
    "channelConfig": {
      "name": "Fishing Trip - Jan 6",
      "description": "Group chat for today\'s fishing trip",
      "isPrivate": true,
      "maxMembers": 15,
      "autoModeration": true
    }
  }'
```

#### GET - List Accessible Channels

```bash
curl "/api/chat/secure-channels?type=trip_chat&metadata=true" \
  -H "Authorization: Bearer <session-token>"
```

### 3. Content Moderation (`/api/chat/moderation`)

#### POST - Moderation Actions

```bash
# Flag a message
curl -X POST /api/chat/moderation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <moderator-token>" \
  -d '{
    "action": "flag_message",
    "channelId": "trip_12345",
    "messageId": "msg_456", 
    "reason": "Inappropriate language",
    "severity": "medium"
  }'

# Ban a user
curl -X POST /api/chat/moderation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <moderator-token>" \
  -d '{
    "action": "moderate_user",
    "userId": "user_789",
    "moderationAction": "ban",
    "duration": 1440,
    "reason": "Repeated violations",
    "channelId": "trip_12345"
  }'
```

#### GET - Moderation Queue

```bash
curl "/api/chat/moderation?status=pending&severity=high" \
  -H "Authorization: Bearer <moderator-token>"
```

## Authentication Middleware

### Usage Examples

#### Basic Endpoint Protection

```typescript
import { requireChatAuth } from '@/lib/middleware/chat-auth';

export const POST = requireChatAuth()(
  async (request, context) => {
    const { user } = context;
    // user.id, user.role, user.permissions available
    return NextResponse.json({ success: true });
  }
);
```

#### Permission-Specific Protection

```typescript
import { requireChatPermissions } from '@/lib/middleware/chat-auth';

export const POST = requireChatPermissions.deleteMessage()(
  async (request, context) => {
    // Only users with DELETE_MESSAGE permission can access
    return NextResponse.json({ success: true });
  }
);
```

#### Role-Specific Protection

```typescript
import { requireChatRole } from '@/lib/middleware/chat-auth';

export const GET = requireChatRole.moderator()(
  async (request, context) => {
    // Only moderators and above can access
    return NextResponse.json({ success: true });
  }
);
```

## Security Features

### 1. Audit Logging

All security-relevant actions are automatically logged:

```typescript
await ChatSecurityManager.auditUserAction(
  userId,
  'channel_create_attempt',
  channelId,
  {
    channelType: 'trip_chat',
    userRole: 'captain',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    success: true
  },
  true
);
```

#### Audit Log Types

- `authentication_success` / `authentication_failed`
- `channel_access_granted` / `channel_access_denied`
- `permission_granted` / `permission_denied` 
- `moderation_action_taken`
- `security_violation_detected`

### 2. Content Moderation

#### Automated Moderation

- **AI-Powered Filtering**: Stream Chat's AI moderation
- **Keyword Detection**: Custom banned words and phrases
- **Spam Prevention**: Rate limiting and duplicate content detection
- **Link Filtering**: URL validation and malware protection

#### Manual Moderation

- **Message Flagging**: User-reported content review
- **User Moderation**: Warn, mute, timeout, or ban users
- **Content Review**: Moderator queue for flagged content
- **Appeal Process**: Automated appeals for moderation actions

### 3. Rate Limiting & Abuse Prevention

#### Message Rate Limits

- **Users**: 30 messages per minute
- **Premium Users**: 50 messages per minute  
- **Captains**: 100 messages per minute
- **Moderators**: No limit

#### Channel Limits

- **Users**: 5 channels maximum
- **Premium Users**: 20 channels maximum
- **Captains**: 50 channels maximum
- **Moderators**: No limit

### 4. Data Privacy & Compliance

#### Message Retention

- **Trip Chats**: 30 days
- **Support Chats**: 90 days
- **Moderation Logs**: 365 days  
- **General Chats**: 14 days

#### GDPR Compliance

- **Right to Deletion**: Automated user data removal
- **Data Export**: Complete chat history export
- **Consent Management**: Granular privacy controls
- **Breach Notification**: Automated security incident reporting

## Monitoring & Alerting

### Health Check Endpoints

- `/api/chat/health` - Overall system health
- `/api/chat/test-connection` - Stream Chat connectivity  
- `/api/chat/auth` - Authentication system status

### Key Metrics

#### Security Metrics

- Authentication success/failure rates
- Permission denial incidents
- Moderation action frequency
- Abuse report volume

#### Performance Metrics

- Token generation latency
- Channel creation time
- Message delivery speed
- Connection establishment time

#### User Activity Metrics

- Active users per role
- Channel participation rates
- Message volume by channel type
- Feature usage statistics

### Alert Conditions

#### Critical Alerts

- Multiple authentication failures from same IP
- Privilege escalation attempts
- Mass user reporting/flagging
- System-wide connection failures

#### Warning Alerts

- High moderation queue volume  
- Unusual user activity patterns
- Performance degradation
- API rate limit approaching

## Best Practices

### For Developers

1. **Always use middleware** for endpoint protection
2. **Check permissions explicitly** for sensitive operations  
3. **Audit all security actions** with context
4. **Validate input** before processing requests
5. **Use secure defaults** for channel configurations

### For Administrators

1. **Monitor audit logs** regularly for suspicious activity
2. **Review moderation queue** daily during business hours
3. **Update user roles** promptly when status changes
4. **Test security configurations** after updates
5. **Maintain backup procedures** for critical data

### For Users

1. **Report inappropriate content** using built-in tools
2. **Respect community guidelines** in all channels
3. **Keep account information** up to date
4. **Use strong authentication** methods when available
5. **Be aware of privacy settings** for channels

## Troubleshooting

### Common Issues

#### Authentication Failures

- **Verify session validity**: Check NextAuth session status
- **Check API keys**: Ensure Stream Chat keys are properly configured
- **Validate permissions**: Confirm user has required permissions
- **Review audit logs**: Check for security violations

#### Channel Access Issues

- **Verify membership**: Ensure user is channel member
- **Check role permissions**: Validate role has channel access
- **Review channel type**: Confirm appropriate channel type access
- **Validate channel configuration**: Check channel security settings

#### Moderation Problems

- **Check moderator permissions**: Verify moderation role assignment
- **Review flagged content**: Ensure proper flag processing
- **Validate moderation actions**: Check action was properly executed
- **Audit moderation logs**: Review action history

### Debug Tools

#### Authentication Debug

```bash
# Check current auth status
curl /api/chat/auth -H "Authorization: Bearer <token>"

# Test specific permissions
curl -X POST /api/chat/auth \
  -d '{"requestedPermissions": ["send_message"]}' \
  -H "Authorization: Bearer <token>"
```

#### Channel Debug

```bash
# List accessible channels
curl /api/chat/secure-channels -H "Authorization: Bearer <token>"

# Test channel creation
curl -X POST /api/chat/secure-channels \
  -d '{"action": "create", "channelType": "group_chat"}' \
  -H "Authorization: Bearer <token>"
```

#### Moderation Debug

```bash
# Check moderation queue
curl /api/chat/moderation -H "Authorization: Bearer <moderator-token>"

# Test moderation action
curl -X POST /api/chat/moderation \
  -d '{"action": "flag_message", "messageId": "test"}' \
  -H "Authorization: Bearer <moderator-token>"
```

## Security Checklist

### Pre-Deployment

- [ ] All API keys configured and validated
- [ ] Authentication middleware applied to all endpoints  
- [ ] Permission matrices reviewed and tested
- [ ] Audit logging configured and functional
- [ ] Rate limiting implemented and tested
- [ ] Content moderation rules configured
- [ ] Channel security settings validated
- [ ] Health monitoring set up

### Post-Deployment

- [ ] Monitor authentication success rates
- [ ] Review audit logs for anomalies
- [ ] Test moderation workflow
- [ ] Verify channel access controls
- [ ] Check performance metrics
- [ ] Validate alert notifications
- [ ] Update security documentation
- [ ] Train moderators on new features

## Support & Resources

- **Stream Chat Documentation**: https://getstream.io/chat/docs/
- **Security Best Practices**: https://getstream.io/chat/docs/security/
- **Moderation Guide**: https://getstream.io/chat/docs/moderation/
- **API Reference**: https://getstream.io/chat/docs/api/

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Next Review**: February 2025
