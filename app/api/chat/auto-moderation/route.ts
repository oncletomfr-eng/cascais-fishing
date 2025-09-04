import { NextRequest, NextResponse } from 'next/server';
import { requireChatRole } from '@/lib/middleware/chat-auth';
import { ChatSecurityManager, ChatRole } from '@/lib/security/chat-permissions';

/**
 * Auto-Moderation Rules Management API
 * Task 22.4: Moderation Tools Implementation
 * 
 * Automated moderation configuration endpoints:
 * - CRUD operations for moderation rules
 * - Rule testing and validation
 * - Performance analytics
 * - Bulk operations
 */

interface ModerationRule {
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

/**
 * GET /api/chat/auto-moderation - Get moderation rules
 */
export const GET = requireChatRole.moderator()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const category = searchParams.get('category');
      const enabled = searchParams.get('enabled');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      console.log(`📋 Getting auto-moderation rules for ${user.id} (${user.role})`);
      
      // Mock data - in production, fetch from database
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
          createdBy: user.id,
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
          createdBy: user.id,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-05T14:15:00Z'
        },
        {
          id: '3',
          name: 'Fishing Scam Detection',
          description: 'Custom rule for detecting fishing-related scams',
          enabled: true,
          category: 'custom',
          type: 'keyword',
          conditions: {
            keywords: ['guaranteed catch', 'miracle bait', 'secret spot', 'pay now'],
            threshold: 2,
            context: 'message'
          },
          actions: {
            flag: true,
            autoRemove: false,
            warn: true,
            notify: true,
            quarantine: true
          },
          severity: 'high',
          stats: {
            triggered: 23,
            falsePositives: 1,
            accuracy: 95.7,
            lastTriggered: '2025-01-04T16:20:00Z'
          },
          createdBy: user.id,
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-04T16:20:00Z'
        }
      ];
      
      // Apply filters
      let filteredRules = mockRules;
      
      if (category && category !== 'all') {
        filteredRules = filteredRules.filter(rule => rule.category === category);
      }
      
      if (enabled !== null) {
        filteredRules = filteredRules.filter(rule => rule.enabled === (enabled === 'true'));
      }
      
      // Apply pagination
      const total = filteredRules.length;
      const paginatedRules = filteredRules.slice(offset, offset + limit);
      
      // Calculate aggregated stats
      const stats = {
        totalRules: mockRules.length,
        enabledRules: mockRules.filter(r => r.enabled).length,
        totalTriggered: mockRules.reduce((sum, rule) => sum + rule.stats.triggered, 0),
        averageAccuracy: mockRules.reduce((sum, rule) => sum + rule.stats.accuracy, 0) / mockRules.length,
        categoryCounts: mockRules.reduce((acc, rule) => {
          acc[rule.category] = (acc[rule.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      // Audit access
      await ChatSecurityManager.auditUserAction(
        user.id,
        'auto_moderation_rules_accessed',
        'system',
        {
          category,
          enabled,
          resultCount: paginatedRules.length,
          ...securityContext
        },
        true
      );
      
      return NextResponse.json({
        success: true,
        rules: paginatedRules,
        pagination: {
          total,
          limit,
          offset,
          hasMore: total > offset + limit
        },
        stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Auto-moderation rules GET error:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve moderation rules',
        code: 'RULES_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * POST /api/chat/auto-moderation - Create or update moderation rule
 */
export const POST = requireChatRole.moderator()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const ruleData = await request.json();
      
      console.log(`📝 Creating/updating auto-moderation rule by ${user.id} (${user.role})`);
      
      // Validate required fields
      if (!ruleData.name || !ruleData.description || !ruleData.category || !ruleData.type) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: name, description, category, type',
          code: 'VALIDATION_ERROR'
        }, { status: 400 });
      }
      
      // Validate rule configuration
      const validationResult = validateRule(ruleData);
      if (!validationResult.valid) {
        return NextResponse.json({
          success: false,
          error: validationResult.error,
          code: 'RULE_VALIDATION_ERROR'
        }, { status: 400 });
      }
      
      const isUpdate = !!ruleData.id;
      const now = new Date().toISOString();
      
      const rule: ModerationRule = {
        ...ruleData,
        id: ruleData.id || generateRuleId(),
        createdBy: isUpdate ? ruleData.createdBy : user.id,
        createdAt: isUpdate ? ruleData.createdAt : now,
        updatedAt: now,
        stats: isUpdate ? ruleData.stats : {
          triggered: 0,
          falsePositives: 0,
          accuracy: 100
        }
      };
      
      // In production, save to database
      console.log(`💾 ${isUpdate ? 'Updated' : 'Created'} rule:`, rule.id);
      
      // Audit rule creation/update
      await ChatSecurityManager.auditUserAction(
        user.id,
        isUpdate ? 'auto_moderation_rule_updated' : 'auto_moderation_rule_created',
        rule.id,
        {
          ruleName: rule.name,
          ruleCategory: rule.category,
          ruleEnabled: rule.enabled,
          ...securityContext
        },
        true
      );
      
      return NextResponse.json({
        success: true,
        rule,
        message: `Rule ${isUpdate ? 'updated' : 'created'} successfully`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Auto-moderation rule POST error:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'auto_moderation_rule_error',
        'unknown',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Rule operation failed',
        code: 'RULE_OPERATION_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * PUT /api/chat/auto-moderation - Test or bulk operations
 */
export const PUT = requireChatRole.moderator()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { action, ...data } = await request.json();
      
      console.log(`🔧 Auto-moderation ${action} by ${user.id} (${user.role})`);
      
      let result;
      
      switch (action) {
        case 'test_rule':
          result = await testRule(data.rule, data.content, user);
          break;
          
        case 'toggle_rule':
          result = await toggleRule(data.ruleId, data.enabled, user);
          break;
          
        case 'bulk_enable':
          result = await bulkToggleRules(data.ruleIds, true, user);
          break;
          
        case 'bulk_disable':
          result = await bulkToggleRules(data.ruleIds, false, user);
          break;
          
        case 'export_rules':
          result = await exportRules(data.ruleIds || [], user);
          break;
          
        case 'import_rules':
          result = await importRules(data.rules, user);
          break;
          
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown action: ${action}`,
            code: 'UNKNOWN_ACTION'
          }, { status: 400 });
      }
      
      // Audit operation
      await ChatSecurityManager.auditUserAction(
        user.id,
        `auto_moderation_${action}`,
        'system',
        {
          action,
          success: result.success,
          ...securityContext
        },
        result.success
      );
      
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Auto-moderation PUT error:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
        code: 'OPERATION_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/chat/auto-moderation - Delete moderation rule
 */
export const DELETE = requireChatRole.moderator()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const ruleId = searchParams.get('ruleId');
      const bulk = searchParams.get('bulk') === 'true';
      const ruleIds = searchParams.get('ruleIds')?.split(',') || [];
      
      if (!ruleId && !bulk) {
        return NextResponse.json({
          success: false,
          error: 'Rule ID required',
          code: 'MISSING_RULE_ID'
        }, { status: 400 });
      }
      
      const idsToDelete = bulk ? ruleIds : [ruleId!];
      
      console.log(`🗑️ Deleting auto-moderation rules: ${idsToDelete.join(', ')} by ${user.id}`);
      
      // In production, delete from database
      // const deletedCount = await deleteRulesFromDatabase(idsToDelete);
      
      // Audit deletion
      await ChatSecurityManager.auditUserAction(
        user.id,
        'auto_moderation_rules_deleted',
        idsToDelete.join(','),
        {
          ruleIds: idsToDelete,
          count: idsToDelete.length,
          ...securityContext
        },
        true
      );
      
      return NextResponse.json({
        success: true,
        deletedRules: idsToDelete,
        message: `${idsToDelete.length} rule(s) deleted successfully`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Auto-moderation DELETE error:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
        code: 'DELETION_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

// Helper functions

function validateRule(rule: Partial<ModerationRule>): { valid: boolean; error?: string } {
  // Basic validation
  if (!rule.name || rule.name.trim().length < 3) {
    return { valid: false, error: 'Rule name must be at least 3 characters' };
  }
  
  if (!rule.description || rule.description.trim().length < 10) {
    return { valid: false, error: 'Rule description must be at least 10 characters' };
  }
  
  if (!['spam', 'toxicity', 'inappropriate', 'custom'].includes(rule.category || '')) {
    return { valid: false, error: 'Invalid rule category' };
  }
  
  if (!['keyword', 'pattern', 'ai', 'sentiment', 'frequency'].includes(rule.type || '')) {
    return { valid: false, error: 'Invalid rule type' };
  }
  
  if (!['low', 'medium', 'high', 'critical'].includes(rule.severity || '')) {
    return { valid: false, error: 'Invalid severity level' };
  }
  
  // Type-specific validation
  if (rule.type === 'keyword' && (!rule.conditions?.keywords || rule.conditions.keywords.length === 0)) {
    return { valid: false, error: 'Keyword rules must have at least one keyword' };
  }
  
  if (rule.type === 'pattern' && (!rule.conditions?.patterns || rule.conditions.patterns.length === 0)) {
    return { valid: false, error: 'Pattern rules must have at least one pattern' };
  }
  
  if (rule.type === 'ai' && (!rule.conditions?.threshold || rule.conditions.threshold < 0 || rule.conditions.threshold > 1)) {
    return { valid: false, error: 'AI rules must have a threshold between 0 and 1' };
  }
  
  // Validate actions
  if (!rule.actions || Object.keys(rule.actions).length === 0) {
    return { valid: false, error: 'At least one action must be configured' };
  }
  
  const hasAnyAction = Object.values(rule.actions).some(action => action === true);
  if (!hasAnyAction) {
    return { valid: false, error: 'At least one action must be enabled' };
  }
  
  return { valid: true };
}

async function testRule(rule: any, content: string, user: any): Promise<any> {
  console.log(`🧪 Testing rule "${rule.name}" with content: "${content.substring(0, 50)}..."`);
  
  // Simulate rule testing based on type
  let matched = false;
  let confidence = 0;
  const triggers = [];
  
  switch (rule.type) {
    case 'keyword':
      if (rule.conditions?.keywords) {
        for (const keyword of rule.conditions.keywords) {
          if (content.toLowerCase().includes(keyword.toLowerCase())) {
            matched = true;
            triggers.push(`keyword: ${keyword}`);
          }
        }
        confidence = matched ? 95 + Math.random() * 5 : 5 + Math.random() * 10;
      }
      break;
      
    case 'pattern':
      if (rule.conditions?.patterns) {
        for (const pattern of rule.conditions.patterns) {
          try {
            const regex = new RegExp(pattern, 'gi');
            if (regex.test(content)) {
              matched = true;
              triggers.push(`pattern: ${pattern}`);
            }
          } catch (error) {
            triggers.push(`invalid pattern: ${pattern}`);
          }
        }
        confidence = matched ? 90 + Math.random() * 10 : Math.random() * 20;
      }
      break;
      
    case 'ai':
      // Simulate AI analysis
      const suspiciousWords = ['spam', 'scam', 'toxic', 'hate', 'abuse'];
      const foundSuspicious = suspiciousWords.some(word => content.toLowerCase().includes(word));
      matched = foundSuspicious && Math.random() > 0.3;
      confidence = Math.random() * 100;
      if (matched) triggers.push('ai_analysis');
      break;
      
    default:
      confidence = Math.random() * 50;
  }
  
  return {
    success: true,
    result: {
      matched,
      confidence: Math.round(confidence),
      triggers,
      recommendation: matched ? (confidence > 80 ? 'auto_remove' : 'flag') : 'approve',
      executionTime: Math.round(Math.random() * 100 + 50) // ms
    }
  };
}

async function toggleRule(ruleId: string, enabled: boolean, user: any): Promise<any> {
  console.log(`🔧 ${enabled ? 'Enabling' : 'Disabling'} rule ${ruleId}`);
  
  // In production, update database
  // await updateRuleStatus(ruleId, enabled);
  
  return {
    success: true,
    ruleId,
    enabled,
    message: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`
  };
}

async function bulkToggleRules(ruleIds: string[], enabled: boolean, user: any): Promise<any> {
  console.log(`🔧 Bulk ${enabled ? 'enabling' : 'disabling'} ${ruleIds.length} rules`);
  
  // In production, update database
  // await bulkUpdateRuleStatus(ruleIds, enabled);
  
  return {
    success: true,
    ruleIds,
    enabled,
    count: ruleIds.length,
    message: `${ruleIds.length} rule(s) ${enabled ? 'enabled' : 'disabled'} successfully`
  };
}

async function exportRules(ruleIds: string[], user: any): Promise<any> {
  console.log(`📤 Exporting ${ruleIds.length || 'all'} rules`);
  
  // In production, fetch rules from database and format for export
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: user.id,
    rules: [] // Would contain actual rules
  };
  
  return {
    success: true,
    exportData,
    message: 'Rules exported successfully'
  };
}

async function importRules(rules: any[], user: any): Promise<any> {
  console.log(`📥 Importing ${rules.length} rules`);
  
  const validRules = [];
  const invalidRules = [];
  
  for (const rule of rules) {
    const validation = validateRule(rule);
    if (validation.valid) {
      validRules.push({
        ...rule,
        id: generateRuleId(),
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      invalidRules.push({ rule, error: validation.error });
    }
  }
  
  // In production, save valid rules to database
  
  return {
    success: true,
    imported: validRules.length,
    failed: invalidRules.length,
    invalidRules: invalidRules.length > 0 ? invalidRules : undefined,
    message: `${validRules.length} rule(s) imported successfully`
  };
}

function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
