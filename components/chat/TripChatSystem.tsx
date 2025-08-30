'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Chat, 
  Channel, 
  MessageList, 
  MessageInput, 
  ChannelHeader,
  ChannelList,
  Thread,
  Window,
  LoadingIndicator
} from 'stream-chat-react';
import { StreamChat as StreamChatClient } from 'stream-chat';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Users, 
  X, 
  Minimize2, 
  Maximize2, 
  Phone,
  MapPin,
  Calendar,
  Clock,
  Fish,
  Settings,
  UserPlus,
  Bell,
  BellOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Import Stream Chat styles
import 'stream-chat-react/dist/css/v2/index.css';

interface TripChatSystemProps {
  tripId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

interface ChatState {
  client: StreamChatClient | null;
  channel: any;
  isLoading: boolean;
  error: string | null;
  isMinimized: boolean;
  unreadCount: number;
  isConnected: boolean;
}

// Основной компонент системы чата для групповых поездок
export function TripChatSystem({
  tripId,
  isOpen = false,
  onToggle,
  className
}: TripChatSystemProps) {
  const { data: session, status } = useSession();
  const [chatState, setChatState] = useState<ChatState>({
    client: null,
    channel: null,
    isLoading: false,
    error: null,
    isMinimized: false,
    unreadCount: 0,
    isConnected: false
  });

  // Initialize Stream Chat client
  const initializeChat = useCallback(async () => {
    if (!session?.user?.id || status !== 'authenticated') {
      return;
    }

    setChatState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔗 Initializing Stream Chat for user:', session.user.id);

      // Get chat token from our API
      const tokenResponse = await fetch('/api/chat/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get chat token');
      }

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to get chat token');
      }

      // Initialize Stream Chat client  
      const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
      if (!apiKey) {
        throw new Error('Stream Chat API key not configured');
      }
      const client = StreamChatClient.getInstance(apiKey);
      
      // Connect user to Stream Chat
      await client.connectUser(
        {
          id: session.user.id,
          name: session.user.name || 'Anonymous User',
          image: session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || 'User')}&background=0ea5e9&color=fff`,
        },
        tokenData.token
      );

      console.log('✅ Stream Chat client initialized successfully');

      setChatState(prev => ({
        ...prev,
        client,
        isLoading: false,
        isConnected: true
      }));

      // Auto-join trip channel if tripId provided
      if (tripId) {
        await joinTripChannel(client, tripId);
      }

    } catch (error) {
      console.error('❌ Error initializing chat:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize chat',
        isConnected: false
      }));
    }
  }, [session, status, tripId]);

  // Join specific trip channel
  const joinTripChannel = useCallback(async (client: StreamChatClient, tripId: string) => {
    try {
      console.log('🚢 Joining trip channel:', tripId);

      // Call our API to join the channel
      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          action: 'join'
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to join trip channel');
      }

      // Get the channel from Stream
      const channelId = `trip-${tripId}`;
      const channel = client.channel('messaging', channelId);
      await channel.watch();

      console.log('✅ Successfully joined trip channel:', channelId);

      setChatState(prev => ({
        ...prev,
        channel,
        error: null
      }));

    } catch (error) {
      console.error('❌ Error joining trip channel:', error);
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to join trip channel'
      }));
    }
  }, []);

  // Initialize chat on component mount
  useEffect(() => {
    if (isOpen && !chatState.client) {
      initializeChat();
    }
  }, [isOpen, initializeChat, chatState.client]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatState.client) {
        console.log('🔌 Disconnecting Stream Chat client');
        chatState.client.disconnectUser();
      }
    };
  }, [chatState.client]);

  // Handle minimize/maximize
  const handleMinimize = () => {
    setChatState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  // Handle close
  const handleClose = () => {
    if (onToggle) {
      onToggle();
    }
  };

  // Loading state
  if (status === 'loading' || chatState.isLoading) {
    return (
      <ChatContainer isOpen={isOpen} isMinimized={false} onClose={handleClose}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <LoadingIndicator size={40} />
            <p className="text-sm text-gray-600">Подключение к чату...</p>
          </div>
        </div>
      </ChatContainer>
    );
  }

  // Authentication required
  if (status === 'unauthenticated') {
    return (
      <ChatContainer isOpen={isOpen} isMinimized={false} onClose={handleClose}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">Войдите в систему для доступа к чату</p>
            <Button variant="outline" onClick={handleClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </ChatContainer>
    );
  }

  // Error state
  if (chatState.error) {
    return (
      <ChatContainer isOpen={isOpen} isMinimized={false} onClose={handleClose}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <X className="h-12 w-12 text-red-400 mx-auto" />
            <p className="text-sm text-red-600">{chatState.error}</p>
            <Button variant="outline" onClick={() => initializeChat()}>
              Попробовать снова
            </Button>
          </div>
        </div>
      </ChatContainer>
    );
  }

  // Chat interface
  if (!chatState.client) {
    return null;
  }

  return (
    <Chat client={chatState.client} theme="str-chat__theme-light">
      <ChatContainer 
        isOpen={isOpen} 
        isMinimized={chatState.isMinimized} 
        onClose={handleClose}
      >
        {/* Header */}
        <ChatHeader 
          isConnected={chatState.isConnected}
          unreadCount={chatState.unreadCount}
          onMinimize={handleMinimize}
          onClose={handleClose}
          isMinimized={chatState.isMinimized}
        />

        {/* Chat Content */}
        {!chatState.isMinimized && (
          <div className="flex-1 flex">
            {tripId && chatState.channel ? (
              // Single trip channel view
              <Channel channel={chatState.channel}>
                <Window>
                  <TripChannelHeader />
                  <MessageList />
                  <MessageInput />
                </Window>
                <Thread />
              </Channel>
            ) : (
              // Channel list view
              <div className="flex-1">
                <ChannelList 
                  filters={{ 
                    type: 'messaging', 
                    members: { $in: [session?.user?.id] }
                  }}
                  sort={{ last_message_at: -1 }}
                  options={{ presence: true, state: true }}
                />
              </div>
            )}
          </div>
        )}
      </ChatContainer>
    </Chat>
  );
}

// Container component for chat UI
function ChatContainer({ 
  children, 
  isOpen, 
  isMinimized, 
  onClose 
}: { 
  children: React.ReactNode;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            height: isMinimized ? '60px' : '600px'
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-lg shadow-2xl border overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Chat header component
function ChatHeader({ 
  isConnected, 
  unreadCount, 
  onMinimize, 
  onClose, 
  isMinimized 
}: {
  isConnected: boolean;
  unreadCount: number;
  onMinimize: () => void;
  onClose: () => void;
  isMinimized: boolean;
}) {
  return (
    <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </div>
        
        <div>
          <h3 className="font-semibold text-sm">Чат поездки</h3>
          <div className="flex items-center space-x-2 text-xs opacity-90">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-400" : "bg-red-400"
            )} />
            <span>{isConnected ? 'Подключен' : 'Отключен'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMinimize}
          className="text-white hover:bg-blue-700 p-1 h-8 w-8"
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-blue-700 p-1 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Custom trip channel header
function TripChannelHeader() {
  return (
    <div className="p-4 border-b bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Fish className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-semibold text-sm">Групповая рыбалка</h4>
            <p className="text-xs text-gray-600">Cascais Marina • Завтра в 9:00</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            5/8
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Floating chat toggle button
export function ChatToggleButton({ 
  onClick, 
  unreadCount = 0, 
  className 
}: { 
  onClick: () => void; 
  unreadCount?: number;
  className?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors",
        className
      )}
    >
      <div className="relative">
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </div>
    </motion.button>
  );
}

// Hook for managing chat state
export function useTripChat(tripId?: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    unreadCount,
    toggleChat,
    openChat,
    closeChat,
    setUnreadCount
  };
}