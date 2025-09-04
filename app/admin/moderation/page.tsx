'use client';

/**
 * Moderation Admin Page
 * Task 22.4: Moderation Tools Implementation
 * 
 * Main admin interface for content moderation:
 * - Centralized moderation dashboard
 * - Content review workflows
 * - Auto-moderation rule management
 * - Analytics and reporting
 * - User management tools
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Shield,
  Users,
  Settings,
  BarChart3,
  Flag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import moderation components
import ModerationDashboard from '@/components/admin/ModerationDashboard';
import ContentReviewPanel from '@/components/admin/ContentReviewPanel';
import AutoModerationRules from '@/components/admin/AutoModerationRules';

export default function ModerationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'dashboard' | 'content-review' | 'auto-rules' | 'analytics'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [reviewingContent, setReviewingContent] = useState<any>(null);

  // Check authentication and permissions
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin?callbackUrl=/admin/moderation');
      return;
    }

    const userRole = session.user?.role;
    if (!userRole || !['admin', 'super_admin', 'moderator'].includes(userRole)) {
      router.push('/');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  // Handle content review
  const handleContentReview = (content: any) => {
    setReviewingContent(content);
    setActiveView('content-review');
  };

  const handleReviewDecision = (decision: string, reason: string) => {
    console.log(`📝 Review decision: ${decision} - ${reason}`);
    // In production, send decision to API
    setReviewingContent(null);
    setActiveView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading moderation panel...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = session.user?.role;
  const canModerate = ['admin', 'super_admin', 'moderator'].includes(userRole || '');

  if (!canModerate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need moderator privileges to access this page.
          </p>
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Shield,
      description: 'Overview and queue management'
    },
    {
      id: 'auto-rules',
      label: 'Auto-Moderation',
      icon: Settings,
      description: 'Automated moderation rules'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Moderation reports and insights'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Moderation Center</h1>
                  <p className="text-sm text-gray-500">Content moderation and safety</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{session.user?.name}</span>
                <span className="text-gray-400 ml-2">({userRole})</span>
              </div>
              
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                System Active
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Content Review Modal */}
        <AnimatePresence>
          {reviewingContent && activeView === 'content-review' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <ContentReviewPanel
                contentId={reviewingContent.id}
                contentType={reviewingContent.type}
                content={reviewingContent.content}
                context={reviewingContent.context}
                analysis={reviewingContent.analysis}
                onDecision={handleReviewDecision}
                onClose={() => {
                  setReviewingContent(null);
                  setActiveView('dashboard');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {activeView !== 'content-review' && (
          <div className="mb-8">
            <nav className="flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id as any)}
                    className={`
                      flex items-center px-6 py-3 rounded-lg font-medium text-sm transition-colors
                      ${isActive 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    <div className="text-left">
                      <div>{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ModerationDashboard 
                  onContentReview={handleContentReview}
                />
              </motion.div>
            )}

            {activeView === 'auto-rules' && (
              <motion.div
                key="auto-rules"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AutoModerationRules />
              </motion.div>
            )}

            {activeView === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ModerationAnalytics />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Analytics Component (placeholder for detailed implementation)
function ModerationAnalytics() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Moderation Analytics</h2>
          <div className="flex space-x-1">
            {[
              { id: 'day', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' }
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id as any)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === range.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Content Reviewed</p>
              <p className="text-2xl font-bold text-blue-600">1,247</p>
              <p className="text-xs text-green-600">↑ 12% from last {timeRange}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Flag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Actions Taken</p>
              <p className="text-2xl font-bold text-orange-600">89</p>
              <p className="text-xs text-red-600">↑ 23% from last {timeRange}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Auto-Resolved</p>
              <p className="text-2xl font-bold text-green-600">3,156</p>
              <p className="text-xs text-green-600">↓ 3% from last {timeRange}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-purple-600">4.2m</p>
              <p className="text-xs text-green-600">↓ 8% from last {timeRange}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Types Moderated</h3>
          <div className="space-y-3">
            {[
              { type: 'Messages', count: 856, percentage: 68.7, color: 'bg-blue-500' },
              { type: 'Files', count: 234, percentage: 18.8, color: 'bg-green-500' },
              { type: 'User Reports', count: 98, percentage: 7.9, color: 'bg-yellow-500' },
              { type: 'Auto-Flags', count: 59, percentage: 4.7, color: 'bg-red-500' }
            ].map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded ${item.color}`}></div>
                  <span className="text-sm text-gray-700">{item.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Moderation Rules</h3>
          <div className="space-y-3">
            {[
              { name: 'Spam Link Detection', triggered: 156, accuracy: 92.3 },
              { name: 'Toxic Language Filter', triggered: 89, accuracy: 96.6 },
              { name: 'Fishing Scam Detection', triggered: 23, accuracy: 95.7 },
              { name: 'Inappropriate Content', triggered: 12, accuracy: 88.9 }
            ].map((rule) => (
              <div key={rule.name} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-500">Accuracy: {rule.accuracy}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{rule.triggered}</p>
                  <p className="text-xs text-gray-500">triggers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
