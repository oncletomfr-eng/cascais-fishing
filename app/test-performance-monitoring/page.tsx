/**
 * Performance Monitoring Demo Page
 * Task 17.6: Chat System Testing & Performance - Performance Monitoring Demo
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { addDays } from 'date-fns'
import { ParticipantList } from '@/components/chat/participants/ParticipantList'
import { ChannelTypingIndicator } from '@/components/chat/participants/TypingIndicator'
import { ParticipantStatusService } from '@/lib/chat/participants/ParticipantStatusService'
import { ParticipantStatusProvider } from '@/lib/chat/participants/useParticipantStatus'
import { PhaseTransitionContainer } from '@/components/transition/PhaseTransitionContainer'
import { createChatParticipant } from '@/components/chat/participants'
import {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  HardDrive,
  Monitor,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  MessageCircle,
  Wifi,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Download,
  Gauge
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Button
} from '@/components/ui/button'
import {
  Badge
} from '@/components/ui/badge'
import {
  Progress
} from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Switch
} from '@/components/ui/switch'
import {
  Label
} from '@/components/ui/label'
import {
  Slider
} from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

// Performance metrics interfaces
interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  cpuUsage: number
  fps: number
  networkLatency: number
  participantCount: number
  messageCount: number
  errors: number
  warnings: number
}

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface NetworkMetrics {
  latency: number
  throughput: number
  packetsLost: number
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected'
}

// Performance monitoring hook
function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    fps: 0,
    networkLatency: 0,
    participantCount: 0,
    messageCount: 0,
    errors: 0,
    warnings: 0
  })

  const [isMonitoring, setIsMonitoring] = useState(false)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const rafId = useRef<number>()

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
    
    const updateMetrics = () => {
      const now = performance.now()
      const deltaTime = now - lastTime.current
      
      if (deltaTime >= 1000) {
        const fps = (frameCount.current * 1000) / deltaTime
        
        // Get memory info if available
        const memory = (performance as any).memory as MemoryInfo | undefined
        const memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0
        
        // Simulate CPU usage (in real app, this would come from actual monitoring)
        const cpuUsage = Math.random() * 30 + 10
        
        // Simulate network latency
        const networkLatency = Math.random() * 50 + 20
        
        setMetrics(prev => ({
          ...prev,
          fps: Math.round(fps),
          memoryUsage: Math.round(memoryUsage),
          cpuUsage: Math.round(cpuUsage),
          networkLatency: Math.round(networkLatency),
          renderTime: deltaTime / frameCount.current
        }))
        
        frameCount.current = 0
        lastTime.current = now
      }
      
      frameCount.current++
      
      if (isMonitoring) {
        rafId.current = requestAnimationFrame(updateMetrics)
      }
    }
    
    updateMetrics()
  }, [isMonitoring])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
  }, [])

  const updateMetric = useCallback((key: keyof PerformanceMetrics, value: number) => {
    setMetrics(prev => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    if (isMonitoring) {
      startMonitoring()
    } else {
      stopMonitoring()
    }
    
    return stopMonitoring
  }, [isMonitoring, startMonitoring, stopMonitoring])

  return {
    metrics,
    isMonitoring,
    startMonitoring: () => setIsMonitoring(true),
    stopMonitoring: () => setIsMonitoring(false),
    updateMetric
  }
}

// Performance stress test component
function PerformanceStressTest({ 
  onMetricsUpdate 
}: { 
  onMetricsUpdate: (key: keyof PerformanceMetrics, value: number) => void 
}) {
  const [participantCount, setParticipantCount] = useState(20)
  const [updateFrequency, setUpdateFrequency] = useState(1000)
  const [isStressTesting, setIsStressTesting] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  const generateParticipants = useCallback((count: number) => {
    return Array.from({ length: count }, (_, i) => 
      createChatParticipant(
        `stress-user-${i}`, 
        `Stress User ${i}`, 
        i === 0 ? 'captain' : 'participant',
        {
          status: ['online', 'away', 'busy', 'offline'][i % 4] as any,
          isTyping: Math.random() > 0.8,
          lastSeen: new Date(Date.now() - Math.random() * 3600000)
        }
      )
    )
  }, [])

  const startStressTest = useCallback(() => {
    setIsStressTesting(true)
    
    // Generate initial participants
    const initialParticipants = generateParticipants(participantCount)
    setParticipants(initialParticipants)
    onMetricsUpdate('participantCount', participantCount)
    
    // Start updating participants
    intervalRef.current = setInterval(() => {
      const startTime = performance.now()
      
      setParticipants(prev => 
        prev.map(p => ({
          ...p,
          status: ['online', 'away', 'busy', 'offline'][Math.floor(Math.random() * 4)],
          isTyping: Math.random() > 0.9,
          lastSeen: new Date()
        }))
      )
      
      const renderTime = performance.now() - startTime
      onMetricsUpdate('renderTime', renderTime)
    }, updateFrequency)
  }, [participantCount, updateFrequency, generateParticipants, onMetricsUpdate])

  const stopStressTest = useCallback(() => {
    setIsStressTesting(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setParticipants([])
    onMetricsUpdate('participantCount', 0)
  }, [onMetricsUpdate])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Stress Testing
        </CardTitle>
        <CardDescription>
          Test performance under high load conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Participant Count: {participantCount}</Label>
            <Slider
              value={[participantCount]}
              onValueChange={([value]) => setParticipantCount(value)}
              max={1000}
              min={10}
              step={10}
              disabled={isStressTesting}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Update Frequency: {updateFrequency}ms</Label>
            <Slider
              value={[updateFrequency]}
              onValueChange={([value]) => setUpdateFrequency(value)}
              max={5000}
              min={100}
              step={100}
              disabled={isStressTesting}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isStressTesting ? (
            <Button onClick={startStressTest} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start Stress Test
            </Button>
          ) : (
            <Button onClick={stopStressTest} variant="destructive" className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Stop Test
            </Button>
          )}
          
          <Button 
            onClick={() => {
              setParticipantCount(20)
              setUpdateFrequency(1000)
            }}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        
        {participants.length > 0 && (
          <div className="mt-4 max-h-64 overflow-auto border rounded-md p-2">
            <ParticipantStatusProvider>
              <ParticipantList
                participants={participants}
                currentUserId="stress-user-0"
                onAction={() => {}}
                showSearch={true}
                showFilters={true}
              />
            </ParticipantStatusProvider>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Real-time metrics dashboard
function MetricsDashboard({ metrics }: { metrics: PerformanceMetrics }) {
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-500'
    if (value <= thresholds.warning) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* FPS */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">FPS</p>
              <p className={`text-2xl font-bold ${getStatusColor(60 - metrics.fps, { good: 10, warning: 30 })}`}>
                {metrics.fps}
              </p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress 
            value={Math.min(metrics.fps, 60)} 
            max={60} 
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Memory</p>
              <p className={`text-2xl font-bold ${getStatusColor(metrics.memoryUsage, { good: 50, warning: 80 })}`}>
                {metrics.memoryUsage.toFixed(1)}%
              </p>
            </div>
            <HardDrive className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress 
            value={metrics.memoryUsage} 
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* CPU Usage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CPU</p>
              <p className={`text-2xl font-bold ${getStatusColor(metrics.cpuUsage, { good: 30, warning: 60 })}`}>
                {metrics.cpuUsage.toFixed(1)}%
              </p>
            </div>
            <Cpu className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress 
            value={metrics.cpuUsage} 
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Network Latency */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Latency</p>
              <p className={`text-2xl font-bold ${getStatusColor(metrics.networkLatency, { good: 50, warning: 100 })}`}>
                {metrics.networkLatency}ms
              </p>
            </div>
            {metrics.networkLatency > 100 ? (
              <WifiOff className="h-8 w-8 text-red-500" />
            ) : (
              <Wifi className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <Progress 
            value={Math.min(metrics.networkLatency, 200)} 
            max={200}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Render Time */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Render Time</p>
              <p className={`text-2xl font-bold ${getStatusColor(metrics.renderTime, { good: 16, warning: 32 })}`}>
                {metrics.renderTime.toFixed(1)}ms
              </p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress 
            value={Math.min(metrics.renderTime, 100)} 
            max={100}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Participants</p>
              <p className="text-2xl font-bold">
                {metrics.participantCount}
              </p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress 
            value={Math.min(metrics.participantCount, 1000)} 
            max={1000}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Messages</p>
              <p className="text-2xl font-bold">
                {metrics.messageCount}
              </p>
            </div>
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <Progress 
            value={Math.min(metrics.messageCount, 10000)} 
            max={10000}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Errors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Errors</p>
              <p className={`text-2xl font-bold ${metrics.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.errors}
              </p>
            </div>
            {metrics.errors > 0 ? (
              <AlertTriangle className="h-8 w-8 text-red-500" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-500" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Performance alerts
function PerformanceAlerts({ metrics }: { metrics: PerformanceMetrics }) {
  const alerts = useMemo(() => {
    const alerts = []
    
    if (metrics.fps < 30) {
      alerts.push({
        type: 'error' as const,
        title: 'Low Frame Rate',
        description: `Frame rate dropped to ${metrics.fps} FPS. Consider reducing participant count or update frequency.`
      })
    }
    
    if (metrics.memoryUsage > 80) {
      alerts.push({
        type: 'error' as const,
        title: 'High Memory Usage',
        description: `Memory usage is at ${metrics.memoryUsage.toFixed(1)}%. Risk of performance degradation.`
      })
    }
    
    if (metrics.cpuUsage > 70) {
      alerts.push({
        type: 'warning' as const,
        title: 'High CPU Usage',
        description: `CPU usage is at ${metrics.cpuUsage.toFixed(1)}%. Application may become unresponsive.`
      })
    }
    
    if (metrics.networkLatency > 100) {
      alerts.push({
        type: 'warning' as const,
        title: 'High Network Latency',
        description: `Network latency is ${metrics.networkLatency}ms. Real-time features may be delayed.`
      })
    }
    
    if (metrics.renderTime > 32) {
      alerts.push({
        type: 'warning' as const,
        title: 'Slow Rendering',
        description: `Render time is ${metrics.renderTime.toFixed(1)}ms. Interface may feel sluggish.`
      })
    }
    
    return alerts
  }, [metrics])

  if (alerts.length === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Performance OK</AlertTitle>
        <AlertDescription>
          All performance metrics are within acceptable ranges.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

export default function PerformanceMonitoringPage() {
  const { metrics, isMonitoring, startMonitoring, stopMonitoring, updateMetric } = usePerformanceMonitor()
  const [autoExport, setAutoExport] = useState(false)
  const [exportInterval, setExportInterval] = useState(30) // seconds
  const metricsHistory = useRef<PerformanceMetrics[]>([])

  // Export performance data
  const exportMetrics = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      history: metricsHistory.current.slice(-100), // Last 100 readings
      summary: {
        avgFps: metricsHistory.current.reduce((sum, m) => sum + m.fps, 0) / metricsHistory.current.length,
        avgMemory: metricsHistory.current.reduce((sum, m) => sum + m.memoryUsage, 0) / metricsHistory.current.length,
        avgCpu: metricsHistory.current.reduce((sum, m) => sum + m.cpuUsage, 0) / metricsHistory.current.length,
        avgLatency: metricsHistory.current.reduce((sum, m) => sum + m.networkLatency, 0) / metricsHistory.current.length
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [metrics])

  // Store metrics history
  useEffect(() => {
    if (isMonitoring) {
      metricsHistory.current.push(metrics)
      if (metricsHistory.current.length > 1000) {
        metricsHistory.current = metricsHistory.current.slice(-1000)
      }
    }
  }, [metrics, isMonitoring])

  // Auto export
  useEffect(() => {
    if (autoExport && isMonitoring) {
      const interval = setInterval(exportMetrics, exportInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoExport, isMonitoring, exportInterval, exportMetrics])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time performance metrics and stress testing for the chat system
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="monitoring"
              checked={isMonitoring}
              onCheckedChange={isMonitoring ? stopMonitoring : startMonitoring}
            />
            <Label htmlFor="monitoring">
              {isMonitoring ? 'Monitoring Active' : 'Start Monitoring'}
            </Label>
          </div>
          
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'LIVE' : 'STOPPED'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="stress-test">Stress Test</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <MetricsDashboard metrics={metrics} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.fps >= 30 ? '✓' : '✗'}</p>
                  <p className="text-sm text-muted-foreground">Frame Rate OK</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.memoryUsage <= 70 ? '✓' : '✗'}</p>
                  <p className="text-sm text-muted-foreground">Memory OK</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.networkLatency <= 100 ? '✓' : '✗'}</p>
                  <p className="text-sm text-muted-foreground">Network OK</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{metrics.errors === 0 ? '✓' : '✗'}</p>
                  <p className="text-sm text-muted-foreground">No Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress-test">
          <PerformanceStressTest onMetricsUpdate={updateMetric} />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Performance Alerts
              </CardTitle>
              <CardDescription>
                Warnings and errors based on current performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceAlerts metrics={metrics} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Performance Data
              </CardTitle>
              <CardDescription>
                Download performance metrics for analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-export"
                  checked={autoExport}
                  onCheckedChange={setAutoExport}
                />
                <Label htmlFor="auto-export">Auto Export</Label>
              </div>
              
              {autoExport && (
                <div className="space-y-2">
                  <Label>Export Interval: {exportInterval} seconds</Label>
                  <Slider
                    value={[exportInterval]}
                    onValueChange={([value]) => setExportInterval(value)}
                    max={300}
                    min={10}
                    step={10}
                  />
                </div>
              )}
              
              <Button onClick={exportMetrics} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Now
              </Button>
              
              <div className="text-sm text-muted-foreground">
                <p>Exported data includes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Current performance metrics</li>
                  <li>Historical data (last 100 readings)</li>
                  <li>Performance summary statistics</li>
                  <li>Timestamp and session information</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
