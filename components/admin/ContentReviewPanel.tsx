'use client';

/**
 * Content Review Panel Component
 * Task 22.4: Moderation Tools Implementation
 * 
 * Advanced content review interface:
 * - Content preview with context
 * - AI-powered threat analysis
 * - Review workflow automation
 * - Evidence collection tools
 * - Decision tracking system
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Shield,
  Eye,
  EyeOff,
  MessageSquare,
  Image,
  Video,
  FileText,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  ChevronRight,
  Download,
  ExternalLink,
  Copy,
  Zap,
  Brain,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ContentAnalysis {
  threatLevel: 'safe' | 'suspicious' | 'harmful' | 'critical';
  confidence: number;
  categories: string[];
  patterns: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: string[];
  similarCases?: {
    id: string;
    similarity: number;
    outcome: string;
  }[];
}

export interface ReviewContext {
  user: {
    id: string;
    name: string;
    role: string;
    joinDate: string;
    previousViolations: number;
    reputation: number;
  };
  channel: {
    id: string;
    name: string;
    type: string;
    memberCount: number;
    created: string;
  };
  conversation: {
    messagesBefore: number;
    messagesAfter: number;
    participants: string[];
    topic?: string;
  };
  timing: {
    posted: string;
    reported: string;
    responseTime: string;
  };
}

export interface ContentReviewProps {
  contentId: string;
  contentType: 'message' | 'file' | 'user' | 'channel';
  content?: string;
  context?: ReviewContext;
  analysis?: ContentAnalysis;
  onDecision?: (decision: 'approve' | 'remove' | 'escalate', reason: string) => void;
  onClose?: () => void;
}

export function ContentReviewPanel({
  contentId,
  contentType,
  content = '',
  context,
  analysis,
  onDecision,
  onClose
}: ContentReviewProps) {
  const [activeSection, setActiveSection] = useState<'content' | 'analysis' | 'context' | 'history'>('content');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(analysis || null);
  const [decisionReason, setDecisionReason] = useState('');
  const [showSensitiveContent, setShowSensitiveContent] = useState(false);

  // Simulate AI analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockAnalysis: ContentAnalysis = {
      threatLevel: content.toLowerCase().includes('spam') ? 'harmful' : 'safe',
      confidence: 0.89,
      categories: ['spam_detection', 'language_analysis', 'pattern_matching'],
      patterns: [
        {
          type: 'Repeated phrases',
          description: 'Content contains repetitive promotional language',
          severity: 'medium'
        },
        {
          type: 'External links',
          description: 'Contains suspicious external links',
          severity: 'high'
        }
      ],
      recommendations: [
        'Consider removing external links',
        'Monitor user for repeated behavior',
        'Apply warning to user account'
      ],
      similarCases: [
        { id: 'case_001', similarity: 0.76, outcome: 'Content removed' },
        { id: 'case_002', similarity: 0.65, outcome: 'Warning issued' }
      ]
    };
    
    setContentAnalysis(mockAnalysis);
    setIsAnalyzing(false);
  };

  const handleDecision = (decision: 'approve' | 'remove' | 'escalate') => {
    if (!decisionReason.trim()) {
      alert('Please provide a reason for your decision');
      return;
    }
    
    onDecision?.(decision, decisionReason);
    setDecisionReason('');
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'suspicious': return 'text-yellow-600 bg-yellow-100';
      case 'harmful': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getContentIcon = () => {
    switch (contentType) {
      case 'message': return <MessageSquare className="w-5 h-5" />;
      case 'file': return <FileText className="w-5 h-5" />;
      case 'user': return <User className="w-5 h-5" />;
      default: return <Flag className="w-5 h-5" />;
    }
  };

  const shouldBlurContent = () => {
    return contentAnalysis?.threatLevel === 'harmful' || 
           contentAnalysis?.threatLevel === 'critical';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {getContentIcon()}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Content Review - {contentType}
            </h2>
            <p className="text-sm text-gray-500">ID: {contentId}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {contentAnalysis && (
            <span className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              getThreatLevelColor(contentAnalysis.threatLevel)
            )}>
              {contentAnalysis.threatLevel.toUpperCase()} 
              ({Math.round(contentAnalysis.confidence * 100)}%)
            </span>
          )}
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'content', label: 'Content', icon: Eye },
          { id: 'analysis', label: 'AI Analysis', icon: Brain },
          { id: 'context', label: 'Context', icon: Search },
          { id: 'history', label: 'History', icon: Clock }
        ].map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeSection === section.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeSection === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <ContentSection
                content={content}
                contentType={contentType}
                shouldBlur={shouldBlurContent() && !showSensitiveContent}
                onToggleBlur={() => setShowSensitiveContent(!showSensitiveContent)}
              />
            </motion.div>
          )}

          {activeSection === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <AnalysisSection
                analysis={contentAnalysis}
                isAnalyzing={isAnalyzing}
                onRunAnalysis={runAnalysis}
              />
            </motion.div>
          )}

          {activeSection === 'context' && (
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <ContextSection context={context} />
            </motion.div>
          )}

          {activeSection === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <HistorySection contentId={contentId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decision Panel */}
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decision Reason *
            </label>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Explain your moderation decision..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              All decisions are logged and auditable
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleDecision('approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-2 inline" />
                Approve
              </button>
              
              <button
                onClick={() => handleDecision('escalate')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-2 inline" />
                Escalate
              </button>
              
              <button
                onClick={() => handleDecision('remove')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-2 inline" />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Content Display Section
function ContentSection({ 
  content, 
  contentType, 
  shouldBlur, 
  onToggleBlur 
}: {
  content: string;
  contentType: string;
  shouldBlur: boolean;
  onToggleBlur: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Content Preview</h3>
        
        {shouldBlur && (
          <button
            onClick={onToggleBlur}
            className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
          >
            <EyeOff className="w-4 h-4 mr-1" />
            Show Sensitive Content
          </button>
        )}
      </div>

      <div className={cn(
        'relative p-4 bg-gray-50 rounded-lg border',
        shouldBlur && 'filter blur-sm'
      )}>
        {contentType === 'message' && (
          <div className="prose max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap">{content}</p>
          </div>
        )}
        
        {contentType === 'file' && (
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-medium">File Content Analysis</p>
              <p className="text-sm text-gray-500">File type: Document</p>
            </div>
          </div>
        )}
        
        {shouldBlur && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-10 rounded-lg">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <p className="text-red-800 font-medium">Potentially Harmful Content</p>
              <p className="text-red-600 text-sm">Click "Show Sensitive Content" to view</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <button className="flex items-center hover:text-blue-600 transition-colors">
          <Copy className="w-4 h-4 mr-1" />
          Copy Content
        </button>
        <button className="flex items-center hover:text-blue-600 transition-colors">
          <Download className="w-4 h-4 mr-1" />
          Download
        </button>
        <button className="flex items-center hover:text-blue-600 transition-colors">
          <ExternalLink className="w-4 h-4 mr-1" />
          View Original
        </button>
      </div>
    </div>
  );
}

// AI Analysis Section
function AnalysisSection({ 
  analysis, 
  isAnalyzing, 
  onRunAnalysis 
}: {
  analysis: ContentAnalysis | null;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI-Powered Analysis</h3>
        
        <button
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Zap className={cn('w-4 h-4 mr-2', isAnalyzing && 'animate-pulse')} />
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">AI is analyzing content for threats and patterns...</p>
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threat Assessment */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Threat Assessment</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Threat Level</span>
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  analysis.threatLevel === 'safe' ? 'bg-green-100 text-green-800' :
                  analysis.threatLevel === 'suspicious' ? 'bg-yellow-100 text-yellow-800' :
                  analysis.threatLevel === 'harmful' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                )}>
                  {analysis.threatLevel.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confidence</span>
                <span className="text-sm font-medium">{Math.round(analysis.confidence * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Patterns Detected */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Patterns Detected</h4>
            <div className="space-y-2">
              {analysis.patterns.map((pattern, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-2',
                    pattern.severity === 'high' ? 'bg-red-500' :
                    pattern.severity === 'medium' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  )} />
                  <div>
                    <p className="text-sm font-medium">{pattern.type}</p>
                    <p className="text-xs text-gray-600">{pattern.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <h4 className="font-medium text-gray-900 mb-3">AI Recommendations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Cases */}
          {analysis.similarCases && analysis.similarCases.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <h4 className="font-medium text-gray-900 mb-3">Similar Cases</h4>
              <div className="space-y-2">
                {analysis.similarCases.map((case_item) => (
                  <div key={case_item.id} className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm font-medium">Case {case_item.id}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {Math.round(case_item.similarity * 100)}% similar
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">{case_item.outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Context Information Section
function ContextSection({ context }: { context?: ReviewContext }) {
  if (!context) {
    return (
      <div className="text-center py-8">
        <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No context information available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <User className="w-4 h-4 mr-2" />
          User Information
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{context.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Role:</span>
            <span className="font-medium">{context.user.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Join Date:</span>
            <span className="font-medium">{new Date(context.user.joinDate).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Violations:</span>
            <span className={cn(
              'font-medium',
              context.user.previousViolations > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {context.user.previousViolations}
            </span>
          </div>
        </div>
      </div>

      {/* Channel Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          Channel Information
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium">{context.channel.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{context.channel.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Members:</span>
            <span className="font-medium">{context.channel.memberCount}</span>
          </div>
        </div>
      </div>

      {/* Timing Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Timeline
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Posted:</span>
            <span className="font-medium">{new Date(context.timing.posted).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reported:</span>
            <span className="font-medium">{new Date(context.timing.reported).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Response Time:</span>
            <span className="font-medium">{context.timing.responseTime}</span>
          </div>
        </div>
      </div>

      {/* Conversation Context */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Conversation Context</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Messages Before:</span>
            <span className="font-medium">{context.conversation.messagesBefore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Messages After:</span>
            <span className="font-medium">{context.conversation.messagesAfter}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Participants:</span>
            <span className="font-medium">{context.conversation.participants.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// History Section
function HistorySection({ contentId }: { contentId: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Review History</h3>
      
      <div className="space-y-3">
        {/* Mock history entries */}
        {[
          {
            id: '1',
            action: 'Content flagged',
            user: 'user_123',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            details: 'Automatically flagged by spam detection system'
          },
          {
            id: '2',
            action: 'Analysis completed',
            user: 'system',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            details: 'AI analysis marked as suspicious (76% confidence)'
          }
        ].map((entry) => (
          <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{entry.action}</span>
                <span className="text-sm text-gray-500">
                  {entry.timestamp.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{entry.details}</p>
              <p className="text-xs text-gray-500 mt-1">By: {entry.user}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContentReviewPanel;
