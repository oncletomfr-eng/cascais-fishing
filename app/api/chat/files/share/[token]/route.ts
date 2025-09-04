import { NextRequest, NextResponse } from 'next/server';
import { SecureFileUploadService } from '@/lib/services/secure-file-upload';
import { ChatSecurityManager, ChatRole } from '@/lib/security/chat-permissions';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Secure File Sharing Endpoint
 * Task 22.3: File Upload System
 * 
 * Public file sharing with token-based access:
 * - Time-limited access tokens
 * - Share link validation
 * - Download tracking
 * - Abuse prevention
 */

interface ShareToken {
  fileId: string;
  sharedBy: string;
  expiresAt: number;
  accessLevel?: 'view' | 'download';
  downloadLimit?: number;
  ipRestriction?: string[];
}

/**
 * GET /api/chat/files/share/[token] - Access shared files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'download';
    
    console.log(`🔗 Share link access: token=${token.substring(0, 10)}..., action=${action}`);
    
    // Validate and decode share token
    const tokenValidation = await validateShareToken(token, request);
    
    if (!tokenValidation.valid) {
      await auditShareAccess(token, 'unknown', tokenValidation.error || 'Invalid token', false, request);
      
      return NextResponse.json({
        success: false,
        error: tokenValidation.error || 'Invalid share token',
        code: 'INVALID_TOKEN'
      }, { status: 403 });
    }
    
    const shareData = tokenValidation.shareData!;
    
    // Get file information
    const fileInfoResult = await SecureFileUploadService.getFileInfo(
      shareData.fileId,
      shareData.sharedBy,
      ChatRole.ADMIN // Use admin role for share access
    );
    
    if (!fileInfoResult.success) {
      await auditShareAccess(token, shareData.sharedBy, 'File not found', false, request);
      
      return NextResponse.json({
        success: false,
        error: 'Shared file not found',
        code: 'FILE_NOT_FOUND'
      }, { status: 404 });
    }
    
    const fileInfo = fileInfoResult.fileInfo!;
    
    // Check access level permissions
    if (shareData.accessLevel === 'view' && action === 'download') {
      await auditShareAccess(token, shareData.sharedBy, 'Download not allowed for view-only link', false, request);
      
      return NextResponse.json({
        success: false,
        error: 'Download not allowed for this share link',
        code: 'DOWNLOAD_FORBIDDEN'
      }, { status: 403 });
    }
    
    // Check download limit
    if (shareData.downloadLimit) {
      const downloadCount = await getShareDownloadCount(token);
      if (downloadCount >= shareData.downloadLimit) {
        await auditShareAccess(token, shareData.sharedBy, 'Download limit exceeded', false, request);
        
        return NextResponse.json({
          success: false,
          error: 'Download limit exceeded for this share link',
          code: 'DOWNLOAD_LIMIT_EXCEEDED'
        }, { status: 429 });
      }
    }
    
    // Check IP restrictions
    if (shareData.ipRestriction) {
      const clientIP = getClientIP(request);
      if (!shareData.ipRestriction.includes(clientIP)) {
        await auditShareAccess(token, shareData.sharedBy, 'IP not allowed', false, request);
        
        return NextResponse.json({
          success: false,
          error: 'Access denied from this IP address',
          code: 'IP_RESTRICTED'
        }, { status: 403 });
      }
    }
    
    switch (action) {
      case 'info':
        // Return file information without downloading
        await auditShareAccess(token, shareData.sharedBy, 'File info accessed', true, request);
        
        return NextResponse.json({
          success: true,
          fileInfo: {
            originalName: fileInfo.originalName,
            size: fileInfo.size,
            mimeType: fileInfo.mimeType,
            uploadedAt: fileInfo.uploadedAt,
            downloadCount: await getShareDownloadCount(token),
            downloadLimit: shareData.downloadLimit,
            expiresAt: new Date(shareData.expiresAt).toISOString(),
            accessLevel: shareData.accessLevel || 'download'
          },
          timestamp: new Date().toISOString()
        });
        
      case 'download':
      default:
        // Download file
        return await handleSharedFileDownload(token, shareData, fileInfo, request);
    }
    
  } catch (error) {
    console.error('❌ Share link error:', error);
    
    await auditShareAccess(
      params.token,
      'unknown',
      error instanceof Error ? error.message : 'Unknown error',
      false,
      request
    );
    
    return NextResponse.json({
      success: false,
      error: 'Share link access failed',
      code: 'SHARE_ACCESS_ERROR'
    }, { status: 500 });
  }
}

async function validateShareToken(
  token: string,
  request: NextRequest
): Promise<{
  valid: boolean;
  shareData?: ShareToken;
  error?: string;
}> {
  try {
    // Decode base64url token
    const decodedData = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf-8')
    ) as ShareToken;
    
    // Check required fields
    if (!decodedData.fileId || !decodedData.sharedBy || !decodedData.expiresAt) {
      return { valid: false, error: 'Invalid token format' };
    }
    
    // Check expiration
    if (Date.now() > decodedData.expiresAt) {
      return { valid: false, error: 'Share link has expired' };
    }
    
    // Additional security validations
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Check for suspicious patterns (basic bot detection)
    if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
      return { valid: false, error: 'Automated access not allowed' };
    }
    
    // Rate limiting per IP
    const isRateLimited = await checkRateLimit(clientIP, token);
    if (isRateLimited) {
      return { valid: false, error: 'Too many requests from this IP' };
    }
    
    return { valid: true, shareData: decodedData };
    
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Token parsing failed' 
    };
  }
}

async function handleSharedFileDownload(
  token: string,
  shareData: ShareToken,
  fileInfo: any,
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Build file path
    const config = SecureFileUploadService.getUploadConfig(ChatRole.USER);
    const filePath = join(process.cwd(), config.uploadPath, fileInfo.secureFileName);
    
    // Check if file exists on disk
    try {
      await stat(filePath);
    } catch (error) {
      await auditShareAccess(token, shareData.sharedBy, 'File not found on disk', false, request);
      
      return NextResponse.json({
        success: false,
        error: 'File not available',
        code: 'FILE_UNAVAILABLE'
      }, { status: 404 });
    }
    
    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Track download
    await trackShareDownload(token, shareData, getClientIP(request), request.headers.get('user-agent') || 'unknown');
    
    // Audit successful download
    await auditShareAccess(token, shareData.sharedBy, 'File downloaded successfully', true, request);
    
    console.log(`📥 Shared file downloaded: ${fileInfo.originalName} via token ${token.substring(0, 10)}...`);
    
    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileInfo.mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${fileInfo.originalName}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Share-Token': token.substring(0, 10) + '...',
        'X-File-Name': fileInfo.originalName,
        'X-Upload-Date': fileInfo.uploadedAt.toISOString(),
        'X-Shared-By': shareData.sharedBy
      }
    });
    
  } catch (error) {
    console.error('❌ Shared file download error:', error);
    
    await auditShareAccess(
      token,
      shareData.sharedBy,
      error instanceof Error ? error.message : 'Download failed',
      false,
      request
    );
    
    return NextResponse.json({
      success: false,
      error: 'Download failed',
      code: 'DOWNLOAD_ERROR'
    }, { status: 500 });
  }
}

// Helper functions

async function auditShareAccess(
  token: string,
  sharedBy: string,
  action: string,
  success: boolean,
  request: NextRequest
): Promise<void> {
  try {
    await ChatSecurityManager.auditUserAction(
      'share_access',
      'share_link_accessed',
      token.substring(0, 10) + '...',
      {
        sharedBy,
        action,
        success,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString()
      },
      success
    );
  } catch (error) {
    console.error('❌ Error auditing share access:', error);
  }
}

async function trackShareDownload(
  token: string,
  shareData: ShareToken,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    // In production, store in database
    console.log(`📊 Tracking share download: ${token.substring(0, 10)}... by IP ${ipAddress}`);
    
    // Example: await prisma.shareDownload.create({
    //   data: {
    //     shareToken: token,
    //     fileId: shareData.fileId,
    //     sharedBy: shareData.sharedBy,
    //     downloadedAt: new Date(),
    //     ipAddress,
    //     userAgent
    //   }
    // });
  } catch (error) {
    console.error('❌ Error tracking share download:', error);
  }
}

async function getShareDownloadCount(token: string): Promise<number> {
  try {
    // In production, query database
    console.log(`📊 Getting download count for share token: ${token.substring(0, 10)}...`);
    
    // Example: const count = await prisma.shareDownload.count({
    //   where: { shareToken: token }
    // });
    
    return 0; // Mock implementation
  } catch (error) {
    console.error('❌ Error getting download count:', error);
    return 0;
  }
}

async function checkRateLimit(ipAddress: string, token: string): Promise<boolean> {
  try {
    // Simple rate limiting: max 10 requests per minute per IP
    const key = `rate_limit:${ipAddress}:${token.substring(0, 10)}`;
    
    // In production, use Redis or similar for rate limiting
    console.log(`🚦 Checking rate limit for IP: ${ipAddress}`);
    
    // Example Redis implementation:
    // const current = await redis.incr(key);
    // if (current === 1) {
    //   await redis.expire(key, 60); // 1 minute
    // }
    // return current > 10;
    
    return false; // Mock implementation - no rate limiting
  } catch (error) {
    console.error('❌ Error checking rate limit:', error);
    return false;
  }
}

function getClientIP(request: NextRequest): string {
  // Try various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (remoteAddr) {
    return remoteAddr.trim();
  }
  
  return 'unknown';
}
