'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  Smile, 
  Trophy, 
  CheckCircle,
  Users,
  Calendar
} from 'lucide-react';
import { useConfetti, confettiPresets } from '@/lib/hooks/useConfetti';

export default function TestConfettiPage() {
  const { fireConfetti, fireFromElement, fireCelebration, reset } = useConfetti();
  const [testStatus, setTestStatus] = useState<'forming' | 'confirmed'>('forming');
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleBasicConfetti = () => {
    fireConfetti();
  };

  const handleCelebration = () => {
    fireCelebration();
  };

  const handleFromButton = () => {
    if (buttonRef.current) {
      fireFromElement(buttonRef.current, confettiPresets.tripConfirmed);
    }
  };

  const handleFromCard = () => {
    if (cardRef.current) {
      fireFromElement(cardRef.current, {
        particleCount: 150,
        spread: 120,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899']
      });
    }
  };

  const handleTripConfirmation = () => {
    setTestStatus('confirmed');
    // Имитируем подтверждение группы с конфетти
    fireCelebration();
    
    setTimeout(() => {
      if (cardRef.current) {
        fireFromElement(cardRef.current, confettiPresets.tripConfirmed);
      }
    }, 1000);
  };

  const resetDemo = () => {
    reset();
    setTestStatus('forming');
  };

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-bold text-center mb-8 text-gray-900"
      >
        🎉 Тестирование Конфетти Анимаций
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center text-gray-600 mb-8 max-w-2xl mx-auto"
      >
        Тестирование canvas-confetti анимаций для celebration эффектов при подтверждении групповых поездок
      </motion.p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Панель управления */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" /> Панель управления
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={handleBasicConfetti} className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Базовое конфетти
                </Button>
                
                <Button 
                  ref={buttonRef}
                  onClick={handleFromButton} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  От этой кнопки
                </Button>
                
                <Button onClick={handleCelebration} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Smile className="w-4 h-4 mr-2" />
                  Celebration
                </Button>
                
                <Button onClick={handleFromCard} className="w-full bg-orange-600 hover:bg-orange-700">
                  <Zap className="w-4 h-4 mr-2" />
                  От карточки
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Тест подтверждения группы</h3>
                <div className="space-y-3">
                  <Button 
                    onClick={handleTripConfirmation} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={testStatus === 'confirmed'}
                  >
                    {testStatus === 'forming' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Подтвердить группу
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 mr-2" />
                        Группа подтверждена!
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={resetDemo} variant="outline" className="w-full">
                    Сбросить демо
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Демо карточка групповой поездки */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card 
            ref={cardRef}
            className={`shadow-lg transition-all duration-500 ${
              testStatus === 'confirmed' ? 'ring-4 ring-green-200 ring-opacity-60' : ''
            }`}
          >
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Групповая рыбалка
                </span>
                <Badge className={
                  testStatus === 'confirmed' 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }>
                  {testStatus === 'confirmed' ? 'Подтверждена' : 'Набирается'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Участники</span>
                <span className="font-medium">
                  {testStatus === 'confirmed' ? '8/8' : '4/8'}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    testStatus === 'confirmed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  initial={{ width: '50%' }}
                  animate={{ 
                    width: testStatus === 'confirmed' ? '100%' : '50%' 
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">€95</p>
                  <p className="text-xs text-muted-foreground">за человека</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {testStatus === 'confirmed' ? 'Группа готова!' : '4 места свободно'}
                  </span>
                </div>
              </div>
              
              {testStatus === 'confirmed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
                >
                  <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-semibold">
                    Поздравляем! Группа успешно сформирована!
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    Капитан свяжется с участниками в ближайшее время
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Информация о canvas-confetti */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-12"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-center">
              📚 О canvas-confetti интеграции
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">✨ Реализованные функции:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Автоматическое конфетти при подтверждении групп</li>
                  <li>• WebSocket реал-тайм триггеры</li>
                  <li>• Celebration анимации для UX psychology</li>
                  <li>• Кастомные цвета в стиле fishing app</li>
                  <li>• Конфетти от конкретных элементов</li>
                  <li>• Поддержка reduced motion</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">🎯 UX преимущества:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Peak-End Rule: яркий финал при подтверждении</li>
                  <li>• Положительные эмоции = больше конверсий</li>
                  <li>• Социальное доказательство успеха</li>
                  <li>• Мотивация к повторным бронированиям</li>
                  <li>• Празднование достижения группы</li>
                  <li>• Высокотехнологичный современный опыт</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-center text-sm text-gray-500">
                <strong>Библиотека:</strong> canvas-confetti | 
                <strong> Trust Score:</strong> 10/10 | 
                <strong> Размер:</strong> ~15KB gzipped
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
