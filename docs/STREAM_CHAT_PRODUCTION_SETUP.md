# Stream Chat Production Configuration Guide
**Task 22.1: Production API Key Setup**

This document provides comprehensive instructions for configuring Stream Chat for production deployment in the Cascais Fishing Platform.

## Prerequisites

1. Stream Chat account with production credentials
2. Production environment with proper security measures
3. Database configured for user management
4. SSL/TLS certificates for secure communication

## Environment Variables Configuration

### Required Variables

Create or update your production environment variables:

```bash
# Stream Chat Core Configuration
NEXT_PUBLIC_STREAM_CHAT_API_KEY=your-production-api-key
STREAM_CHAT_API_SECRET=your-production-api-secret

# Environment Configuration  
NODE_ENV=production
STREAM_CHAT_ENVIRONMENT=production

# Optional Advanced Configuration
STREAM_CHAT_BASE_URL=https://chat.stream-io-api.com
STREAM_CHAT_TIMEOUT=10000
STREAM_CHAT_ENABLE_LOGGING=false
```

### Security Best Practices

1. **API Key Management**
   - Store API keys in secure environment variable management system
   - Never commit API keys to version control
   - Rotate keys regularly (recommended: every 90 days)
   - Use different keys for development, staging, and production

2. **API Secret Protection**
   - Store API secret in server-side environment only
   - Never expose API secret to client-side code
   - Use secrets management service (e.g., AWS Secrets Manager, Azure Key Vault)

3. **Network Security**
   - Ensure HTTPS is enabled for all API communications
   - Configure proper CORS headers
   - Implement rate limiting for API endpoints

## Production Deployment Checklist

### Pre-Deployment

- [ ] Obtain production Stream Chat API credentials
- [ ] Verify API key and secret are valid and not demo keys
- [ ] Configure environment variables in production environment
- [ ] Set up secrets management system
- [ ] Configure logging and monitoring

### API Key Validation

Your production API key should:
- Be obtained from Stream Chat production dashboard
- Not contain "demo", "test", or "dev" in the key
- Be at least 10 characters long
- Start with valid Stream Chat key prefix

### Testing Production Configuration

1. **Health Check Endpoint**
   ```bash
   curl https://your-domain.com/api/chat/health
   ```

2. **Connection Test**
   ```bash
   curl https://your-domain.com/api/chat/test-connection
   ```

3. **Token Generation Test**
   ```bash
   # Requires authentication
   curl -X POST https://your-domain.com/api/chat/token \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-session-token"
   ```

## Configuration Files

### Stream Chat Configuration (`lib/config/stream-chat.ts`)

The production configuration includes:
- Environment validation
- Security checks  
- Error handling
- Health monitoring
- Performance optimization

Key features:
- Singleton server client instance
- Production-ready token generation
- Comprehensive error handling
- Performance monitoring
- Security validation

### API Endpoints

1. **Token Generation** (`/api/chat/token`)
   - POST: Generate user authentication token
   - GET: Get current user chat status

2. **Connection Testing** (`/api/chat/test-connection`)
   - GET: Test Stream Chat connection

3. **Health Monitoring** (`/api/chat/health`)
   - GET: Comprehensive health check with troubleshooting

## Monitoring and Alerting

### Health Check Monitoring

Set up monitoring for these endpoints:
- `/api/chat/health` - Overall service health
- `/api/chat/test-connection` - Connection status

### Key Metrics to Monitor

1. **Connection Metrics**
   - API response time
   - Connection success rate
   - Token generation success rate

2. **Error Tracking**
   - Authentication failures
   - API quota exceeded
   - Network connectivity issues

3. **Performance Metrics**
   - Message delivery latency
   - Connection establishment time
   - User session duration

### Alerting Configuration

Set up alerts for:
- Health check failures (status != 'healthy')
- High error rates (>5% over 5 minutes)
- Slow response times (>2 seconds)
- API quota approaching limits

## Troubleshooting

### Common Issues

1. **"Invalid API Key" Error**
   - Verify `NEXT_PUBLIC_STREAM_CHAT_API_KEY` is set correctly
   - Check if key is not a demo/test key
   - Confirm key has proper format and permissions

2. **"Authentication Failed" Error**  
   - Verify `STREAM_CHAT_API_SECRET` is set correctly
   - Ensure secret matches the API key
   - Check if secret has proper server-side permissions

3. **Connection Timeouts**
   - Check network connectivity to Stream Chat servers
   - Verify firewall allows outbound HTTPS connections
   - Increase `STREAM_CHAT_TIMEOUT` if needed

4. **Token Generation Failures**
   - Ensure user data is valid and properly formatted
   - Check if user ID meets Stream Chat requirements
   - Verify server-side API secret is configured

### Debug Mode

Enable debug logging in development:
```bash
STREAM_CHAT_ENABLE_LOGGING=true
```

### Health Check Response Codes

- `200 OK`: All systems healthy
- `200 OK` with warnings: Some degraded services
- `503 Service Unavailable`: Unhealthy, service issues

## Scaling Considerations

### Connection Limits

Stream Chat has connection limits based on your plan:
- Monitor active connections
- Implement connection pooling
- Use proper disconnect handling

### Performance Optimization

1. **Client-Side**
   - Implement proper connection reuse
   - Use connection state management
   - Implement offline handling

2. **Server-Side**
   - Use singleton client instance
   - Implement token caching
   - Use batch operations where possible

## Security Considerations

### Authentication Flow

1. User authenticates with your application
2. Server generates Stream Chat token using API secret
3. Client connects to Stream Chat using token
4. Token expires and gets refreshed automatically

### Data Privacy

- Configure proper user permissions
- Implement message retention policies
- Use Stream Chat moderation features
- Comply with GDPR/data protection requirements

## Backup and Disaster Recovery

### Data Backup
- Stream Chat handles message data backup
- Export user data periodically for compliance
- Maintain local user profile backups

### Failover Strategy
- Implement graceful degradation
- Use fallback messaging systems if needed
- Monitor service availability

## Support and Resources

- Stream Chat Documentation: https://getstream.io/chat/docs/
- API Reference: https://getstream.io/chat/docs/api/
- Support Portal: https://getstream.io/support/

## Changelog

- v1.0.0: Initial production configuration
- Added comprehensive health monitoring
- Implemented security best practices
- Added troubleshooting documentation
