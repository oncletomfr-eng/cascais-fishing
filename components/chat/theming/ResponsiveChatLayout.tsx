'use client';

/**
 * Responsive Chat Layout for Mobile & Desktop
 * Task 20.5: Add responsive design and mobile optimization
 * 
 * Taking the role of UI/UX Designer specializing in Responsive Design
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Info,
  Wifi,
  WifiOff,
  RefreshCw,
  Volume2,
  VolumeX
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

// Enhanced mobile functionality hooks
export function useResponsive() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false,
    isKeyboardVisible: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      
      // Detect virtual keyboard (mobile)
      const visualHeight = window.visualViewport?.height || height;
      const isKeyboardVisible = isMobile && visualHeight < height * 0.75;
      
      // Get safe area insets for devices with notches
      const safeAreaInsets = {
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0')
      };
      
      setViewport({
        width,
        height,
        isMobile,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isPortrait: height > width,
        isKeyboardVisible,
        safeAreaInsets
      });
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    
    // Listen for visual viewport changes (keyboard, browser UI)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return viewport;
}

// Touch gestures hook for mobile interactions
export function useTouchGestures(element: React.RefObject<HTMLElement | HTMLDivElement>) {
  const [gesture, setGesture] = useState<{
    isSwipe: boolean;
    direction: 'left' | 'right' | 'up' | 'down' | null;
    startX: number;
    startY: number;
    distanceX: number;
    distanceY: number;
  }>({
    isSwipe: false,
    direction: null,
    startX: 0,
    startY: 0,
    distanceX: 0,
    distanceY: 0
  });

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    let startTouch: Touch | null = null;
    let startTime = 0;

    function handleTouchStart(e: TouchEvent) {
      startTouch = e.touches[0];
      startTime = Date.now();
      
      setGesture(prev => ({
        ...prev,
        startX: startTouch!.clientX,
        startY: startTouch!.clientY
      }));
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!startTouch) return;
      
      const endTouch = e.changedTouches[0];
      const distanceX = endTouch.clientX - startTouch.clientX;
      const distanceY = endTouch.clientY - startTouch.clientY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      const duration = Date.now() - startTime;
      
      // Detect swipe: minimum distance 50px, maximum time 300ms
      if (distance > 50 && duration < 300) {
        const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);
        const direction = isHorizontal 
          ? (distanceX > 0 ? 'right' : 'left')
          : (distanceY > 0 ? 'down' : 'up');
          
        setGesture({
          isSwipe: true,
          direction,
          startX: startTouch.clientX,
          startY: startTouch.clientY,
          distanceX,
          distanceY
        });
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element]);

  return gesture;
}

// Pull to refresh hook
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let startY = 0;
    let startScrollTop = 0;
    let isPulling = false;

    function handleTouchStart(e: TouchEvent) {
      if (!element) return;
      startY = e.touches[0].clientY;
      startScrollTop = element.scrollTop;
      isPulling = startScrollTop === 0;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isPulling) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.3, 100));
        e.preventDefault();
      }
    }

    async function handleTouchEnd() {
      if (!isPulling) return;

      if (pullDistance > 60) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
      isPulling = false;
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, pullDistance]);

  return { elementRef, isRefreshing, pullDistance };
}

// Connection status hook
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleOnline() {
      setIsOnline(true);
      setConnectionQuality('good');
    }

    function handleOffline() {
      setIsOnline(false);
      setConnectionQuality('offline');
    }

    // Test connection quality periodically
    const testConnection = async () => {
      if (!navigator.onLine) {
        setConnectionQuality('offline');
        return;
      }

      try {
        const start = Date.now();
        await fetch('/api/admin/health', { method: 'HEAD' });
        const latency = Date.now() - start;
        
        setConnectionQuality(latency < 500 ? 'good' : 'poor');
      } catch {
        setConnectionQuality('poor');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const intervalId = setInterval(testConnection, 10000); // Test every 10 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return { isOnline, connectionQuality };
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

// Enhanced Mobile Chat Layout with advanced mobile features
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const viewport = useResponsive();
  const { isOnline, connectionQuality } = useConnectionStatus();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const gesture = useTouchGestures(chatContainerRef);
  
  // Pull to refresh functionality
  const { elementRef: pullToRefreshRef, isRefreshing: isPulling, pullDistance } = usePullToRefresh(
    async () => {
      // Simulate refresh action - replace with actual refresh logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Chat refreshed');
    }
  );

  // Handle swipe gestures for tab navigation
  useEffect(() => {
    if (gesture.isSwipe && gesture.direction) {
      switch (gesture.direction) {
        case 'left':
          if (activeTab === 'chat') setActiveTab('participants');
          else if (activeTab === 'participants') setActiveTab('info');
          break;
        case 'right':
          if (activeTab === 'participants') setActiveTab('chat');
          else if (activeTab === 'info') setActiveTab('participants');
          break;
      }
    }
  }, [gesture, activeTab]);

  // Handle keyboard visibility
  useEffect(() => {
    if (viewport.isKeyboardVisible) {
      // Adjust UI when keyboard is visible
      document.documentElement.style.setProperty('--mobile-keyboard-offset', '20px');
    } else {
      document.documentElement.style.removeProperty('--mobile-keyboard-offset');
    }
  }, [viewport.isKeyboardVisible]);

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
      {/* Enhanced Mobile Header with Connection Status */}
      <div className="mobile-header" style={{ paddingTop: viewport.safeAreaInsets.top }}>
        {/* Pull to refresh indicator */}
        {(isPulling || pullDistance > 0) && (
          <div className="pull-to-refresh-indicator" style={{ height: Math.max(pullDistance, isPulling ? 40 : 0) }}>
            <div className="refresh-icon">
              <RefreshCw size={16} className={isPulling ? 'spinning' : ''} />
              <span>Pull to refresh</span>
            </div>
          </div>
        )}
        
        <div className="mobile-header-content">
          <div className="mobile-header-left">
            <button
              onClick={onToggleMinimize}
              className="mobile-minimize-btn"
              aria-label="Minimize chat"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="mobile-header-info">
              <h3>Fishing Trip Chat</h3>
              <div className="mobile-status-line">
                <span>5 participants</span>
                {/* Connection status indicator */}
                <div className={`connection-status ${connectionQuality}`}>
                  {isOnline ? (
                    <Wifi size={12} className={connectionQuality === 'good' ? 'text-green-500' : 'text-yellow-500'} />
                  ) : (
                    <WifiOff size={12} className="text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mobile-header-actions">
            <button className="mobile-action-btn" aria-label="Voice call">
              <Phone size={18} />
            </button>
            <button className="mobile-action-btn" aria-label="Video call">
              <Video size={18} />
            </button>
            <button className="mobile-action-btn" aria-label="More options">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Content with Touch Support */}
      <div 
        className="mobile-content"
        style={{ 
          paddingBottom: Math.max(viewport.safeAreaInsets.bottom, viewport.isKeyboardVisible ? 0 : 60),
          marginBottom: viewport.isKeyboardVisible ? '0' : undefined
        }}
        ref={chatContainerRef}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="mobile-chat-content"
              ref={pullToRefreshRef}
            >
              {/* Connection quality warning banner */}
              {connectionQuality === 'poor' && (
                <div className="connection-warning-banner">
                  <WifiOff size={16} />
                  <span>Poor connection - messages may be delayed</span>
                </div>
              )}
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

      {/* Enhanced Mobile Navigation with Safe Areas */}
      <div 
        className="mobile-nav" 
        style={{ 
          paddingBottom: viewport.safeAreaInsets.bottom,
          display: viewport.isKeyboardVisible ? 'none' : 'flex' 
        }}
      >
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`mobile-nav-item ${item.active ? 'active' : ''}`}
            aria-label={`Switch to ${item.label} tab`}
            aria-pressed={item.active}
            role="tab"
            style={{ minHeight: '48px', minWidth: '48px' }} // WCAG touch target size
          >
            <div className="nav-icon-container">
              <item.icon size={20} />
              {item.badge && (
                <div className="nav-badge" aria-label={`${item.badge} new items`}>
                  {item.badge}
                </div>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
        
        {/* Swipe hint for users */}
        <div className="swipe-hint">
          <span>👈 👉 Swipe to navigate</span>
        </div>
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
