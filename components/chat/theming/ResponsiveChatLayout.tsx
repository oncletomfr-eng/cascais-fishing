'use client';

/**
 * Responsive Chat Layout for Mobile & Desktop
 * Task 20.5: Add responsive design and mobile optimization
 * 
 * Taking the role of UI/UX Designer specializing in Responsive Design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  X, 
  MessageSquare, 
  Users, 
  Settings, 
  Minimize2, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Phone,
  Video,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface ChatLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  participants?: React.ReactNode;
  className?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  showParticipants?: boolean;
  onToggleParticipants?: () => void;
}

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
  active?: boolean;
  onClick: () => void;
}

// Hook for detecting device type and screen size
export function useResponsive() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isPortrait: height > width
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}

// Main Responsive Chat Layout
export function ResponsiveChatLayout({
  children,
  sidebar,
  header,
  participants,
  className = '',
  isMinimized = false,
  onToggleMinimize,
  showParticipants = false,
  onToggleParticipants
}: ChatLayoutProps) {
  const viewport = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on desktop
  useEffect(() => {
    if (viewport.isDesktop) {
      setMobileMenuOpen(false);
      setSidebarOpen(false);
    }
  }, [viewport.isDesktop]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (viewport.isMobile) {
    return (
      <MobileChatLayout
        className={className}
        isMinimized={isMinimized}
        onToggleMinimize={onToggleMinimize}
        showParticipants={showParticipants}
        onToggleParticipants={onToggleParticipants}
      >
        {children}
      </MobileChatLayout>
    );
  }

  if (viewport.isTablet) {
    return (
      <TabletChatLayout
        className={className}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showParticipants={showParticipants}
        onToggleParticipants={onToggleParticipants}
      >
        {children}
      </TabletChatLayout>
    );
  }

  return (
    <DesktopChatLayout
      className={className}
      sidebar={sidebar}
      header={header}
      participants={participants}
      isMinimized={isMinimized}
      onToggleMinimize={onToggleMinimize}
      showParticipants={showParticipants}
      onToggleParticipants={onToggleParticipants}
    >
      {children}
    </DesktopChatLayout>
  );
}

// Desktop Chat Layout
function DesktopChatLayout({
  children,
  sidebar,
  header,
  participants,
  className,
  isMinimized,
  onToggleMinimize,
  showParticipants,
  onToggleParticipants
}: ChatLayoutProps) {
  return (
    <div className={`desktop-chat-layout ${isMinimized ? 'minimized' : ''} ${className}`}>
      {/* Sidebar */}
      {sidebar && !isMinimized && (
        <motion.div
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          exit={{ x: -280 }}
          className="chat-sidebar desktop-sidebar"
        >
          {sidebar}
        </motion.div>
      )}

      {/* Main Chat Area */}
      <div className="chat-main-area">
        {/* Header */}
        {header && (
          <div className="chat-header desktop-header">
            {header}
            <div className="header-actions">
              <button
                onClick={onToggleParticipants}
                className={`header-action-btn ${showParticipants ? 'active' : ''}`}
                title="Toggle participants"
              >
                <Users size={18} />
              </button>
              <button
                onClick={onToggleMinimize}
                className="header-action-btn"
                title={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Chat Content */}
        <div className="chat-content">
          {children}
        </div>
      </div>

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && participants && !isMinimized && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="chat-participants desktop-participants"
          >
            {participants}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tablet Chat Layout
function TabletChatLayout({
  children,
  className,
  sidebarOpen,
  setSidebarOpen,
  showParticipants,
  onToggleParticipants
}: {
  children: React.ReactNode;
  className: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showParticipants: boolean;
  onToggleParticipants?: () => void;
}) {
  return (
    <div className={`tablet-chat-layout ${className}`}>
      {/* Overlay */}
      <AnimatePresence>
        {(sidebarOpen || showParticipants) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="tablet-overlay"
            onClick={() => {
              setSidebarOpen(false);
              onToggleParticipants?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="tablet-header">
        <button
          onClick={() => setSidebarOpen(true)}
          className="tablet-menu-btn"
        >
          <Menu size={20} />
        </button>
        <div className="tablet-header-title">
          <MessageSquare size={18} />
          <span>Fishing Chat</span>
        </div>
        <div className="tablet-header-actions">
          <button
            onClick={onToggleParticipants}
            className={`tablet-action-btn ${showParticipants ? 'active' : ''}`}
          >
            <Users size={18} />
          </button>
          <button className="tablet-action-btn">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="tablet-content">
        {children}
      </div>

      {/* Sliding Participants Panel */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="tablet-participants-panel"
          >
            <div className="participants-header">
              <h3>Participants</h3>
              <button
                onClick={onToggleParticipants}
                className="close-participants-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="participants-content">
              {/* Participants content would go here */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile Chat Layout
function MobileChatLayout({
  children,
  className,
  isMinimized,
  onToggleMinimize,
  showParticipants,
  onToggleParticipants
}: {
  children: React.ReactNode;
  className: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  showParticipants?: boolean;
  onToggleParticipants?: () => void;
}) {
  const [activeTab, setActiveTab] = useState('chat');

  const mobileNavItems: MobileNavItem[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      active: activeTab === 'chat',
      onClick: () => setActiveTab('chat')
    },
    {
      id: 'participants',
      label: 'People',
      icon: Users,
      badge: 5, // Example participant count
      active: activeTab === 'participants',
      onClick: () => setActiveTab('participants')
    },
    {
      id: 'info',
      label: 'Info',
      icon: Info,
      active: activeTab === 'info',
      onClick: () => setActiveTab('info')
    }
  ];

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`mobile-chat-minimized ${className}`}
        onClick={onToggleMinimize}
      >
        <div className="minimized-chat-icon">
          <MessageSquare size={24} />
          <div className="minimized-badge">3</div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`mobile-chat-layout ${className}`}>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-left">
          <button
            onClick={onToggleMinimize}
            className="mobile-minimize-btn"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="mobile-header-info">
            <h3>Fishing Trip Chat</h3>
            <p>5 participants</p>
          </div>
        </div>
        <div className="mobile-header-actions">
          <button className="mobile-action-btn">
            <Phone size={18} />
          </button>
          <button className="mobile-action-btn">
            <Video size={18} />
          </button>
          <button className="mobile-action-btn">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="mobile-content">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="mobile-chat-content"
            >
              {children}
            </motion.div>
          )}
          {activeTab === 'participants' && (
            <motion.div
              key="participants"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="mobile-participants-content"
            >
              <div className="participants-list-mobile">
                {/* Participants would be rendered here */}
                <div className="participant-item">
                  <div className="participant-avatar">👤</div>
                  <div className="participant-info">
                    <div className="participant-name">Captain John</div>
                    <div className="participant-status">Online</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="mobile-info-content"
            >
              <div className="trip-info">
                <h4>Trip Information</h4>
                <div className="info-item">
                  <span>📅 Date:</span>
                  <span>Today, 6:00 AM</span>
                </div>
                <div className="info-item">
                  <span>📍 Location:</span>
                  <span>Cascais Marina</span>
                </div>
                <div className="info-item">
                  <span>🌊 Conditions:</span>
                  <span>Perfect</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Navigation */}
      <div className="mobile-nav">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`mobile-nav-item ${item.active ? 'active' : ''}`}
          >
            <div className="nav-icon-container">
              <item.icon size={20} />
              {item.badge && (
                <div className="nav-badge">{item.badge}</div>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Chat Message Bubble with responsive design
export interface ResponsiveMessageBubbleProps {
  message: string;
  isOwn: boolean;
  timestamp: Date;
  avatar?: string;
  userName?: string;
  reactions?: string[];
  onReact?: (emoji: string) => void;
  className?: string;
}

export function ResponsiveMessageBubble({
  message,
  isOwn,
  timestamp,
  avatar,
  userName,
  reactions = [],
  onReact,
  className = ''
}: ResponsiveMessageBubbleProps) {
  const viewport = useResponsive();
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className={`responsive-message-bubble ${isOwn ? 'own-message' : 'other-message'} ${className}`}>
      {!isOwn && !viewport.isMobile && (
        <div className="message-avatar">
          {avatar ? (
            <img src={avatar} alt={userName} />
          ) : (
            <div className="avatar-fallback">
              {userName?.charAt(0) || '?'}
            </div>
          )}
        </div>
      )}

      <div className="message-content">
        {!isOwn && viewport.isMobile && (
          <div className="message-header-mobile">
            <span className="sender-name">{userName}</span>
            <span className="message-time">
              {timestamp.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}

        <div className="message-bubble">
          <p className="message-text">{message}</p>
          {!viewport.isMobile && (
            <span className="message-timestamp">
              {timestamp.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>

        {reactions.length > 0 && (
          <div className="message-reactions">
            {reactions.map((reaction, index) => (
              <span key={index} className="reaction">
                {reaction}
              </span>
            ))}
          </div>
        )}
      </div>

      {viewport.isMobile && (
        <button
          className="mobile-message-actions"
          onClick={() => setShowReactions(!showReactions)}
        >
          <MoreVertical size={14} />
        </button>
      )}
    </div>
  );
}

export default ResponsiveChatLayout;
