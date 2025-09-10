'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useSession, signIn } from 'next-auth/react'
import { 
  Bug, 
  Wifi, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Settings,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react'

// Import diagnostic components
import { ChatConnectionDiagnostics } from '@/components/chat/enhanced-diagnostics/ChatConnectionDiagnostics'
import { useChatSSEDiagnostic } from '@/hooks/useChatSSEDiagnostic'
import { EnhancedMultiPhaseChatSystem } from '@/components/chat/EnhancedMultiPhaseChatSystem'

/**
 * 🔧 Debug Chat Connection Page
 * 
 * Advanced diagnostic page for troubleshooting chat connection issues
 * including Stream Chat authentication, SSE polling, and hybrid modes
 */

interface DiagnosticSettings {
  sseOnlyMode: boolean
  enableDiagnostics: boolean
  showDetailedLogs: boolean
  autoReconnect: boolean
  maxReconnectAttempts: number
  pollingInterval: number
}

export default function DebugChatConnectionPage() {
  const { data: session, status } = useSession()
  
  const [settings, setSettings] = useState<DiagnosticSettings>({
    sseOnlyMode: true, // Default to SSE-only to bypass Stream Chat issues
    enableDiagnostics: true,
    showDetailedLogs: true,
    autoReconnect: true,
    maxReconnectAttempts: 3,
    pollingInterval: 2000
  })
  
  const [apiTests, setApiTests] = useState<Record<string, any>>({})
  const [isTestingAPI, setIsTestingAPI] = useState(false)

  // Initialize diagnostic SSE hook
  const chatSSE = useChatSSEDiagnostic({
    channelIds: ['debug-channel-123', 'test-channel-456'],
    autoReconnect: settings.autoReconnect,
    maxReconnectAttempts: settings.maxReconnectAttempts,
    enableDiagnostics: settings.enableDiagnostics,
    preferences: {
      receiveOnlineStatus: true,
      receiveTypingIndicators: true,
      receiveReadReceipts: true
    }
  })

  // Test API endpoints
  const testAPIEndpoints = async () => {
    setIsTestingAPI(true)
    const results: Record<string, any> = {}
    
    const endpoints = [
      { name: 'Health Check', url: '/api/chat/health', method: 'GET' },
      { name: 'SSE Polling', url: '/api/chat/sse?channels=test&clientId=debug&lastEventId=0', method: 'GET' },
      { name: 'Stream Chat Diagnostics', url: '/api/chat/diagnostics', method: 'GET' },
      { name: 'Token Generation', url: '/api/chat/token', method: 'POST' },
      { name: 'Session Check', url: '/api/auth/session', method: 'GET' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          ...(endpoint.method === 'POST' ? { body: JSON.stringify({}) } : {})
        })
        
        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch {
          data = responseText
        }

        results[endpoint.name] = {
          status: response.status,
          ok: response.ok,
          data: data,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        results[endpoint.name] = {
          status: 0,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      }
      
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    
    setApiTests(results)
    setIsTestingAPI(false)
  }

  // Download diagnostics
  const downloadDiagnostics = () => {
    const diagnosticsData = {
      timestamp: new Date().toISOString(),
      settings,
      chatSSEStatus: chatSSE.connectionStatus,
      chatSSEDiagnostics: chatSSE.getDiagnostics(),
      apiTests,
      sessionInfo: {
        authenticated: status === 'authenticated',
        userId: session?.user?.id || null,
        userName: session?.user?.name || null
      },
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    }

    const blob = new Blob([JSON.stringify(diagnosticsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-diagnostics-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Authentication check
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Activity className="w-8 h-8 animate-spin mx-auto" />
          <p>Loading authentication...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Bug className="w-5 h-5" />
              Debug Chat Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Authentication required to access chat diagnostics
            </p>
            <Button onClick={() => signIn()} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Bug className="w-8 h-8" />
          Chat Connection Diagnostics
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Advanced diagnostic tools for troubleshooting chat connection issues, 
          testing SSE polling, and bypassing Stream Chat authentication problems.
        </p>
      </div>

      {/* Quick Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {chatSSE.isConnected ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <h3 className="font-medium">SSE Polling</h3>
              <p className="text-sm text-gray-600">
                {chatSSE.connectionStatus.status}
              </p>
              <Badge variant={chatSSE.isConnected ? 'default' : 'destructive'} className="mt-1">
                {chatSSE.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Wifi className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium">Network Quality</h3>
              <p className="text-sm text-gray-600">
                {chatSSE.connectionStatus.diagnostics.networkQuality}
              </p>
              <Badge variant="outline" className="mt-1">
                {Math.round(chatSSE.connectionStatus.diagnostics.averageResponseTime)}ms avg
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium">Online Users</h3>
              <p className="text-sm text-gray-600">
                {chatSSE.onlineUsers.size} users online
              </p>
              <Badge variant="secondary" className="mt-1">
                {chatSSE.typingUsers.size} typing
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Diagnostic Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sse-only">SSE-Only Mode</Label>
                <Switch
                  id="sse-only"
                  checked={settings.sseOnlyMode}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sseOnlyMode: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="diagnostics">Enable Diagnostics</Label>
                <Switch
                  id="diagnostics"
                  checked={settings.enableDiagnostics}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableDiagnostics: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="logs">Show Detailed Logs</Label>
                <Switch
                  id="logs"
                  checked={settings.showDetailedLogs}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showDetailedLogs: checked }))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="reconnect">Auto Reconnect</Label>
                <Switch
                  id="reconnect"
                  checked={settings.autoReconnect}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoReconnect: checked }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Max Reconnect Attempts: {settings.maxReconnectAttempts}</Label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.maxReconnectAttempts}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxReconnectAttempts: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex gap-4">
            <Button onClick={testAPIEndpoints} disabled={isTestingAPI}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isTestingAPI ? 'animate-spin' : ''}`} />
              {isTestingAPI ? 'Testing APIs...' : 'Test API Endpoints'}
            </Button>
            
            <Button variant="outline" onClick={chatSSE.reconnect}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnect SSE
            </Button>
            
            <Button variant="outline" onClick={downloadDiagnostics}>
              <Download className="w-4 h-4 mr-2" />
              Export Diagnostics
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="live-chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live-chat">Live Chat Test</TabsTrigger>
          <TabsTrigger value="diagnostics">Connection Diagnostics</TabsTrigger>
          <TabsTrigger value="api-tests">API Tests</TabsTrigger>
          <TabsTrigger value="logs">Debug Logs</TabsTrigger>
        </TabsList>

        {/* Live Chat Test */}
        <TabsContent value="live-chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Chat System Test</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={settings.sseOnlyMode ? 'default' : 'secondary'}>
                  {settings.sseOnlyMode ? 'SSE-Only Mode' : 'Hybrid Mode'}
                </Badge>
                <Badge variant="outline">
                  Channel: debug-channel-123
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {settings.sseOnlyMode ? (
                <Alert className="mb-4">
                  <Eye className="w-4 h-4" />
                  <AlertDescription>
                    <strong>SSE-Only Mode:</strong> Stream Chat is bypassed. Only SSE polling system is active.
                    This should work even if Stream Chat authentication fails.
                  </AlertDescription>
                </Alert>
              ) : null}
              
              <div className="h-[600px] border rounded-lg">
                <EnhancedMultiPhaseChatSystem
                  tripId="debug-trip-123"
                  tripDate={new Date()}
                  isOpen={true}
                  enableRealTimeFeatures={true}
                  className="h-full"
                  // TODO: Add forceSSEOnly prop when implementing
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Diagnostics */}
        <TabsContent value="diagnostics" className="space-y-6">
          <ChatConnectionDiagnostics />
        </TabsContent>

        {/* API Tests */}
        <TabsContent value="api-tests" className="space-y-6">
          {/* Stream Chat Diagnostics Special Section */}
          {apiTests['Stream Chat Diagnostics'] && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5" />
                  Stream Chat Configuration Analysis
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Detailed analysis of Stream Chat setup and authentication issues
                </p>
              </CardHeader>
              <CardContent>
                {apiTests['Stream Chat Diagnostics'].data && apiTests['Stream Chat Diagnostics'].data.diagnostics ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        apiTests['Stream Chat Diagnostics'].data.overallStatus === 'WORKING' ? 'default' : 'destructive'
                      }>
                        {apiTests['Stream Chat Diagnostics'].data.overallStatus}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        Overall Stream Chat Status
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(apiTests['Stream Chat Diagnostics'].data.diagnostics)
                        .filter(([key]) => key.endsWith('Present') || key.endsWith('Valid') || key.endsWith('Working'))
                        .map(([key, value]: [string, any]) => (
                          <div key={key} className="text-center p-3 border rounded">
                            <div className="flex items-center justify-center mb-2">
                              {value ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <p className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <Badge variant={value ? 'default' : 'destructive'} className="mt-1">
                              {value ? 'OK' : 'FAIL'}
                            </Badge>
                          </div>
                        ))
                      }
                    </div>

                    {apiTests['Stream Chat Diagnostics'].data.recommendations && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Recommendations:</h4>
                        <div className="space-y-2">
                          {apiTests['Stream Chat Diagnostics'].data.recommendations.map((rec: string, index: number) => (
                            <Alert key={index} className={rec.startsWith('✅') ? 'border-green-200' : 'border-orange-200'}>
                              <AlertDescription className="text-sm">
                                {rec}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    <details>
                      <summary className="cursor-pointer text-sm text-gray-500">
                        View Full Diagnostic Data
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto max-h-64">
                        {JSON.stringify(apiTests['Stream Chat Diagnostics'].data.diagnostics, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Stream Chat diagnostics failed to load. Check the error details below.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>API Endpoint Tests</CardTitle>
              <p className="text-sm text-gray-600">
                Test individual API endpoints to isolate connection issues
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(apiTests).length === 0 ? (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Click "Test API Endpoints" above to run comprehensive API tests
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {Object.entries(apiTests).map(([name, result]: [string, any]) => (
                    <Card key={name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.ok ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <h4 className="font-medium">{name}</h4>
                            <p className="text-sm text-gray-600">
                              Status: {result.status} {result.ok ? '✓' : '✗'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={result.ok ? 'default' : 'destructive'}>
                          {result.ok ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                      
                      {result.data && name !== 'Stream Chat Diagnostics' && (
                        <details className="mt-3">
                          <summary className="text-sm cursor-pointer text-gray-500">
                            View Response Data
                          </summary>
                          <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      {result.error && (
                        <Alert className="mt-3">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription className="text-sm">
                            {result.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Debug Logs</CardTitle>
              <p className="text-sm text-gray-600">
                Live connection events and diagnostic information
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-auto font-mono text-sm">
                {chatSSE.connectionStatus.diagnostics.connectionHistory.length === 0 ? (
                  <p>No connection events yet. Click "Reconnect SSE" to generate logs.</p>
                ) : (
                  chatSSE.connectionStatus.diagnostics.connectionHistory
                    .slice(-50)
                    .map((log, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-500">
                          [{log.timestamp.toISOString()}]
                        </span>
                        <span className="ml-2 text-yellow-400">
                          {log.event.toUpperCase()}:
                        </span>
                        <span className="ml-2">
                          {log.details}
                        </span>
                      </div>
                    ))
                )}
              </div>
              
              {chatSSE.connectionStatus.diagnostics.errorHistory.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-red-600 font-medium">
                    Error History ({chatSSE.connectionStatus.diagnostics.errorHistory.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {chatSSE.connectionStatus.diagnostics.errorHistory.slice(-10).map((error, index) => (
                      <Alert key={index} className="text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <strong>[{error.timestamp.toISOString()}]</strong><br />
                          {error.error}
                          {error.context && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-gray-500">Context</summary>
                              <pre className="text-xs mt-1 bg-gray-50 p-1 rounded">
                                {JSON.stringify(error.context, null, 2)}
                              </pre>
                            </details>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer with session info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>
              <strong>Session:</strong> {session?.user?.name} ({session?.user?.id})
            </p>
            <p>
              <strong>Diagnostics:</strong> {Object.keys(apiTests).length} API tests, 
              {chatSSE.connectionStatus.diagnostics.connectionHistory.length} connection events,
              {chatSSE.connectionStatus.diagnostics.errorHistory.length} errors logged
            </p>
            <p className="text-xs">
              Debug page created to isolate and fix chat connection issues. 
              Use SSE-Only mode to bypass Stream Chat authentication problems.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
