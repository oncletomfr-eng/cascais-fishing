'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi, 
  Server, 
  Key, 
  Activity,
  RefreshCw,
  Bug,
  Info
} from 'lucide-react'

/**
 * 🔧 Enhanced Chat Connection Diagnostics
 * 
 * Comprehensive diagnostic tool to identify and debug chat connection issues
 * including Stream Chat authentication, SSE polling, and network connectivity
 */

interface DiagnosticResult {
  name: string
  status: 'success' | 'warning' | 'error' | 'pending'
  message: string
  details?: string
  suggestion?: string
  timestamp: Date
}

interface NetworkTest {
  endpoint: string
  method: 'GET' | 'POST'
  expectedStatus: number
  description: string
}

const DIAGNOSTIC_TESTS: NetworkTest[] = [
  {
    endpoint: '/api/chat/health',
    method: 'GET',
    expectedStatus: 200,
    description: 'Chat service health check'
  },
  {
    endpoint: '/api/chat/token',
    method: 'POST',
    expectedStatus: 200,
    description: 'Stream Chat token generation'
  },
  {
    endpoint: '/api/chat/sse?channels=test&clientId=diagnostic&lastEventId=0',
    method: 'GET',
    expectedStatus: 200,
    description: 'SSE polling endpoint test'
  },
  {
    endpoint: '/api/auth/session',
    method: 'GET',
    expectedStatus: 200,
    description: 'User authentication session'
  }
]

export function ChatConnectionDiagnostics() {
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [environmentInfo, setEnvironmentInfo] = useState<Record<string, any>>({})

  // Collect environment information
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      windowLocation: window.location.href,
      protocol: window.location.protocol,
      websocketSupport: 'WebSocket' in window,
      fetchSupport: 'fetch' in window,
      localStorage: typeof Storage !== 'undefined',
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    setEnvironmentInfo(info)
  }, [])

  const addDiagnosticResult = (result: Omit<DiagnosticResult, 'timestamp'>) => {
    setDiagnosticResults(prev => [...prev, { ...result, timestamp: new Date() }])
  }

  const runSingleTest = async (test: NetworkTest): Promise<DiagnosticResult> => {
    try {
      console.log(`🔍 Running diagnostic test: ${test.description}`)
      
      const startTime = Date.now()
      const response = await fetch(test.endpoint, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Diagnostic-Test': 'true'
        },
        ...(test.method === 'POST' ? { body: JSON.stringify({}) } : {})
      })
      
      const responseTime = Date.now() - startTime
      const responseText = await response.text()
      
      let parsedResponse: any
      try {
        parsedResponse = JSON.parse(responseText)
      } catch {
        parsedResponse = responseText
      }

      if (response.status === test.expectedStatus) {
        return {
          name: test.description,
          status: 'success',
          message: `✅ Test passed (${responseTime}ms)`,
          details: `Status: ${response.status}, Response: ${JSON.stringify(parsedResponse, null, 2).slice(0, 500)}`,
          timestamp: new Date()
        }
      } else {
        return {
          name: test.description,
          status: 'error',
          message: `❌ Unexpected status: ${response.status} (expected ${test.expectedStatus})`,
          details: `Response: ${JSON.stringify(parsedResponse, null, 2).slice(0, 500)}`,
          suggestion: getSuggestionForEndpoint(test.endpoint, response.status),
          timestamp: new Date()
        }
      }
      
    } catch (error) {
      console.error(`❌ Diagnostic test failed for ${test.description}:`, error)
      
      return {
        name: test.description,
        status: 'error',
        message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : String(error),
        suggestion: getSuggestionForEndpoint(test.endpoint, 0),
        timestamp: new Date()
      }
    }
  }

  const getSuggestionForEndpoint = (endpoint: string, status: number): string => {
    if (endpoint.includes('/api/chat/token')) {
      if (status === 401) {
        return '🔐 User not authenticated. Please sign in to continue.'
      } else if (status === 500) {
        return '⚙️ Stream Chat configuration issue. Check STREAM_CHAT_API_KEY and STREAM_CHAT_API_SECRET environment variables.'
      }
    }
    
    if (endpoint.includes('/api/chat/sse')) {
      if (status >= 500) {
        return '🔧 SSE endpoint error. Check server logs for detailed error information.'
      }
    }
    
    if (status === 0) {
      return '🌐 Network connectivity issue. Check internet connection and proxy settings.'
    }
    
    return '🔍 Check server logs and network connectivity for more details.'
  }

  const runAllDiagnostics = async () => {
    if (isRunning) return
    
    setIsRunning(true)
    setDiagnosticResults([])
    
    addDiagnosticResult({
      name: 'Diagnostic Session Started',
      status: 'pending',
      message: '🚀 Running comprehensive chat connection diagnostics...'
    })

    // Test environment prerequisites
    addDiagnosticResult({
      name: 'Browser Environment Check',
      status: environmentInfo.websocketSupport && environmentInfo.fetchSupport ? 'success' : 'warning',
      message: environmentInfo.websocketSupport && environmentInfo.fetchSupport 
        ? '✅ Browser environment supports all required features'
        : '⚠️ Browser may have limited support for some features',
      details: JSON.stringify(environmentInfo, null, 2)
    })

    // Run network tests sequentially
    for (const test of DIAGNOSTIC_TESTS) {
      const result = await runSingleTest(test)
      addDiagnosticResult(result)
      
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    // Summary analysis
    const errorCount = diagnosticResults.filter(r => r.status === 'error').length
    const warningCount = diagnosticResults.filter(r => r.status === 'warning').length
    
    addDiagnosticResult({
      name: 'Diagnostic Summary',
      status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success',
      message: errorCount > 0 
        ? `❌ ${errorCount} critical issues found` 
        : warningCount > 0 
          ? `⚠️ ${warningCount} warnings detected`
          : '✅ All tests passed successfully',
      suggestion: errorCount > 0 
        ? 'Review failed tests above and follow suggested fixes'
        : 'Chat system appears to be functioning normally'
    })

    setIsRunning(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <Activity className="w-4 h-4 text-blue-600 animate-spin" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default'
      case 'warning': return 'secondary'
      case 'error': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Chat Connection Diagnostics
        </CardTitle>
        <div className="flex items-center justify-between">
          <Button 
            onClick={runAllDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostic'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="results" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="environment">Environment Info</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {diagnosticResults.length === 0 ? (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Click "Run Full Diagnostic" to analyze your chat connection and identify any issues.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {diagnosticResults.map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <h4 className="font-medium">{result.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                          {result.suggestion && (
                            <p className="text-sm text-blue-700 mt-2 font-medium">
                              💡 {result.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(result.status)}>
                        {result.status}
                      </Badge>
                    </div>
                    
                    {result.details && (
                      <details className="mt-3">
                        <summary className="text-sm cursor-pointer text-gray-500">
                          View Details
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 mt-2 rounded overflow-auto max-h-32">
                          {result.details}
                        </pre>
                      </details>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="environment" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-3">Browser Environment</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(environmentInfo).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-mono text-right">
                      {typeof value === 'boolean' ? (value ? '✅' : '❌') : String(value).slice(0, 30)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Common Issues & Solutions:</strong>
                </AlertDescription>
              </Alert>

              <Card className="p-4">
                <h4 className="font-medium mb-3">🔐 Authentication Issues</h4>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Ensure user is signed in with valid NextAuth session</li>
                  <li>Check NEXTAUTH_URL and NEXTAUTH_SECRET environment variables</li>
                  <li>Verify authentication provider configuration</li>
                </ul>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3">⚙️ Stream Chat Configuration</h4>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Set NEXT_PUBLIC_STREAM_CHAT_API_KEY environment variable</li>
                  <li>Set STREAM_CHAT_API_SECRET environment variable (server-side only)</li>
                  <li>Ensure API keys are valid and not demo/placeholder values</li>
                  <li>Check Stream Chat dashboard for API key status</li>
                </ul>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3">🌐 Network & Connectivity</h4>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Check internet connection and proxy settings</li>
                  <li>Ensure no firewall blocking WebSocket connections</li>
                  <li>Verify CORS configuration for cross-origin requests</li>
                  <li>Check server deployment status and health</li>
                </ul>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-3">🔧 SSE Polling System</h4>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>SSE polling should work independently of Stream Chat</li>
                  <li>Check /api/chat/sse endpoint logs for detailed errors</li>
                  <li>Verify polling interval and timeout settings</li>
                  <li>Test with different channel IDs and client IDs</li>
                </ul>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
