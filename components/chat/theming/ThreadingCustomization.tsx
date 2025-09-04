'use client';

/**
 * Threading and Message Reply Customization
 * Task 20.3: Configure threading and message replies
 * 
 * Taking the role of UI/UX Designer specializing in Chat Threading Systems
 */

import React, { useState, useCallback } from 'react';
import { 
  MessageSquare, 
  Reply, 
  CornerDownRight, 
  Users, 
  Clock,
  ChevronRight,
  ChevronDown,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Types for threading system
export interface ThreadMessage {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  timestamp: Date;
  parentMessageId?: string;
  replyCount?: number;
  isThreadStart?: boolean;
  attachments?: ThreadAttachment[];
}

export interface ThreadAttachment {
  id: string;
  type: 'image' | 'file' | 'location' | 'weather';
  url?: string;
  name?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface ThreadViewProps {
  parentMessage: ThreadMessage;
  replies: ThreadMessage[];
  currentUserId: string;
  onReply: (text: string, parentId: string) => void;
  onClose: () => void;
  isOpen: boolean;
  className?: string;
}

// Custom Thread Panel Component
export function ThreadView({
  parentMessage,
  replies,
  currentUserId,
  onReply,
  onClose,
  isOpen,
  className = ''
}: ThreadViewProps) {
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleSubmitReply = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(replyText.trim(), parentMessage.id);
      setReplyText('');
      setIsReplying(false);
    }
  }, [replyText, onReply, parentMessage.id]);

  const formatTimestamp = useCallback((date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: ru });
  }, []);

  if (!isOpen) return null;

  return (
    <div className={`thread-view ${className}`}>
      {/* Thread Header */}
      <div className="thread-header">
        <div className="thread-title">
          <MessageSquare size={18} />
          <span>Thread</span>
          <div className="thread-count">
            {replies.length + 1} message{replies.length !== 0 ? 's' : ''}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="thread-close-btn"
          aria-label="Close thread"
        >
          ×
        </button>
      </div>

      {/* Thread Messages */}
      <div className="thread-messages">
        {/* Parent Message */}
        <div className="thread-message parent-message">
          <div className="message-avatar">
            {parentMessage.user.image ? (
              <img 
                src={parentMessage.user.image} 
                alt={parentMessage.user.name}
                className="avatar-image"
              />
            ) : (
              <div className="avatar-fallback">
                {parentMessage.user.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="message-content">
            <div className="message-header">
              <span className="message-author">{parentMessage.user.name}</span>
              <span className="message-timestamp">
                {formatTimestamp(parentMessage.timestamp)}
              </span>
              <div className="parent-indicator">
                <Hash size={12} />
                Thread started
              </div>
            </div>
            <div className="message-text">{parentMessage.text}</div>
            {parentMessage.attachments && parentMessage.attachments.length > 0 && (
              <div className="message-attachments">
                {parentMessage.attachments.map(attachment => (
                  <ThreadAttachmentPreview key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply Messages */}
        <div className="thread-replies">
          <AnimatePresence>
            {replies.map((reply, index) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`thread-message reply-message ${
                  reply.user.id === currentUserId ? 'own-message' : ''
                }`}
              >
                <div className="reply-indicator">
                  <CornerDownRight size={14} className="reply-arrow" />
                </div>
                
                <div className="message-avatar">
                  {reply.user.image ? (
                    <img 
                      src={reply.user.image} 
                      alt={reply.user.name}
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-fallback">
                      {reply.user.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">{reply.user.name}</span>
                    <span className="message-timestamp">
                      {formatTimestamp(reply.timestamp)}
                    </span>
                  </div>
                  <div className="message-text">{reply.text}</div>
                  {reply.attachments && reply.attachments.length > 0 && (
                    <div className="message-attachments">
                      {reply.attachments.map(attachment => (
                        <ThreadAttachmentPreview key={attachment.id} attachment={attachment} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Reply Input */}
      <div className="thread-input-container">
        {isReplying ? (
          <form onSubmit={handleSubmitReply} className="reply-form">
            <div className="reply-form-header">
              <Reply size={14} />
              <span>Replying to thread</span>
              <button 
                type="button"
                onClick={() => setIsReplying(false)}
                className="cancel-reply"
              >
                Cancel
              </button>
            </div>
            <div className="reply-input-wrapper">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to this thread..."
                className="reply-textarea"
                rows={3}
                autoFocus
              />
              <div className="reply-actions">
                <button 
                  type="submit" 
                  className="send-reply-btn"
                  disabled={!replyText.trim()}
                >
                  Send Reply
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setIsReplying(true)}
            className="start-reply-btn"
          >
            <Reply size={16} />
            Reply to thread
          </button>
        )}
      </div>
    </div>
  );
}

// Thread Preview Component (shows in main chat)
export interface ThreadPreviewProps {
  message: ThreadMessage;
  replyCount: number;
  lastReplyUser?: string;
  lastReplyTime?: Date;
  onOpenThread: (messageId: string) => void;
  className?: string;
}

export function ThreadPreview({
  message,
  replyCount,
  lastReplyUser,
  lastReplyTime,
  onOpenThread,
  className = ''
}: ThreadPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (replyCount === 0) return null;

  return (
    <div className={`thread-preview ${className}`}>
      <button
        onClick={() => onOpenThread(message.id)}
        className="thread-preview-btn"
      >
        <div className="thread-preview-content">
          <div className="thread-info">
            <MessageSquare size={14} className="thread-icon" />
            <span className="reply-count">
              {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}
            </span>
            {lastReplyUser && (
              <span className="last-reply">
                Last reply by {lastReplyUser}
              </span>
            )}
            {lastReplyTime && (
              <span className="last-reply-time">
                {formatDistanceToNow(lastReplyTime, { addSuffix: true, locale: ru })}
              </span>
            )}
          </div>
          <ChevronRight size={16} className="thread-chevron" />
        </div>
      </button>
    </div>
  );
}

// Reply Button Component (for individual messages)
export interface ReplyButtonProps {
  messageId: string;
  onStartThread: (messageId: string) => void;
  hasThread?: boolean;
  replyCount?: number;
  className?: string;
}

export function ReplyButton({
  messageId,
  onStartThread,
  hasThread = false,
  replyCount = 0,
  className = ''
}: ReplyButtonProps) {
  return (
    <button
      onClick={() => onStartThread(messageId)}
      className={`reply-button ${hasThread ? 'has-thread' : ''} ${className}`}
      title={hasThread ? `View thread (${replyCount} replies)` : 'Start thread'}
    >
      <Reply size={14} />
      {hasThread && replyCount > 0 && (
        <span className="reply-count-badge">{replyCount}</span>
      )}
    </button>
  );
}

// Attachment Preview in Thread
function ThreadAttachmentPreview({ attachment }: { attachment: ThreadAttachment }) {
  switch (attachment.type) {
    case 'image':
      return (
        <div className="attachment-image">
          <img src={attachment.url} alt={attachment.name} />
        </div>
      );
    case 'file':
      return (
        <div className="attachment-file">
          <div className="file-icon">📎</div>
          <span className="file-name">{attachment.name}</span>
          <span className="file-size">{formatFileSize(attachment.size || 0)}</span>
        </div>
      );
    case 'location':
      return (
        <div className="attachment-location">
          <div className="location-icon">📍</div>
          <span className="location-text">Location shared</span>
        </div>
      );
    case 'weather':
      return (
        <div className="attachment-weather">
          <div className="weather-icon">🌊</div>
          <span className="weather-text">Weather update</span>
        </div>
      );
    default:
      return null;
  }
}

// Utility function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Hook for managing thread state
export function useThreading() {
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadsData, setThreadsData] = useState<Record<string, ThreadMessage[]>>({});

  const openThread = useCallback((messageId: string) => {
    setActiveThread(messageId);
  }, []);

  const closeThread = useCallback(() => {
    setActiveThread(null);
  }, []);

  const addReply = useCallback((threadId: string, reply: ThreadMessage) => {
    setThreadsData(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), reply]
    }));
  }, []);

  const getThreadReplies = useCallback((threadId: string) => {
    return threadsData[threadId] || [];
  }, [threadsData]);

  return {
    activeThread,
    openThread,
    closeThread,
    addReply,
    getThreadReplies,
    threadsData
  };
}

export default ThreadView;
