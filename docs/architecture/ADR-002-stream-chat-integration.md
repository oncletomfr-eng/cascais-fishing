# ADR-002: Stream Chat Integration Architecture

## Status
Accepted (January 2025)

## Context

The Cascais Fishing platform requires real-time communication features to enable:
- Trip participants to communicate during fishing trips
- Captain-to-participant coordination
- Group discussions about fishing conditions and techniques
- File sharing (photos of catches, weather updates)
- Moderated community interactions

### Technical Requirements
- Real-time messaging with WebSocket support
- File upload capabilities (images, documents)
- Message moderation and content filtering
- Mobile-responsive UI across devices
- Offline message synchronization
- User presence indicators
- Scalable architecture for growing user base

### Evaluation Criteria
- **Integration Complexity**: Ease of implementation with Next.js/React
- **Scalability**: Ability to handle growing user base
- **Feature Completeness**: Built-in features vs custom development
- **Reliability**: Service uptime and message delivery guarantees
- **Cost Structure**: Pricing model and long-term affordability
- **Security**: Data protection and privacy compliance
- **Mobile Support**: React Native compatibility for future mobile apps

### Alternatives Considered

#### 1. Custom WebSocket Solution
- **Pros**: Full control, no vendor dependency, custom features
- **Cons**: Complex implementation, infrastructure management, security concerns, development time
- **Verdict**: Too resource-intensive for current team size

#### 2. Socket.io with Redis
- **Pros**: Well-established, flexible, good documentation
- **Cons**: Requires backend infrastructure, scaling complexity, custom UI development
- **Verdict**: Would require significant backend development effort

#### 3. Firebase Realtime Database/Firestore
- **Pros**: Google-backed reliability, real-time updates, good documentation
- **Cons**: Limited chat-specific features, custom UI required, vendor lock-in with Google
- **Verdict**: Missing specialized chat features like moderation

#### 4. Stream Chat
- **Pros**: Chat-specialized platform, rich feature set, React SDK, moderation tools
- **Cons**: Vendor dependency, subscription cost, learning curve
- **Verdict**: Best balance of features vs implementation effort

## Decision

We decided to integrate **Stream Chat** as our real-time messaging solution with the following architecture:

### 1. Stream Chat SDK Integration
```typescript
// lib/stream-chat.ts
import { StreamChat } from 'stream-chat';
import { generateUserToken } from 'stream-chat';

export const chatClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
  process.env.STREAM_CHAT_API_SECRET
);

export async function createUserToken(userId: string): Promise<string> {
  return chatClient.createToken(userId);
}
```

### 2. User Authentication Integration
```typescript
// Integration with NextAuth
export async function initializeChatUser(session: Session) {
  const token = await createUserToken(session.user.id);
  
  await chatClient.connectUser(
    {
      id: session.user.id,
      name: session.user.name,
      image: session.user.image,
    },
    token
  );
}
```

### 3. Channel Management System
```typescript
// Channel types for different use cases
enum ChannelType {
  TRIP_CHAT = 'trip',        // Trip-specific discussions
  GROUP_CHAT = 'group',      // General group conversations
  DIRECT_MESSAGE = 'messaging', // 1-on-1 conversations
  ANNOUNCEMENT = 'announce'   // Read-only announcements
}

// Channel creation with proper permissions
export async function createTripChannel(tripId: string, participants: string[]) {
  const channel = chatClient.channel('trip', tripId, {
    name: `Trip ${tripId} Chat`,
    members: participants,
    created_by_id: 'system',
  });
  
  await channel.create();
  return channel;
}
```

### 4. UI Component Architecture
```typescript
// components/chat/ChatInterface.tsx
interface ChatInterfaceProps {
  channelId: string;
  channelType: ChannelType;
  theme?: 'light' | 'dark';
  moderationEnabled?: boolean;
}

export function ChatInterface({
  channelId,
  channelType,
  theme = 'light',
  moderationEnabled = true
}: ChatInterfaceProps) {
  return (
    <Chat client={chatClient} theme={theme}>
      <Channel channel={channel}>
        <Window>
          <ChannelHeader />
          <MessageList />
          <MessageInput />
        </Window>
        <Thread />
      </Channel>
    </Chat>
  );
}
```

### 5. Moderation and Security
```typescript
// Automated moderation configuration
const moderationConfig = {
  automod: 'AI',           // AI-powered content moderation
  automod_behavior: 'flag', // Flag suspicious content for review
  blocklist_behavior: 'block', // Block messages with banned words
  commands: ['ban', 'mute', 'timeout'], // Available moderation commands
};

// Custom moderation rules
export async function setupChannelModeration(channelId: string) {
  const channel = chatClient.channel('trip', channelId);
  
  await channel.updatePartial({
    set: {
      automod: 'AI',
      automod_behavior: 'flag',
      custom_moderation_rules: {
        spam_detection: true,
        profanity_filter: true,
        link_validation: true,
      }
    }
  });
}
```

## Consequences

### Positive
- **Rapid Development**: Pre-built React components and hooks accelerate development
- **Rich Feature Set**: Built-in features like file uploads, reactions, threading, typing indicators
- **Scalability**: Stream handles infrastructure scaling automatically
- **Reliability**: 99.999% uptime SLA and enterprise-grade infrastructure
- **Security**: Built-in moderation, encryption, and security features
- **Mobile Ready**: React Native SDK available for future mobile apps
- **Real-time**: WebSocket connections with automatic fallbacks
- **Developer Experience**: Excellent documentation and developer tools

### Negative
- **Vendor Dependency**: Reliance on Stream's service availability and pricing
- **Cost Structure**: Per-user pricing model may become expensive at scale
- **Customization Limits**: Some UI/UX limitations with pre-built components
- **Learning Curve**: Team needs to learn Stream-specific APIs and concepts
- **Data Location**: Chat data stored on Stream's infrastructure

### Neutral
- **Integration Complexity**: Moderate complexity for advanced features
- **Migration Path**: Possible to export data if migration needed in future
- **Compliance**: Stream provides GDPR/SOC2 compliance but requires trust in vendor

## Implementation Details

### Authentication Flow
```typescript
// pages/api/chat/token.ts
export default async function handler(req: NextRequest) {
  const session = await getServerSession(req, authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const token = chatClient.createToken(session.user.id);
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: 'Token creation failed' }, { status: 500 });
  }
}
```

### Channel Permissions
```typescript
// Role-based permissions for different channel types
const channelPermissions = {
  trip: {
    admin: ['read', 'write', 'delete', 'moderate'],
    captain: ['read', 'write', 'moderate'],
    participant: ['read', 'write'],
    observer: ['read']
  },
  group: {
    owner: ['read', 'write', 'delete', 'moderate'],
    moderator: ['read', 'write', 'moderate'],
    member: ['read', 'write'],
    guest: ['read']
  }
};
```

### File Upload Configuration
```typescript
// Configure file uploads with size and type restrictions
const fileUploadConfig = {
  allowed_file_extensions: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
  allowed_mime_types: ['image/jpeg', 'image/png', 'application/pdf'],
  max_file_size: 10 * 1024 * 1024, // 10MB
  max_attachment_size: 50 * 1024 * 1024, // 50MB total
  image_resize: {
    width: 800,
    height: 600,
    quality: 80
  }
};
```

## Mobile Responsiveness

### Responsive Design Implementation
```typescript
// components/chat/theming/ResponsiveChatLayout.tsx
export function ResponsiveChatLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div className={`
      ${isMobile ? 'fixed inset-0 z-50' : 'h-96 rounded-lg border'}
      flex flex-col bg-white
    `}>
      <ChatInterface
        channelId={channelId}
        channelType="trip"
        theme={isMobile ? 'mobile' : 'desktop'}
      />
    </div>
  );
}
```

### Touch Gesture Support
- Swipe gestures for message actions
- Pull-to-refresh for message history
- Touch-optimized UI components
- Haptic feedback integration

## Performance Optimization

### Connection Management
```typescript
// Optimize connection handling
useEffect(() => {
  let mounted = true;
  
  async function initChat() {
    if (session?.user && !chatClient.user && mounted) {
      await initializeChatUser(session);
    }
  }
  
  initChat();
  
  return () => {
    mounted = false;
    if (chatClient.user) {
      chatClient.disconnectUser();
    }
  };
}, [session]);
```

### Message Pagination
- Lazy loading of message history
- Infinite scroll implementation
- Image lazy loading and optimization
- Connection state management

## Monitoring and Analytics

### Key Metrics
- Message delivery success rate
- Real-time connection stability
- User engagement metrics
- File upload success rates
- Moderation effectiveness

### Error Tracking
```typescript
// Integration with Sentry for error tracking
chatClient.on('connection.recovered', () => {
  console.log('Chat connection recovered');
});

chatClient.on('connection.error', (error) => {
  Sentry.captureException(error);
  console.error('Chat connection error:', error);
});
```

## Security Considerations

### Data Protection
- End-to-end message encryption in transit
- User token expiration and refresh
- Rate limiting for message sending
- Content moderation and filtering

### Privacy Compliance
- GDPR-compliant data handling
- User data export capabilities
- Message retention policies
- Right to deletion support

## Future Enhancements

### Planned Features
- **Voice Messages**: Audio message recording and playback
- **Video Calls**: Integration with WebRTC for video communication
- **Bot Integration**: Automated responses and fishing tips
- **Advanced Search**: Full-text search across message history
- **Custom Reactions**: Fishing-themed emoji reactions
- **Offline Support**: Message queuing and sync when connection restored

### Integration Opportunities
- **Weather Integration**: Automated weather updates in trip channels
- **Location Sharing**: GPS coordinates sharing for fishing spots
- **Catch Logging**: Direct integration with fishing diary
- **Event Notifications**: Trip updates and system announcements

## Migration Strategy

### Phase 1: Basic Integration ✅
- Set up Stream Chat account and API keys
- Implement basic chat UI components
- User authentication integration
- Channel creation for trips

### Phase 2: Enhanced Features ✅
- File upload and image sharing
- Message moderation setup
- Mobile responsive design
- Error handling and monitoring

### Phase 3: Advanced Features
- Custom moderation rules
- Advanced channel permissions
- Performance optimizations
- Analytics integration

### Phase 4: Future Enhancements
- Voice/video integration
- Advanced search capabilities
- Bot integrations
- Offline support

## Cost Analysis

### Pricing Structure (as of January 2025)
- **Maker Plan**: $99/month for up to 100 MAU
- **Growth Plan**: $499/month for up to 1,000 MAU
- **Enterprise**: Custom pricing for 10,000+ MAU

### Cost Optimization Strategies
- Monitor Monthly Active Users (MAU) closely
- Implement user cleanup for inactive accounts
- Optimize channel creation (avoid excessive channels)
- Regular usage analytics review

## References

- [Stream Chat React SDK Documentation](https://getstream.io/chat/docs/sdk/react/)
- [Stream Chat API Reference](https://getstream.io/chat/docs/rest/)
- [Next.js Integration Guide](https://getstream.io/chat/react-chat/tutorial/)
- [Mobile Chat UI Best Practices](https://getstream.io/blog/chat-ui-best-practices/)
- [Real-time Chat Security](https://getstream.io/blog/chat-security-best-practices/)

---

**Decision Date**: January 10, 2025
**Contributors**: Engineering Team, UX Team
**Review Date**: June 2025
**Next Evaluation**: December 2025 (annual vendor review)
