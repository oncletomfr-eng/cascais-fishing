'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { LeaderboardTableEnhanced } from '@/components/leaderboard/LeaderboardTableEnhanced';
import { PrivacySettings } from '@/components/profile/PrivacySettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TestPrivacyControlsPage() {
  const { data: session } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePrivacySettingsChange = (newSettings: any) => {
    console.log('Privacy settings changed:', newSettings);
    // Refresh leaderboard to show updated privacy settings
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">Тест системы приватности рейтингов</h1>
        <p className="text-gray-600 mt-2">
          Проверьте как работают настройки приватности в лидербордах
        </p>
      </div>

      {!session ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-600 mb-4">Для тестирования нужно войти в систему</p>
            <Button onClick={() => window.location.href = '/auth/signin'}>
              Войти
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Настройки приватности</TabsTrigger>
            <TabsTrigger value="leaderboard">Лидерборд</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <PrivacySettings onSettingsChange={handlePrivacySettingsChange} />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Тестовый лидерборд</CardTitle>
                <p className="text-sm text-gray-600">
                  Здесь вы можете видеть как настройки приватности влияют на отображение в рейтингах.
                </p>
              </CardHeader>
              <CardContent>
                <LeaderboardTableEnhanced
                  key={refreshKey}
                  currentUserId={session.user?.id}
                  enableEnhancedFeatures={true}
                  showPositionHistory={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Testing Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>🧪 Инструкции по тестированию</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">1. Настройки видимости:</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Публичный:</strong> Вас видно в рейтингах с именем и фото</li>
              <li><strong>Анонимный:</strong> Вас видно как "Анонимный игрок" без фото</li>
              <li><strong>Приватный:</strong> Вас не видно в публичных рейтингах</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold">2. Как тестировать:</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Измените настройки на вкладке "Настройки приватности"</li>
              <li>Перейдите на вкладку "Лидерборд" чтобы увидеть изменения</li>
              <li>Проверьте как отображается ваш профиль в рейтинге</li>
              <li>Откройте страницу в инкогнито режиме чтобы увидеть как видят анонимные пользователи</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">3. Ожидаемое поведение:</h4>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Ваш собственный профиль всегда виден вам полностью</li>
              <li>Анонимные профили показываются с замененным именем и без фото</li>
              <li>Приватные профили полностью исключены из рейтингов</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
