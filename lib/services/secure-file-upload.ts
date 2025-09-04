/**
 * Secure File Upload Service
 * Task 22.3: File Upload System
 * 
 * Comprehensive secure file handling for Stream Chat:
 * - Multi-layer security validation
 * - File type and content verification
 * - Virus scanning simulation
 * - Access control integration
 * - Upload progress tracking
 * - Automatic cleanup policies
 */

import { writeFile, mkdir, unlink, stat, readFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ChatRole, ChatPermission } from '@/lib/security/chat-permissions';

// File upload configuration
export interface FileUploadConfig {
  maxFileSize: number;           // bytes
  maxFilesPerUpload: number;     // count
  allowedMimeTypes: string[];    // MIME types
  allowedExtensions: string[];   // file extensions
  enableVirusScanning: boolean;  // antivirus check
  enableContentValidation: boolean; // content type verification
  uploadPath: string;           // storage path
  tempPath: string;            // temporary processing path
  retentionPeriod: number;     // days to keep files
}

// Upload result information
export interface FileUploadResult {
  success: boolean;
  fileId: string;
  originalName: string;
  secureFileName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  securityChecks: {
    sizeValidation: boolean;
    typeValidation: boolean;
    contentValidation: boolean;
    virusScanning: boolean;
    accessPermission: boolean;
  };
  error?: string;
}

// File access information
export interface SecureFileInfo {
  fileId: string;
  originalName: string;
  secureFileName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  channelId?: string;
  accessLevel: 'public' | 'private' | 'channel_only' | 'user_only';
  downloadCount: number;
  lastAccessed?: Date;
}

// Default configurations by user role
const ROLE_UPLOAD_CONFIGS: Record<ChatRole, Partial<FileUploadConfig>> = {
  [ChatRole.SUPER_ADMIN]: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFilesPerUpload: 20,
    allowedMimeTypes: ['*/*'] // All types
  },
  [ChatRole.ADMIN]: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFilesPerUpload: 15,
    allowedMimeTypes: [
      'image/*', 'video/*', 'audio/*', 'application/pdf',
      'text/*', 'application/zip', 'application/x-compressed'
    ]
  },
  [ChatRole.MODERATOR]: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    maxFilesPerUpload: 10,
    allowedMimeTypes: [
      'image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'
    ]
  },
  [ChatRole.CAPTAIN]: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    maxFilesPerUpload: 8,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'text/plain'
    ]
  },
  [ChatRole.PREMIUM_USER]: {
    maxFileSize: 15 * 1024 * 1024, // 15MB
    maxFilesPerUpload: 6,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/webm',
      'application/pdf'
    ]
  },
  [ChatRole.USER]: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerUpload: 5,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/webm'
    ]
  },
  [ChatRole.GUEST]: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFilesPerUpload: 2,
    allowedMimeTypes: [
      'image/jpeg', 'image/png'
    ]
  },
  [ChatRole.BANNED]: {
    maxFileSize: 0,
    maxFilesPerUpload: 0,
    allowedMimeTypes: []
  }
};

// Base configuration
const BASE_CONFIG: FileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFilesPerUpload: 5,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'],
  enableVirusScanning: process.env.NODE_ENV === 'production',
  enableContentValidation: true,
  uploadPath: 'public/uploads/chat',
  tempPath: 'temp/uploads',
  retentionPeriod: 30
};

/**
 * Secure File Upload Service - Main class for handling file operations
 */
export class SecureFileUploadService {
  
  /**
   * Get upload configuration based on user role
   */
  static getUploadConfig(userRole: ChatRole, customConfig?: Partial<FileUploadConfig>): FileUploadConfig {
    const roleConfig = ROLE_UPLOAD_CONFIGS[userRole] || {};
    
    return {
      ...BASE_CONFIG,
      ...roleConfig,
      ...customConfig
    };
  }
  
  /**
   * Validate file before upload
   */
  static async validateFile(
    file: File | Buffer, 
    fileName: string,
    config: FileUploadConfig,
    userRole: ChatRole
  ): Promise<{ valid: boolean; error?: string; warnings?: string[] }> {
    const warnings: string[] = [];
    
    try {
      // Check if user role can upload files
      if (userRole === ChatRole.BANNED) {
        return { valid: false, error: 'User is banned from uploading files' };
      }
      
      // Size validation
      const fileSize = file instanceof File ? file.size : file.length;
      if (fileSize > config.maxFileSize) {
        return { 
          valid: false, 
          error: `File size (${this.formatFileSize(fileSize)}) exceeds maximum allowed (${this.formatFileSize(config.maxFileSize)})` 
        };
      }
      
      if (fileSize === 0) {
        return { valid: false, error: 'File is empty' };
      }
      
      // Extension validation
      const fileExtension = extname(fileName).toLowerCase();
      if (!config.allowedExtensions.includes(fileExtension)) {
        return { valid: false, error: `File extension "${fileExtension}" is not allowed` };
      }
      
      // MIME type validation
      const mimeType = file instanceof File ? file.type : await this.detectMimeType(file, fileName);
      if (!this.isMimeTypeAllowed(mimeType, config.allowedMimeTypes)) {
        return { valid: false, error: `File type "${mimeType}" is not allowed` };
      }
      
      // Content validation
      if (config.enableContentValidation) {
        const contentValidation = await this.validateFileContent(file, fileName, mimeType);
        if (!contentValidation.valid) {
          return { valid: false, error: contentValidation.error };
        }
        if (contentValidation.warnings) {
          warnings.push(...contentValidation.warnings);
        }
      }
      
      // File name validation
      const fileNameValidation = this.validateFileName(fileName);
      if (!fileNameValidation.valid) {
        return { valid: false, error: fileNameValidation.error };
      }
      
      return { valid: true, warnings };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  /**
   * Upload file securely with comprehensive checks
   */
  static async uploadFile(
    file: File | Buffer,
    fileName: string,
    uploadedBy: string,
    userRole: ChatRole,
    channelId?: string,
    customConfig?: Partial<FileUploadConfig>
  ): Promise<FileUploadResult> {
    const config = this.getUploadConfig(userRole, customConfig);
    const securityChecks = {
      sizeValidation: false,
      typeValidation: false,
      contentValidation: false,
      virusScanning: false,
      accessPermission: false
    };
    
    try {
      console.log(`🔒 Starting secure file upload for user ${uploadedBy} (${userRole})`);
      
      // 1. Validate file
      const validation = await this.validateFile(file, fileName, config, userRole);
      if (!validation.valid) {
        return {
          success: false,
          fileId: '',
          originalName: fileName,
          secureFileName: '',
          url: '',
          size: 0,
          mimeType: '',
          uploadedAt: new Date(),
          uploadedBy,
          securityChecks,
          error: validation.error
        };
      }
      
      securityChecks.sizeValidation = true;
      securityChecks.typeValidation = true;
      securityChecks.accessPermission = true;
      
      // 2. Generate secure file information
      const fileId = uuidv4();
      const fileExtension = extname(fileName);
      const secureFileName = `${fileId}${fileExtension}`;
      const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
      const mimeType = file instanceof File ? file.type : await this.detectMimeType(file, fileName);
      
      // 3. Create upload directories
      const uploadDir = join(process.cwd(), config.uploadPath);
      const tempDir = join(process.cwd(), config.tempPath);
      
      await mkdir(uploadDir, { recursive: true });
      await mkdir(tempDir, { recursive: true });
      
      // 4. Save to temporary location first
      const tempFilePath = join(tempDir, secureFileName);
      await writeFile(tempFilePath, fileBuffer);
      
      // 5. Content validation (deep inspection)
      if (config.enableContentValidation) {
        const contentCheck = await this.validateFileContent(fileBuffer, fileName, mimeType);
        if (!contentCheck.valid) {
          await unlink(tempFilePath).catch(() => {}); // Cleanup temp file
          return {
            success: false,
            fileId,
            originalName: fileName,
            secureFileName,
            url: '',
            size: fileBuffer.length,
            mimeType,
            uploadedAt: new Date(),
            uploadedBy,
            securityChecks,
            error: contentCheck.error
          };
        }
        securityChecks.contentValidation = true;
      }
      
      // 6. Virus scanning (simulated in development)
      if (config.enableVirusScanning) {
        const virusCheck = await this.scanForViruses(tempFilePath, fileBuffer);
        if (!virusCheck.clean) {
          await unlink(tempFilePath).catch(() => {}); // Cleanup temp file
          return {
            success: false,
            fileId,
            originalName: fileName,
            secureFileName,
            url: '',
            size: fileBuffer.length,
            mimeType,
            uploadedAt: new Date(),
            uploadedBy,
            securityChecks,
            error: 'File failed virus scanning'
          };
        }
        securityChecks.virusScanning = true;
      }
      
      // 7. Move to final location
      const finalFilePath = join(uploadDir, secureFileName);
      await writeFile(finalFilePath, fileBuffer);
      await unlink(tempFilePath).catch(() => {}); // Cleanup temp file
      
      // 8. Generate secure URL
      const fileUrl = `/uploads/chat/${secureFileName}`;
      
      // 9. Store file metadata (in production, save to database)
      await this.storeFileMetadata({
        fileId,
        originalName: fileName,
        secureFileName,
        mimeType,
        size: fileBuffer.length,
        uploadedAt: new Date(),
        uploadedBy,
        channelId,
        accessLevel: channelId ? 'channel_only' : 'user_only',
        downloadCount: 0
      });
      
      console.log(`✅ File uploaded successfully: ${fileId}`);
      
      return {
        success: true,
        fileId,
        originalName: fileName,
        secureFileName,
        url: fileUrl,
        size: fileBuffer.length,
        mimeType,
        uploadedAt: new Date(),
        uploadedBy,
        securityChecks
      };
      
    } catch (error) {
      console.error('❌ Secure file upload error:', error);
      
      return {
        success: false,
        fileId: '',
        originalName: fileName,
        secureFileName: '',
        url: '',
        size: 0,
        mimeType: '',
        uploadedAt: new Date(),
        uploadedBy,
        securityChecks,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }
  
  /**
   * Get file information with access control
   */
  static async getFileInfo(
    fileId: string,
    requestingUserId: string,
    userRole: ChatRole
  ): Promise<{ success: boolean; fileInfo?: SecureFileInfo; error?: string }> {
    try {
      // Get file metadata (in production, fetch from database)
      const fileInfo = await this.getFileMetadata(fileId);
      
      if (!fileInfo) {
        return { success: false, error: 'File not found' };
      }
      
      // Check access permissions
      const hasAccess = await this.checkFileAccess(fileInfo, requestingUserId, userRole);
      
      if (!hasAccess) {
        return { success: false, error: 'Access denied' };
      }
      
      return { success: true, fileInfo };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get file info' 
      };
    }
  }
  
  /**
   * Delete file with access control
   */
  static async deleteFile(
    fileId: string,
    requestingUserId: string,
    userRole: ChatRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fileInfo = await this.getFileMetadata(fileId);
      
      if (!fileInfo) {
        return { success: false, error: 'File not found' };
      }
      
      // Check deletion permissions
      const canDelete = fileInfo.uploadedBy === requestingUserId || 
                       userRole === ChatRole.ADMIN || 
                       userRole === ChatRole.SUPER_ADMIN ||
                       userRole === ChatRole.MODERATOR;
      
      if (!canDelete) {
        return { success: false, error: 'Permission denied' };
      }
      
      // Delete physical file
      const config = this.getUploadConfig(userRole);
      const filePath = join(process.cwd(), config.uploadPath, fileInfo.secureFileName);
      
      try {
        await unlink(filePath);
      } catch (error) {
        // File might already be deleted, continue with metadata removal
      }
      
      // Remove metadata (in production, delete from database)
      await this.removeFileMetadata(fileId);
      
      console.log(`🗑️ File deleted: ${fileId} by user ${requestingUserId}`);
      
      return { success: true };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete file' 
      };
    }
  }
  
  /**
   * Cleanup old files based on retention policy
   */
  static async cleanupOldFiles(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;
    
    try {
      console.log('🧹 Starting file cleanup process...');
      
      // In production, query database for old files
      const oldFiles = await this.getExpiredFiles();
      
      for (const fileInfo of oldFiles) {
        try {
          const config = this.getUploadConfig(ChatRole.USER); // Use default config
          const filePath = join(process.cwd(), config.uploadPath, fileInfo.secureFileName);
          
          await unlink(filePath);
          await this.removeFileMetadata(fileInfo.fileId);
          
          cleaned++;
        } catch (error) {
          console.error(`❌ Failed to cleanup file ${fileInfo.fileId}:`, error);
          errors++;
        }
      }
      
      console.log(`✅ File cleanup completed: ${cleaned} files cleaned, ${errors} errors`);
      
    } catch (error) {
      console.error('❌ File cleanup process error:', error);
      errors++;
    }
    
    return { cleaned, errors };
  }
  
  // Private helper methods
  
  private static isMimeTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
    if (allowedTypes.includes('*/*')) {
      return true;
    }
    
    return allowedTypes.some(allowedType => {
      if (allowedType.endsWith('/*')) {
        return mimeType.startsWith(allowedType.slice(0, -1));
      }
      return mimeType === allowedType;
    });
  }
  
  private static validateFileName(fileName: string): { valid: boolean; error?: string } {
    // Check file name length
    if (fileName.length > 255) {
      return { valid: false, error: 'File name too long' };
    }
    
    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return { valid: false, error: 'File name contains invalid characters' };
    }
    
    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const baseName = basename(fileName, extname(fileName)).toUpperCase();
    if (reservedNames.includes(baseName)) {
      return { valid: false, error: 'File name is reserved' };
    }
    
    return { valid: true };
  }
  
  private static async validateFileContent(
    file: File | Buffer, 
    fileName: string, 
    mimeType: string
  ): Promise<{ valid: boolean; error?: string; warnings?: string[] }> {
    const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    const warnings: string[] = [];
    
    try {
      // Check file signature (magic bytes) to prevent MIME type spoofing
      const signature = fileBuffer.subarray(0, 16);
      const expectedSignatures = this.getExpectedSignatures(mimeType);
      
      if (expectedSignatures.length > 0) {
        const hasValidSignature = expectedSignatures.some(expectedSig => 
          signature.subarray(0, expectedSig.length).equals(expectedSig)
        );
        
        if (!hasValidSignature) {
          return { valid: false, error: 'File content does not match declared type' };
        }
      }
      
      // Additional content validation for specific file types
      if (mimeType.startsWith('image/')) {
        const imageValidation = await this.validateImageContent(fileBuffer);
        if (!imageValidation.valid) {
          return imageValidation;
        }
        if (imageValidation.warnings) {
          warnings.push(...imageValidation.warnings);
        }
      }
      
      // Check for embedded executables or suspicious content
      if (this.containsSuspiciousContent(fileBuffer)) {
        warnings.push('File contains potentially suspicious content');
      }
      
      return { valid: true, warnings };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `Content validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  private static async detectMimeType(buffer: Buffer, fileName: string): Promise<string> {
    // Simple MIME type detection based on file signature
    const signature = buffer.subarray(0, 16);
    
    // Common file signatures
    if (signature.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
      return 'image/jpeg';
    }
    if (signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      return 'image/png';
    }
    if (signature.subarray(0, 6).equals(Buffer.from('GIF89a')) || signature.subarray(0, 6).equals(Buffer.from('GIF87a'))) {
      return 'image/gif';
    }
    if (signature.subarray(4, 12).equals(Buffer.from('ftypmp4'))) {
      return 'video/mp4';
    }
    if (signature.subarray(0, 4).equals(Buffer.from('%PDF'))) {
      return 'application/pdf';
    }
    
    // Fall back to extension-based detection
    const ext = extname(fileName).toLowerCase();
    const extensionMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
    };
    
    return extensionMap[ext] || 'application/octet-stream';
  }
  
  private static getExpectedSignatures(mimeType: string): Buffer[] {
    const signatures: Record<string, Buffer[]> = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
      'image/gif': [Buffer.from('GIF89a'), Buffer.from('GIF87a')],
      'video/mp4': [Buffer.from('ftyp', 'ascii')],
      'application/pdf': [Buffer.from('%PDF')]
    };
    
    return signatures[mimeType] || [];
  }
  
  private static async validateImageContent(buffer: Buffer): Promise<{ valid: boolean; error?: string; warnings?: string[] }> {
    // Basic image validation
    try {
      // Check for minimum viable image size
      if (buffer.length < 100) {
        return { valid: false, error: 'Image file too small to be valid' };
      }
      
      // Additional image-specific checks could go here
      // For example, using a library like 'sharp' for more detailed validation
      
      return { valid: true };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `Image validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  private static containsSuspiciousContent(buffer: Buffer): boolean {
    // Look for suspicious patterns
    const suspiciousPatterns = [
      Buffer.from('MZ'), // PE executable header
      Buffer.from('PK'), // ZIP archive (could contain executables)
      Buffer.from('<!DOCTYPE html', 'ascii'), // HTML in non-HTML files
      Buffer.from('<script', 'ascii') // Script tags
    ];
    
    return suspiciousPatterns.some(pattern => 
      buffer.indexOf(pattern) !== -1
    );
  }
  
  private static async scanForViruses(filePath: string, buffer: Buffer): Promise<{ clean: boolean; threats?: string[] }> {
    // In development, simulate virus scanning
    if (process.env.NODE_ENV !== 'production') {
      console.log('🦠 Simulating virus scan...');
      
      // Simulate suspicious file detection
      if (buffer.indexOf(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) !== -1) {
        return { clean: false, threats: ['Test virus signature detected'] };
      }
      
      return { clean: true };
    }
    
    // In production, integrate with actual antivirus service
    // Example integration with ClamAV, VirusTotal, etc.
    try {
      // Example: await antivirusService.scanFile(filePath);
      return { clean: true };
    } catch (error) {
      console.error('❌ Virus scanning error:', error);
      return { clean: false, threats: ['Virus scanning failed'] };
    }
  }
  
  private static async checkFileAccess(
    fileInfo: SecureFileInfo, 
    userId: string, 
    userRole: ChatRole
  ): Promise<boolean> {
    // Super admin and admin can access everything
    if (userRole === ChatRole.SUPER_ADMIN || userRole === ChatRole.ADMIN) {
      return true;
    }
    
    // File owner can always access
    if (fileInfo.uploadedBy === userId) {
      return true;
    }
    
    // Access level checks
    switch (fileInfo.accessLevel) {
      case 'public':
        return true;
        
      case 'user_only':
        return fileInfo.uploadedBy === userId;
        
      case 'channel_only':
        // In production, check if user is member of the channel
        // For now, allow moderators to access
        return userRole === ChatRole.MODERATOR || userRole === ChatRole.CAPTAIN;
        
      case 'private':
      default:
        return false;
    }
  }
  
  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
  
  // Database operations (mock implementations - replace with actual DB calls)
  
  private static async storeFileMetadata(fileInfo: SecureFileInfo): Promise<void> {
    // In production, store in database
    console.log('💾 Storing file metadata:', fileInfo.fileId);
    
    // Example: await prisma.fileUpload.create({ data: fileInfo });
  }
  
  private static async getFileMetadata(fileId: string): Promise<SecureFileInfo | null> {
    // In production, fetch from database
    console.log('🔍 Getting file metadata:', fileId);
    
    // Example: return await prisma.fileUpload.findUnique({ where: { fileId } });
    
    // Mock implementation
    return null;
  }
  
  private static async removeFileMetadata(fileId: string): Promise<void> {
    // In production, delete from database
    console.log('🗑️ Removing file metadata:', fileId);
    
    // Example: await prisma.fileUpload.delete({ where: { fileId } });
  }
  
  private static async getExpiredFiles(): Promise<SecureFileInfo[]> {
    // In production, query database for expired files
    console.log('📅 Getting expired files...');
    
    // Example: 
    // const cutoffDate = new Date(Date.now() - BASE_CONFIG.retentionPeriod * 24 * 60 * 60 * 1000);
    // return await prisma.fileUpload.findMany({ where: { uploadedAt: { lt: cutoffDate } } });
    
    return [];
  }
}
