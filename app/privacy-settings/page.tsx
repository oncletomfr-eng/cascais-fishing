'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PrivacySettings } from '@/components/profile/PrivacySettings';
import { useSession } from 'next-auth/react';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Показываем загрузку пока проверяем сессию
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Перенаправляем на логин если не авторизован
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleSettingsChange = (newSettings: any) => {
    console.log('Privacy settings updated:', newSettings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Настройки приватности
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Управляйте видимостью вашего профиля и участием в рейтингах. 
              Вы можете настроить кто видит ваши достижения и активность в приложении.
            </p>
          </div>
        </motion.div>

        {/* User Info Card */}
        {session?.user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {session.user.image && (
                    <img 
                      src={session.user.image} 
                      alt={session.user.name || ''}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{session.user.name}</p>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Privacy Settings Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PrivacySettings onSettingsChange={handleSettingsChange} />
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                🛡️ О приватности
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Публичный профиль:</strong> Ваше имя, фото и статистика видны всем пользователям в рейтингах и профиле.
                </p>
                <p>
                  <strong>Анонимный режим:</strong> Вы участвуете в рейтингах, но ваше имя и фото заменены на "Анонимный игрок".
                </p>
                <p>
                  <strong>Только друзья:</strong> Профиль виден только вашим друзьям (функция в разработке).
                </p>
                <p>
                  <strong>Приватный профиль:</strong> Вы не участвуете в публичных рейтингах, профиль скрыт.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
