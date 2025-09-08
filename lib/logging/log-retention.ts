/**
 * Log Retention Management System
 * Configure log retention policies and archiving strategies
 */

import { logger } from './structured-logger';

export interface LogRetentionPolicy {
  // Retention periods by log level (in days)
  errorRetentionDays: number;
  warnRetentionDays: number;
  infoRetentionDays: number;
  debugRetentionDays: number;
  traceRetentionDays: number;
  
  // Archive settings
  archiveAfterDays: number;
  archiveLocation?: string;
  compressionEnabled: boolean;
  
  // Cleanup settings
  maxLogFiles: number;
  maxLogSizeMB: number;
  cleanupIntervalHours: number;
  
  // Environment-specific overrides
  environment: 'development' | 'staging' | 'production';
}

export interface LogFile {
  path: string;
  size: number;
  createdAt: Date;
  lastModified: Date;
  level?: string;
  archived: boolean;
}

export class LogRetentionManager {
  private policy: LogRetentionPolicy;
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(policy?: Partial<LogRetentionPolicy>) {
    this.policy = this.createDefaultPolicy(policy);
    
    // Auto-start cleanup in production
    if (this.policy.environment === 'production') {
      this.startAutoCleanup();
    }
  }
  
  private createDefaultPolicy(override?: Partial<LogRetentionPolicy>): LogRetentionPolicy {
    const environment = (process.env.NODE_ENV as any) || 'development';
    
    const defaultPolicies: Record<string, Partial<LogRetentionPolicy>> = {
      development: {
        errorRetentionDays: 7,
        warnRetentionDays: 3,
        infoRetentionDays: 1,
        debugRetentionDays: 1,
        traceRetentionDays: 1,
        archiveAfterDays: 2,
        maxLogFiles: 50,
        maxLogSizeMB: 100,
        compressionEnabled: false,
        cleanupIntervalHours: 24
      },
      staging: {
        errorRetentionDays: 30,
        warnRetentionDays: 14,
        infoRetentionDays: 7,
        debugRetentionDays: 3,
        traceRetentionDays: 1,
        archiveAfterDays: 7,
        maxLogFiles: 200,
        maxLogSizeMB: 500,
        compressionEnabled: true,
        cleanupIntervalHours: 12
      },
      production: {
        errorRetentionDays: 90,
        warnRetentionDays: 30,
        infoRetentionDays: 14,
        debugRetentionDays: 7,
        traceRetentionDays: 3,
        archiveAfterDays: 30,
        maxLogFiles: 1000,
        maxLogSizeMB: 2000,
        compressionEnabled: true,
        cleanupIntervalHours: 6
      }
    };
    
    const basePolicy = {
      ...defaultPolicies[environment],
      environment,
      archiveLocation: process.env.LOG_ARCHIVE_LOCATION || '/tmp/logs/archive'
    };
    
    return { ...basePolicy, ...override } as LogRetentionPolicy;
  }
  
  /**
   * Get current retention policy
   */
  getPolicy(): LogRetentionPolicy {
    return { ...this.policy };
  }
  
  /**
   * Update retention policy
   */
  updatePolicy(updates: Partial<LogRetentionPolicy>): void {
    this.policy = { ...this.policy, ...updates };
    logger.info('Log retention policy updated', {
      operation: 'log_retention_update',
      metadata: { updates }
    });
  }
  
  /**
   * Get retention period for a specific log level
   */
  getRetentionDays(logLevel: string): number {
    switch (logLevel.toLowerCase()) {
      case 'error':
        return this.policy.errorRetentionDays;
      case 'warn':
      case 'warning':
        return this.policy.warnRetentionDays;
      case 'info':
        return this.policy.infoRetentionDays;
      case 'debug':
        return this.policy.debugRetentionDays;
      case 'trace':
        return this.policy.traceRetentionDays;
      default:
        return this.policy.infoRetentionDays; // Default fallback
    }
  }
  
  /**
   * Check if a log file should be archived
   */
  shouldArchive(logFile: LogFile): boolean {
    const ageInDays = this.getAgeInDays(logFile.createdAt);
    return ageInDays >= this.policy.archiveAfterDays && !logFile.archived;
  }
  
  /**
   * Check if a log file should be deleted
   */
  shouldDelete(logFile: LogFile): boolean {
    const ageInDays = this.getAgeInDays(logFile.createdAt);
    const retentionDays = this.getRetentionDays(logFile.level || 'info');
    return ageInDays > retentionDays;
  }
  
  /**
   * Get age of a log file in days
   */
  private getAgeInDays(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Start automatic cleanup process
   */
  startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    const intervalMs = this.policy.cleanupIntervalHours * 60 * 60 * 1000;
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(error => {
        logger.error('Auto cleanup failed', {
          operation: 'log_cleanup_auto',
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        });
      });
    }, intervalMs);
    
    logger.info('Auto cleanup started', {
      operation: 'log_cleanup_start',
      metadata: { intervalHours: this.policy.cleanupIntervalHours }
    });
  }
  
  /**
   * Stop automatic cleanup process
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      
      logger.info('Auto cleanup stopped', {
        operation: 'log_cleanup_stop'
      });
    }
  }
  
  /**
   * Perform manual cleanup
   */
  async performCleanup(): Promise<{
    filesProcessed: number;
    filesArchived: number;
    filesDeleted: number;
    spaceFreedMB: number;
  }> {
    const startTime = Date.now();
    const results = {
      filesProcessed: 0,
      filesArchived: 0,
      filesDeleted: 0,
      spaceFreedMB: 0
    };
    
    try {
      logger.info('Starting log cleanup', {
        operation: 'log_cleanup_start',
        metadata: { policy: this.policy }
      });
      
      // In a real implementation, this would scan actual log files
      // For now, we'll simulate the process
      const logFiles = await this.scanLogFiles();
      
      for (const logFile of logFiles) {
        results.filesProcessed++;
        
        if (this.shouldDelete(logFile)) {
          await this.deleteLogFile(logFile);
          results.filesDeleted++;
          results.spaceFreedMB += logFile.size / (1024 * 1024);
        } else if (this.shouldArchive(logFile)) {
          await this.archiveLogFile(logFile);
          results.filesArchived++;
        }
      }
      
      // Check total log size limits
      await this.enforceLogSizeLimits();
      
      const duration = Date.now() - startTime;
      
      logger.info('Log cleanup completed', {
        operation: 'log_cleanup_complete',
        duration,
        metadata: results
      });
      
      return results;
      
    } catch (error) {
      logger.error('Log cleanup failed', {
        operation: 'log_cleanup_error',
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }
  
  /**
   * Scan for log files (placeholder implementation)
   */
  private async scanLogFiles(): Promise<LogFile[]> {
    // In a real implementation, this would scan the actual log directory
    // For now, return an empty array
    // This would typically use fs.readdir() and fs.stat()
    return [];
  }
  
  /**
   * Archive a log file
   */
  private async archiveLogFile(logFile: LogFile): Promise<void> {
    logger.debug(`Archiving log file: ${logFile.path}`, {
      operation: 'log_archive',
      resource: logFile.path,
      metadata: {
        size: logFile.size,
        age: this.getAgeInDays(logFile.createdAt)
      }
    });
    
    // In a real implementation, this would:
    // 1. Compress the log file if compression is enabled
    // 2. Move it to the archive location
    // 3. Update the file's archived status
  }
  
  /**
   * Delete a log file
   */
  private async deleteLogFile(logFile: LogFile): Promise<void> {
    logger.debug(`Deleting log file: ${logFile.path}`, {
      operation: 'log_delete',
      resource: logFile.path,
      metadata: {
        size: logFile.size,
        age: this.getAgeInDays(logFile.createdAt)
      }
    });
    
    // In a real implementation, this would:
    // 1. Delete the file from the filesystem
    // 2. Update any tracking databases
  }
  
  /**
   * Enforce log size limits
   */
  private async enforceLogSizeLimits(): Promise<void> {
    // In a real implementation, this would:
    // 1. Calculate total log size
    // 2. Delete oldest files if limits are exceeded
    // 3. Enforce maximum number of files
    
    logger.debug('Enforcing log size limits', {
      operation: 'log_size_enforcement',
      metadata: {
        maxLogFiles: this.policy.maxLogFiles,
        maxLogSizeMB: this.policy.maxLogSizeMB
      }
    });
  }
  
  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<{
    totalFiles: number;
    totalSizeMB: number;
    filesByLevel: Record<string, number>;
    oldestFile: Date | null;
    newestFile: Date | null;
    archiveStats: {
      archivedFiles: number;
      archivedSizeMB: number;
    };
  }> {
    // In a real implementation, this would scan actual files
    return {
      totalFiles: 0,
      totalSizeMB: 0,
      filesByLevel: {},
      oldestFile: null,
      newestFile: null,
      archiveStats: {
        archivedFiles: 0,
        archivedSizeMB: 0
      }
    };
  }
}

// Global retention manager instance
export const logRetentionManager = new LogRetentionManager();

// Helper functions for easy integration
export function startLogRetention(policy?: Partial<LogRetentionPolicy>): void {
  if (policy) {
    logRetentionManager.updatePolicy(policy);
  }
  logRetentionManager.startAutoCleanup();
}

export function stopLogRetention(): void {
  logRetentionManager.stopAutoCleanup();
}

export function cleanupLogs(): Promise<any> {
  return logRetentionManager.performCleanup();
}

export function getLogRetentionPolicy(): LogRetentionPolicy {
  return logRetentionManager.getPolicy();
}

// Environment-specific configurations
export const LOG_RETENTION_CONFIGS = {
  development: {
    errorRetentionDays: 7,
    warnRetentionDays: 3,
    infoRetentionDays: 1,
    archiveAfterDays: 2,
    cleanupIntervalHours: 24,
    compressionEnabled: false
  },
  staging: {
    errorRetentionDays: 30,
    warnRetentionDays: 14,
    infoRetentionDays: 7,
    archiveAfterDays: 7,
    cleanupIntervalHours: 12,
    compressionEnabled: true
  },
  production: {
    errorRetentionDays: 90,
    warnRetentionDays: 30,
    infoRetentionDays: 14,
    archiveAfterDays: 30,
    cleanupIntervalHours: 6,
    compressionEnabled: true
  }
} as const;
