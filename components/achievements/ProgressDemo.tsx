/**
 * Progress Animation Demo - Comprehensive demonstration of progress tracking features
 * Part of Task 9.2: Progress Tracking & Animations  
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Play, Pause, RotateCcw, TrendingUp, Target,
  Fish, Trophy, Clock, Zap, Calendar
} from 'lucide-react'
import { getIconComponent } from '@/lib/utils/icon-mapper'
import {
  CircularProgressBar,
  LinearProgressBar, 
  ProgressHistory,
  MotivationalMessage
} from './AnimatedProgress'

// Demo data
const ACHIEVEMENT_DEMOS = {
  fishSpecies: {
    label: 'Виды рыб',
    current: 7,
    max: 15,
    color: '#3b82f6',
    unit: 'видов',
    milestones: [
      { value: 3, label: 'Новичок', unlocked: true, unlockedAt: new Date('2024-07-10') },
      { value: 7, label: 'Любитель', unlocked: true, unlockedAt: new Date('2024-08-15') },
      { value: 10, label: 'Эксперт', unlocked: false },
      { value: 15, label: 'Мастер', unlocked: false }
    ]
  },
  techniques: {
    label: 'Техники рыбалки',
    current: 5,
    max: 8,
    color: '#10b981',
    unit: 'техник',
    milestones: [
      { value: 2, label: 'Старт', unlocked: true, unlockedAt: new Date('2024-07-15') },
      { value: 4, label: 'Прогресс', unlocked: true, unlockedAt: new Date('2024-08-01') },
      { value: 6, label: 'Продвинутый', unlocked: false },
      { value: 8, label: 'Профи', unlocked: false }
    ]
  }
}

// Progress history mock data
const PROGRESS_HISTORY = [
  { date: new Date('2024-07-01'), value: 1, event: 'Первая рыба' },
  { date: new Date('2024-07-10'), value: 3, milestone: 'Новичок' },
  { date: new Date('2024-07-15'), value: 4, event: 'Новая техника' },
  { date: new Date('2024-08-01'), value: 5, event: 'Троллинг освоен' },
  { date: new Date('2024-08-10'), value: 6, event: 'Командная рыбалка' },
  { date: new Date('2024-08-15'), value: 7, milestone: 'Любитель' },
  { date: new Date('2024-08-25'), value: 8, event: 'Новое место' },
  { date: new Date('2024-09-01'), value: 9, event: 'Сегодня' }
]

export default function ProgressDemo() {
  const [selectedDemo, setSelectedDemo] = useState<keyof typeof ACHIEVEMENT_DEMOS>('fishSpecies')
  const [animationRunning, setAnimationRunning] = useState(true)
  const [manualProgress, setManualProgress] = useState([50])
  const [lastMilestone, setLastMilestone] = useState<string | undefined>()
  
  const currentDemo = ACHIEVEMENT_DEMOS[selectedDemo]
  const percentage = (currentDemo.current / currentDemo.max) * 100
  
  const resetProgress = () => {
    Object.values(ACHIEVEMENT_DEMOS).forEach(demo => {
      demo.current = Math.floor(demo.max * 0.3) // Reset to 30%
      demo.milestones.forEach((milestone, index) => {
        milestone.unlocked = index < 2 // Unlock first 2 milestones
      })
    })
    setLastMilestone(undefined)
  }
  
  const toggleAnimation = () => {
    setAnimationRunning(!animationRunning)
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Демонстрация анимированного прогресса
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <Button
                onClick={toggleAnimation}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {animationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {animationRunning ? 'Пауза' : 'Запуск'}
              </Button>
              
              <Button
                onClick={resetProgress}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Сброс
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Категория:</span>
              <div className="flex gap-1">
                {Object.entries(ACHIEVEMENT_DEMOS).map(([key, demo]) => (
                  <Button
                    key={key}
                    onClick={() => setSelectedDemo(key as keyof typeof ACHIEVEMENT_DEMOS)}
                    variant={selectedDemo === key ? "default" : "outline"}
                    size="sm"
                  >
                    {demo.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivational Message */}
      <MotivationalMessage 
        percentage={percentage} 
        milestoneReached={lastMilestone}
      />
      
      {/* Progress Demonstrations */}
      <Tabs defaultValue="circular" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="circular" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Круговой
          </TabsTrigger>
          <TabsTrigger value="linear" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Линейный
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            История
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Ручной
          </TabsTrigger>
        </TabsList>
        
        {/* Circular Progress Tab */}
        <TabsContent value="circular">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(ACHIEVEMENT_DEMOS).map(([key, demo]) => {
              const isSelected = key === selectedDemo
              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDemo(key as keyof typeof ACHIEVEMENT_DEMOS)}
                  >
                    <CardContent className="p-6 flex flex-col items-center space-y-4">
                      <CircularProgressBar
                        progress={demo}
                        milestones={demo.milestones}
                        size="lg"
                        animate={animationRunning}
                      />
                      
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">{demo.label}</h3>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {demo.milestones.filter(m => m.unlocked).map((milestone, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              🏆 {milestone.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>
        
        {/* Linear Progress Tab */}
        <TabsContent value="linear">
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(ACHIEVEMENT_DEMOS).map(([key, demo]) => (
              <Card key={key}>
                <CardContent className="p-6">
                  <LinearProgressBar
                    progress={demo}
                    milestones={demo.milestones}
                    animate={animationRunning}
                    showMilestones={true}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Progress History Tab */}
        <TabsContent value="history">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressHistory 
              history={PROGRESS_HISTORY}
              maxValue={15}
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Последние события
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {PROGRESS_HISTORY.slice(-5).reverse().map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        {item.milestone ? <Trophy className="w-4 h-4 text-yellow-600" /> : React.createElement(getIconComponent('Fish'), { className: "w-4 h-4 text-blue-600" })}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.milestone ? `🏆 ${item.milestone}` : item.event}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.date.toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.value}/15
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Manual Control Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Ручное управление прогрессом
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-20">Прогресс:</span>
                  <Slider
                    value={manualProgress}
                    onValueChange={setManualProgress}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-12">{manualProgress[0]}%</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center space-y-4">
                    <h4 className="font-medium">Круговой индикатор</h4>
                    <CircularProgressBar
                      progress={{
                        current: manualProgress[0],
                        max: 100,
                        label: 'Тестовый прогресс',
                        color: '#6366f1'
                      }}
                      size="xl"
                      animate={true}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Линейный индикатор</h4>
                    <LinearProgressBar
                      progress={{
                        current: manualProgress[0],
                        max: 100,
                        label: 'Ручное управление',
                        unit: 'пунктов',
                        color: '#6366f1'
                      }}
                      milestones={[
                        { value: 25, label: '¼', unlocked: manualProgress[0] >= 25 },
                        { value: 50, label: '½', unlocked: manualProgress[0] >= 50 },
                        { value: 75, label: '¾', unlocked: manualProgress[0] >= 75 },
                        { value: 100, label: 'Финиш', unlocked: manualProgress[0] >= 100 }
                      ]}
                      animate={true}
                    />
                    
                    <MotivationalMessage percentage={manualProgress[0]} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}