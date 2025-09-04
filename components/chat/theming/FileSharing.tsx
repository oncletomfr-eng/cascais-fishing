'use client';

/**
 * File Sharing Component for Fishing Chat
 * Task 20.4: Implement file sharing with image support
 * 
 * Taking the role of UI/UX Designer specializing in File Upload Systems
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Image, 
  File, 
  Video, 
  FileText, 
  Camera,
  X, 
  Download,
  Eye,
  Share2,
  AlertCircle,
  CheckCircle,
  Loader2,
  PlusCircle,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  uploadProgress?: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  metadata?: {
    dimensions?: { width: number; height: number };
    duration?: number;
    location?: { lat: number; lng: number };
    timestamp?: Date;
  };
}

export interface FileSharingProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  attachments: FileAttachment[];
  maxFileSize?: number;
  maxFiles?: number;
  acceptedTypes?: string[];
  isUploading?: boolean;
  className?: string;
}

// Supported file types with fishing-specific categories
const FILE_CATEGORIES = {
  images: {
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    icon: Image,
    label: 'Photos',
    description: 'Catch photos, scenic views'
  },
  videos: {
    types: ['video/mp4', 'video/webm', 'video/mov'],
    icon: Video,
    label: 'Videos',
    description: 'Fishing videos, technique demos'
  },
  documents: {
    types: ['application/pdf', 'text/plain', 'application/msword'],
    icon: FileText,
    label: 'Documents',
    description: 'Fishing reports, regulations'
  },
  other: {
    types: ['*'],
    icon: File,
    label: 'Other Files',
    description: 'Maps, GPS files, misc'
  }
};

// File type detection
function getFileCategory(file: File): keyof typeof FILE_CATEGORIES {
  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    if (config.types.includes(file.type) || config.types.includes('*')) {
      if (category !== 'other') return category as keyof typeof FILE_CATEGORIES;
    }
  }
  return 'other';
}

// File size formatter
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Main File Sharing Component
export function FileSharing({
  onFileSelect,
  onFileRemove,
  attachments,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*', 'application/pdf', 'text/*'],
  isUploading = false,
  className = ''
}: FileSharingProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files).filter(file => {
      // Check file size
      if (file.size > maxFileSize) {
        alert(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}.`);
        return false;
      }

      // Check file type
      const isAllowed = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        alert(`File type "${file.type}" is not supported.`);
        return false;
      }

      return true;
    });

    if (selectedFiles.length + attachments.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    if (selectedFiles.length > 0) {
      onFileSelect(selectedFiles);
      setShowUploadModal(false);
    }
  }, [maxFileSize, maxFiles, acceptedTypes, attachments.length, onFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle file input click
  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle camera capture
  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  return (
    <div className={`file-sharing ${className}`}>
      {/* File Upload Button */}
      <div className="file-upload-controls">
        <button
          onClick={() => setShowUploadModal(true)}
          className="file-upload-btn"
          title="Attach files"
          disabled={isUploading || attachments.length >= maxFiles}
        >
          {isUploading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden-file-input"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden-file-input"
        />
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="upload-modal-overlay"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="upload-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="upload-modal-header">
                <h3>Share Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="close-modal-btn"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="upload-methods">
                {/* Quick Upload Options */}
                <div className="quick-upload-section">
                  <h4>Quick Upload</h4>
                  <div className="quick-upload-buttons">
                    <button
                      onClick={handleCameraClick}
                      className="quick-upload-btn camera-btn"
                    >
                      <Camera size={24} />
                      <span>Take Photo</span>
                    </button>
                    <button
                      onClick={handleFileInputClick}
                      className="quick-upload-btn gallery-btn"
                    >
                      <Image size={24} />
                      <span>From Gallery</span>
                    </button>
                    <button
                      onClick={handleFileInputClick}
                      className="quick-upload-btn files-btn"
                    >
                      <File size={24} />
                      <span>Browse Files</span>
                    </button>
                  </div>
                </div>

                {/* Drag & Drop Area */}
                <div
                  className={`drag-drop-area ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleFileInputClick}
                >
                  <Upload size={48} className="upload-icon" />
                  <h4>Drop files here or click to browse</h4>
                  <p>
                    Max {maxFiles} files, up to {formatFileSize(maxFileSize)} each
                  </p>
                  <div className="supported-types">
                    {Object.entries(FILE_CATEGORIES).map(([key, category]) => (
                      <div key={key} className="file-type-info">
                        <category.icon size={16} />
                        <span>{category.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Attachments List */}
      {attachments.length > 0 && (
        <div className="file-attachments">
          <AnimatePresence>
            {attachments.map((attachment) => (
              <motion.div
                key={attachment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`file-attachment ${attachment.uploadStatus}`}
              >
                <FileAttachmentPreview attachment={attachment} />
                <div className="attachment-info">
                  <div className="attachment-name">{attachment.name}</div>
                  <div className="attachment-details">
                    <span className="file-size">{formatFileSize(attachment.size)}</span>
                    {attachment.uploadProgress !== undefined && (
                      <span className="upload-progress">
                        {attachment.uploadProgress}%
                      </span>
                    )}
                  </div>
                  {attachment.uploadStatus === 'uploading' && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${attachment.uploadProgress || 0}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="attachment-actions">
                  {attachment.uploadStatus === 'completed' && (
                    <>
                      <button
                        className="attachment-action-btn view-btn"
                        title="View file"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="attachment-action-btn download-btn"
                        title="Download file"
                      >
                        <Download size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => onFileRemove(attachment.id)}
                    className="attachment-action-btn remove-btn"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="attachment-status">
                  {attachment.uploadStatus === 'uploading' && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {attachment.uploadStatus === 'completed' && (
                    <CheckCircle size={16} className="success-icon" />
                  )}
                  {attachment.uploadStatus === 'failed' && (
                    <AlertCircle size={16} className="error-icon" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// File Attachment Preview Component
function FileAttachmentPreview({ attachment }: { attachment: FileAttachment }) {
  const category = getFileCategory({ type: attachment.type } as File);
  const CategoryIcon = FILE_CATEGORIES[category].icon;

  if (category === 'images' && attachment.thumbnailUrl) {
    return (
      <div className="attachment-preview image-preview">
        <img
          src={attachment.thumbnailUrl}
          alt={attachment.name}
          className="preview-image"
        />
        <div className="image-overlay">
          <Image size={16} />
        </div>
      </div>
    );
  }

  if (category === 'videos' && attachment.thumbnailUrl) {
    return (
      <div className="attachment-preview video-preview">
        <img
          src={attachment.thumbnailUrl}
          alt={attachment.name}
          className="preview-image"
        />
        <div className="video-overlay">
          <Video size={20} />
        </div>
        {attachment.metadata?.duration && (
          <div className="video-duration">
            {Math.floor(attachment.metadata.duration / 60)}:
            {(attachment.metadata.duration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`attachment-preview file-preview ${category}`}>
      <CategoryIcon size={24} />
    </div>
  );
}

// Fishing-specific file sharing shortcuts
export interface FishingFileShortcutsProps {
  onCatchPhoto: () => void;
  onLocationShare: () => void;
  onWeatherShare: () => void;
  className?: string;
}

export function FishingFileShortcuts({
  onCatchPhoto,
  onLocationShare,
  onWeatherShare,
  className = ''
}: FishingFileShortcutsProps) {
  return (
    <div className={`fishing-file-shortcuts ${className}`}>
      <button onClick={onCatchPhoto} className="fishing-shortcut catch-photo">
        <Camera size={16} />
        <span>Catch Photo</span>
      </button>
      <button onClick={onLocationShare} className="fishing-shortcut location">
        <Share2 size={16} />
        <span>Share Location</span>
      </button>
      <button onClick={onWeatherShare} className="fishing-shortcut weather">
        <FileText size={16} />
        <span>Weather Report</span>
      </button>
    </div>
  );
}

// Hook for managing file uploads
export function useFileUpload() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    const newAttachments: FileAttachment[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      uploadStatus: 'pending'
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    return newAttachments;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== fileId));
  }, []);

  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setAttachments(prev => prev.map(att =>
      att.id === fileId
        ? { ...att, uploadProgress: progress, uploadStatus: 'uploading' }
        : att
    ));
  }, []);

  const markFileCompleted = useCallback((fileId: string, url: string, thumbnailUrl?: string) => {
    setAttachments(prev => prev.map(att =>
      att.id === fileId
        ? { ...att, url, thumbnailUrl, uploadStatus: 'completed', uploadProgress: 100 }
        : att
    ));
  }, []);

  const markFileFailed = useCallback((fileId: string) => {
    setAttachments(prev => prev.map(att =>
      att.id === fileId
        ? { ...att, uploadStatus: 'failed' }
        : att
    ));
  }, []);

  const clearFiles = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    uploading,
    addFiles,
    removeFile,
    updateFileProgress,
    markFileCompleted,
    markFileFailed,
    clearFiles,
    setUploading
  };
}

export default FileSharing;
