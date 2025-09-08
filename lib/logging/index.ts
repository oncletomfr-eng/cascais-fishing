/**
 * Unified Logging System
 * Export all logging functionality
 */

// Core logging functionality
export {
  logger,
  apiLogger,
  dbLogger,
  authLogger,
  chatLogger,
  LogLevel,
  type LogContext,
  type StructuredLogEntry
} from './structured-logger';

// Correlation ID system
export {
  correlationStorage,
  generateCorrelationId,
  generateRequestId,
  getCorrelationContext,
  getCorrelationId,
  getRequestId,
  getUserId,
  updateCorrelationContext,
  runWithCorrelationContext,
  withCorrelationId,
  withCorrelationLogging,
  correlationIdMiddleware,
  getCorrelationHeaders,
  createChildCorrelationId,
  enhanceMiddlewareWithCorrelation,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  type CorrelationContext
} from './correlation-id';

// Log retention system
export {
  logRetentionManager,
  startLogRetention,
  stopLogRetention,
  cleanupLogs,
  getLogRetentionPolicy,
  LogRetentionManager,
  LOG_RETENTION_CONFIGS,
  type LogRetentionPolicy,
  type LogFile
} from './log-retention';

// Note: Middleware functions are imported directly from './middleware'
// This avoids TypeScript module resolution issues
