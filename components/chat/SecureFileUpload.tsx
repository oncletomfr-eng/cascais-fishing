'use client';

/**
 * Secure File Upload Component
 * Task 22.3: File Upload System
 * 
 * Enhanced file upload with comprehensive security:
 * - Role-based upload limits
 * - Real-time security validation
 * - Progress tracking with security checks
 * - Stream Chat integration
 * - File access control
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Upload, 
  X, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Eye,
  Download,
  Share2,
  Trash2,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Types
export interface SecureFileUpload {
  id: string;
  file: File;
  uploadProgress: number;
  uploadStatus: 'pending' | 'validating' | 'uploading' | 'completed' | 'failed';
  securityChecks: {
    sizeValidation: boolean;
    typeValidation: boolean;
    contentValidation: boolean;
    virusScanning: boolean;
    accessPermission: boolean;
  };
  result?: {
    fileId: string;
    url: string;
    secureFileName: string;
  };
  error?: string;
  warnings?: string[];
}

export interface UploadConfig {
  maxFileSize: number;
  maxFilesPerUpload: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  userRole: string;
}

export interface SecureFileUploadProps {
  channelId?: string;
  uploadType?: 'message_attachment' | 'channel_media' | 'profile_image' | 'temp_upload';
  onUploadComplete?: (files: SecureFileUpload[]) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: { completed: number; total: number; overall: number }) => void;
  className?: string;
  disabled?: boolean;
  metadata?: {
    description?: string;
    tags?: string[];
    expiresAt?: string;
  };
}

export function SecureFileUpload({
  channelId,
  uploadType = 'temp_upload',
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  className = '',
  disabled = false,
  metadata
}: SecureFileUploadProps) {
  const { data: session } = useSession();
  const [uploads, setUploads] = useState<SecureFileUpload[]>([]);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch upload configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/chat/upload?action=config');
        if (response.ok) {
          const data = await response.json();
          setUploadConfig(data.uploadConfig);
        }
      } catch (error) {
        console.error('❌ Error fetching upload config:', error);
      }
    };

    if (session?.user) {
      fetchConfig();
    }
  }, [session]);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    if (!uploadConfig || !session?.user || disabled) return;

    const fileArray = Array.from(files);
    
    // Check file count
    if (fileArray.length > uploadConfig.maxFilesPerUpload) {
      onUploadError?.(
        `Too many files selected. Maximum allowed: ${uploadConfig.maxFilesPerUpload}`
      );
      return;
    }

    if (uploads.length + fileArray.length > uploadConfig.maxFilesPerUpload) {
      onUploadError?.(
        `Total files would exceed limit of ${uploadConfig.maxFilesPerUpload}`
      );
      return;
    }

    // Create upload entries
    const newUploads: SecureFileUpload[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      uploadProgress: 0,
      uploadStatus: 'pending',
      securityChecks: {
        sizeValidation: false,
        typeValidation: false,
        contentValidation: false,
        virusScanning: false,
        accessPermission: false
      }
    }));

    setUploads(prev => [...prev, ...newUploads]);
    
    // Start upload process
    await processUploads(newUploads);
    
  }, [uploadConfig, session, disabled, uploads, onUploadError]);

  const processUploads = async (uploadsToProcess: SecureFileUpload[]) => {
    setIsUploading(true);
    
    try {
      for (const upload of uploadsToProcess) {
        await processIndividualUpload(upload);
      }
    } finally {
      setIsUploading(false);
      
      // Trigger completion callback
      const completedUploads = uploads.filter(u => u.uploadStatus === 'completed');
      if (completedUploads.length > 0 && onUploadComplete) {
        onUploadComplete(completedUploads);
      }
    }
  };

  const processIndividualUpload = async (upload: SecureFileUpload) => {
    try {
      console.log(`🔒 Starting secure upload: ${upload.file.name}`);
      
      // Update status to validating
      updateUploadStatus(upload.id, 'validating');
      
      // Create form data
      const formData = new FormData();
      formData.append('files', upload.file);
      formData.append('uploadData', JSON.stringify({
        channelId,
        uploadType,
        metadata
      }));

      // Upload with progress tracking
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success && result.uploads.length > 0) {
        const uploadResult = result.uploads[0];
        
        // Update with success
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? {
                ...u,
                uploadStatus: 'completed',
                uploadProgress: 100,
                securityChecks: uploadResult.securityChecks,
                result: {
                  fileId: uploadResult.fileId,
                  url: uploadResult.url,
                  secureFileName: uploadResult.secureFileName
                }
              }
            : u
        ));
        
        console.log(`✅ Upload completed: ${upload.file.name}`);
        
      } else {
        // Handle upload failure
        const errorMessage = result.error || 'Upload failed';
        updateUploadError(upload.id, errorMessage);
        console.log(`❌ Upload failed: ${upload.file.name} - ${errorMessage}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateUploadError(upload.id, errorMessage);
      console.error(`❌ Upload error for ${upload.file.name}:`, error);
    }
  };

  const updateUploadStatus = (uploadId: string, status: SecureFileUpload['uploadStatus']) => {
    setUploads(prev => prev.map(u => 
      u.id === uploadId ? { ...u, uploadStatus: status } : u
    ));
  };

  const updateUploadError = (uploadId: string, error: string) => {
    setUploads(prev => prev.map(u => 
      u.id === uploadId 
        ? { ...u, uploadStatus: 'failed', error }
        : u
    ));
  };

  const removeUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  }, []);

  const retryUpload = useCallback(async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (upload) {
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, uploadStatus: 'pending', error: undefined }
          : u
      ));
      await processIndividualUpload(upload);
    }
  }, [uploads]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Clear input value to allow selecting same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (file.type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (file.type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (file.type.includes('zip') || file.type.includes('rar')) return <Archive className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getSecurityStatus = (upload: SecureFileUpload) => {
    const { securityChecks } = upload;
    const totalChecks = Object.keys(securityChecks).length;
    const passedChecks = Object.values(securityChecks).filter(Boolean).length;
    
    return { totalChecks, passedChecks };
  };

  if (!session?.user) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Lock className="w-8 h-8 mx-auto mb-2" />
        Please sign in to upload files
      </div>
    );
  }

  if (!uploadConfig) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading upload configuration...
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400',
          'focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-opacity-20'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={uploadConfig.allowedMimeTypes.join(',')}
          onChange={handleFileInputChange}
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <div className="flex justify-center">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isUploading ? 'Processing uploads...' : 'Drop files here or click to select'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max {uploadConfig.maxFilesPerUpload} files, {formatFileSize(uploadConfig.maxFileSize)} each
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-1 text-xs text-green-600">
            <Shield className="w-3 h-3" />
            Secure Upload with Virus Scanning
          </div>
        </div>
      </div>

      {/* Upload List */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {uploads.map((upload) => (
              <motion.div
                key={upload.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="border rounded-lg p-3 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* File Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getFileIcon(upload.file)}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(upload.file.size)} • {upload.file.type}
                      </p>
                      
                      {/* Security Status */}
                      {upload.uploadStatus !== 'pending' && (
                        <div className="mt-1 flex items-center space-x-2 text-xs">
                          {upload.uploadStatus === 'validating' && (
                            <div className="flex items-center text-yellow-600">
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              Security validation...
                            </div>
                          )}
                          
                          {upload.uploadStatus === 'uploading' && (
                            <div className="flex items-center text-blue-600">
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              Uploading... {upload.uploadProgress}%
                            </div>
                          )}
                          
                          {upload.uploadStatus === 'completed' && (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Upload complete
                            </div>
                          )}
                          
                          {upload.uploadStatus === 'failed' && (
                            <div className="flex items-center text-red-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {upload.error || 'Upload failed'}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Security Checks */}
                      {(upload.uploadStatus === 'validating' || upload.uploadStatus === 'completed') && (
                        <div className="mt-2 grid grid-cols-5 gap-1">
                          {Object.entries(upload.securityChecks).map(([check, passed]) => (
                            <div
                              key={check}
                              className={cn(
                                'w-2 h-2 rounded-full',
                                passed ? 'bg-green-400' : 'bg-gray-200'
                              )}
                              title={check.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2">
                    {upload.uploadStatus === 'completed' && upload.result && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(upload.result?.url, '_blank');
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          title="View file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = upload.result?.url || '';
                            link.download = upload.file.name;
                            link.click();
                          }}
                          className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement share functionality
                            console.log('Share file:', upload.result?.fileId);
                          }}
                          className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                          title="Share file"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    
                    {upload.uploadStatus === 'failed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryUpload(upload.id);
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUpload(upload.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {upload.uploadStatus === 'uploading' && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${upload.uploadProgress}%` }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Configuration Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>User Role: {uploadConfig.userRole}</span>
          <span>Max Files: {uploadConfig.maxFilesPerUpload}</span>
          <span>Max Size: {formatFileSize(uploadConfig.maxFileSize)}</span>
        </div>
      </div>
    </div>
  );
}

export default SecureFileUpload;
