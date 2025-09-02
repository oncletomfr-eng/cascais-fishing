'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Check, CheckCheck, Eye, Clock } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

// Read Receipts Component
// Part of Task 19: Real-time Integration & SSE

export interface MessageReceipt {
  messageId: string
  userId: string
  userName?: string
  status: 'sent' | 'delivered' | 'read'
  timestamp: string
}

interface ReadReceiptStatusProps {
  messageId: string
  receipts: MessageReceipt[]
  currentUserId: string
  totalRecipients?: number
  variant?: 'icon' | 'count' | 'avatars' | 'detailed'
  className?: string
}

interface ReadReceiptListProps {
  receipts: MessageReceipt[]
  messageId: string
  maxVisible?: number
  showTimestamps?: boolean
  className?: string
}

interface ReadReceiptAvatarsProps {
  receipts: MessageReceipt[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Read receipt status icons
export function ReadReceiptIcon({ 
  status, 
  className,
  animated = true 
}: { 
  status: 'sent' | 'delivered' | 'read'
  className?: string
  animated?: boolean
}) {
  const iconProps = {
    className: cn('h-4 w-4', className)
  }

  const icons = {
    sent: {
      icon: Clock,
      color: 'text-gray-400',
      label: 'Отправлено'
    },
    delivered: {
      icon: Check,
      color: 'text-gray-500',
      label: 'Доставлено'
    },
    read: {
      icon: CheckCheck,
      color: 'text-blue-500',
      label: 'Прочитано'
    }
  }

  const config = icons[status]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(config.color)}
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={animated ? { type: 'spring', stiffness: 400, damping: 25 } : {}}
          >
            <Icon {...iconProps} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Small avatar stack for read receipts
export function ReadReceiptAvatars({
  receipts,
  maxVisible = 3,
  size = 'sm',
  className
}: ReadReceiptAvatarsProps) {
  const readReceipts = receipts.filter(r => r.status === 'read')
  const visibleReceipts = readReceipts.slice(0, maxVisible)
  const remainingCount = Math.max(0, readReceipts.length - maxVisible)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  }

  if (readReceipts.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center -space-x-1', className)}>
            <AnimatePresence mode="popLayout">
              {visibleReceipts.map((receipt, index) => (
                <motion.div
                  key={receipt.userId}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25
                  }}
                  className="relative"
                  style={{ zIndex: visibleReceipts.length - index }}
                >
                  <Avatar className={cn(
                    sizeClasses[size],
                    'border-2 border-white dark:border-gray-900'
                  )}>
                    <AvatarFallback className={textSizes[size]}>
                      {receipt.userName?.substring(0, 2).toUpperCase() || 
                       receipt.userId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {remainingCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  'flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900',
                  sizeClasses[size]
                )}
              >
                <span className={cn('font-medium text-gray-600 dark:text-gray-300', textSizes[size])}>
                  +{remainingCount}
                </span>
              </motion.div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Прочитали ({readReceipts.length})</p>
            {visibleReceipts.slice(0, 5).map((receipt) => (
              <p key={receipt.userId} className="text-xs">
                {receipt.userName || `User ${receipt.userId}`}
              </p>
            ))}
            {readReceipts.length > 5 && (
              <p className="text-xs text-muted-foreground">
                и ещё {readReceipts.length - 5}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Detailed read receipt list
export function ReadReceiptList({
  receipts,
  messageId,
  maxVisible = 10,
  showTimestamps = true,
  className
}: ReadReceiptListProps) {
  const sortedReceipts = receipts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxVisible)

  const statusIcons = {
    sent: Clock,
    delivered: Check,
    read: CheckCheck
  }

  const statusColors = {
    sent: 'text-gray-400',
    delivered: 'text-gray-500',
    read: 'text-blue-500'
  }

  const statusLabels = {
    sent: 'Отправлено',
    delivered: 'Доставлено',
    read: 'Прочитано'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium">Статус прочтения</h4>
      
      <div className="space-y-1">
        <AnimatePresence>
          {sortedReceipts.map((receipt) => {
            const Icon = statusIcons[receipt.status]
            const colorClass = statusColors[receipt.status]
            const label = statusLabels[receipt.status]
            
            return (
              <motion.div
                key={`${receipt.userId}-${receipt.status}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50"
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {receipt.userName?.substring(0, 2).toUpperCase() || 
                       receipt.userId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <span className="text-sm">
                    {receipt.userName || `User ${receipt.userId}`}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={cn('flex items-center space-x-1', colorClass)}>
                    <Icon className="h-3 w-3" />
                    <span className="text-xs">{label}</span>
                  </div>
                  
                  {showTimestamps && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(receipt.timestamp), 'HH:mm', { locale: ru })}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        
        {receipts.length > maxVisible && (
          <div className="text-xs text-muted-foreground text-center py-2">
            Показано {maxVisible} из {receipts.length}
          </div>
        )}
      </div>
    </div>
  )
}

// Main read receipt status component
export function ReadReceiptStatus({
  messageId,
  receipts,
  currentUserId,
  totalRecipients,
  variant = 'icon',
  className
}: ReadReceiptStatusProps) {
  const messageReceipts = receipts.filter(r => r.messageId === messageId)
  
  // Calculate status counts
  const statusCounts = messageReceipts.reduce((acc, receipt) => {
    acc[receipt.status] = (acc[receipt.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const readCount = statusCounts.read || 0
  const deliveredCount = statusCounts.delivered || 0
  const sentCount = statusCounts.sent || 0

  // Determine overall status for the message
  const getOverallStatus = () => {
    if (readCount > 0) return 'read'
    if (deliveredCount > 0) return 'delivered'
    return 'sent'
  }

  const overallStatus = getOverallStatus()

  // Icon variant - simple status icon
  if (variant === 'icon') {
    return (
      <div className={className}>
        <ReadReceiptIcon status={overallStatus} />
      </div>
    )
  }

  // Count variant - show read count
  if (variant === 'count') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <ReadReceiptIcon status={overallStatus} />
        {readCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {readCount}
            {totalRecipients && (
              <span>/{totalRecipients}</span>
            )}
          </span>
        )}
      </div>
    )
  }

  // Avatars variant - show user avatars who read
  if (variant === 'avatars') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <ReadReceiptIcon status={overallStatus} />
        <ReadReceiptAvatars receipts={messageReceipts} />
      </div>
    )
  }

  // Detailed variant - full breakdown
  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <ReadReceiptIcon status={overallStatus} />
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            {readCount > 0 && (
              <span className="flex items-center space-x-1">
                <CheckCheck className="h-3 w-3 text-blue-500" />
                <span>{readCount}</span>
              </span>
            )}
            {deliveredCount > 0 && (
              <span className="flex items-center space-x-1">
                <Check className="h-3 w-3 text-gray-500" />
                <span>{deliveredCount}</span>
              </span>
            )}
            {sentCount > 0 && (
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span>{sentCount}</span>
              </span>
            )}
          </div>
        </div>
        
        <ReadReceiptAvatars receipts={messageReceipts} maxVisible={5} />
      </div>
    )
  }

  return null
}

// Hook for managing read receipts
export function useReadReceipts() {
  const [receipts, setReceipts] = useState<Map<string, MessageReceipt[]>>(new Map())

  const addReceipt = (receipt: MessageReceipt) => {
    setReceipts(prev => {
      const updated = new Map(prev)
      const messageReceipts = updated.get(receipt.messageId) || []
      
      // Update existing receipt or add new one
      const existingIndex = messageReceipts.findIndex(
        r => r.userId === receipt.userId
      )
      
      if (existingIndex >= 0) {
        // Update existing receipt if new status is "higher"
        const statusPriority = { sent: 1, delivered: 2, read: 3 }
        if (statusPriority[receipt.status] > statusPriority[messageReceipts[existingIndex].status]) {
          messageReceipts[existingIndex] = receipt
        }
      } else {
        messageReceipts.push(receipt)
      }
      
      updated.set(receipt.messageId, messageReceipts)
      return updated
    })
  }

  const getReceiptsForMessage = (messageId: string): MessageReceipt[] => {
    return receipts.get(messageId) || []
  }

  const markAsRead = (messageId: string, userId: string, userName?: string) => {
    const receipt: MessageReceipt = {
      messageId,
      userId,
      userName,
      status: 'read',
      timestamp: new Date().toISOString()
    }
    addReceipt(receipt)
  }

  return {
    receipts,
    addReceipt,
    getReceiptsForMessage,
    markAsRead
  }
}
