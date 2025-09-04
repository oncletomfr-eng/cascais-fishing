# Moderation System Guide
**Task 22.4: Moderation Tools Implementation**

This document provides comprehensive documentation for the Moderation System implemented for Stream Chat in the Cascais Fishing Platform.

## Overview

The Moderation System provides enterprise-grade content moderation capabilities with:

- **Real-Time Moderation Dashboard** - Live queue management and content review
- **AI-Powered Content Analysis** - Automated threat detection and pattern matching
- **Advanced Workflow Management** - Structured review processes with audit trails
- **Auto-Moderation Rules Engine** - Configurable automated moderation policies
- **Comprehensive Analytics** - Performance metrics and reporting
- **Role-Based Access Control** - Granular permissions for moderation team

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Moderation System                         │
├─────────────────────────────────────────────────────────────────┤
│ Admin Interface                                                 │
│ ├── ModerationDashboard.tsx     - Main dashboard & queue       │
│ ├── ContentReviewPanel.tsx      - Detailed content review      │
│ ├── AutoModerationRules.tsx     - Rules management             │
│ └── /admin/moderation/page.tsx  - Main admin page             │
├─────────────────────────────────────────────────────────────────┤
│ Backend APIs                                                    │
│ ├── /api/chat/moderation        - Core moderation operations   │
│ ├── /api/chat/auto-moderation   - Rule management              │
│ └── Security middleware         - Access control               │
├─────────────────────────────────────────────────────────────────┤
│ Features                                                        │
│ ├── Real-time queue management  - Live flagged content         │
│ ├── AI content analysis        - Threat detection              │
│ ├── Workflow automation        - Rule-based actions            │
│ ├── Audit logging             - Complete activity tracking     │
│ └── Performance analytics      - System metrics                │
└─────────────────────────────────────────────────────────────────┘
```

### Security & Access Control

#### Moderation Roles

| Role | Permissions | Dashboard Access | Rule Management | User Actions |
|------|-------------|------------------|----------------|--------------|
| **SUPER_ADMIN** | Full access | ✅ All features | ✅ Create/Edit/Delete | ✅ Ban/Suspend/Warn |
| **ADMIN** | Most features | ✅ All features | ✅ Create/Edit/Delete | ✅ Ban/Suspend/Warn |
| **MODERATOR** | Review & action | ✅ Queue & review | ✅ View/Test only | ✅ Warn/Mute only |
| **CAPTAIN** | Limited review | ❌ No access | ❌ No access | ❌ No access |
| **USER** | Report only | ❌ No access | ❌ No access | ❌ No access |

#### Access Protection

All moderation endpoints and components are protected with:
- **Authentication middleware** - Session validation required
- **Role-based authorization** - Minimum moderator role enforced
- **Audit logging** - All actions tracked with user context
- **IP and device tracking** - Security monitoring enabled

## Features

### 1. Real-Time Moderation Dashboard

#### Main Dashboard (`ModerationDashboard.tsx`)

**Features:**
- Live statistics dashboard with key metrics
- Real-time moderation queue with auto-refresh
- Filtering and search capabilities
- Bulk action support for efficiency
- Tab-based navigation (Queue, Analytics, Users, Settings)

**Key Statistics:**
- **Pending Reviews** - Items awaiting moderator action
- **Resolved Today** - Items processed in current day
- **User Reports** - Community-generated reports
- **Average Resolution Time** - Performance metric

**Queue Management:**
```typescript
// Filter options
const filters = {
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  severity: 'low' | 'medium' | 'high' | 'critical',
  type: 'message' | 'user' | 'channel' | 'file',
  reporter: string,
  dateRange: { start: Date, end: Date }
};

// Bulk actions
const bulkActions = [
  'approve_all',
  'dismiss_all', 
  'escalate_selected',
  'assign_to_moderator'
];
```

**Real-Time Updates:**
- 30-second auto-refresh cycle
- WebSocket notifications for urgent items
- Live status indicators for system health

### 2. Content Review Panel

#### Advanced Review Interface (`ContentReviewPanel.tsx`)

**Multi-Tab Review System:**
1. **Content Tab** - Raw content display with security blur
2. **Analysis Tab** - AI-powered threat assessment
3. **Context Tab** - User, channel, and conversation context
4. **History Tab** - Complete review timeline

**AI-Powered Analysis:**
```typescript
interface ContentAnalysis {
  threatLevel: 'safe' | 'suspicious' | 'harmful' | 'critical';
  confidence: number; // 0-100
  categories: string[];
  patterns: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: string[];
  similarCases?: {
    id: string;
    similarity: number;
    outcome: string;
  }[];
}
```

**Security Features:**
- **Content Blurring** - Potentially harmful content automatically blurred
- **Context Analysis** - User history and behavioral patterns
- **Pattern Detection** - AI identification of suspicious content
- **Evidence Collection** - Screenshots, metadata, and context preservation

**Decision Workflow:**
1. **Review** - Moderator examines content and context
2. **Analysis** - AI provides threat assessment and recommendations
3. **Decision** - Approve, Remove, or Escalate with required reason
4. **Action** - Automated execution of moderation decision
5. **Audit** - Complete logging of decision and rationale

### 3. Auto-Moderation Rules Engine

#### Intelligent Rule Management (`AutoModerationRules.tsx`)

**Rule Types:**
- **Keyword Matching** - Simple text pattern detection
- **Pattern Detection** - Regular expression matching
- **AI Analysis** - Machine learning threat assessment
- **Sentiment Analysis** - Emotional tone evaluation
- **Frequency Check** - Spam and repetitive content detection

**Rule Configuration:**
```typescript
interface ModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'spam' | 'toxicity' | 'inappropriate' | 'custom';
  type: 'keyword' | 'pattern' | 'ai' | 'sentiment' | 'frequency';
  conditions: {
    keywords?: string[];
    patterns?: string[];
    threshold?: number;
    context?: string;
    exceptions?: string[];
  };
  actions: {
    flag: boolean;
    autoRemove: boolean;
    warn: boolean;
    notify: boolean;
    quarantine: boolean;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

**Built-in Rules:**
1. **Spam Link Detection** - Identifies excessive external links
2. **Toxic Language Filter** - AI-powered toxicity detection
3. **Fishing Scam Detection** - Custom rules for fishing-related scams
4. **Inappropriate Content** - General content violations

**Rule Testing:**
- **Live Testing Interface** - Test rules against sample content
- **Performance Metrics** - Accuracy, false positives, trigger rates
- **A/B Testing Support** - Compare rule effectiveness

### 4. Analytics & Reporting

#### Comprehensive Analytics Dashboard

**Key Performance Indicators:**
- **Content Reviewed** - Total items processed
- **Actions Taken** - Enforcement actions executed
- **Auto-Resolved** - Automated moderation success rate
- **Average Response Time** - Efficiency metric

**Advanced Analytics:**
- **Content Type Distribution** - Messages, files, users, reports
- **Rule Performance Analysis** - Effectiveness of auto-moderation
- **Moderator Performance** - Individual moderator metrics
- **Trend Analysis** - Historical patterns and forecasting

**Reporting Features:**
```typescript
interface AnalyticsReport {
  timeRange: 'day' | 'week' | 'month' | 'quarter' | 'year';
  metrics: {
    totalReviews: number;
    actionsTaken: number;
    autoResolved: number;
    averageResponseTime: string;
    accuracy: number;
    falsePositiveRate: number;
  };
  breakdowns: {
    byContentType: Record<string, number>;
    byRuleType: Record<string, number>;
    byModerator: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  trends: {
    volumeTrend: number; // % change
    accuracyTrend: number;
    responseTrend: number;
  };
}
```

## API Reference

### Core Moderation API

#### GET `/api/chat/moderation`

Get flagged content and moderation queue.

**Query Parameters:**
- `status` - Filter by status (pending, reviewed, resolved, dismissed)
- `severity` - Filter by severity (low, medium, high, critical)
- `limit` - Number of items per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "flaggedContent": [
    {
      "id": "flag_001",
      "type": "message",
      "content": "Flagged message content...",
      "reportedBy": "user_123",
      "reportedByName": "John Doe",
      "reportedAt": "2025-01-05T12:00:00Z",
      "reason": "Inappropriate language",
      "severity": "medium",
      "status": "pending",
      "targetUser": {
        "id": "user_456",
        "name": "Jane Smith",
        "role": "user"
      },
      "context": {
        "channelId": "trip-12345",
        "channelName": "Trip Chat",
        "messageId": "msg_789"
      }
    }
  ],
  "statistics": {
    "pending": 15,
    "reviewed": 45,
    "resolved": 32,
    "dismissed": 8,
    "totalFlags": 100,
    "averageResolutionTime": "2.5 hours",
    "userReports": 15,
    "autoFlags": 8
  }
}
```

#### POST `/api/chat/moderation`

Perform moderation actions.

**Actions:**
- `flag_message` - Flag content for review
- `review_flag` - Review and decide on flagged content
- `moderate_user` - Take action against user
- `auto_moderate` - Configure auto-moderation
- `report_abuse` - Report abusive behavior

**Examples:**

```bash
# Review flagged content
curl -X POST /api/chat/moderation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <moderator-token>" \
  -d '{
    "action": "review_flag",
    "messageId": "flag_001",
    "moderationAction": "remove",
    "reason": "Violates community guidelines"
  }'

# Moderate user
curl -X POST /api/chat/moderation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <moderator-token>" \
  -d '{
    "action": "moderate_user",
    "userId": "user_456",
    "moderationAction": "warn",
    "reason": "Inappropriate behavior",
    "duration": 1440
  }'
```

### Auto-Moderation Rules API

#### GET `/api/chat/auto-moderation`

Retrieve auto-moderation rules.

**Query Parameters:**
- `category` - Filter by category (spam, toxicity, inappropriate, custom)
- `enabled` - Filter by enabled status (true, false)
- `limit` - Number of rules per page
- `offset` - Pagination offset

#### POST `/api/chat/auto-moderation`

Create or update moderation rule.

**Example:**
```json
{
  "name": "Custom Scam Detection",
  "description": "Detects fishing scam patterns",
  "category": "custom",
  "type": "keyword",
  "conditions": {
    "keywords": ["guaranteed catch", "miracle bait", "secret spot"],
    "threshold": 2,
    "context": "message"
  },
  "actions": {
    "flag": true,
    "autoRemove": false,
    "warn": true,
    "notify": true,
    "quarantine": true
  },
  "severity": "high",
  "enabled": true
}
```

#### PUT `/api/chat/auto-moderation`

Test rules and bulk operations.

**Actions:**
- `test_rule` - Test rule against content
- `toggle_rule` - Enable/disable rule
- `bulk_enable` - Enable multiple rules
- `bulk_disable` - Disable multiple rules
- `export_rules` - Export rules configuration
- `import_rules` - Import rules from backup

#### DELETE `/api/chat/auto-moderation`

Delete moderation rules.

```bash
# Delete single rule
DELETE /api/chat/auto-moderation?ruleId=rule_123

# Bulk delete
DELETE /api/chat/auto-moderation?bulk=true&ruleIds=rule_123,rule_456,rule_789
```

## Frontend Integration

### Admin Dashboard Usage

```tsx
import ModerationDashboard from '@/components/admin/ModerationDashboard';
import ContentReviewPanel from '@/components/admin/ContentReviewPanel';
import AutoModerationRules from '@/components/admin/AutoModerationRules';

function AdminModerationPage() {
  const [reviewingContent, setReviewingContent] = useState(null);

  const handleContentReview = (content) => {
    setReviewingContent(content);
  };

  const handleReviewDecision = (decision, reason) => {
    // Process moderation decision
    console.log(`Decision: ${decision} - ${reason}`);
    setReviewingContent(null);
  };

  return (
    <div>
      {/* Main Dashboard */}
      <ModerationDashboard onContentReview={handleContentReview} />
      
      {/* Content Review Modal */}
      {reviewingContent && (
        <ContentReviewPanel
          contentId={reviewingContent.id}
          contentType={reviewingContent.type}
          content={reviewingContent.content}
          onDecision={handleReviewDecision}
          onClose={() => setReviewingContent(null)}
        />
      )}
      
      {/* Auto-Moderation Rules */}
      <AutoModerationRules />
    </div>
  );
}
```

### Custom Rule Creation

```tsx
const customRule = {
  name: "Fishing Trip Spam",
  description: "Detects spam in fishing trip discussions",
  category: "spam",
  type: "pattern",
  conditions: {
    patterns: [
      "(?i)(free|cheap)\\s+(trip|fishing|boat)",
      "(?i)limited\\s+time\\s+offer",
      "(?i)click\\s+(here|link|now)"
    ],
    threshold: 1,
    context: "message",
    exceptions: ["official", "announcement"]
  },
  actions: {
    flag: true,
    autoRemove: false,
    warn: true,
    notify: true,
    quarantine: false
  },
  severity: "medium",
  enabled: true
};

// Create rule via API
const response = await fetch('/api/chat/auto-moderation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customRule)
});
```

## Security & Privacy

### Data Protection

#### Personal Information Handling
- **Content Encryption** - All flagged content encrypted at rest
- **Access Logging** - Complete audit trail of who accessed what
- **Data Retention** - Configurable retention policies (default 90 days)
- **Right to Deletion** - GDPR compliance with data removal

#### Security Measures
- **Role-Based Access** - Minimum privilege principle enforced
- **IP Restrictions** - Optional IP allowlisting for admin access
- **Session Management** - Secure session handling with timeouts
- **Two-Factor Authentication** - Optional 2FA for moderator accounts

### Privacy Controls

```typescript
interface PrivacySettings {
  dataRetention: {
    flaggedContent: number; // days
    moderatorLogs: number;  // days
    userReports: number;    // days
    analytics: number;      // days
  };
  accessControls: {
    requireMFA: boolean;
    ipAllowlist: string[];
    sessionTimeout: number; // minutes
  };
  auditSettings: {
    logLevel: 'basic' | 'detailed' | 'comprehensive';
    includeContent: boolean;
    includePersonalData: boolean;
  };
}
```

## Best Practices

### For Moderators

1. **Consistent Decision Making** - Follow established guidelines and precedents
2. **Document Reasoning** - Always provide clear rationales for decisions
3. **Handle Sensitive Content** - Use content blur features for potentially harmful material
4. **Escalate When Uncertain** - Don't hesitate to escalate complex cases
5. **Monitor Performance** - Review personal moderation statistics regularly

### For Administrators

1. **Regular Rule Review** - Audit and update auto-moderation rules monthly
2. **Performance Monitoring** - Track false positive rates and accuracy
3. **Team Training** - Provide ongoing training for moderation team
4. **Community Feedback** - Incorporate user feedback into moderation policies
5. **Backup and Recovery** - Maintain backups of moderation configurations

### For Developers

1. **Test Moderation Rules** - Always test rules before deployment
2. **Monitor API Performance** - Track response times and error rates
3. **Implement Graceful Degradation** - Handle API failures appropriately
4. **Secure Sensitive Data** - Encrypt all moderation-related data
5. **Follow Audit Requirements** - Ensure comprehensive logging

## Troubleshooting

### Common Issues

#### Dashboard Not Loading

**Symptoms:** Moderation dashboard shows loading spinner indefinitely

**Causes:**
- API endpoint not accessible
- User lacks required permissions
- Database connection issues

**Solutions:**
```bash
# Check API endpoint
curl /api/chat/moderation -H "Authorization: Bearer <token>"

# Verify user permissions
curl /api/chat/auth -H "Authorization: Bearer <token>"

# Check system logs
tail -f /var/log/app.log | grep moderation
```

#### Auto-Moderation Rules Not Triggering

**Symptoms:** Rules show as enabled but don't catch violations

**Diagnostic Steps:**
1. **Test Rule Manually** - Use built-in rule testing interface
2. **Check Rule Logic** - Verify patterns and conditions are correct
3. **Review Logs** - Check for rule execution errors
4. **Validate Permissions** - Ensure rule has proper action permissions

**Common Fixes:**
- Escape special characters in regex patterns
- Adjust threshold values for better accuracy
- Add context exceptions for legitimate content
- Update rule conditions based on false positives

#### High False Positive Rate

**Symptoms:** Rules catching legitimate content frequently

**Investigation Process:**
1. **Analyze False Positives** - Review incorrectly flagged content
2. **Adjust Thresholds** - Increase confidence requirements
3. **Add Exceptions** - Include legitimate use cases
4. **Refine Patterns** - Make detection more specific

**Example Fix:**
```javascript
// Original pattern (too broad)
"pattern": "fish.*sale"

// Improved pattern (more specific)
"pattern": "(?i)\\b(urgent|cheap|free)\\s+fish.*sale\\b"
```

### Performance Optimization

#### Dashboard Loading Optimization

```typescript
// Implement pagination for large datasets
const useModeration = (filters) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/chat/moderation?${new URLSearchParams(filters)}`
      );
      const result = await response.json();
      setData(result.flaggedContent);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  return { data, loading, fetchData };
};
```

#### Rule Processing Optimization

```typescript
// Implement rule caching and batch processing
class RuleProcessor {
  private ruleCache: Map<string, ModerationRule> = new Map();
  
  async processContent(content: string): Promise<ModerationResult> {
    const enabledRules = await this.getCachedRules();
    const results = await Promise.all(
      enabledRules.map(rule => this.testRule(rule, content))
    );
    
    return this.aggregateResults(results);
  }
  
  private async getCachedRules(): Promise<ModerationRule[]> {
    // Cache rules for 5 minutes
    if (this.ruleCache.size === 0 || this.cacheExpired()) {
      await this.refreshRuleCache();
    }
    return Array.from(this.ruleCache.values());
  }
}
```

## Migration Guide

### From Basic Moderation

1. **Backup Existing Data** - Export current moderation logs and rules
2. **Update Database Schema** - Add new tables for enhanced features
3. **Configure Permissions** - Set up role-based access control
4. **Import Legacy Rules** - Convert existing rules to new format
5. **Train Moderators** - Provide training on new interface and workflows

### Database Schema Changes

```sql
-- Moderation rules table
CREATE TABLE moderation_rules (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  severity VARCHAR(20) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  stats JSONB DEFAULT '{}',
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced flagged content table
ALTER TABLE flagged_content 
  ADD COLUMN analysis JSONB,
  ADD COLUMN review_context JSONB,
  ADD COLUMN moderator_notes TEXT,
  ADD COLUMN resolution_time INTERVAL;

-- Moderation audit log
CREATE TABLE moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_id VARCHAR(255),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Support & Resources

- **Stream Chat Moderation Docs:** https://getstream.io/chat/docs/moderation/
- **Content Moderation Best Practices:** https://owasp.org/www-project-content-security-policy/
- **GDPR Compliance Guide:** https://gdpr.eu/
- **Community Guidelines Template:** Available in `/docs/templates/`

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Next Review:** February 2025
