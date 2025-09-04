import { NextRequest, NextResponse } from 'next/server';
import { requireChatPermissions } from '@/lib/middleware/chat-auth';
import { SecureFileUploadService } from '@/lib/services/secure-file-upload';
import { ChatSecurityManager } from '@/lib/security/chat-permissions';
import { getStreamChatServerClient } from '@/lib/config/stream-chat';

/**
 * Secure Chat File Upload API
 * Task 22.3: File Upload System
 * 
 * Comprehensive file upload with:
 * - Multi-layer security validation
 * - Role-based upload limits
 * - Virus scanning integration
 * - Stream Chat integration
 * - Progress tracking support
 * - Access control enforcement
 */

interface UploadRequest {
  channelId?: string;
  messageId?: string;
  uploadType: 'message_attachment' | 'channel_media' | 'profile_image' | 'temp_upload';
  metadata?: {
    description?: string;
    tags?: string[];
    expiresAt?: string;
  };
}

/**
 * POST /api/chat/upload - Upload files with comprehensive security
 */
export const POST = requireChatPermissions.uploadFile()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      
      console.log(`📤 File upload request from user ${user.id} (${user.role})`);
      
      // Parse multipart form data
      const formData = await request.formData();
      const uploadData = formData.get('uploadData') as string;
      const files = formData.getAll('files') as File[];
      
      if (!files || files.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No files provided',
          code: 'NO_FILES'
        }, { status: 400 });
      }
      
      // Parse upload configuration
      let uploadConfig: UploadRequest;
      try {
        uploadConfig = uploadData ? JSON.parse(uploadData) : { uploadType: 'temp_upload' };
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Invalid upload configuration',
          code: 'INVALID_CONFIG'
        }, { status: 400 });
      }
      
      const { channelId, messageId, uploadType, metadata } = uploadConfig;
      
      // Validate channel access if channelId provided
      if (channelId) {
        const hasChannelAccess = await validateChannelAccess(user.id, channelId, user.role);
        if (!hasChannelAccess) {
          await ChatSecurityManager.auditUserAction(
            user.id,
            'file_upload_channel_access_denied',
            channelId,
            {
              uploadType,
              fileCount: files.length,
              ...securityContext
            },
            false
          );
          
          return NextResponse.json({
            success: false,
            error: 'Access denied to channel',
            code: 'CHANNEL_ACCESS_DENIED'
          }, { status: 403 });
        }
      }
      
      // Get user-specific upload configuration
      const userUploadConfig = SecureFileUploadService.getUploadConfig(user.role, {
        // Custom config based on upload type
        ...(uploadType === 'profile_image' && {
          maxFileSize: 5 * 1024 * 1024, // 5MB for profile images
          maxFilesPerUpload: 1,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        }),
        ...(uploadType === 'message_attachment' && {
          // Use default config for message attachments
        })
      });
      
      // Validate file count
      if (files.length > userUploadConfig.maxFilesPerUpload) {
        return NextResponse.json({
          success: false,
          error: `Too many files. Maximum allowed: ${userUploadConfig.maxFilesPerUpload}`,
          code: 'TOO_MANY_FILES'
        }, { status: 400 });
      }
      
      // Process each file
      const uploadResults = [];
      const errors = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          console.log(`📎 Processing file ${i + 1}/${files.length}: ${file.name}`);
          
          // Upload file with security checks
          const uploadResult = await SecureFileUploadService.uploadFile(
            file,
            file.name,
            user.id,
            user.role,
            channelId,
            userUploadConfig
          );
          
          if (uploadResult.success) {
            // Create Stream Chat attachment if for message
            let streamChatAttachment = null;
            if (uploadType === 'message_attachment' && channelId) {
              streamChatAttachment = await createStreamChatAttachment(
                uploadResult,
                channelId,
                user.id,
                metadata
              );
            }
            
            uploadResults.push({
              ...uploadResult,
              streamChatAttachment,
              uploadType,
              metadata
            });
            
            console.log(`✅ File uploaded successfully: ${uploadResult.fileId}`);
          } else {
            errors.push({
              fileName: file.name,
              error: uploadResult.error
            });
            
            console.log(`❌ File upload failed: ${file.name} - ${uploadResult.error}`);
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
          errors.push({
            fileName: file.name,
            error: errorMessage
          });
          
          console.error(`❌ File upload error for ${file.name}:`, error);
        }
      }
      
      // Audit upload attempt
      await ChatSecurityManager.auditUserAction(
        user.id,
        'file_upload_completed',
        channelId || 'none',
        {
          uploadType,
          totalFiles: files.length,
          successfulUploads: uploadResults.length,
          failedUploads: errors.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          ...securityContext
        },
        uploadResults.length > 0
      );
      
      // Determine response status
      const hasSuccesses = uploadResults.length > 0;
      const hasErrors = errors.length > 0;
      
      let status = 200;
      if (!hasSuccesses && hasErrors) {
        status = 400; // All failed
      } else if (hasSuccesses && hasErrors) {
        status = 207; // Multi-status (partial success)
      }
      
      return NextResponse.json({
        success: hasSuccesses,
        uploads: uploadResults,
        errors: hasErrors ? errors : undefined,
        summary: {
          total: files.length,
          successful: uploadResults.length,
          failed: errors.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0)
        },
        uploadType,
        channelId,
        timestamp: new Date().toISOString()
      }, { status });
      
    } catch (error) {
      console.error('❌ Chat upload API error:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'file_upload_api_error',
        'unknown',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        code: 'UPLOAD_API_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * GET /api/chat/upload - Get upload status and file information
 */
export const GET = requireChatPermissions.uploadFile()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const fileId = searchParams.get('fileId');
      const channelId = searchParams.get('channelId');
      const action = searchParams.get('action') || 'info';
      
      console.log(`📋 File upload query from user ${user.id}: action=${action}`);
      
      switch (action) {
        case 'info':
          if (!fileId) {
            return NextResponse.json({
              success: false,
              error: 'File ID required for info action',
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
          
          return NextResponse.json({
            success: true,
            fileInfo: fileInfoResult.fileInfo,
            timestamp: new Date().toISOString()
          });
          
        case 'config':
          const uploadConfig = SecureFileUploadService.getUploadConfig(user.role);
          return NextResponse.json({
            success: true,
            uploadConfig: {
              maxFileSize: uploadConfig.maxFileSize,
              maxFilesPerUpload: uploadConfig.maxFilesPerUpload,
              allowedMimeTypes: uploadConfig.allowedMimeTypes,
              allowedExtensions: uploadConfig.allowedExtensions
            },
            userRole: user.role,
            timestamp: new Date().toISOString()
          });
          
        case 'cleanup':
          // Only admin/moderators can trigger cleanup
          if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'moderator') {
            return NextResponse.json({
              success: false,
              error: 'Insufficient permissions for cleanup operation',
              code: 'INSUFFICIENT_PERMISSIONS'
            }, { status: 403 });
          }
          
          const cleanupResult = await SecureFileUploadService.cleanupOldFiles();
          
          await ChatSecurityManager.auditUserAction(
            user.id,
            'file_cleanup_triggered',
            'system',
            {
              filesRemoved: cleanupResult.cleaned,
              errors: cleanupResult.errors,
              ...securityContext
            },
            true
          );
          
          return NextResponse.json({
            success: true,
            cleanupResult,
            timestamp: new Date().toISOString()
          });
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown action: ${action}`,
            code: 'UNKNOWN_ACTION'
          }, { status: 400 });
      }
      
    } catch (error) {
      console.error('❌ Chat upload GET API error:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
        code: 'QUERY_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/chat/upload - Delete uploaded files
 */
export const DELETE = requireChatPermissions.uploadFile()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const fileId = searchParams.get('fileId');
      
      if (!fileId) {
        return NextResponse.json({
          success: false,
          error: 'File ID required',
          code: 'MISSING_FILE_ID'
        }, { status: 400 });
      }
      
      console.log(`🗑️ File deletion request from user ${user.id} for file ${fileId}`);
      
      // Delete file with access control
      const deleteResult = await SecureFileUploadService.deleteFile(
        fileId,
        user.id,
        user.role
      );
      
      // Audit deletion attempt
      await ChatSecurityManager.auditUserAction(
        user.id,
        'file_deletion_attempt',
        fileId,
        {
          success: deleteResult.success,
          error: deleteResult.error,
          ...securityContext
        },
        deleteResult.success
      );
      
      if (!deleteResult.success) {
        return NextResponse.json({
          success: false,
          error: deleteResult.error,
          code: 'DELETION_FAILED'
        }, { status: deleteResult.error === 'Permission denied' ? 403 : 404 });
      }
      
      return NextResponse.json({
        success: true,
        fileId,
        message: 'File deleted successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Chat upload DELETE API error:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'file_deletion_api_error',
        'unknown',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
        code: 'DELETION_API_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

// Helper functions

async function validateChannelAccess(userId: string, channelId: string, userRole: string): Promise<boolean> {
  try {
    const client = getStreamChatServerClient();
    const channel = client.channel('messaging', channelId);
    
    // Query channel to check if user is a member
    const { members } = await channel.queryMembers({ id: userId });
    
    // User is a member or has admin/moderator privileges
    return members.length > 0 || ['admin', 'super_admin', 'moderator'].includes(userRole);
    
  } catch (error) {
    console.error('❌ Error validating channel access:', error);
    return false;
  }
}

async function createStreamChatAttachment(
  uploadResult: any,
  channelId: string,
  userId: string,
  metadata?: any
): Promise<any> {
  try {
    console.log(`📎 Creating Stream Chat attachment for file ${uploadResult.fileId}`);
    
    // Create Stream Chat compatible attachment object
    const attachment = {
      type: uploadResult.mimeType.startsWith('image/') ? 'image' : 
            uploadResult.mimeType.startsWith('video/') ? 'video' : 'file',
      title: uploadResult.originalName,
      title_link: uploadResult.url,
      image_url: uploadResult.mimeType.startsWith('image/') ? uploadResult.url : undefined,
      asset_url: uploadResult.url,
      file_size: uploadResult.size,
      mime_type: uploadResult.mimeType,
      // Custom metadata for fishing app
      fishing_file_id: uploadResult.fileId,
      upload_timestamp: uploadResult.uploadedAt.toISOString(),
      uploader_id: userId,
      security_checked: true,
      ...metadata
    };
    
    return attachment;
    
  } catch (error) {
    console.error('❌ Error creating Stream Chat attachment:', error);
    return null;
  }
}
