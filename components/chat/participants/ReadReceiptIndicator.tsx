/**
 * Read Receipt Indicator Component
 * Task 17.5: Participant Management System - Read Status System
 */

'use client'

import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ReadReceipt } from '@/lib/chat/participant-types'
import { useReadReceipts, useParticipantStatus } from '@/lib/chat/participants/useParticipantStatus'
import { 
  Check, 
  CheckCheck, 
  Eye, 
  Clock,
  Users,
  MessageCircle 
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Read status types
type ReadStatus = 'unread' | 'delivered' | 'read'

// Simple read checkmarks component
interface ReadCheckmarksProps {
  status: ReadStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function ReadCheckmarks({ status, size = 'md', className }: ReadCheckmarksProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const iconClass = cn(sizeClasses[size], className)

  switch (status) {
    case 'unread':
      return <Clock className={cn(iconClass, 'text-gray-400')} />
    case 'delivered':
      return <Check className={cn(iconClass, 'text-gray-500')} />
    case 'read':
      return <CheckCheck className={cn(iconClass, 'text-blue-500')} />
    default:
      return null
  }
}

// Read receipt list for a message
interface ReadReceiptListProps {
  receipts: ReadReceipt[]
  totalParticipants: number
  showAvatars?: boolean
  compact?: boolean
  maxVisible?: number
  className?: string
}

function ReadReceiptList({
  receipts,
  totalParticipants,
  showAvatars = true,
  compact = false,
  maxVisible = 5,
  className
}: ReadReceiptListProps) {
  const { participants } = useParticipantStatus()

  const sortedReceipts = [...receipts].sort((a, b) => 
    b.readAt.getTime() - a.readAt.getTime()
  )

  const visibleReceipts = sortedReceipts.slice(0, maxVisible)
  const hiddenCount = sortedReceipts.length - maxVisible

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId)
    return participant?.name || 'Неизвестный участник'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (receipts.length === 0) {
    return (
      <div className={cn(
        'flex items-center space-x-2 text-gray-500',
        compact ? 'text-xs' : 'text-sm',
        className
      )}>
        <Eye className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        <span>Никто не прочитал</span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <CheckCheck className="w-4 h-4 text-blue-500" />
          <span className="font-medium">
            Прочитано {receipts.length} из {totalParticipants}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round((receipts.length / totalParticipants) * 100)}%
        </Badge>
      </div>

      {/* Receipt list */}
      <div className="space-y-1">
        {visibleReceipts.map((receipt) => {
          const participantName = getParticipantName(receipt.participantId)
          
          return (
            <div 
              key={receipt.participantId} 
              className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
            >
              {showAvatars && (
                <Avatar className="w-6 h-6">
                  <AvatarImage 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=random&size=24`}
                    alt={participantName}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(participantName)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {participantName}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(receipt.readAt, { 
                    addSuffix: true,
                    locale: ru 
                  })}
                </div>
              </div>

              <CheckCheck className="w-4 h-4 text-blue-500" />
            </div>
          )
        })}

        {hiddenCount > 0 && (
          <div className="text-center p-2 text-sm text-gray-500">
            +{hiddenCount} еще
          </div>
        )}
      </div>
    </div>
  )
}

// Main read receipt indicator for messages
interface MessageReadReceiptProps {
  messageId: string
  channelId: string
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function MessageReadReceipt({
  messageId,
  channelId,
  showDetails = false,
  compact = false,
  className
}: MessageReadReceiptProps) {
  const receipts = useReadReceipts(messageId, channelId)
  const { participants } = useParticipantStatus()
  
  const channelParticipants = participants.filter(p => 
    // In a real implementation, you'd filter by channel membership
    true
  )

  const readCount = receipts.length
  const totalCount = channelParticipants.length
  const readPercentage = totalCount > 0 ? (readCount / totalCount) * 100 : 0

  const getReadStatus = (): ReadStatus => {
    if (readCount === 0) return 'unread'
    if (readCount < totalCount) return 'delivered'
    return 'read'
  }

  const status = getReadStatus()

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={cn('flex items-center space-x-1', className)}>
              <ReadCheckmarks status={status} size="sm" />
              {readCount > 0 && (
                <span className="text-xs text-gray-600">{readCount}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Прочитано {readCount} из {totalCount} участников</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (showDetails) {
    return (
      <Popover>
        <PopoverTrigger>
          <div className={cn(
            'flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer',
            className
          )}>
            <ReadCheckmarks status={status} />
            <div className="text-sm">
              <div className="font-medium">
                {readCount} из {totalCount} прочитано
              </div>
              <div className="text-gray-500">
                {readPercentage.toFixed(0)}% участников
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <ReadReceiptList
            receipts={receipts}
            totalParticipants={totalCount}
            showAvatars={true}
            maxVisible={8}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <ReadCheckmarks status={status} />
      <span className="text-sm text-gray-600">
        {readCount}/{totalCount}
      </span>
    </div>
  )
}

// Read receipt summary for channel or conversation
interface ReadReceiptSummaryProps {
  channelId: string
  lastMessageId?: string
  className?: string
}

export function ReadReceiptSummary({
  channelId,
  lastMessageId,
  className
}: ReadReceiptSummaryProps) {
  const receipts = useReadReceipts(lastMessageId || '', channelId)
  const { participants } = useParticipantStatus()

  const totalParticipants = participants.length
  const readCount = receipts.length
  const unreadCount = totalParticipants - readCount

  if (!lastMessageId || totalParticipants === 0) {
    return null
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-3 bg-gray-50 rounded-lg',
      className
    )}>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <CheckCheck className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">
            {readCount} прочитали
          </span>
        </div>

        {unreadCount > 0 && (
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {unreadCount} не прочитали
            </span>
          </div>
        )}
      </div>

      <Badge variant="outline">
        {Math.round((readCount / totalParticipants) * 100)}%
      </Badge>
    </div>
  )
}

// Read receipt avatars (for showing who read a message)
interface ReadReceiptAvatarsProps {
  receipts: ReadReceipt[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ReadReceiptAvatars({
  receipts,
  maxVisible = 3,
  size = 'sm',
  className
}: ReadReceiptAvatarsProps) {
  const { participants } = useParticipantStatus()

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  const visibleReceipts = receipts.slice(0, maxVisible)
  const hiddenCount = receipts.length - maxVisible

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId)
    return participant?.name || 'Unknown'
  }

  if (receipts.length === 0) return null

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className="flex -space-x-1">
        {visibleReceipts.map((receipt, index) => {
          const participantName = getParticipantName(receipt.participantId)
          
          return (
            <TooltipProvider key={receipt.participantId}>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar 
                    className={cn(
                      sizeClasses[size],
                      'border-2 border-white'
                    )}
                    style={{ zIndex: visibleReceipts.length - index }}
                  >
                    <AvatarImage 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=10b981&color=fff&size=32`}
                      alt={participantName}
                    />
                    <AvatarFallback className="bg-green-500 text-white text-xs">
                      {participantName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{participantName} прочитал</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
        
        {hiddenCount > 0 && (
          <div className={cn(
            sizeClasses[size],
            'flex items-center justify-center border-2 border-white bg-green-600 text-white rounded-full text-xs font-medium'
          )}>
            +{hiddenCount}
          </div>
        )}
      </div>

      <CheckCheck className="w-3 h-3 text-green-500 ml-1" />
    </div>
  )
}

// Unread message indicator
interface UnreadIndicatorProps {
  unreadCount: number
  className?: string
}

export function UnreadIndicator({ unreadCount, className }: UnreadIndicatorProps) {
  if (unreadCount === 0) return null

  return (
    <Badge 
      variant="destructive"
      className={cn(
        'rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5',
        className
      )}
    >
      <span className="text-xs font-medium">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </Badge>
  )
}

// Export main components
export default MessageReadReceipt
