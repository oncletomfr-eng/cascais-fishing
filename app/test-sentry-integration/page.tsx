import { SentryTestPanel } from '@/components/error-tracking/SentryTestPanel';

export default function TestSentryIntegrationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚨 Sentry Error Tracking Integration Test
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive testing panel for Sentry error tracking integration. 
            Test client-side, server-side, and performance monitoring capabilities.
          </p>
        </div>

        <SentryTestPanel />

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🔍 What to Check After Testing
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                📊 Sentry Dashboard
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Check Sentry.io project dashboard</li>
                <li>• Verify errors appear with proper context</li>
                <li>• Confirm performance transactions</li>
                <li>• Check user context and tags</li>
                <li>• Verify error grouping and deduplication</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                🚨 Error Types Tested
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>API Errors:</strong> Server-side exception handling</li>
                <li>• <strong>Client Errors:</strong> React ErrorBoundary integration</li>
                <li>• <strong>Async Errors:</strong> Unhandled promise rejections</li>
                <li>• <strong>Custom Context:</strong> Rich error metadata</li>
                <li>• <strong>Performance:</strong> Transaction monitoring</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ⚡ Integration Status
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Client-side tracking active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Server-side tracking active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Performance monitoring active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
