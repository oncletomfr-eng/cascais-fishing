'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Users, 
  Trophy, 
  Settings,
  Info,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Типы для настроек приватности
type LeaderboardVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'ANONYMOUS';
type ProfileVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'LIMITED';

interface PrivacySettings {
  leaderboardVisibility: LeaderboardVisibility;
  profileVisibility: ProfileVisibility;
  showInCompetitions: boolean;
  showRankingHistory: boolean;
  allowAchievementSharing: boolean;
  anonymousMode: boolean;
  visibleToFriendsOnly: boolean;
  competitionOptOuts: string[];
}

interface PrivacySettingsProps {
  onSettingsChange?: (settings: PrivacySettings) => void;
  className?: string;
}

export function PrivacySettings({ onSettingsChange, className }: PrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    leaderboardVisibility: 'PUBLIC',
    profileVisibility: 'PUBLIC',
    showInCompetitions: true,
    showRankingHistory: true,
    allowAchievementSharing: true,
    anonymousMode: false,
    visibleToFriendsOnly: false,
    competitionOptOuts: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Загружаем текущие настройки
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/privacy-settings');
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        console.error('Failed to load privacy settings');
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить настройки приватности",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/privacy-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setHasChanges(false);
        onSettingsChange?.(data.settings);
        
        toast({
          title: "Настройки сохранены",
          description: "Ваши настройки приватности обновлены",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить настройки приватности",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/privacy-settings?action=reset', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setHasChanges(false);
        onSettingsChange?.(data.settings);
        
        toast({
          title: "Настройки сброшены",
          description: "Все настройки приватности сброшены к значениям по умолчанию",
        });
      } else {
        throw new Error('Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting privacy settings:', error);
      toast({
        title: "Ошибка сброса",
        description: "Не удалось сбросить настройки приватности",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getVisibilityDescription = (visibility: LeaderboardVisibility | ProfileVisibility) => {
    const descriptions = {
      PUBLIC: "Виден всем пользователям",
      FRIENDS: "Виден только друзьям",
      PRIVATE: "Не виден никому",
      ANONYMOUS: "Виден анонимно",
      LIMITED: "Ограниченная видимость",
    };
    return descriptions[visibility];
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Загрузка настроек...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <CardTitle>Настройки приватности</CardTitle>
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Есть несохраненные изменения
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Видимость в лидербордах */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <h3 className="font-medium">Видимость в рейтингах</h3>
            </div>
            <Select
              value={settings.leaderboardVisibility}
              onValueChange={(value: LeaderboardVisibility) =>
                updateSetting('leaderboardVisibility', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <div>
                      <div>Публичный</div>
                      <div className="text-xs text-muted-foreground">
                        Виден всем в рейтингах
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="ANONYMOUS">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    <div>
                      <div>Анонимный</div>
                      <div className="text-xs text-muted-foreground">
                        В рейтингах без имени
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="FRIENDS">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <div>Только друзья</div>
                      <div className="text-xs text-muted-foreground">
                        Виден только друзьям
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="PRIVATE">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <div>
                      <div>Приватный</div>
                      <div className="text-xs text-muted-foreground">
                        Не участвую в рейтингах
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getVisibilityDescription(settings.leaderboardVisibility)}
            </p>
          </div>

          <Separator />

          {/* Видимость профиля */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <h3 className="font-medium">Видимость профиля</h3>
            </div>
            <Select
              value={settings.profileVisibility}
              onValueChange={(value: ProfileVisibility) =>
                updateSetting('profileVisibility', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Публичный</SelectItem>
                <SelectItem value="LIMITED">Ограниченный</SelectItem>
                <SelectItem value="FRIENDS">Только друзья</SelectItem>
                <SelectItem value="PRIVATE">Приватный</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getVisibilityDescription(settings.profileVisibility)}
            </p>
          </div>

          <Separator />

          {/* Переключатели */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span className="font-medium">Участие в соревнованиях</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Участвовать в сезонных соревнованиях и турнирах
                </p>
              </div>
              <Switch
                checked={settings.showInCompetitions}
                onCheckedChange={(checked) => updateSetting('showInCompetitions', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">История рангов</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Показывать историю изменения позиций в рейтинге
                </p>
              </div>
              <Switch
                checked={settings.showRankingHistory}
                onCheckedChange={(checked) => updateSetting('showRankingHistory', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Поделиться достижениями</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Разрешить делиться достижениями в социальных сетях
                </p>
              </div>
              <Switch
                checked={settings.allowAchievementSharing}
                onCheckedChange={(checked) => updateSetting('allowAchievementSharing', checked)}
              />
            </div>
          </div>

          {/* Информационное сообщение */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Эти настройки влияют только на видимость в рейтингах и соревнованиях. 
              Ваша базовая активность в приложении остается неизменной.
            </AlertDescription>
          </Alert>

          {/* Кнопки управления */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={saveSettings} 
              disabled={!hasChanges || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Сохранить настройки
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetSettings}
              disabled={isSaving}
            >
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
