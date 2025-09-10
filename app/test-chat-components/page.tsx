'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  Activity,
  Settings,
  TestTube 
} from 'lucide-react'

// Import the enhanced chat system for testing
import { EnhancedMultiPhaseChatSystem } from '@/components/chat/EnhancedMultiPhaseChatSystem'

// Simple test page without authentication requirement
export default function TestChatComponentsPage() {
  const [forceSSEOnly, setForceSSEOnly] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-3xl font-bold text-blue-600">
            <MessageCircle className="h-8 w-8" />
            <span>Chat Component Testing</span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Testing enhanced chat system components without authentication requirement
          </p>
          
          {/* Mode Controls */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-white/50 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Label htmlFor="force-sse-only" className="text-sm font-medium">
                Force SSE-only mode (bypass Stream Chat)
              </Label>
              <Switch
                id="force-sse-only"
                checked={forceSSEOnly}
                onCheckedChange={setForceSSEOnly}
              />
            </div>
            
            <Badge 
              variant={forceSSEOnly ? "destructive" : "default"}
            >
              {forceSSEOnly ? "SSE-Only Mode" : "Hybrid Mode"}
            </Badge>
          </div>

          {/* Mode Alert */}
          {forceSSEOnly && (
            <Alert className="max-w-2xl mx-auto">
              <Activity className="h-4 w-4" />
              <AlertDescription>
                <strong>SSE-Only Mode Active:</strong> Stream Chat is bypassed. 
                Testing degraded mode functionality.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Test Cases */}
        <div className="grid gap-6">
          {/* Component Rendering Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>Component Rendering Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Testing component rendering without authentication. 
                    Expected: Component should render with fallback or error state.
                  </AlertDescription>
                </Alert>
                
                <div className="h-[500px] border rounded-lg">
                  <EnhancedMultiPhaseChatSystem
                    tripId="test-trip-123"
                    tripDate={new Date()}
                    isOpen={true}
                    enableRealTimeFeatures={true}
                    forceSSEOnly={forceSSEOnly}
                    className="h-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expected Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <strong>✅ SSE-Only Mode (forceSSEOnly = true):</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Should show "SSE-режим чата" interface</li>
                    <li>Should display connection mode badge as "SSE Mode"</li>
                    <li>Should show orange/warning styling</li>
                    <li>Should explain limited functionality</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>⚠️ Hybrid Mode (forceSSEOnly = false):</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Should attempt Stream Chat connection</li>
                    <li>May show authentication error (expected without login)</li>
                    <li>Should automatically fallback to degraded mode</li>
                    <li>Should display appropriate error messages</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Toggle the "Force SSE-only mode" switch above</li>
              <li>Observe how the chat component changes behavior</li>
              <li>Check the browser console for diagnostic logs</li>
              <li>Verify the connection mode badge updates correctly</li>
              <li>Test both modes to ensure fallback logic works</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
