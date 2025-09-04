'use client';

/**
 * Auto Moderation Rules Component
 * Task 22.4: Moderation Tools Implementation
 * 
 * Automated moderation configuration:
 * - AI-powered content filtering
 * - Custom rule creation
 * - Pattern matching system
 * - Threshold management
 * - Real-time rule testing
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Zap,
  Brain,
  Shield,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Filter,
  Search,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Code,
  TestTube
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'spam' | 'toxicity' | 'inappropriate' | 'custom';
  type: 'keyword' | 'pattern' | 'ai' | 'sentiment' | 'frequency';
  conditions: {
    keywords?: string[];
    patterns?: string[];
    threshold?: number;
    context?: string;
    exceptions?: string[];
  };
  actions: {
    flag: boolean;
    autoRemove: boolean;
    warn: boolean;
    notify: boolean;
    quarantine: boolean;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  stats: {
    triggered: number;
    falsePositives: number;
    accuracy: number;
    lastTriggered?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutoModerationRulesProps {
  className?: string;
}

const RULE_CATEGORIES = [
  { id: 'spam', label: 'Spam Detection', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'toxicity', label: 'Toxicity', color: 'bg-red-100 text-red-800' },
  { id: 'inappropriate', label: 'Inappropriate Content', color: 'bg-orange-100 text-orange-800' },
  { id: 'custom', label: 'Custom Rules', color: 'bg-blue-100 text-blue-800' }
];

const RULE_TYPES = [
  { id: 'keyword', label: 'Keyword Matching', icon: Search },
  { id: 'pattern', label: 'Pattern Detection', icon: Code },
  { id: 'ai', label: 'AI Analysis', icon: Brain },
  { id: 'sentiment', label: 'Sentiment Analysis', icon: BarChart3 },
  { id: 'frequency', label: 'Frequency Check', icon: RefreshCw }
];

export function AutoModerationRules({ className = '' }: AutoModerationRulesProps) {
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRule, setEditingRule] = useState<ModerationRule | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);

  // Mock data - in production, fetch from API
  useEffect(() => {
    const mockRules: ModerationRule[] = [
      {
        id: '1',
        name: 'Spam Link Detection',
        description: 'Detects messages with excessive external links',
        enabled: true,
        category: 'spam',
        type: 'pattern',
        conditions: {
          patterns: ['http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'],
          threshold: 3,
          context: 'message'
        },
        actions: {
          flag: true,
          autoRemove: false,
          warn: true,
          notify: true,
          quarantine: false
        },
        severity: 'medium',
        stats: {
          triggered: 156,
          falsePositives: 12,
          accuracy: 92.3,
          lastTriggered: '2025-01-05T10:30:00Z'
        },
        createdBy: 'admin',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-05T10:30:00Z'
      },
      {
        id: '2',
        name: 'Toxic Language Filter',
        description: 'AI-powered toxic language detection',
        enabled: true,
        category: 'toxicity',
        type: 'ai',
        conditions: {
          threshold: 0.75,
          context: 'message',
          exceptions: ['educational', 'moderation']
        },
        actions: {
          flag: true,
          autoRemove: true,
          warn: false,
          notify: true,
          quarantine: true
        },
        severity: 'high',
        stats: {
          triggered: 89,
          falsePositives: 3,
          accuracy: 96.6,
          lastTriggered: '2025-01-05T14:15:00Z'
        },
        createdBy: 'moderator',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-05T14:15:00Z'
      }
    ];
    
    setRules(mockRules);
    setLoading(false);
  }, []);

  const filteredRules = rules.filter(rule => {
    if (selectedCategory !== 'all' && rule.category !== selectedCategory) return false;
    if (searchTerm && !rule.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !rule.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled } : rule
    ));
    
    // In production, send API request
    console.log(`${enabled ? 'Enabled' : 'Disabled'} rule ${ruleId}`);
  };

  const deleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      console.log(`Deleted rule ${ruleId}`);
    }
  };

  const testRule = async (rule: ModerationRule, testContent: string) => {
    setTestingRule(rule.id);
    
    // Simulate testing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock result based on rule type
    const mockResult = {
      matched: testContent.includes('spam') || Math.random() > 0.5,
      confidence: Math.random() * 100,
      triggers: ['keyword_match', 'pattern_detected'],
      recommendation: 'flag'
    };
    
    setTestingRule(null);
    alert(`Test Result: ${mockResult.matched ? 'MATCHED' : 'NO MATCH'}\nConfidence: ${mockResult.confidence.toFixed(1)}%`);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRuleTypeIcon = (type: string) => {
    const typeConfig = RULE_TYPES.find(t => t.id === type);
    const Icon = typeConfig?.icon || Shield;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auto-Moderation Rules</h2>
          <p className="text-gray-600 mt-1">Configure automated content moderation</p>
        </div>
        
        <button
          onClick={() => setShowCreateRule(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {RULE_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading moderation rules...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Rules Found</h3>
              <p className="text-gray-500">Create your first auto-moderation rule.</p>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <RuleCard
                  rule={rule}
                  onToggle={toggleRule}
                  onEdit={(rule) => setEditingRule(rule)}
                  onDelete={deleteRule}
                  onTest={testRule}
                  testing={testingRule === rule.id}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Create/Edit Rule Modal */}
      <AnimatePresence>
        {(showCreateRule || editingRule) && (
          <CreateEditRuleModal
            rule={editingRule}
            onClose={() => {
              setShowCreateRule(false);
              setEditingRule(null);
            }}
            onSave={(rule) => {
              if (editingRule) {
                setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
              } else {
                setRules(prev => [...prev, { ...rule, id: Date.now().toString() }]);
              }
              setShowCreateRule(false);
              setEditingRule(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual Rule Card
function RuleCard({ 
  rule, 
  onToggle, 
  onEdit, 
  onDelete, 
  onTest,
  testing 
}: {
  rule: ModerationRule;
  onToggle: (ruleId: string, enabled: boolean) => void;
  onEdit: (rule: ModerationRule) => void;
  onDelete: (ruleId: string) => void;
  onTest: (rule: ModerationRule, content: string) => void;
  testing: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [testContent, setTestContent] = useState('');

  const category = RULE_CATEGORIES.find(c => c.id === rule.category);
  const accuracy = rule.stats.accuracy;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {getRuleTypeIcon(rule.type)}
            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', category?.color)}>
              {category?.label}
            </span>
            <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getSeverityColor(rule.severity))}>
              {rule.severity.toUpperCase()}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3">{rule.description}</p>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <BarChart3 className="w-4 h-4" />
              <span>Triggered: {rule.stats.triggered}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Accuracy: {accuracy.toFixed(1)}%</span>
            </div>
            {rule.stats.lastTriggered && (
              <div className="flex items-center space-x-1">
                <RefreshCw className="w-4 h-4" />
                <span>Last: {new Date(rule.stats.lastTriggered).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {/* Rule Toggle */}
          <button
            onClick={() => onToggle(rule.id, !rule.enabled)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              rule.enabled ? 'bg-green-600' : 'bg-gray-200'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                rule.enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onEdit(rule)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed View */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Conditions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Conditions</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {rule.conditions.keywords && (
                    <p>Keywords: {rule.conditions.keywords.join(', ')}</p>
                  )}
                  {rule.conditions.patterns && (
                    <p>Patterns: {rule.conditions.patterns.length} pattern(s)</p>
                  )}
                  {rule.conditions.threshold && (
                    <p>Threshold: {rule.conditions.threshold}</p>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rule.actions).map(([action, enabled]) => (
                    enabled && (
                      <span key={action} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {action.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>
            
            {/* Test Rule */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Test Rule</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter test content..."
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => onTest(rule, testContent)}
                  disabled={testing || !testContent.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Create/Edit Rule Modal
function CreateEditRuleModal({ 
  rule, 
  onClose, 
  onSave 
}: {
  rule: ModerationRule | null;
  onClose: () => void;
  onSave: (rule: ModerationRule) => void;
}) {
  const isEditing = !!rule;
  const [formData, setFormData] = useState<Partial<ModerationRule>>(
    rule || {
      name: '',
      description: '',
      enabled: true,
      category: 'custom',
      type: 'keyword',
      conditions: {},
      actions: {
        flag: true,
        autoRemove: false,
        warn: false,
        notify: true,
        quarantine: false
      },
      severity: 'medium'
    }
  );

  const handleSave = () => {
    if (!formData.name?.trim() || !formData.description?.trim()) {
      alert('Name and description are required');
      return;
    }
    
    const ruleData: ModerationRule = {
      ...formData as ModerationRule,
      id: rule?.id || Date.now().toString(),
      stats: rule?.stats || {
        triggered: 0,
        falsePositives: 0,
        accuracy: 100
      },
      createdBy: rule?.createdBy || 'current_user',
      createdAt: rule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSave(ruleData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Rule' : 'Create New Rule'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rule name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category || 'custom'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RULE_CATEGORIES.map(category => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this rule does"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type || 'keyword'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RULE_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={formData.severity || 'medium'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(formData.actions || {}).map(([action, enabled]) => (
                  <label key={action} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          [action]: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {action.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Enable/Disable */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                Enable rule immediately
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AutoModerationRules;
