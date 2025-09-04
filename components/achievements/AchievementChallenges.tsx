'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Users, 
  Trophy, 
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  Calendar,
  Target,
  Award,
  Send
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

import { useAchievementComparison } from '@/hooks/useAchievementComparison';
import { AchievementWithProgress, CATEGORY_CONFIG, RARITY_CONFIG } from '@/lib/types/achievements';

// Types
interface AchievementChallenge {
  id: string;
  fromUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  toUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  achievement: AchievementWithProgress;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  progress?: {
    fromUserProgress: number;
    toUserProgress: number;
  };
}

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { id: string; name: string; avatar?: string };
  achievement: AchievementWithProgress;
  onSendChallenge: (message: string) => void;
}

interface AchievementChallengesProps {
  currentUserId: string;
  className?: string;
}

// Create Challenge Modal Component
function CreateChallengeModal({
  isOpen,
  onClose,
  targetUser,
  achievement,
  onSendChallenge
}: CreateChallengeModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    setIsSubmitting(true);
    try {
      onSendChallenge(message);
      setMessage('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const config = CATEGORY_CONFIG[achievement.category];
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Бросить вызов</h3>
              <p className="text-sm text-gray-500">Пригласите {targetUser.name} к соревнованию</p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center text-white`}>
                {React.createElement(config.icon, { className: 'w-5 h-5' })}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{achievement.name}</h4>
                <Badge variant="outline" className={`${rarityConfig.textColor} text-xs mt-1`}>
                  {React.createElement(rarityConfig.icon, { className: 'w-3 h-3 mr-1' })}
                  {rarityConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Сообщение (необязательно)</label>
            <Textarea
              placeholder="Добавьте мотивирующее сообщение..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSubmitting}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Challenge Card Component
function ChallengeCard({ 
  challenge, 
  currentUserId, 
  onAccept, 
  onDecline 
}: {
  challenge: AchievementChallenge;
  currentUserId: string;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
}) {
  const isReceiver = challenge.toUser.id === currentUserId;
  const otherUser = isReceiver ? challenge.fromUser : challenge.toUser;
  const config = CATEGORY_CONFIG[challenge.achievement.category];
  const rarityConfig = RARITY_CONFIG[challenge.achievement.rarity];

  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      label: 'Ожидание'
    },
    accepted: {
      color: 'bg-blue-100 text-blue-800', 
      icon: Target,
      label: 'В процессе'
    },
    completed: {
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      label: 'Завершен'
    },
    declined: {
      color: 'bg-red-100 text-red-800',
      icon: XCircle,
      label: 'Отклонен'
    }
  };

  const status = statusConfig[challenge.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherUser.avatar} />
              <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {isReceiver ? `${challenge.fromUser.name} бросил вам вызов` : `Вызов для ${challenge.toUser.name}`}
              </p>
              <p className="text-xs text-gray-500">
                {challenge.createdAt.toLocaleDateString('ru', { 
                  day: 'numeric', 
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          
          <Badge className={status.color}>
            {React.createElement(status.icon, { className: 'w-3 h-3 mr-1' })}
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Achievement Details */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 ${config.color} rounded-lg flex items-center justify-center text-white`}>
            {React.createElement(config.icon, { className: 'w-6 h-6' })}
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{challenge.achievement.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{challenge.achievement.description}</p>
            <Badge variant="outline" className={`${rarityConfig.textColor} text-xs mt-2`}>
              {React.createElement(rarityConfig.icon, { className: 'w-3 h-3 mr-1' })}
              {rarityConfig.label}
            </Badge>
          </div>
        </div>

        {/* Challenge Message */}
        {challenge.message && (
          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">"{challenge.message}"</p>
            </div>
          </div>
        )}

        {/* Progress (if challenge is accepted) */}
        {challenge.status === 'accepted' && challenge.progress && (
          <div className="mb-3 space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{challenge.fromUser.name}:</span>
                <span className="font-medium">
                  {challenge.progress.fromUserProgress}/{challenge.achievement.maxProgress}
                </span>
              </div>
              <Progress 
                value={(challenge.progress.fromUserProgress / challenge.achievement.maxProgress) * 100} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{challenge.toUser.name}:</span>
                <span className="font-medium">
                  {challenge.progress.toUserProgress}/{challenge.achievement.maxProgress}
                </span>
              </div>
              <Progress 
                value={(challenge.progress.toUserProgress / challenge.achievement.maxProgress) * 100} 
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {challenge.status === 'pending' && isReceiver && (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDecline(challenge.id)}
              className="flex-1"
            >
              <XCircle className="w-3 h-3 mr-2" />
              Отклонить
            </Button>
            <Button 
              size="sm"
              onClick={() => onAccept(challenge.id)}
              className="flex-1"
            >
              <CheckCircle className="w-3 h-3 mr-2" />
              Принять
            </Button>
          </div>
        )}

        {challenge.status === 'completed' && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">Челлендж завершен!</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Main Component
export function AchievementChallenges({ currentUserId, className }: AchievementChallengesProps) {
  const [challenges, setChallenges] = useState<AchievementChallenge[]>([]);
  const [activeTab, setActiveTab] = useState('received');
  const [isLoading, setIsLoading] = useState(false);

  const { 
    acceptChallenge, 
    declineChallenge, 
    getUserChallenges 
  } = useAchievementComparison({
    enableChallenges: true
  });

  // Load challenges
  useEffect(() => {
    const loadChallenges = async () => {
      setIsLoading(true);
      try {
        const userChallenges = await getUserChallenges(currentUserId);
        // Convert to proper format with mock data
        const formattedChallenges: AchievementChallenge[] = userChallenges.map((c) => ({
          ...c,
          fromUser: {
            id: c.fromUserId,
            name: c.fromUserId === currentUserId ? 'Вы' : 'Другой пользователь',
            avatar: undefined
          },
          toUser: {
            id: c.toUserId,
            name: c.toUserId === currentUserId ? 'Вы' : 'Другой пользователь',
            avatar: undefined
          },
          achievement: {
            id: c.achievementId,
            name: 'Мастер рыбалки',
            description: 'Поймайте 10 различных видов рыб',
            category: 'FISH_SPECIES' as any,
            rarity: 'RARE' as any,
            maxProgress: 10,
            progress: 3,
            unlocked: false,
            progressPercent: 30
          } as AchievementWithProgress
        }));
        setChallenges(formattedChallenges);
      } catch (error) {
        console.error('Failed to load challenges:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChallenges();
  }, [currentUserId, getUserChallenges]);

  const handleAcceptChallenge = async (challengeId: string) => {
    const success = await acceptChallenge(challengeId);
    if (success) {
      setChallenges(prev => 
        prev.map(c => c.id === challengeId ? { ...c, status: 'accepted' as const } : c)
      );
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    const success = await declineChallenge(challengeId);
    if (success) {
      setChallenges(prev => 
        prev.map(c => c.id === challengeId ? { ...c, status: 'declined' as const } : c)
      );
    }
  };

  const receivedChallenges = challenges.filter(c => c.toUser.id === currentUserId);
  const sentChallenges = challenges.filter(c => c.fromUser.id === currentUserId);

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Челленджи достижений</h2>
        <p className="text-gray-600">Соревнуйтесь с друзьями за достижения</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Входящие ({receivedChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Отправленные ({sentChallenges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : receivedChallenges.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет входящих челленджей</h3>
                  <p className="text-gray-500">
                    Когда кто-то бросит вам вызов, он появится здесь
                  </p>
                </CardContent>
              </Card>
            ) : (
              receivedChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={currentUserId}
                  onAccept={handleAcceptChallenge}
                  onDecline={handleDeclineChallenge}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          <div className="space-y-4">
            {sentChallenges.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет отправленных челленджей</h3>
                  <p className="text-gray-500">
                    Найдите друзей и бросьте им вызов в достижениях!
                  </p>
                </CardContent>
              </Card>
            ) : (
              sentChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  currentUserId={currentUserId}
                  onAccept={() => {}}
                  onDecline={() => {}}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
