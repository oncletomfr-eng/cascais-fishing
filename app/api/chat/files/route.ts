import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

// Dynamic imports to reduce bundle size
const loadChatAuth = () => import('@/lib/middleware/chat-auth');
const loadChatSecurity = () => import('@/lib/security/chat-permissions');
const loadFileUploadService = () => import('@/lib/services/secure-file-upload');

/**
 * Secure File Management API
 * Task 22.3: File Upload System
 * 
 * Comprehensive file operations with:
 * - Secure file downloads with access control
 * - File information and metadata
 * - File listing and search
 * - Download tracking and analytics
 * - File sharing controls
 */

interface FileRequest {
  action: 'download' | 'info' | 'list' | 'share' | 'analytics';
  fileId?: string;
  channelId?: string;
  userId?: string;
  filters?: {
    fileType?: string;
    uploadedAfter?: string;
    uploadedBefore?: string;
    size?: 'small' | 'medium' | 'large';
  };
}

/**
 * GET /api/chat/files - File operations with access control
 */
export const GET = async (request: NextRequest) => {
  // Load authentication middleware dynamically
  const { requireChatAuth } = await loadChatAuth();
  
  // Create the authenticated handler
  const handler = requireChatAuth()(async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const action = searchParams.get('action') || 'list';
      const fileId = searchParams.get('fileId');
      const channelId = searchParams.get('channelId');
      const targetUserId = searchParams.get('userId');
      
      console.log(`📁 File operation request: ${action} by user ${user.id} (${user.role})`);
      
      switch (action) {
        case 'download':
          return await handleFileDownload(fileId, user, securityContext);
          
        case 'info':
          return await handleFileInfo(fileId, user, securityContext);
          
        case 'list':
          return await handleFileList(channelId, targetUserId, user, searchParams, securityContext);
          
        case 'share':
          return await handleFileShare(fileId, user, securityContext);
          
        case 'analytics':
          return await handleFileAnalytics(fileId, channelId, user, securityContext);
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown action: ${action}`,
            code: 'UNKNOWN_ACTION'
          }, { status: 400 });
      }
      
    } catch (error) {
      console.error('❌ File management API error:', error);
      
      try {
        const { ChatSecurityManager } = await loadChatSecurity();
        const { user, securityContext } = context;
        const { ChatSecurityManager } = await loadChatSecurity();
        const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
          user?.id || 'unknown',
          'file_management_error',
          'unknown',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            ...securityContext
          },
          false
        );
      } catch (auditError) {
        console.error('Failed to audit error:', auditError);
      }
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'File operation failed',
        code: 'FILE_OPERATION_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  });
  
  // Execute the handler
  return handler(request);
};

/**
 * POST /api/chat/files - Update file settings and permissions
 */
export const POST = async (request: NextRequest) => {
  // Load authentication middleware dynamically
  const { requireChatAuth } = await loadChatAuth();
  
  // Create the authenticated handler
  const handler = requireChatAuth()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const body = await request.json();
      
      const { action, fileId, settings } = body;
      
      if (!fileId) {
        return NextResponse.json({
          success: false,
          error: 'File ID required',
          code: 'MISSING_FILE_ID'
        }, { status: 400 });
      }
      
      console.log(`📝 File update request: ${action} for file ${fileId} by user ${user.id}`);
      
      // Get file info to check permissions
      const { SecureFileUploadService } = await loadFileUploadService();
      const { SecureFileUploadService } = await loadFileUploadService();
    const fileInfoResult = await SecureFileUploadService.getFileInfo(
        fileId,
        user.id,
        user.role
      );
      
      if (!fileInfoResult.success) {
        return NextResponse.json({
          success: false,
          error: fileInfoResult.error,
          code: 'FILE_NOT_FOUND'
        }, { status: 404 });
      }
      
      const fileInfo = fileInfoResult.fileInfo!;
      
      // Check if user can modify file settings
      const canModify = fileInfo.uploadedBy === user.id || 
                       ['admin', 'super_admin', 'moderator'].includes(user.role);
      
      if (!canModify) {
        const { ChatSecurityManager } = await loadChatSecurity();
        const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
          user.id,
          'file_modification_denied',
          fileId,
          {
            action,
            reason: 'Insufficient permissions',
            ...securityContext
          },
          false
        );
        
        return NextResponse.json({
          success: false,
          error: 'Permission denied',
          code: 'PERMISSION_DENIED'
        }, { status: 403 });
      }
      
      let result;
      
      switch (action) {
        case 'update_access':
          result = await updateFileAccess(fileId, settings.accessLevel, user, securityContext);
          break;
          
        case 'update_metadata':
          result = await updateFileMetadata(fileId, settings.metadata, user, securityContext);
          break;
          
        case 'generate_share_link':
          result = await generateShareLink(fileId, settings, user, securityContext);
          break;
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown action: ${action}`,
            code: 'UNKNOWN_ACTION'
          }, { status: 400 });
      }
      
      // Audit file update
      const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
        user.id,
        `file_${action}`,
        fileId,
        {
          action,
          settings,
          result: result.success,
          ...securityContext
        },
        result.success
      );
      
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ File update API error:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'File update failed',
        code: 'FILE_UPDATE_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  });
  
  // Execute the handler
  return handler(request);
};

// Handler functions

async function handleFileDownload(
  fileId: string | null,
  user: any,
  securityContext: any
): Promise<NextResponse> {
  if (!fileId) {
    return NextResponse.json({
      success: false,
      error: 'File ID required for download',
      code: 'MISSING_FILE_ID'
    }, { status: 400 });
  }
  
  try {
    // Get file info with access control
    const { SecureFileUploadService } = await loadFileUploadService();
    const fileInfoResult = await SecureFileUploadService.getFileInfo(
      fileId,
      user.id,
      user.role
    );
    
    if (!fileInfoResult.success) {
      const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
        user.id,
        'file_download_denied',
        fileId,
        {
          reason: fileInfoResult.error,
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: fileInfoResult.error,
        code: 'FILE_ACCESS_DENIED'
      }, { status: 403 });
    }
    
    const fileInfo = fileInfoResult.fileInfo!;
    
    // Build file path
    const { SecureFileUploadService } = await loadFileUploadService();
    const config = SecureFileUploadService.getUploadConfig(user.role);
    const filePath = join(process.cwd(), config.uploadPath, fileInfo.secureFileName);
    
    try {
      // Check if file exists
      await stat(filePath);
      
      // Read file
      const fileBuffer = await readFile(filePath);
      
      // Update download tracking (in production, update database)
      await trackFileDownload(fileId, user.id, securityContext);
      
      // Audit successful download
      const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
        user.id,
        'file_downloaded',
        fileId,
        {
          fileName: fileInfo.originalName,
          fileSize: fileInfo.size,
          ...securityContext
        },
        true
      );
      
      console.log(`📥 File downloaded: ${fileId} by user ${user.id}`);
      
      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': fileInfo.mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Content-Disposition': `attachment; filename="${fileInfo.originalName}"`,
          'Cache-Control': 'private, no-cache',
          'X-File-ID': fileId,
          'X-Upload-Date': fileInfo.uploadedAt.toISOString()
        }
      });
      
    } catch (fileError) {
      console.error(`❌ File not found on disk: ${fileId}`, fileError);
      
      return NextResponse.json({
        success: false,
        error: 'File not found on server',
        code: 'FILE_NOT_FOUND_ON_DISK'
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('❌ File download error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Download failed',
      code: 'DOWNLOAD_ERROR'
    }, { status: 500 });
  }
}

async function handleFileInfo(
  fileId: string | null,
  user: any,
  securityContext: any
): Promise<NextResponse> {
  if (!fileId) {
    return NextResponse.json({
      success: false,
      error: 'File ID required',
      code: 'MISSING_FILE_ID'
    }, { status: 400 });
  }
  
  const fileInfoResult = await SecureFileUploadService.getFileInfo(
    fileId,
    user.id,
    user.role
  );
  
  if (!fileInfoResult.success) {
    return NextResponse.json({
      success: false,
      error: fileInfoResult.error,
      code: 'FILE_INFO_ERROR'
    }, { status: 404 });
  }
  
  // Audit file info access
  const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
    user.id,
    'file_info_accessed',
    fileId,
    {
      fileName: fileInfoResult.fileInfo?.originalName,
      ...securityContext
    },
    true
  );
  
  return NextResponse.json({
    success: true,
    fileInfo: fileInfoResult.fileInfo,
    timestamp: new Date().toISOString()
  });
}

async function handleFileList(
  channelId: string | null,
  targetUserId: string | null,
  user: any,
  searchParams: URLSearchParams,
  securityContext: any
): Promise<NextResponse> {
  try {
    // Parse filters
    const filters = {
      fileType: searchParams.get('fileType'),
      uploadedAfter: searchParams.get('uploadedAfter'),
      uploadedBefore: searchParams.get('uploadedBefore'),
      size: searchParams.get('size') as 'small' | 'medium' | 'large' | null
    };
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get files list (in production, query from database)
    const filesResult = await getFilesList({
      channelId,
      userId: targetUserId || user.id,
      filters,
      limit,
      offset,
      requestingUserId: user.id,
      requestingUserRole: user.role
    });
    
    // Audit file list access
    const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
      user.id,
      'file_list_accessed',
      channelId || targetUserId || 'user_files',
      {
        filters,
        resultCount: filesResult.files.length,
        ...securityContext
      },
      true
    );
    
    return NextResponse.json({
      success: true,
      files: filesResult.files,
      pagination: {
        total: filesResult.total,
        limit,
        offset,
        hasMore: filesResult.total > offset + limit
      },
      filters,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ File list error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve file list',
      code: 'FILE_LIST_ERROR'
    }, { status: 500 });
  }
}

async function handleFileShare(
  fileId: string | null,
  user: any,
  securityContext: any
): Promise<NextResponse> {
  if (!fileId) {
    return NextResponse.json({
      success: false,
      error: 'File ID required',
      code: 'MISSING_FILE_ID'
    }, { status: 400 });
  }
  
  // Get file info to check permissions
  const fileInfoResult = await SecureFileUploadService.getFileInfo(
    fileId,
    user.id,
    user.role
  );
  
  if (!fileInfoResult.success) {
    return NextResponse.json({
      success: false,
      error: fileInfoResult.error,
      code: 'FILE_NOT_FOUND'
    }, { status: 404 });
  }
  
  // Generate share information
  const shareInfo = {
    fileId,
    fileName: fileInfoResult.fileInfo?.originalName,
    shareUrl: `/api/chat/files?action=download&fileId=${fileId}`,
    sharedBy: user.id,
    sharedAt: new Date().toISOString(),
    accessLevel: fileInfoResult.fileInfo?.accessLevel,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  };
  
  // Audit file sharing
  const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
    user.id,
    'file_shared',
    fileId,
    {
      fileName: fileInfoResult.fileInfo?.originalName,
      shareUrl: shareInfo.shareUrl,
      ...securityContext
    },
    true
  );
  
  return NextResponse.json({
    success: true,
    shareInfo,
    timestamp: new Date().toISOString()
  });
}

async function handleFileAnalytics(
  fileId: string | null,
  channelId: string | null,
  user: any,
  securityContext: any
): Promise<NextResponse> {
  // Only allow analytics for file owners and admins/moderators
  if (!['admin', 'super_admin', 'moderator'].includes(user.role)) {
    if (fileId) {
      const { SecureFileUploadService } = await loadFileUploadService();
      const { SecureFileUploadService } = await loadFileUploadService();
    const fileInfoResult = await SecureFileUploadService.getFileInfo(
        fileId,
        user.id,
        user.role
      );
      
      if (!fileInfoResult.success || fileInfoResult.fileInfo?.uploadedBy !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Permission denied',
          code: 'PERMISSION_DENIED'
        }, { status: 403 });
      }
    }
  }
  
  // Get analytics data (mock implementation)
  const analytics = await getFileAnalytics(fileId, channelId, user.role);
  
  // Audit analytics access
  const { ChatSecurityManager } = await loadChatSecurity();
  await ChatSecurityManager.auditUserAction(
    user.id,
    'file_analytics_accessed',
    fileId || channelId || 'global',
    {
      analyticsType: fileId ? 'file' : 'channel',
      ...securityContext
    },
    true
  );
  
  return NextResponse.json({
    success: true,
    analytics,
    timestamp: new Date().toISOString()
  });
}

// Helper functions

async function trackFileDownload(fileId: string, userId: string, securityContext: any): Promise<void> {
  // In production, update database with download tracking
  console.log(`📊 Tracking download: file ${fileId} by user ${userId}`);
  
  // Example: await prisma.fileDownload.create({
  //   data: {
  //     fileId,
  //     userId,
  //     downloadedAt: new Date(),
  //     ipAddress: securityContext.ipAddress,
  //     userAgent: securityContext.userAgent
  //   }
  // });
}

async function updateFileAccess(
  fileId: string,
  accessLevel: string,
  user: any,
  securityContext: any
): Promise<{ success: boolean; error?: string }> {
  // In production, update database
  console.log(`🔒 Updating file access: ${fileId} to ${accessLevel} by ${user.id}`);
  
  // Example: await prisma.fileUpload.update({
  //   where: { fileId },
  //   data: { accessLevel }
  // });
  
  return { success: true };
}

async function updateFileMetadata(
  fileId: string,
  metadata: any,
  user: any,
  securityContext: any
): Promise<{ success: boolean; error?: string }> {
  // In production, update database
  console.log(`📝 Updating file metadata: ${fileId} by ${user.id}`, metadata);
  
  return { success: true };
}

async function generateShareLink(
  fileId: string,
  settings: any,
  user: any,
  securityContext: any
): Promise<{ success: boolean; shareLink?: string; error?: string }> {
  // Generate secure share link with expiration
  const shareToken = Buffer.from(JSON.stringify({
    fileId,
    sharedBy: user.id,
    expiresAt: Date.now() + (settings.expirationHours || 24) * 60 * 60 * 1000
  })).toString('base64url');
  
  const shareLink = `/api/chat/files/share/${shareToken}`;
  
  console.log(`🔗 Generated share link for file ${fileId} by ${user.id}`);
  
  return { success: true, shareLink };
}

async function getFilesList(params: any): Promise<{ files: any[]; total: number }> {
  // In production, query database with filters and pagination
  console.log('📋 Getting files list with params:', params);
  
  // Mock implementation
  return {
    files: [], // Example file list
    total: 0
  };
}

async function getFileAnalytics(
  fileId: string | null,
  channelId: string | null,
  userRole: string
): Promise<any> {
  // In production, aggregate analytics from database
  console.log(`📊 Getting file analytics: fileId=${fileId}, channelId=${channelId}, role=${userRole}`);
  
  // Mock analytics data
  return {
    totalUploads: 0,
    totalDownloads: 0,
    totalSize: 0,
    popularFileTypes: [],
    recentActivity: [],
    storageUsage: {
      used: 0,
      available: 1000000000, // 1GB
      percentage: 0
    }
  };
}
