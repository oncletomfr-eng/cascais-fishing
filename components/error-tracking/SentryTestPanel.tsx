'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bug, 
  AlertTriangle, 
  Info, 
  Zap, 
  Activity,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface TestResult {
  type: string;
  success: boolean;
  message: string;
  timestamp: string;
}

export function SentryTestPanel() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const addResult = (type: string, success: boolean, message: string) => {
    setResults(prev => [...prev, {
      type,
      success,
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const testError = async (type: 'error' | 'warning' | 'info' | 'custom' | 'performance') => {
    setLoading(type);
    try {
      const response = await fetch(`/api/test-sentry?type=${type}`);
      const data = await response.json();
      
      if (response.ok) {
        addResult(type, true, data.message);
      } else {
        addResult(type, true, `Expected error: ${data.error}`);
      }
    } catch (error) {
      addResult(type, false, `Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setLoading(null);
    }
  };

  const testClientError = () => {
    try {
      // This will trigger our ErrorBoundary and ErrorProvider
      throw new Error('Client-side test error from SentryTestPanel');
    } catch (error) {
      // The error will be caught by our global error handlers
      addResult('client', true, 'Client error thrown - should be captured by ErrorBoundary');
    }
  };

  const testAsyncError = async () => {
    setLoading('async');
    try {
      // This will trigger an unhandled promise rejection
      Promise.reject(new Error('Unhandled promise rejection test'));
      
      setTimeout(() => {
        addResult('async', true, 'Async error created - should be captured by global handlers');
        setLoading(null);
      }, 1000);
    } catch (error) {
      addResult('async', false, `Unexpected catch: ${error instanceof Error ? error.message : 'Unknown'}`);
      setLoading(null);
    }
  };

  const testPostError = async () => {
    setLoading('post');
    try {
      const response = await fetch('/api/test-sentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          email: 'test@cascaisfishing.com',
          username: 'testuser',
          message: 'POST test error with user context'
        })
      });
      
      const data = await response.json();
      addResult('post', true, data.error || data.message);
    } catch (error) {
      addResult('post', false, `POST error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setLoading(null);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Sentry Error Tracking Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Use this panel to test error tracking integration. Each test will send errors to Sentry with different contexts and severity levels.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* API Error Tests */}
            <Button
              onClick={() => testError('error')}
              disabled={loading === 'error'}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {loading === 'error' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              API Error
            </Button>

            <Button
              onClick={() => testError('warning')}
              disabled={loading === 'warning'}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading === 'warning' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              API Warning
            </Button>

            <Button
              onClick={() => testError('info')}
              disabled={loading === 'info'}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading === 'info' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Info className="h-4 w-4" />}
              API Info
            </Button>

            <Button
              onClick={() => testError('custom')}
              disabled={loading === 'custom'}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {loading === 'custom' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Custom Context
            </Button>

            <Button
              onClick={() => testError('performance')}
              disabled={loading === 'performance'}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading === 'performance' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Performance
            </Button>

            <Button
              onClick={testPostError}
              disabled={loading === 'post'}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {loading === 'post' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
              POST Error
            </Button>

            {/* Client-Side Tests */}
            <Button
              onClick={testClientError}
              disabled={!!loading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Client Error
            </Button>

            <Button
              onClick={testAsyncError}
              disabled={loading === 'async'}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {loading === 'async' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Async Error
            </Button>

            <Button
              onClick={clearResults}
              disabled={!!loading}
              variant="outline"
              className="md:col-span-1"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Test Results ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.reverse().map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.type}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{result.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
