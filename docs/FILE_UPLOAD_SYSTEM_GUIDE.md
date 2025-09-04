# Secure File Upload System Guide
**Task 22.3: File Upload System**

This document provides comprehensive documentation for the Secure File Upload System implemented for Stream Chat in the Cascais Fishing Platform.

## Overview

The Secure File Upload System provides enterprise-grade file sharing capabilities with:

- **Multi-Layer Security Validation** - Content validation, virus scanning, and access control
- **Role-Based Upload Limits** - Different limits based on user roles and permissions
- **Stream Chat Integration** - Seamless file sharing in chat channels
- **Real-Time Progress Tracking** - Upload progress with security check visualization
- **File Access Control** - Granular permissions and sharing controls
- **Automated Cleanup** - Retention policies and automatic file management

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Secure File Upload System                    │
├─────────────────────────────────────────────────────────────────┤
│ Frontend Components                                             │
│ ├── SecureFileUpload.tsx    - Main upload component            │
│ ├── FileSharing.tsx         - Enhanced file sharing UI         │
│ └── FileSharingTheme.css     - Styling and animations          │
├─────────────────────────────────────────────────────────────────┤
│ Backend Services                                                │
│ ├── SecureFileUploadService - Core upload logic                │
│ ├── File validation         - Security and content checks      │
│ ├── Virus scanning         - Malware detection                 │
│ └── Access control         - Permission enforcement            │
├─────────────────────────────────────────────────────────────────┤
│ API Endpoints                                                   │
│ ├── /api/chat/upload        - Main upload endpoint             │
│ ├── /api/chat/files         - File management operations       │
│ └── /api/chat/files/share   - Secure file sharing              │
├─────────────────────────────────────────────────────────────────┤
│ Security Features                                               │
│ ├── Role-based limits       - Upload quotas per role           │
│ ├── Content validation      - File type and signature checks   │
│ ├── Virus scanning         - Malware detection                 │
│ ├── Access control         - Permission-based file access     │
│ └── Audit logging          - Complete activity tracking        │
└─────────────────────────────────────────────────────────────────┘
```

### Security Layers

#### 1. Input Validation Layer
- **File Size Validation** - Role-based size limits
- **File Type Validation** - MIME type and extension checking
- **File Name Validation** - Dangerous character and reserved name detection
- **Quantity Validation** - Upload count limits per user role

#### 2. Content Analysis Layer
- **Magic Byte Verification** - File signature validation to prevent spoofing
- **Content Structure Validation** - Deep inspection of file structure
- **Suspicious Content Detection** - Embedded executable and script detection
- **Image Metadata Analysis** - EXIF data validation and sanitization

#### 3. Security Scanning Layer
- **Virus Scanning** - Malware detection (ClamAV integration ready)
- **Threat Pattern Detection** - Known malicious pattern recognition
- **Behavioral Analysis** - File behavior assessment
- **Quarantine System** - Automatic isolation of suspicious files

#### 4. Access Control Layer
- **Role-Based Permissions** - Upload rights based on chat roles
- **Channel Access Control** - File access tied to channel membership
- **Ownership Verification** - File owner rights and delegation
- **Share Link Security** - Token-based sharing with expiration

## Role-Based Configuration

### Upload Limits by Role

| Role | Max File Size | Max Files | Allowed Types | Special Features |
|------|---------------|-----------|---------------|------------------|
| **SUPER_ADMIN** | 100MB | 20 | All types | Full system access |
| **ADMIN** | 50MB | 15 | Most types | Moderation tools |
| **MODERATOR** | 25MB | 10 | Common types | Content review |
| **CAPTAIN** | 20MB | 8 | Media + PDF | Trip media focus |
| **PREMIUM_USER** | 15MB | 6 | Media + PDF | Enhanced limits |
| **USER** | 10MB | 5 | Images + Video | Standard access |
| **GUEST** | 5MB | 2 | Images only | Limited access |
| **BANNED** | 0MB | 0 | None | No access |

### File Type Restrictions

#### Super Admin & Admin
- All file types allowed (`*/*`)
- Includes executables and archives (with scanning)

#### Moderator & Captain
```javascript
allowedMimeTypes: [
  'image/*', 'video/*', 'audio/*', 
  'application/pdf', 'text/*'
]
```

#### Premium User & Standard User
```javascript
allowedMimeTypes: [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf'
]
```

#### Guest Users
```javascript
allowedMimeTypes: [
  'image/jpeg', 'image/png'
]
```

## API Reference

### Upload Endpoint

#### POST `/api/chat/upload`

Upload files with comprehensive security validation.

**Authentication Required:** Yes (via chat authentication middleware)

**Request Format:**
```javascript
// Multipart form data
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('uploadData', JSON.stringify({
  channelId: 'trip-12345',
  uploadType: 'message_attachment',
  metadata: {
    description: 'Trip photos',
    tags: ['fishing', 'trip'],
    expiresAt: '2025-01-20T12:00:00Z'
  }
}));
```

**Upload Types:**
- `message_attachment` - Files attached to chat messages
- `channel_media` - Media files for channel (higher limits)
- `profile_image` - User profile pictures (special validation)
- `temp_upload` - Temporary uploads (auto-cleanup)

**Response:**
```json
{
  "success": true,
  "uploads": [
    {
      "fileId": "uuid-file-id",
      "originalName": "catch_photo.jpg",
      "secureFileName": "uuid-generated-name.jpg",
      "url": "/uploads/chat/uuid-generated-name.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "uploadedAt": "2025-01-05T12:00:00Z",
      "uploadedBy": "user_123",
      "securityChecks": {
        "sizeValidation": true,
        "typeValidation": true,
        "contentValidation": true,
        "virusScanning": true,
        "accessPermission": true
      },
      "streamChatAttachment": {
        "type": "image",
        "image_url": "/uploads/chat/uuid-generated-name.jpg",
        "fishing_file_id": "uuid-file-id"
      }
    }
  ],
  "summary": {
    "total": 1,
    "successful": 1,
    "failed": 0
  }
}
```

### File Management Endpoint

#### GET `/api/chat/files`

Retrieve file information and perform file operations.

**Actions:**
- `info` - Get file metadata
- `list` - List accessible files
- `download` - Download file
- `share` - Generate share information
- `analytics` - Get file analytics (admin/owner only)

**Examples:**

```bash
# Get file information
GET /api/chat/files?action=info&fileId=uuid-file-id

# List files in channel
GET /api/chat/files?action=list&channelId=trip-12345&limit=20

# Download file
GET /api/chat/files?action=download&fileId=uuid-file-id

# Get upload analytics
GET /api/chat/files?action=analytics&channelId=trip-12345
```

#### POST `/api/chat/files`

Update file settings and permissions.

**Actions:**
- `update_access` - Change file access level
- `update_metadata` - Update file metadata
- `generate_share_link` - Create secure share link

**Example:**
```javascript
POST /api/chat/files
{
  "action": "generate_share_link",
  "fileId": "uuid-file-id",
  "settings": {
    "expirationHours": 24,
    "accessLevel": "view",
    "downloadLimit": 10,
    "ipRestriction": ["192.168.1.0/24"]
  }
}
```

#### DELETE `/api/chat/files`

Delete files with access control.

```bash
DELETE /api/chat/files?fileId=uuid-file-id
```

### Secure Sharing Endpoint

#### GET `/api/chat/files/share/[token]`

Access files via secure share links.

**Features:**
- Time-limited access
- Download count limits
- IP restrictions
- View-only mode
- Abuse prevention

**Example:**
```bash
# Access shared file
GET /api/chat/files/share/eyJmaWxlSWQiOiJ1dWlkLWZpbGUtaWQi...

# Get file info without downloading
GET /api/chat/files/share/eyJmaWxlSWQiOiJ1dWlkLWZpbGUtaWQi...?action=info
```

## Frontend Integration

### Basic Usage

```tsx
import { SecureFileUpload } from '@/components/chat/SecureFileUpload';

function ChatInterface() {
  const handleUploadComplete = (files) => {
    console.log('Files uploaded:', files);
    // Add files to chat message or channel
  };

  return (
    <SecureFileUpload
      channelId="trip-12345"
      uploadType="message_attachment"
      onUploadComplete={handleUploadComplete}
      metadata={{
        description: "Trip photos",
        tags: ["fishing", "memories"]
      }}
    />
  );
}
```

### Advanced Configuration

```tsx
<SecureFileUpload
  channelId="trip-12345"
  uploadType="channel_media"
  onUploadComplete={handleUploadComplete}
  onUploadError={(error) => console.error('Upload error:', error)}
  onUploadProgress={(progress) => console.log('Progress:', progress)}
  className="custom-upload-styles"
  disabled={false}
  metadata={{
    description: "Trip documentation",
    tags: ["official", "trip-12345"],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }}
/>
```

### Stream Chat Integration

```tsx
import { useFileUpload } from '@/components/chat/theming/FileSharing';

function ChatMessage() {
  const { attachments, addFiles, clearFiles } = useFileUpload();

  const handleSecureUpload = (files) => {
    // Convert secure uploads to Stream Chat attachments
    const streamAttachments = files.map(file => ({
      type: file.result.mimeType.startsWith('image/') ? 'image' : 'file',
      asset_url: file.result.url,
      title: file.file.name,
      fishing_file_id: file.result.fileId,
      security_validated: true
    }));
    
    // Add to Stream Chat message
    addFiles(streamAttachments);
  };

  return (
    <div>
      <SecureFileUpload onUploadComplete={handleSecureUpload} />
      {/* Render Stream Chat message with attachments */}
    </div>
  );
}
```

## Security Features

### Content Validation

#### File Signature Verification
```javascript
// Example: JPEG signature validation
const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF]);
const fileHeader = fileBuffer.subarray(0, 3);
const isValidJPEG = fileHeader.equals(jpegSignature);
```

#### Suspicious Content Detection
```javascript
// Detect embedded executables
const suspiciousPatterns = [
  Buffer.from('MZ'), // PE executable
  Buffer.from('PK'), // ZIP archive
  Buffer.from('<script', 'ascii') // Script tags
];
```

### Virus Scanning Integration

#### ClamAV Integration (Production)
```javascript
// Example integration with ClamAV
const clamscan = require('clamscan');

const scanner = await clamscan.init({
  clamdscan: {
    socket: '/var/run/clamd.scan/clamd.sock',
    timeout: 120000
  }
});

const scanResult = await scanner.scanFile(filePath);
if (!scanResult.isInfected) {
  // File is clean
}
```

#### Development Simulation
```javascript
// Test virus signature for development
const testVirusSignature = 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE';
const containsTestVirus = buffer.indexOf(Buffer.from(testVirusSignature)) !== -1;
```

### Access Control

#### Permission Matrix
```javascript
// File access permissions by role
const canAccess = (userRole, fileInfo, requestingUserId) => {
  // Super admin access
  if (userRole === 'super_admin' || userRole === 'admin') {
    return true;
  }
  
  // Owner access
  if (fileInfo.uploadedBy === requestingUserId) {
    return true;
  }
  
  // Access level checks
  switch (fileInfo.accessLevel) {
    case 'public':
      return true;
    case 'channel_only':
      return userRole === 'moderator' || userRole === 'captain';
    case 'private':
    default:
      return false;
  }
};
```

## Monitoring & Analytics

### Upload Metrics

#### Key Performance Indicators
- **Upload Success Rate** - Percentage of successful uploads
- **Security Validation Rate** - Files passing security checks
- **Average Upload Time** - Time from start to completion
- **Storage Usage** - Space consumed by role/channel
- **Virus Detection Rate** - Malicious files caught

#### Analytics Dashboard
```bash
# Get comprehensive analytics
GET /api/chat/files?action=analytics&channelId=trip-12345

Response:
{
  "analytics": {
    "totalUploads": 1247,
    "totalDownloads": 3891,
    "totalSize": 157286400,
    "popularFileTypes": [
      { "type": "image/jpeg", "count": 582 },
      { "type": "video/mp4", "count": 331 },
      { "type": "application/pdf", "count": 89 }
    ],
    "recentActivity": [...],
    "storageUsage": {
      "used": 157286400,
      "available": 1000000000,
      "percentage": 15.7
    }
  }
}
```

### Audit Logging

#### Security Events
All file operations are logged with:
- User identification and role
- Action performed
- File information
- Security check results
- IP address and user agent
- Timestamp and session ID

#### Log Example
```json
{
  "timestamp": "2025-01-05T12:00:00Z",
  "userId": "user_123",
  "action": "file_upload_completed",
  "channelId": "trip-12345",
  "details": {
    "fileName": "catch_photo.jpg",
    "fileSize": 1024000,
    "securityPassed": true,
    "virusClean": true,
    "userRole": "captain",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "success": true
}
```

## Best Practices

### For Developers

1. **Always Use Middleware** - Protect upload endpoints with chat authentication
2. **Validate Before Processing** - Check permissions before file operations
3. **Handle Errors Gracefully** - Provide clear error messages to users
4. **Clean Up Resources** - Remove temporary files after processing
5. **Monitor Performance** - Track upload speeds and success rates

### For System Administrators

1. **Regular Cleanup** - Run automated file cleanup processes
2. **Monitor Storage** - Track disk usage and set alerts
3. **Review Security Logs** - Check for suspicious upload patterns
4. **Update Virus Definitions** - Keep malware detection current
5. **Test Disaster Recovery** - Validate backup and restore procedures

### For Users

1. **Appropriate File Sizes** - Use smallest file size that meets quality needs
2. **Relevant File Types** - Only upload files appropriate for fishing context
3. **Respect Storage Limits** - Be mindful of quota limitations
4. **Report Issues** - Report suspicious files or access problems
5. **Use Share Links Wisely** - Don't share sensitive files publicly

## Troubleshooting

### Common Issues

#### Upload Failures

**Error: "File size exceeds maximum allowed"**
- **Cause:** File larger than role-based limit
- **Solution:** Compress file or upgrade user role
- **Prevention:** Check upload config before selecting files

**Error: "File type not allowed"**
- **Cause:** MIME type not in allowed list
- **Solution:** Convert to supported format
- **Prevention:** Review allowed file types for user role

**Error: "File failed virus scanning"**
- **Cause:** Malware detected in file
- **Solution:** Scan file locally and clean if possible
- **Prevention:** Use updated antivirus before uploading

**Error: "Content validation failed"**
- **Cause:** File content doesn't match declared type
- **Solution:** Re-save file in proper format
- **Prevention:** Ensure file integrity before upload

#### Access Issues

**Error: "Access denied to channel"**
- **Cause:** User not member of specified channel
- **Solution:** Join channel or upload without channel
- **Prevention:** Verify channel membership

**Error: "Permission denied"**
- **Cause:** Insufficient role permissions
- **Solution:** Request role upgrade or use different upload type
- **Prevention:** Check role capabilities

### Debug Commands

#### Check Upload Configuration
```bash
curl /api/chat/upload?action=config \
  -H "Authorization: Bearer <token>"
```

#### Test File Access
```bash
curl /api/chat/files?action=info&fileId=<file-id> \
  -H "Authorization: Bearer <token>"
```

#### Verify Share Link
```bash
curl /api/chat/files/share/<token>?action=info
```

## Migration Guide

### From Basic File Upload

1. **Update Components** - Replace basic upload with SecureFileUpload
2. **Add Middleware** - Protect endpoints with chat authentication
3. **Migrate File Storage** - Move files to secure directory structure
4. **Update Database Schema** - Add security and metadata fields
5. **Configure Virus Scanning** - Set up malware detection

### Database Schema Updates

```sql
-- Add security fields to file uploads table
ALTER TABLE file_uploads ADD COLUMN security_checks JSONB DEFAULT '{}';
ALTER TABLE file_uploads ADD COLUMN access_level VARCHAR(20) DEFAULT 'private';
ALTER TABLE file_uploads ADD COLUMN download_count INTEGER DEFAULT 0;
ALTER TABLE file_uploads ADD COLUMN expires_at TIMESTAMP;

-- Create share tracking table
CREATE TABLE file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES file_uploads(id),
  share_token VARCHAR(255) UNIQUE NOT NULL,
  shared_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  download_limit INTEGER,
  access_level VARCHAR(20) DEFAULT 'download'
);
```

## Support & Resources

- **Stream Chat Documentation:** https://getstream.io/chat/docs/
- **File Upload Best Practices:** https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload
- **ClamAV Integration:** https://www.clamav.net/documents/clam-antivirus-0.103-user-manual
- **Security Guidelines:** OWASP File Upload Security Guide

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Next Review:** February 2025
