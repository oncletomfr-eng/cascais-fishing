'use client';

/**
 * Moderation Dashboard Component
 * Task 22.4: Moderation Tools Implementation
 * 
 * Comprehensive admin dashboard for content moderation:
 * - Real-time moderation queue
 * - Content review workflows
 * - User management tools
 * - Moderation analytics
 * - Security monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Shield,
  AlertTriangle,
  Eye,
  Ban,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  MoreHorizontal,
  Trash2,
  UserX,
  Volume2,
  VolumeX,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Types for moderation data
export interface FlaggedContent {
  id: string;
  type: 'message' | 'user' | 'channel' | 'file';
  content?: string;
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderatorId?: string;
  moderatorName?: string;
  moderatorAction?: string;
  reviewedAt?: string;
  targetUser?: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  context?: {
    channelId?: string;
    channelName?: string;
    messageId?: string;
    fileId?: string;
  };
}

export interface ModerationStats {
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  totalFlags: number;
  averageResolutionTime: string;
  userReports: number;
  autoFlags: number;
  todayActivity: number;
  weeklyTrend: number;
}

export interface ModerationDashboardProps {
  className?: string;
}

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  reviewed: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-red-100 text-red-800'
};

export function ModerationDashboard({ className = '' }: ModerationDashboardProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'queue' | 'analytics' | 'users' | 'settings'>('queue');
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'high' | 'critical'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Check if user has moderation permissions
  const canModerate = session?.user && ['admin', 'super_admin', 'moderator'].includes(session.user.role || '');

  // Fetch moderation data
  const fetchModerationData = useCallback(async () => {
    if (!canModerate) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/chat/moderation', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setFlaggedContent(data.flaggedContent || []);
        setStats(data.statistics);
      } else {
        console.error('Failed to fetch moderation data');
      }
    } catch (error) {
      console.error('Error fetching moderation data:', error);
    } finally {
      setLoading(false);
    }
  }, [canModerate]);

  // Initial data load
  useEffect(() => {
    fetchModerationData();
  }, [fetchModerationData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchModerationData, 30000);
    return () => clearInterval(interval);
  }, [fetchModerationData]);

  // Handle moderation actions
  const handleModerationAction = async (
    flagId: string,
    action: string,
    reason?: string
  ) => {
    try {
      const response = await fetch('/api/chat/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'review_flag',
          messageId: flagId,
          moderationAction: action,
          reason
        })
      });

      if (response.ok) {
        await fetchModerationData();
        console.log(`✅ Moderation action ${action} completed for flag ${flagId}`);
      } else {
        console.error('Moderation action failed');
      }
    } catch (error) {
      console.error('Error performing moderation action:', error);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string, items: string[]) => {
    for (const itemId of items) {
      await handleModerationAction(itemId, action);
    }
    setSelectedItems([]);
  };

  // Filter content based on selected filter
  const filteredContent = flaggedContent.filter(item => {
    if (selectedFilter === 'pending') return item.status === 'pending';
    if (selectedFilter === 'high') return item.severity === 'high';
    if (selectedFilter === 'critical') return item.severity === 'critical';
    return true;
  }).filter(item => 
    searchTerm === '' || 
    item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reportedByName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canModerate) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-600 mb-2">Access Restricted</h2>
        <p className="text-gray-500">
          You need moderator privileges to access this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-7xl mx-auto p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Moderation Dashboard</h1>
          <p className="text-gray-600 mt-1">Content moderation and community management</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchModerationData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </button>
          
          <div className="flex items-center text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            Live Updates
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.todayActivity}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">User Reports</p>
                <p className="text-2xl font-bold text-blue-600">{stats.userReports}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Flag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageResolutionTime}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'queue', label: 'Moderation Queue', icon: Flag },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'queue' && (
            <ModerationQueue
              flaggedContent={filteredContent}
              selectedFilter={selectedFilter}
              setSelectedFilter={setSelectedFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              onModerationAction={handleModerationAction}
              onBulkAction={handleBulkAction}
              loading={loading}
            />
          )}
          
          {activeTab === 'analytics' && (
            <ModerationAnalytics stats={stats} />
          )}
          
          {activeTab === 'users' && (
            <UserManagement />
          )}
          
          {activeTab === 'settings' && (
            <ModerationSettings />
          )}
        </div>
      </div>
    </div>
  );
}

// Moderation Queue Component
function ModerationQueue({
  flaggedContent,
  selectedFilter,
  setSelectedFilter,
  searchTerm,
  setSearchTerm,
  selectedItems,
  setSelectedItems,
  onModerationAction,
  onBulkAction,
  loading
}: any) {
  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="pending">Pending Review</option>
              <option value="high">High Severity</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search content, reason, or reporter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
            <button
              onClick={() => onBulkAction('dismiss', selectedItems)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Dismiss All
            </button>
            <button
              onClick={() => onBulkAction('resolve', selectedItems)}
              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
            >
              Resolve All
            </button>
          </div>
        )}
      </div>

      {/* Content List */}
      <div className="space-y-3">
        <AnimatePresence>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading moderation queue...</p>
            </div>
          ) : flaggedContent.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-500">No flagged content requires review.</p>
            </div>
          ) : (
            flaggedContent.map((item: FlaggedContent) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <FlaggedContentItem
                  item={item}
                  isSelected={selectedItems.includes(item.id)}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedItems([...selectedItems, item.id]);
                    } else {
                      setSelectedItems(selectedItems.filter(id => id !== item.id));
                    }
                  }}
                  onAction={onModerationAction}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Individual Flagged Content Item
function FlaggedContentItem({ item, isSelected, onSelect, onAction }: any) {
  const [showDetails, setShowDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: string, reason?: string) => {
    setActionLoading(true);
    try {
      await onAction(item.id, action, reason);
    } finally {
      setActionLoading(false);
    }
  };

  const getContentIcon = () => {
    switch (item.type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          
          {/* Content Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getContentIcon()}
              <span className="text-sm font-medium text-gray-900 capitalize">{item.type}</span>
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium', SEVERITY_COLORS[item.severity])}>
                {item.severity}
              </span>
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[item.status])}>
                {item.status}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              <strong>Reason:</strong> {item.reason}
            </div>
            
            {item.content && (
              <div className="text-sm text-gray-800 bg-white p-2 rounded border mb-2">
                {item.content.length > 200 ? `${item.content.substring(0, 200)}...` : item.content}
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Reported by: {item.reportedByName}</span>
              <span>{new Date(item.reportedAt).toLocaleDateString()}</span>
              {item.context?.channelName && <span>Channel: {item.context.channelName}</span>}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {item.status === 'pending' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleAction('dismiss', 'False positive')}
              disabled={actionLoading}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
            
            <button
              onClick={() => handleAction('delete_content', 'Content removed')}
              disabled={actionLoading}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
            
            <button
              onClick={() => handleAction('resolve', 'Reviewed and resolved')}
              disabled={actionLoading}
              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              Resolve
            </button>
          </div>
        )}
      </div>

      {/* Detailed View */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-4 rounded border space-y-3"
          >
            {item.targetUser && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Target User</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.targetUser.name}</p>
                    <p className="text-xs text-gray-500">Role: {item.targetUser.role}</p>
                  </div>
                </div>
              </div>
            )}
            
            {item.context && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Context</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {item.context.channelId && <p>Channel ID: {item.context.channelId}</p>}
                  {item.context.messageId && <p>Message ID: {item.context.messageId}</p>}
                  {item.context.fileId && <p>File ID: {item.context.fileId}</p>}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Analytics Component (placeholder)
function ModerationAnalytics({ stats }: { stats: ModerationStats | null }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Moderation Analytics</h3>
        <p className="text-gray-500">Detailed analytics coming soon...</p>
      </div>
    </div>
  );
}

// User Management Component (placeholder)
function UserManagement() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
        <p className="text-gray-500">User moderation tools coming soon...</p>
      </div>
    </div>
  );
}

// Settings Component (placeholder)
function ModerationSettings() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Moderation Settings</h3>
        <p className="text-gray-500">Configuration options coming soon...</p>
      </div>
    </div>
  );
}

export default ModerationDashboard;
